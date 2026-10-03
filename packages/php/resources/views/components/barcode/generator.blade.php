{{-- <x-nq::barcode.generator default-value="NSQ-2026-0042" download-name="sku" />
     The barcode generator: type a value, pick a format, see the barcode, download it as SVG or PNG. Changing the format moves to that
     format's example when the current value cannot work. Needs the Alpine runtime. --}}
@props(['defaultValue' => 'NSQ-2026-0042', 'defaultFormat' => 'CODE128', 'downloadName' => 'barcode'])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $formats = ['CODE128' => 'Code 128', 'EAN13' => 'EAN-13', 'EAN8' => 'EAN-8', 'UPC' => 'UPC-A', 'CODE39' => 'Code 39', 'ITF14' => 'ITF-14', 'ITF' => 'Interleaved 2 of 5', 'codabar' => 'Codabar', 'pharmacode' => 'Pharmacode'];
@endphp
<x-nq::card data-slot="barcode-generator"
    x-data="nqBarcodeGenerator(@js(['value' => $defaultValue, 'format' => $defaultFormat, 'downloadName' => $downloadName]))"
    x-init="$watch('format', (f) => setFormat(f))"
    {{ $attributes->cn('w-full max-w-2xl') }}>
    <x-nq::card.header>
        <x-nq::card.title>{{ $t('Barcode generator', 'مولّد الباركود') }}</x-nq::card.title>
        <x-nq::card.description>{{ $t('Type a value, pick a format, download it as SVG or PNG.', 'اكتب قيمة واختر الصيغة ونزّلها بصيغة SVG أو PNG.') }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-5">
        <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <x-nq::field>
                <x-nq::field.label>{{ $t('Value', 'القيمة') }}</x-nq::field.label>
                <x-nq::field.input ltr spellcheck="false" autocomplete="off" value="{{ $defaultValue }}" x-model="value" />
                <x-nq::field.description><span x-text="hint">&nbsp;</span></x-nq::field.description>
            </x-nq::field>
            <x-nq::field>
                <x-nq::field.label>{{ $t('Format', 'الصيغة') }}</x-nq::field.label>
                <x-nq::select :value="$defaultFormat" x-model="format">
                    <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                    <x-nq::select.content>
                        @foreach ($formats as $v => $l)<x-nq::select.item :value="$v">{{ $l }}</x-nq::select.item>@endforeach
                    </x-nq::select.content>
                </x-nq::select>
            </x-nq::field>
        </div>
        <div class="flex justify-center">
            <div data-slot="barcode" dir="ltr" class="inline-flex max-w-full flex-col items-center gap-3">
                <x-nq::barcode.preview downloadable />
            </div>
        </div>
    </x-nq::card.content>
</x-nq::card>
