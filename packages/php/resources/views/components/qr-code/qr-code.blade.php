{{-- <x-nq::qr-code value="https://nasaq.fadymondy.com" downloadable download-name="my-link" />
     A styled QR code drawn as one SVG, left-to-right in Arabic too. The code is drawn in the browser (Alpine runtime + `uqr`), so
     it is also live: x-model / wire:model on `value` redraws it.
     module-style: square | dots | rounded   eye-style: square | rounded | circle   ecc: L | M | Q | H ("H" is forced with a logo)
     margin: quiet zone in modules (4)   fg / bg / eye-fg: any CSS colour or token, e.g. "var(--nq-brand)"   logo: image URL or data: URI
     size: px, or "fill"   label: accessible name   downloadable: Download SVG + PNG buttons   png-size: 1024 --}}
@props([
    'value' => '', 'moduleStyle' => 'square', 'eyeStyle' => 'square', 'ecc' => 'M', 'margin' => 4,
    'fg' => 'black', 'bg' => 'white', 'eyeFg' => null, 'logo' => null, 'size' => 192, 'label' => null,
    'downloadable' => false, 'downloadName' => 'qr-code', 'pngSize' => 1024,
])
<div data-slot="qr-code" data-module-style="{{ $moduleStyle }}" data-eye-style="{{ $eyeStyle }}" dir="ltr"
    x-data="nqQrCode(@js(['value' => $value, 'moduleStyle' => $moduleStyle, 'eyeStyle' => $eyeStyle, 'ecc' => $ecc, 'margin' => $margin, 'fg' => $fg, 'bg' => $bg, 'eyeFg' => $eyeFg, 'logo' => $logo, 'size' => $size, 'pngSize' => $pngSize, 'downloadName' => $downloadName, 'label' => $label, 'labelFor' => \Nasaq\Nasaq::t('QR code for {value}', 'رمز QR لـ {value}')]))"
    x-modelable="value"
    {{ $attributes->cn(['inline-flex flex-col items-center gap-3', 'flex w-full' => $size === 'fill']) }}>
    <x-nq::qr-code.preview :size="$size" :bg="$bg" :value="$value" :label="$label" :downloadable="$downloadable" />
</div>
