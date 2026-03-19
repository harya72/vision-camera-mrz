package com.harya72.mrz.scanner

import android.util.Log
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.google.android.gms.tasks.Tasks
import com.harya72.mrz.scanner.utils.MRZCleaner
import com.harya72.mrz.scanner.utils.MRZParser
import java.util.concurrent.TimeUnit
import kotlin.math.max

class MrzFrameProcessorPlugin : FrameProcessorPlugin() {
    private val textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val mrzParser = MRZParser()

    // Throttling to 3 FPS
    private var lastProcessTime = 0L
    private val PROCESS_INTERVAL_MS = 333L 



    override fun callback(frame: Frame, params: Map<String, Any>?): Any? {
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastProcessTime < PROCESS_INTERVAL_MS) {
            return null
        }
        
        val mediaImage = frame.image ?: return null
        val rotationDegrees = when (frame.orientation.name) {
            "PORTRAIT" -> 90
            "LANDSCAPE_LEFT" -> 0
            "PORTRAIT_UPSIDE_DOWN" -> 270
            "LANDSCAPE_RIGHT" -> 180
            else -> 90
        }

        val inputImage = InputImage.fromMediaImage(mediaImage, rotationDegrees)
        lastProcessTime = currentTime

        return try {
            val textResult = Tasks.await(textRecognizer.process(inputImage), 500, TimeUnit.MILLISECONDS)
            
            val sortedLines = MRZCleaner.extractSortedMRZLines(textResult)
            if (sortedLines.isEmpty()) return null

            val stringLines = sortedLines.map { it.text }
            
            // Reconstruct the bounding box by enveloping all candidates
            var minX = Int.MAX_VALUE
            var minY = Int.MAX_VALUE
            var maxX = 0
            var maxY = 0
            
            var validBoxFound = false
            for (candidate in sortedLines) {
                candidate.boundingBox?.let { box ->
                    if (box.left < minX) minX = box.left
                    if (box.top < minY) minY = box.top
                    if (box.right > maxX) maxX = box.right
                    if (box.bottom > maxY) maxY = box.bottom
                    validBoxFound = true
                }
            }

            if (!validBoxFound) return null

            // Normalize coordinates [0..1]
            val imageWidth = frame.width.toDouble()
            val imageHeight = frame.height.toDouble()

            val normX = max(0.0, minX / imageWidth)
            val normY = max(0.0, minY / imageHeight)
            val normWidth = (maxX - minX) / imageWidth
            val normHeight = (maxY - minY) / imageHeight

            // The output boundary mapped to a standard rectangle
            val pointsMap = mapOf(
                "topLeft" to mapOf("x" to normX, "y" to normY),
                "topRight" to mapOf("x" to normX + normWidth, "y" to normY),
                "bottomRight" to mapOf("x" to normX + normWidth, "y" to normY + normHeight),
                "bottomLeft" to mapOf("x" to normX, "y" to normY + normHeight)
            )

            val parsedBundle = mrzParser.parseFromLines(stringLines)
            val partial = parsedBundle.getBoolean("partialExtraction", false)

            if (!partial) {
                val mrzMap = mutableMapOf<String, Any>()
                for (key in parsedBundle.keySet()) {
                    val value = parsedBundle.get(key)
                    if (value != null && key != "partialExtraction") {
                        mrzMap[key] = value.toString()
                    }
                }
                
                return mapOf(
                    "isLocked" to true,
                    "points" to pointsMap,
                    "mrz" to mrzMap
                )
            } else {
                return mapOf(
                    "isLocked" to false,
                    "points" to pointsMap,
                    "mrz" to null
                )
            }

        } catch (e: Exception) {
            Log.e("MrzFrameProcessor", "Error processing MLKit text", e)
            null
        }
    }
}
