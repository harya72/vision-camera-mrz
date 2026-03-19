import React from 'react';
import { StyleSheet } from 'react-native';
import { Camera, CameraDevice } from 'react-native-vision-camera';

interface MrzCameraPreviewProps {
  cameraRef: React.RefObject<Camera | null>;
  device: CameraDevice;
  isActive: boolean;
  frameProcessor: any;
}

export const MrzCameraPreview: React.FC<MrzCameraPreviewProps> = ({
  cameraRef,
  device,
  isActive,
  frameProcessor
}) => {
  return (
    <Camera
      ref={cameraRef}
      style={[StyleSheet.absoluteFill]}
      device={device}
      isActive={isActive}
      frameProcessor={frameProcessor}
      enableFpsGraph
      resizeMode='contain'
      pixelFormat="yuv"
      photo={true}
    />
  );
};
