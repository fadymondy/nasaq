export { default as NqProductDetail } from "./NqProductDetail.vue";
export { default as NqProductGallery } from "./NqProductGallery.vue";
export { default as NqProductQuantityStepper } from "./NqProductQuantityStepper.vue";
export { default as NqProductSizeGuide } from "./NqProductSizeGuide.vue";
export { default as NqProductVariantPicker } from "./NqProductVariantPicker.vue";
export type {
  ProductActionResult,
  ProductBreadcrumb,
  ProductDeliveryCity,
  ProductDeliveryConfig,
  ProductSpec,
  ProductTrustBadge,
  ProductTrustIcon,
} from "./NqProductDetail.vue";
export type { ProductSizeGuideData } from "./NqProductSizeGuide.vue";
export type { ProductDetailLabels } from "./pdp-strings";
export type {
  CommerceDeliveryWindow,
  CommerceDisplayPrice,
  CommerceImage,
  CommerceOption,
  CommerceProductVisibility,
  CommerceProduct,
  CommerceSelection,
  CommerceStockState,
  CommerceVariant,
} from "./commerce";
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
