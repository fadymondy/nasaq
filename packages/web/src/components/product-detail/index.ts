export * from "./product-detail";
export * from "./product-gallery";
export * from "./quantity-stepper";
export * from "./size-guide";
export * from "./variant-picker";
export type { ProductDetailLabels } from "./pdp-strings";
export {
  autoSelectSingle,
  clampPurchaseQuantity,
  deliveryWindow,
  displayPrice,
  galleryIndexForImage,
  imageForSelection,
  initialSelection,
  maxPurchasable,
  missingOptions,
  resolveSwipe,
  selectionLabel,
  selectOptionValue,
  stepIndex,
  stockState,
  zoomOrigin,
  type DeliveryWindow,
  type DisplayPrice,
  type StockState,
  type SwipeResult,
} from "./pdp-logic";
