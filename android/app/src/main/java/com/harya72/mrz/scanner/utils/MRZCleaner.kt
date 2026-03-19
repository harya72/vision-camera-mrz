package com.harya72.mrz.scanner.utils

import android.graphics.Rect
import com.google.mlkit.vision.text.Text

object MRZCleaner {
    
    data class CleanLine(val text: String, val boundingBox: Rect?)

    fun extractSortedMRZLines(textResult: Text): List<CleanLine> {
        val candidates = mutableListOf<CleanLine>()
        
        for (block in textResult.textBlocks) {
            for (line in block.lines) {
                val cleanLine = line.text.uppercase()
                    .replace(" ", "")
                    .replace("\n", "")
                    .replace(Regex("[^A-Z0-9<{(K]"), "")
                    .replace("{", "<")
                    .replace("(", "<")
                    .replace("KK", "<<")
                    .replace("<K", "<<")
                    .trim()
                
                if (cleanLine.length >= 10 && cleanLine.contains("<")) {
                    candidates.add(CleanLine(cleanLine, line.boundingBox))
                }
            }
        }
        
        return candidates.sortedBy { it.boundingBox?.top ?: 0 }
    }
}
