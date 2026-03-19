import { VisionCameraProxy, Frame } from 'react-native-vision-camera';

const plugin = VisionCameraProxy.initFrameProcessorPlugin('scanMrzFrame', {});

if (plugin == null) {
  throw new Error('Failed to load scanMrzFrame plugin!');
}

export function scanMrzFrame(frame: Frame): any {
  'worklet';
  if (plugin == null) {
    throw new Error('Failed to load scanMrzFrame plugin!');
  }
  return plugin.call(frame);
}
