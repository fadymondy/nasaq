/** Opacity-only transitions: the grid moves colour and light, never position. */
export const fade = "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0";

/** The × button shared by NqDialogContent and NqSheetContent. */
export const overlayCloseClass =
  "absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4";
