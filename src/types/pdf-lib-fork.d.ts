export {};

declare module "pdf-lib" {
  interface PDFDocument {
    setCustomMetadata(name: string, value: string): void;
    getCustomMetadata(name: string): string | undefined;
  }
}
