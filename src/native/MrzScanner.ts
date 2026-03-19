import { NativeModules } from 'react-native';

const { MrzScanner } = NativeModules;

export interface MrzResult {
  documentType?: string;
  issuingCountry?: string;
  surname?: string;
  givenNames?: string;
  documentNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  sex?: string;
  dateOfExpiry?: string;
  mrzFormat?: string;
  error?: string;
  rawText?: string;
  partialExtraction?: boolean;
}

export interface MrzScannerInterface {
  scanFromUri(uri: string): Promise<MrzResult>;
}

export default MrzScanner as MrzScannerInterface;
