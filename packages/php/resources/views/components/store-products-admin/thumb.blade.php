{{-- Internal: a product picture that falls back to a placeholder icon. src is an Alpine expression; the host component needs the thumbs helper (imgOk, broken).
     <x-nq::store-products-admin.thumb src="p.images[0]?.src" :size="40" /> --}}
@props(['src', 'size' => 40])
<span data-slot="product-thumb" style="width: {{ (int) $size }}px; height: {{ (int) $size }}px"
    {{ $attributes->cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary text-muted-foreground') }}>
    <img alt="" x-show="imgOk({{ $src }})" x-bind:src="{{ $src }}" x-on:error="broken[{{ $src }}] = true" class="size-full object-cover" />
    <x-lucide-image aria-hidden="true" x-show="! imgOk({{ $src }})" class="size-1/2" />
</span>
