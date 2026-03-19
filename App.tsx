import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, useCameraDevice, useFrameProcessor, useCameraPermission } from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import { scanMrzFrame } from './src/native/MrzFrameProcessor';
import MrzScanner, { MrzResult } from './src/native/MrzScanner';
import { MrzFrameResult } from './src/types';
import { MrzOverlay } from './src/components/MrzOverlay';
import { MrzResultCard } from './src/components/MrzResultCard';
import { MrzCameraPreview } from './src/components/MrzCameraPreview';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const App = () => {
  const [mode, setMode] = useState<'static' | 'realtime'>('static');
  const [image, setImage] = useState<string | null>(null);
  const [scannerResult, setScannerResult] = useState<MrzFrameResult | null>(null);
  const [mrzResult, setMrzResult] = useState<MrzResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const resetScannerState = () => {
    setMrzResult(null);
    mrzResultRef.current = null;
    setRealtimeResult(null);
    realtimeResultRef.current = null;
    setScannerResult(null);
    setImage(null);
    setVerifyUri(null);
    verifyUriRef.current = null;
    setIsCapturing(false);
    isCapturingRef.current = false;
    setIsVerifying(false);
    isVerifyingRef.current = false;
    setExecCountdown(null);
    if (autoCaptureTimer.current) {
      clearTimeout(autoCaptureTimer.current);
      autoCaptureTimer.current = null;
    }
  };

  // Verification flow states
  const [verifyUri, setVerifyUri] = useState<string | null>(null);
  const verifyUriRef = useRef<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const isVerifyingRef = useRef(false);

  const mrzResultRef = useRef<MrzResult | null>(null);
  const isScanningRef = useRef(false);
  const isCapturingRef = useRef(false);

  // Camera permissions and device
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const [realtimeResult, setRealtimeResult] = useState<MrzFrameResult | null>(null);
  const realtimeResultRef = useRef<MrzFrameResult | null>(null);

  const autoCaptureTimer = useRef<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [execCountdown, setExecCountdown] = useState<number | null>(null);

  const setRealtimePointsJS = useRunOnJS((result: MrzFrameResult | null) => {
    if (isScanningRef.current || isVerifyingRef.current || verifyUriRef.current || mrzResultRef.current || isCapturingRef.current) return;

    realtimeResultRef.current = result;

    if (result?.isLocked && !autoCaptureTimer.current) {
      isCapturingRef.current = true;
      setIsCapturing(true);

      autoCaptureTimer.current = setTimeout(() => {
        handleCaptureVerify();
        autoCaptureTimer.current = null;
      }, 1500);
    }
  }, []);

  useEffect(() => {
    if (verifyUri) {
      setExecCountdown(1);
      const timer = setInterval(() => {
        setExecCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            executeOcrOnVerify();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setExecCountdown(null);
    }
  }, [verifyUri]);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const result = scanMrzFrame(frame);
    setRealtimePointsJS(result as any);
  }, []);

  const scanMrz = async (uri: string) => {
    setIsScanning(true);
    isScanningRef.current = true;
    setMrzResult(null);
    mrzResultRef.current = null;
    try {
      const res = await MrzScanner.scanFromUri(uri);
      console.log('MRZ result:', JSON.stringify(res));
      setRealtimeResult(null);
      realtimeResultRef.current = null;
      setMrzResult(res);
      mrzResultRef.current = res;
      if (res.error) {
        Alert.alert('Scan Result', res.error);
      }
    } catch (error) {
      console.error('MRZ error:', error);
      Alert.alert('MRZ Error', 'An error occurred during MRZ extraction.');
    } finally {
      setIsScanning(false);
      isScanningRef.current = false;
    }
  };

  const originalPhotoUriRef = useRef<string | null>(null);
  const capturedPointsRef = useRef<any | null>(null);

  const handleCaptureVerify = async () => {
    const currentResult = realtimeResultRef.current;
    if (!camera.current || !currentResult?.points) {
      setIsCapturing(false);
      isCapturingRef.current = false;
      return;
    }

    setIsVerifying(true);
    isVerifyingRef.current = true;
    try {
      // 1. Take high-res photo
      const photo = await camera.current.takePhoto({
        flash: 'off',
        enableShutterSound: false
      });
      const photoUri = 'file://' + photo.path;
      originalPhotoUriRef.current = photoUri; // Store original for OCR

      // 2. Show the captured raw photo for confirmation
      capturedPointsRef.current = currentResult.points;
      // We no longer crop out edges; the full uncropped image is the standard
      setVerifyUri(photoUri);
      verifyUriRef.current = photoUri;
    } catch (error) {
      console.error('Verify error:', error);
      Alert.alert('Verify Error', 'Failed to generate preprocessing preview.');
    } finally {
      setIsVerifying(false);
      isVerifyingRef.current = false;
      setIsCapturing(false);
      isCapturingRef.current = false;
    }
  };

  const executeOcrOnVerify = async () => {
    const pointsToUse = capturedPointsRef.current;
    const originalUri = originalPhotoUriRef.current;
    if (!originalUri || !pointsToUse) {
      setVerifyUri(null);
      verifyUriRef.current = null;
      return;
    }

    setVerifyUri(null);
    await scanMrz(originalUri);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      resetScannerState();
      setImage(uri);
      Image.getSize(uri, async (width, height) => {
        setImageSize({ width, height });
        // Instead of boundary detection, auto-trigger text-first OCR natively on the static image
        scanMrz(uri);
      });
    }
  };



  const renderRealtimeContent = () => {
    if (!hasPermission) {
      return (
        <View style={styles.center}>
          <Text style={styles.text}>Camera permission is required.</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!device) {
      return (
        <View style={styles.center}>
          <Text style={styles.text}>No camera device found.</Text>
        </View>
      );
    }

    return (
      <View
        style={StyleSheet.absoluteFill}
      >
        <MrzCameraPreview
          cameraRef={camera}
          device={device}
          isActive={mode === 'realtime'}
          frameProcessor={frameProcessor}
        />
        <View style={styles.cameraControls}>
          {isCapturing && (
            <View style={styles.countdownContainer}>
              <ActivityIndicator size="large" color="#4CD964" />
              <Text style={styles.countdownText}>Capturing in 1s... Hold Still</Text>
            </View>
          )}
          {realtimeResult?.isLocked && !isCapturing && (
            <TouchableOpacity
              style={[styles.button, styles.captureButton, isVerifying && styles.disabledButton]}
              onPress={handleCaptureVerify}
              disabled={isVerifying}
            >
              <Text style={styles.buttonText}>
                {isVerifying ? 'Processing...' : 'Capture & Verify'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, { marginTop: 15, backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={() => { resetScannerState(); setMode('static'); }}
          >
            <Text style={styles.buttonText}>Switch to Static Mode</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={!!verifyUri} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.verifyModal}>
              <Text style={styles.modalTitle}>Document Captured</Text>
              <Text style={styles.modalSubtitle}>Processing the full high-resolution image...</Text>

              {verifyUri && (
                <View style={styles.previewWrapper}>
                  <Image
                    source={{ uri: verifyUri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                  {execCountdown !== null && (
                    <View style={styles.modalCountdownOverlay}>
                      <Text style={styles.modalCountdownText}>Executing OCR in {execCountdown}s...</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.button, { backgroundColor: '#FF3B30' }]} onPress={() => setVerifyUri(null)}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, { backgroundColor: '#4CD964' }]} onPress={executeOcrOnVerify}>
                  <Text style={styles.buttonText}>Execute OCR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {(mrzResult || realtimeResult?.mrz) && (
          <MrzResultCard
            result={mrzResult || realtimeResult!.mrz!}
            onClose={() => { resetScannerState(); setMode('static'); }}
            onRetry={() => { resetScannerState(); setMode('realtime'); }}
          />
        )}
      </View>
    );
  };



  const renderStaticContent = () => (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Passport Scanner</Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Pick Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#34C759' }]} onPress={() => { resetScannerState(); setMode('realtime'); }}>
          <Text style={styles.buttonText}>Real-time Mode</Text>
        </TouchableOpacity>
      </View>

      {image && (
        <View style={[styles.imageContainer, { height: (imageSize.height / imageSize.width) * SCREEN_WIDTH }]}>
          <Image
            source={{ uri: image }}
            style={[styles.image, { height: (imageSize.height / imageSize.width) * SCREEN_WIDTH }]}
            resizeMode="stretch"
          />
          <MrzOverlay
            result={scannerResult}
            targetWidth={SCREEN_WIDTH}
            targetHeight={(imageSize.height / imageSize.width) * SCREEN_WIDTH}
          />
        </View>
      )}

      {image && !mrzResult && (
        <TouchableOpacity
          style={[styles.button, { marginTop: 20, backgroundColor: '#FF9500' }, isScanning && styles.disabledButton]}
          onPress={() => scanMrz(image)}
          disabled={isScanning}
        >
          <Text style={styles.buttonText}>{isScanning ? 'Scanning...' : 'Detect MRZ From This Image'}</Text>
        </TouchableOpacity>
      )}

      {mrzResult && (
        <MrzResultCard
          result={mrzResult}
          onClose={() => { resetScannerState(); setMode('static'); }}
          onRetry={() => { resetScannerState(); setMode('realtime'); }}
        />
      )}

      {scannerResult && !mrzResult && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>MRZ Text Block Detection:</Text>
          <Text style={styles.resultText}>Visible: True</Text>
        </View>
      )}
    </ScrollView>
  );

  return mode === 'realtime' ? renderRealtimeContent() : renderStaticContent();
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 30,
    color: '#1a1a1a',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  captureButton: {
    backgroundColor: '#FF3B30',
    width: 200,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    backgroundColor: '#e9ecef',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: SCREEN_WIDTH,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  results: {
    marginTop: 24,
    width: '90%',
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  resultText: {
    fontSize: 15,
    color: '#495057',
    marginBottom: 6,
  },

  text: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 20,
    textAlign: 'center',
  },
  countdownContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  countdownText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  previewWrapper: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  modalCountdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCountdownText: {
    color: '#4CD964',
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyModal: {
    width: '95%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#000',
    marginBottom: 25,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
    justifyContent: 'center',
  }
});

export default App;