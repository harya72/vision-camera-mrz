import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { MrzFrameResult } from '../types';

interface MrzOverlayProps {
  result: MrzFrameResult | null;
  targetWidth: number;
  targetHeight: number;
}

export const MrzOverlay: React.FC<MrzOverlayProps> = ({ result, targetWidth, targetHeight }) => {
  if (!result || targetWidth === 0) return null;

  const { points } = result;

  // Calculate dimensions to match "Cover" behavior
  const viewAspectRatio = targetWidth / targetHeight;
  const imageAspectRatio = targetWidth / targetHeight; // In Text-First, images map 1:1 with preview

  let offsetX = 0;
  let offsetY = 0;
  let scaledImgWidth = targetWidth;
  let scaledImgHeight = targetHeight;

  if (imageAspectRatio > viewAspectRatio) {
    // Image is wider than view (cropped horizontally)
    scaledImgHeight = targetHeight;
    scaledImgWidth = targetWidth * (targetHeight / targetHeight);
    offsetX = (targetWidth - scaledImgWidth) / 2;
  } else {
    // Image is taller than view (cropped vertically)
    scaledImgWidth = targetWidth;
    scaledImgHeight = targetHeight * (targetWidth / targetWidth);
    offsetY = (targetHeight - scaledImgHeight) / 2;
  }

  if (!points) return null;

  const ptsArray = [points.topLeft, points.topRight, points.bottomRight, points.bottomLeft];

  const scaledPoints = ptsArray.map(p =>
    `${p.x * scaledImgWidth + offsetX},${p.y * scaledImgHeight + offsetY}`
  ).join(' ');

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none', zIndex: 10 }]}>
      <Svg height={targetHeight} width={targetWidth}>
        <Polygon
          points={scaledPoints}
          fill={result.isLocked ? "rgba(76, 217, 100, 0.4)" : "rgba(255, 149, 0, 0.4)"}
          stroke={result.isLocked ? "#4CD964" : "#FF9500"}
          strokeWidth="4"
        />
      </Svg>
    </View>
  );
};
