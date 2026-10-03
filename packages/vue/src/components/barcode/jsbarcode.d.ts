// Minimal types for `jsbarcode` (the package ships its own, but it is not in packages/vue's dependencies yet).
declare module "jsbarcode" {
  interface JsBarcodeOptions {
    format?: string;
    displayValue?: boolean;
    height?: number;
    width?: number;
    margin?: number;
    lineColor?: string;
    background?: string;
    fontSize?: number;
    font?: string;
    valid?: (valid: boolean) => void;
  }
  const JsBarcode: (element: SVGElement, value: string, options?: JsBarcodeOptions) => void;
  export default JsBarcode;
}
