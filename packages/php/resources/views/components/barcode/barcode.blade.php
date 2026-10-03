{{-- <x-nq::barcode value="NSQ-2026-0042" format="CODE128" downloadable download-name="sku" />
     A barcode drawn as SVG by jsbarcode, left-to-right in Arabic too. Drawn in the browser (Alpine runtime; jsbarcode loads from a CDN
     on first use, or set window.JsBarcode first), so x-model / wire:model on `value` redraws it.
     format: CODE128 | EAN13 | EAN8 | UPC | CODE39 | ITF14 | ITF | codabar | pharmacode   A value the format cannot encode shows the reason.
     show-value: print the value under the bars (true)   height: 80   bar-width: 2   margin: 10   fg / bg: any CSS colour or token
     downloadable: Download SVG + PNG buttons   download-name: "barcode"   png-size: 1200   jsbarcode-src: override the CDN URL --}}
@props([
    'value' => '', 'format' => 'CODE128', 'showValue' => true, 'height' => 80, 'barWidth' => 2, 'margin' => 10,
    'fg' => 'black', 'bg' => 'white', 'downloadable' => false, 'downloadName' => 'barcode', 'pngSize' => 1200, 'jsbarcodeSrc' => null,
])
<div data-slot="barcode" data-format="{{ $format }}" dir="ltr"
    x-data="nqBarcode(@js(['value' => $value, 'format' => $format, 'showValue' => (bool) $showValue, 'height' => $height, 'barWidth' => $barWidth, 'margin' => $margin, 'fg' => $fg, 'bg' => $bg, 'pngSize' => $pngSize, 'downloadName' => $downloadName, 'jsbarcodeSrc' => $jsbarcodeSrc]))"
    x-modelable="value"
    x-bind:data-invalid="message ? '' : null"
    {{ $attributes->cn('inline-flex max-w-full flex-col items-center gap-3') }}>
    <x-nq::barcode.preview :bg="$bg" :downloadable="$downloadable" />
</div>
