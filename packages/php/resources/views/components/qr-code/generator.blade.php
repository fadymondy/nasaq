{{-- <x-nq::qr-code.generator default-value="https://nasaq.fadymondy.com" download-name="my-link" />
     The QR generator: type the content, pick the module and corner style, colours and a centre logo, watch the code update,
     and download it as SVG or PNG. Same options as <x-nq::qr-code>, as starting values. Needs the Alpine runtime. --}}
@props([
    'defaultValue' => 'https://nasaq.fadymondy.com', 'defaultModuleStyle' => 'rounded', 'defaultEyeStyle' => 'rounded',
    'defaultFg' => 'black', 'defaultBg' => 'white', 'defaultLogo' => null, 'downloadName' => 'qr-code',
])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $styles = ['square' => $t('Squares', 'مربعات'), 'dots' => $t('Dots', 'نقاط'), 'rounded' => $t('Rounded', 'مستديرة')];
    $eyes = ['square' => $t('Square', 'مربعة'), 'rounded' => $t('Rounded', 'مستديرة الحواف'), 'circle' => $t('Circle', 'دائرية')];
    $levels = ['L' => $t('Low (7%)', 'منخفض (7%)'), 'M' => $t('Medium (15%)', 'متوسط (15%)'), 'Q' => $t('Quartile (25%)', 'ربعي (25%)'), 'H' => $t('High (30%)', 'عالٍ (30%)')];
    $colorClass = 'h-control w-14 cursor-pointer rounded-control border border-input bg-card p-1';
@endphp
<x-nq::card data-slot="qr-code-generator" x-id="['qr-gen']"
    x-data="nqQrGenerator(@js(['value' => $defaultValue, 'moduleStyle' => $defaultModuleStyle, 'eyeStyle' => $defaultEyeStyle, 'fg' => $defaultFg, 'bg' => $defaultBg, 'logo' => $defaultLogo, 'downloadName' => $downloadName, 'labelFor' => $t('QR code for {value}', 'رمز QR لـ {value}')]))"
    {{ $attributes->cn('w-full max-w-3xl') }}>
    <x-nq::card.header>
        <x-nq::card.title>{{ $t('QR code', 'رمز QR') }}</x-nq::card.title>
        <x-nq::card.description>{{ $t('A link, text or any string the code should hold.', 'رابط أو نص أو أي سلسلة تريد أن يحملها الرمز.') }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div class="flex flex-col gap-4">
            <x-nq::field>
                <x-nq::field.label>{{ $t('Content', 'المحتوى') }}</x-nq::field.label>
                <x-nq::field.textarea dir="auto" rows="3" x-model="value">{{ $defaultValue }}</x-nq::field.textarea>
            </x-nq::field>
            <div class="grid gap-4 sm:grid-cols-2">
                <x-nq::field>
                    <x-nq::field.label>{{ $t('Dots', 'شكل النقاط') }}</x-nq::field.label>
                    <x-nq::select :value="$defaultModuleStyle" x-model="moduleStyle">
                        <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($styles as $v => $l)<x-nq::select.item :value="$v">{{ $l }}</x-nq::select.item>@endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </x-nq::field>
                <x-nq::field>
                    <x-nq::field.label>{{ $t('Corners', 'شكل الزوايا') }}</x-nq::field.label>
                    <x-nq::select :value="$defaultEyeStyle" x-model="eyeStyle">
                        <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($eyes as $v => $l)<x-nq::select.item :value="$v">{{ $l }}</x-nq::select.item>@endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </x-nq::field>
                <x-nq::field>
                    <x-nq::field.label>{{ $t('Error correction', 'تصحيح الأخطاء') }}</x-nq::field.label>
                    <x-nq::select value="M" x-model="ecc">
                        <x-nq::select.trigger x-bind:disabled="logo !== null"><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($levels as $v => $l)<x-nq::select.item :value="$v">{{ $l }}</x-nq::select.item>@endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </x-nq::field>
                <div class="flex items-end gap-3">
                    <label class="flex flex-col gap-1.5 text-label text-foreground" x-bind:for="$id('qr-gen', 'fg')">
                        {{ $t('Foreground', 'لون الرمز') }}
                        <input x-bind:id="$id('qr-gen', 'fg')" type="color" value="#000000" x-bind:value="hex('fg')" x-on:input="fg = $event.target.value" class="{{ $colorClass }}">
                    </label>
                    <label class="flex flex-col gap-1.5 text-label text-foreground" x-bind:for="$id('qr-gen', 'bg')">
                        {{ $t('Background', 'لون الخلفية') }}
                        <input x-bind:id="$id('qr-gen', 'bg')" type="color" value="#ffffff" x-bind:value="hex('bg')" x-on:input="bg = $event.target.value" class="{{ $colorClass }}">
                    </label>
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <div class="flex flex-wrap items-center gap-2">
                    <input type="file" accept="image/*" class="sr-only" x-ref="file" x-on:change="pick($event)">
                    <x-nq::button type="button" size="sm" x-on:click="$refs.file.click()">
                        <x-lucide-image-up aria-hidden="true" />
                        <span x-text="logo ? @js($t('Centre logo', 'الشعار في المنتصف')) : @js($t('Add a logo', 'إضافة شعار'))">{{ $defaultLogo ? $t('Centre logo', 'الشعار في المنتصف') : $t('Add a logo', 'إضافة شعار') }}</span>
                    </x-nq::button>
                    <x-nq::button type="button" size="sm" variant="ghost" x-show="logo" style="display: none" x-on:click="removeLogo()">
                        <x-lucide-x aria-hidden="true" />{{ $t('Remove logo', 'إزالة الشعار') }}
                    </x-nq::button>
                </div>
                <p x-show="logo" style="display: none" class="text-caption text-muted-foreground">{{ $t('A logo raises error correction to the highest level so the code still scans.', 'الشعار يرفع تصحيح الأخطاء إلى أعلى مستوى ليبقى الرمز قابلًا للمسح.') }}</p>
            </div>
        </div>
        <div data-slot="qr-code" x-bind:data-module-style="moduleStyle" x-bind:data-eye-style="eyeStyle" data-module-style="{{ $defaultModuleStyle }}" data-eye-style="{{ $defaultEyeStyle }}" dir="ltr"
            class="inline-flex flex-col items-center gap-3 justify-self-center">
            <x-nq::qr-code.preview :size="224" :bg="$defaultBg" :value="$defaultValue" downloadable />
        </div>
    </x-nq::card.content>
</x-nq::card>
