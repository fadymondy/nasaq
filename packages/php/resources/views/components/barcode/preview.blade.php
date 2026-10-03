{{-- Internal: the problem line, the SVG, download buttons and error line shared by barcode and barcode.generator. Reads the surrounding nqBarcode / nqBarcodeGenerator scope. --}}
@props(['bg' => 'white', 'downloadable' => false])
<p x-show="message" style="display: none" role="alert" dir="auto" x-text="message"
    class="rounded-control border border-dashed border-border px-4 py-6 text-center text-body-sm text-nq-danger-text"></p>
<svg data-slot="barcode-svg" role="img" x-show="!message" x-bind:aria-label="name" x-bind:style="{ background: bg }" style="background: {{ $bg }}"
    class="h-auto max-w-full rounded-control border border-border"></svg>
@if ($downloadable)
    <div x-show="!message" class="flex flex-wrap items-center justify-center gap-2" dir="inherit" data-slot="barcode-actions">
        <x-nq::button type="button" size="sm" x-on:click="save('svg')"><x-lucide-download aria-hidden="true" />{{ \Nasaq\Nasaq::t('Download SVG', 'تنزيل SVG') }}</x-nq::button>
        <x-nq::button type="button" size="sm" x-on:click="save('png')"><x-lucide-download aria-hidden="true" />{{ \Nasaq\Nasaq::t('Download PNG', 'تنزيل PNG') }}</x-nq::button>
    </div>
@endif
<p x-show="error" style="display: none" role="alert" class="text-caption text-nq-danger-text">{{ \Nasaq\Nasaq::t('Could not create the file. Try again.', 'تعذر إنشاء الملف. حاول مرة أخرى.') }}</p>
