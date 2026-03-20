# React Native MRZ Scanner 📸

A powerful, real-time Machine Readable Zone (MRZ) scanner built with React Native and Expo. This application extracts data from passports, visas, and ID cards (TD1, TD2, TD3 formats) using Google ML Kit and a custom high-performance frame processor.

---

## ✨ Features

- **Real-time Scanning**: High-speed MRZ detection using `react-native-vision-camera`.
- **Static Image OCR**: Pick an image from your gallery and extract MRZ data instantly.
- **Smart Auto-Capture**: Automatically triggers a high-resolution photo capture when a stable MRZ is detected for maximum accuracy.
- **Comprehensive Extraction**: Parses surname, given names, document number, nationality, date of birth, sex, and expiry date.
- **Multi-Format Support**:
  - **TD3**: Passports (2 lines, 44 characters)
  - **TD2/TD1**: ID Cards and Visas (2 or 3 lines, 30-36 characters)

---

## 🛠️ Tech Stack

- **Core**: [React Native](https://reactnative.dev/) (0.83.2) & [Expo](https://expo.dev/) (55.0.6)
- **Camera**: [React Native Vision Camera](https://react-native-vision-camera.com/) (v4)
- **Logic**: [React Native Worklets Core](https://github.com/margelo/react-native-worklets-core) (for camera thread processing)
- **OCR Engine**: [Google ML Kit Text Recognition](https://developers.google.com/ml-kit/vision/text-recognition) (Android)
- **Language**: TypeScript & Kotlin (Native Module)

---

## 📸 Screenshots

| Main Screen | Real-time Scanning | Scan Result |
| :---: | :---: | :---: |
| ![Main Screen](./assets/screenshots/preview_main.jpg) | ![Scanning](./assets/screenshots/realtime_scan.jpg) | ![Result](./assets/screenshots/scan_result.jpg) |

---

## 📂 Project Structure

```text
├── android/            # Native Android implementation (ML Kit & MRZ Parser)
├── assets/             # APP icons, splash screen, and screenshots
├── src/
│   ├── components/     # UI components (Results, Camera Preview)
│   ├── native/         # Native module interfaces & Frame Processors
│   └── types/          # TypeScript definitions
└── App.tsx             # Main application entry and mode orchestration
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Android Studio / Xcode
- Expo CLI (`npm install -g expo-cli`)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/harya72/vision-camera-mrz.git
   cd vision-camera-mrz
   ```

2. **Install dependencies**:
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Run the application**:

   **For Android**:
   ```bash
   npm run android
   ```

   **For iOS**:
   ```bash
   npm run ios
   ```

   **Development (Expo)**:
   ```bash
   npm start
   ```

---

## 🛡️ Permissions

The app requires the following permissions:
- **Camera**: For real-time scanning.
- **Media Library**: For picking images from the gallery.

---

## 🤝 Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue or submit a pull request.

## 📝 License

This project is licensed under the MIT License.
