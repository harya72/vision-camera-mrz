import { MrzResult } from '../native/MrzScanner';

export interface MrzFrameResult {
  isLocked: boolean;
  points: { 
    topLeft: { x: number, y: number };
    topRight: { x: number, y: number };
    bottomRight: { x: number, y: number };
    bottomLeft: { x: number, y: number };
  };
  mrz?: MrzResult;
}
