export const BARCODE_DETECTOR_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "qr_code",
] as const;

export type BarcodeDetectorFormat = (typeof BARCODE_DETECTOR_FORMATS)[number];
