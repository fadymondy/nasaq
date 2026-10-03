{{-- <x-nq::brand-guidelines.asset-card :asset="['id' => 'mark', 'name' => 'Mark', 'format' => 'SVG', 'href' => $uri, 'filename' => 'mark.svg', 'ground' => 'light']" brand="nasaq" />
     One downloadable file on a light or dark ground, with the file type and a download link.
     asset: ['id', 'name', 'format', 'href', 'filename', 'ground'? light|dark, 'description'?]. brand: the mark drawn in the tile. The default slot replaces the mark. --}}
@props(['asset', 'brand' => null])
@php
    $dark = ($asset['ground'] ?? 'light') === 'dark';
    $download = str_replace('{name}', $asset['name'], \Nasaq\Nasaq::t('Download {name}', 'تنزيل {name}'));
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'brand-asset-card') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground overflow-hidden') }}>
    <div data-theme="{{ $dark ? 'dark' : 'light' }}" class="flex aspect-[16/10] items-center justify-center border-b border-border bg-background p-6">
        @if (trim((string) $slot) !== ''){{ $slot }}@else<x-nq::product-mark :brand="$brand" :size="72" :on-dark="$dark" title="" />@endif
    </div>
    <div class="flex items-center justify-between gap-3 p-3">
        <div class="flex min-w-0 flex-col gap-0.5">
            <span class="flex items-center gap-2 text-label text-foreground">
                <x-nq::text-utilities.user-text class="truncate">{{ $asset['name'] }}</x-nq::text-utilities.user-text>
                <x-nq::badge variant="outline">{{ $asset['format'] }}</x-nq::badge>
            </span>
            @if (! empty($asset['description']))<span class="text-caption text-muted-foreground">{{ $asset['description'] }}</span>@endif
        </div>
        <x-nq::button variant="secondary" size="sm" :href="$asset['href']" :download="$asset['filename']" :aria-label="$download">
            <x-nq::icon name="download" aria-hidden="true" />
            {{ \Nasaq\Nasaq::t('Download', 'تنزيل') }}
        </x-nq::button>
    </div>
</div>
