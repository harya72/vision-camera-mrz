package com.harya72.mrz.scanner.utils

import android.os.Bundle
import java.util.Calendar

class MRZParser {

    fun parseFromLines(initialLines: List<String>): Bundle {
        val lines = mutableListOf<String>()

        // Remove spaces, uppercase, $ to S, split by newlines
        for (initialLine in initialLines) {
            var line = initialLine
            while (line.contains(" ")) {
                line = line.replace(" ", "")
            }
            line = line.uppercase()
            while (line.contains("$")) {
                line = line.replace("$", "S")
            }
            // In case there's newline within string
            if (line.contains("\n")) {
                val parts = line.split("\n")
                lines.addAll(parts.filter { it.isNotEmpty() })
            } else {
                if (line.isNotEmpty()) lines.add(line)
            }
        }

        if (lines.size >= 2) {
            val firstInitialLastLine = lines.getOrNull(lines.size - 1)
            val secondInitialLastLine = lines.getOrNull(lines.size - 2)

            if (firstInitialLastLine != null && secondInitialLastLine != null) {
                if (firstInitialLastLine.contains("«") || secondInitialLastLine.contains("«")) {
                    return reconstructFromFragments(lines)
                }

                for (i in 1 until lines.size) {
                    val currentLine = lines[i]
                    val lastLine = lines[i - 1]

                    val cLen = currentLine.length
                    val lLen = lastLine.length

                    // Relaxed length: ML Kit frequently drops trailing '<' padding.
                    // First line (lLen) only needs ~10 chars (DocType + Country + Name start).
                    // Second line (cLen) needs at least 27 chars to reach the Expiration Date field.
                    if (cLen in 27..48 && lLen in 10..48) {

                        val docType = extractDocType(lastLine)
                        // Passports (P) are TD3 (44 chars). If length exceeds 37, it's definitely TD3.
                        val targetLen = if (docType.startsWith("P") || cLen > 37 || lLen > 37) 44 else 36

                        // Pad missing trailing '<' to guarantee correct extraction indices
                        val paddedLast = lastLine.padEnd(targetLen, '<').take(targetLen)
                        val paddedCurrent = currentLine.padEnd(targetLen, '<').take(targetLen)

                        val result = parse2LineMRZ(paddedLast, paddedCurrent)
                        if (result != null) return result
                    }
                }
            }
        }

        if (lines.size >= 3) {
            val thirdToLastLine = lines.getOrNull(lines.size - 3)
            if (thirdToLastLine != null && thirdToLastLine.contains("«")) {
                return reconstructFromFragments(lines)
            }

            for (i in 2 until lines.size) {
                val currentLine = lines[i]
                val lastLine = lines[i - 1]
                val secondToLastLine = lines[i - 2]

                val cLen = currentLine.length
                val l1Len = lastLine.length
                val l2Len = secondToLastLine.length

                // Relaxed length: ML Kit drops trailing '<' padding.
                // firstRow (l2Len) needs ~15 chars (DocType + Country + DocNum).
                // secondRow (l1Len) needs ~18 chars (DOB + Sex + Expiry + Nationality).
                // thirdRow (cLen) needs ~5 chars (Name start).
                if (cLen in 5..35 && l1Len in 18..35 && l2Len in 15..35) {

                    val paddedL2 = secondToLastLine.padEnd(30, '<').take(30)
                    val paddedL1 = lastLine.padEnd(30, '<').take(30)
                    val paddedC = currentLine.padEnd(30, '<').take(30)

                    val result = parse3LineMRZ(paddedL2, paddedL1, paddedC)
                    if (result != null) return result
                }
            }
        }

        return reconstructFromFragments(lines)
    }

    private fun parse2LineMRZ(firstRow: String, secondRow: String): Bundle? {
        val docType = extractDocType(firstRow)
        val names = extractNamesFromLine(5, firstRow)

        val idNumber = extractIdNumber(secondRow, 0, 9) ?: return null
        val issuingCountry = extractCountry(firstRow, 2, 5)
        val nationality = extractCountry(secondRow, 10, 13)
        val dob = extractDateOfBirthFromLine(13, secondRow)
        val gender = extractGender(secondRow.getOrNull(20)?.toString() ?: "U")
        val docExpirationDate = extractDateOfExpirationFromLine(21, secondRow)

        val bundle = Bundle()
        bundle.putString("docMRZ", "$firstRow\n$secondRow")
        bundle.putString("documentType", docType)
        bundle.putString("issuingCountry", issuingCountry)
        bundle.putString("givenNames", names.first)
        bundle.putString("surname", names.second) // Maps to lastNames
        bundle.putString("documentNumber", idNumber)
        bundle.putString("nationality", nationality)
        bundle.putString("dateOfBirth", dob ?: "Unknown")
        bundle.putString("sex", gender)
        bundle.putString("dateOfExpiry", docExpirationDate ?: "Unknown")
        return bundle
    }

    private fun parse3LineMRZ(firstRow: String, secondRow: String, thirdRow: String): Bundle? {
        val docType = extractDocType(firstRow)
        val names = extractNamesFromLine(0, thirdRow)

        val idNumber = extractIdNumber(firstRow, 5, 14) ?: return null
        val issuingCountry = extractCountry(firstRow, 2, 5)
        val nationality = extractCountry(secondRow, 15, 18)
        val dob = extractDateOfBirthFromLine(0, secondRow)
        val gender = extractGender(secondRow.getOrNull(7)?.toString() ?: "U")
        val docExpirationDate = extractDateOfExpirationFromLine(8, secondRow)

        val bundle = Bundle()
        bundle.putString("docMRZ", "$firstRow\n$secondRow\n$thirdRow")
        bundle.putString("documentType", docType)
        bundle.putString("issuingCountry", issuingCountry)
        bundle.putString("givenNames", names.first)
        bundle.putString("surname", names.second) // Maps to lastNames
        bundle.putString("documentNumber", idNumber)
        bundle.putString("nationality", nationality)
        bundle.putString("dateOfBirth", dob ?: "Unknown")
        bundle.putString("sex", gender)
        bundle.putString("dateOfExpiry", docExpirationDate ?: "Unknown")
        return bundle
    }


    private fun extractDocType(line: String): String {
        if (line.length < 2) return line
        val docTypeLen = if (line[1] == '<') 1 else 2
        return line.take(docTypeLen)
    }

    private fun extractIdNumber(line: String, startingIndex: Int, endingIndex: Int): String? {
        if (endingIndex > line.length) return null
        var idNumber = line.substring(startingIndex, endingIndex).replace("O", "0")

        idNumber = idNumber.replace("<", "")
        return idNumber
    }

    private fun extractCountry(line: String, startingIndex: Int, endingIndex: Int): String {
        if (endingIndex > line.length) return ""
        var country = line.substring(startingIndex, endingIndex)
        country = replaceNumbersWithCorrespondingLetters(country)
        if (country == "D<<") return "DEU"
        return country.replace("<", "")
    }

    private fun extractDateOfExpirationFromLine(startingIndex: Int, line: String): String? {
        if (startingIndex + 6 > line.length) return null
        val dateStr = line.substring(startingIndex, startingIndex + 6).replace("O", "0")
        val year = dateStr.take(2).toIntOrNull() ?: return null
        val month = dateStr.substring(2, 4)
        val day = dateStr.substring(4, 6)

        var fullYear = 2000 + year
        val currentYear = Calendar.getInstance().get(Calendar.YEAR)
        if (fullYear - currentYear > 10) fullYear -= 100

        return "$fullYear-$month-$day"
    }

    private fun extractDateOfBirthFromLine(startingIndex: Int, line: String): String? {
        if (startingIndex + 6 > line.length) return null
        val dateStr = line.substring(startingIndex, startingIndex + 6).replace("O", "0")
        val year = dateStr.take(2).toIntOrNull() ?: return null
        val month = dateStr.substring(2, 4)
        val day = dateStr.substring(4, 6)

        var fullYear = 2000 + year
        val currentYear = Calendar.getInstance().get(Calendar.YEAR)
        if (currentYear - fullYear < 0) fullYear -= 100

        return "$fullYear-$month-$day"
    }

    private fun extractNamesFromLine(startingIndex: Int, line: String): Pair<String, String> {
        var angleBracketCount = 0
        var lastNamesExtracted = false
        val lastNames = mutableListOf<String>()
        var lastName = ""
        val givenNames = mutableListOf<String>()
        var givenName = ""

        val actualStart = if (startingIndex < line.length) startingIndex else 0

        for (i in actualStart until line.length) {
            val c = line[i]
            if (c != '<' && !lastNamesExtracted) {
                angleBracketCount = 0
                lastName += c
                if (i == line.length - 1) lastNames.add(lastName)
            } else if (c != '<') {
                angleBracketCount = 0
                givenName += c
                if (i == line.length - 1) givenNames.add(givenName)
            } else if (angleBracketCount == 0 && !lastNamesExtracted) {
                lastNames.add(lastName)
                lastName = ""
                angleBracketCount++
            } else if (angleBracketCount == 0) {
                givenNames.add(givenName)
                givenName = ""
                angleBracketCount++
            } else if (angleBracketCount == 1 && !lastNamesExtracted) {
                lastNames.add(lastName)
                lastNamesExtracted = true
                angleBracketCount = 0
            } else if (angleBracketCount == 1) {
                givenNames.add(givenName)
                break
            }
        }

        val cleanGiven = givenNames.filter { it.isNotEmpty() }
            .joinToString(" ") { replaceNumbersWithCorrespondingLetters(it) }
        val cleanLast = lastNames.filter { it.isNotEmpty() }
            .joinToString(" ") { replaceNumbersWithCorrespondingLetters(it) }
        return Pair(cleanGiven, cleanLast)
    }

    private fun replaceNumbersWithCorrespondingLetters(word: String): String {
        return word.replace("0", "O")
                   .replace("6", "G")
                   .replace("2", "Z")
                   .replace("1", "I")
    }

    private fun extractGender(letter: String): String {
        return when (letter) {
            "<" -> "U"
            "H" -> "Male"
            "M" -> "Male"
            "F" -> "Female"
            else -> letter
        }
    }

    private fun reconstructFromFragments(lines: List<String>): Bundle {
        val bundle = Bundle()
        val allText = lines.joinToString(" ")
        bundle.putString("documentType", "P")
        bundle.putString("rawText", allText)
        bundle.putBoolean("partialExtraction", true)
        return bundle
    }
}