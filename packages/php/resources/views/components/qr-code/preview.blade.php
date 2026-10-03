{{-- Internal: the SVG, download buttons and error line shared by qr-code and qr-code.generator. Reads the surrounding nqQrCode / nqQrGenerator scope. --}}
@props(['size' => 192, 'bg' => 'white', 'value' => '', 'label' => null, 'downloadable' => false])
@php $fill = $size === 'fill'; @endphp
<svg data-slot="qr-code-svg" role="img"
    @unless ($fill) width="{{ $size }}" height="{{ $size }}" @endunless
    x-bind:aria-label="name" x-bind:viewBox="viewBox" x-bind:shape-rendering="shape" x-bind:style="{ background: bg }"
    style="background: {{ $bg }}"
    class="{{ \Nasaq\Cn::merge('aspect-square rounded-control border border-border', $fill ? 'w-full' : '') }}">
    <path x-bind:d="layout.modules" x-bind:fill="fg" />
    <g x-bind:fill="eyeFg ?? fg">
        <path x-bind:d="layout.eyes[0].ring" fill-rule="evenodd" />
        <path x-bind:d="layout.eyes[0].pupil" />
    </g>
    <g x-bind:fill="eyeFg ?? fg">
        <path x-bind:d="layout.eyes[1].ring" fill-rule="evenodd" />
        <path x-bind:d="layout.eyes[1].pupil" />
    </g>
    <g x-bind:fill="eyeFg ?? fg">
        <path x-bind:d="layout.eyes[2].ring" fill-rule="evenodd" />
        <path x-bind:d="layout.eyes[2].pupil" />
    </g>
    <image x-show="layout.logo" style="display: none" x-bind:href="layout.logo?.src" x-bind:x="layout.logo?.x" x-bind:y="layout.logo?.y"
        x-bind:width="layout.logo?.size" x-bind:height="layout.logo?.size" preserveAspectRatio="xMidYMid meet" />
</svg>
@if ($downloadable)
    <div class="flex flex-wrap items-center justify-center gap-2" dir="inherit" data-slot="qr-code-actions">
        <x-nq::button type="button" size="sm" x-on:click="save('svg')"><x-lucide-download aria-hidden="true" />{{ \Nasaq\Nasaq::t('Download SVG', 'تنزيل SVG') }}</x-nq::button>
        <x-nq::button type="button" size="sm" x-on:click="save('png')"><x-lucide-download aria-hidden="true" />{{ \Nasaq\Nasaq::t('Download PNG', 'تنزيل PNG') }}</x-nq::button>
    </div>
@endif
<p x-show="error" style="display: none" role="alert" class="text-caption text-nq-danger-text">{{ \Nasaq\Nasaq::t('Could not create the file. Try again.', 'تعذر إنشاء الملف. حاول مرة أخرى.') }}</p>
