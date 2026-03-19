package com.harya72.mrz.scanner

import android.graphics.*
import android.media.ExifInterface
import android.net.Uri
import android.util.Log
import com.facebook.react.bridge.*
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.harya72.mrz.scanner.utils.MRZParser
import com.harya72.mrz.scanner.utils.MRZCleaner

private const val TAG = "MrzScannerModule"

class MrzScannerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val textRecognizer: TextRecognizer =
        TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val parser = MRZParser()

    override fun getName(): String = "MrzScanner"

    private fun loadBitmap(uri: String): Bitmap? {
        val context = reactContext
        val photoPath: String? = when {
            uri.startsWith("file://") -> Uri.parse(uri).path
            uri.startsWith("content://") -> null
            else -> uri
        }

        var bitmap: Bitmap? = if (photoPath != null) {
            BitmapFactory.decodeFile(photoPath)
        } else {
            val inputStream = context.contentResolver.openInputStream(Uri.parse(uri))
            val b = BitmapFactory.decodeStream(inputStream)
            inputStream?.close()
            b
        }

        // Apply EXIF rotation safely
        if (bitmap != null && photoPath != null) {
            try {
                val exif = ExifInterface(photoPath)
                val orientation = exif.getAttributeInt(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_UNDEFINED
                )
                val matrix = Matrix()
                val degrees = when (orientation) {
                    ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                    ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                    ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                    else -> 0f
                }
                if (degrees != 0f) {
                    matrix.postRotate(degrees)
                    bitmap = Bitmap.createBitmap(
                        bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true
                    )
                }
            } catch (e: Exception) {
                Log.w(TAG, "EXIF read failed: ${e.message}")
            }
        }
        return bitmap
    }

    private fun processMrzFromTextBlocks(textResult: Text): android.os.Bundle {
        val sortedLines = MRZCleaner.extractSortedMRZLines(textResult)
        return parser.parseFromLines(sortedLines.map { it.text })
    }

    @ReactMethod
    fun scanFromUri(uri: String, promise: Promise) {
        try {
            val bitmap = loadBitmap(uri) ?: run {
                promise.reject("DECODE_ERROR", "Failed to decode image from: $uri")
                return
            }

            val inputImage = InputImage.fromBitmap(bitmap, 0)
            val result = Tasks.await(textRecognizer.process(inputImage))
            
            val bundle = processMrzFromTextBlocks(result)

            if (bundle.containsKey("error")) {
                promise.reject("NO_MRZ", "Could not find a valid MRZ checksum match in the image.")
                return
            }

            val resultMap = Arguments.createMap()
            var hasData = false
            for (key in bundle.keySet()) {
                val value = bundle.get(key)
                if (value != null) {
                    hasData = true
                    when (value) {
                        is String -> resultMap.putString(key, value)
                        is Boolean -> resultMap.putBoolean(key, value)
                    }
                }
            }
            
            if (hasData) {
                promise.resolve(resultMap)
            } else {
                promise.reject("NO_MRZ", "Extraction found an MRZ but parsable fields were empty.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in scanFromUri: ${e.message}")
            promise.reject("MRZ_SCAN_ERROR", e.message)
        }
    }
}