type BarcodeDetectorOptions = {
  formats?: string[];
};

type DetectedBarcode = {
  rawValue: string;
  format: string;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: BarcodeDetectorOptions) => {
      detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
    };
  }
}

export {};
