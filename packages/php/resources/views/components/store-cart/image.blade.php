{{-- <x-nq::store-cart.image src="/tee.jpg" alt="Everyday cotton tee" :size="88" />
     A product picture on a square, with a placeholder (an image-off icon) when there is no source or it fails to load. data-state is "image" or "placeholder".
     size: pixels (default 88). fluid: fill the parent instead. loading: lazy (default) | eager.
     In a cart line the source comes from the line: src-expr="line.image" alt-expr="line.name" (Alpine expressions). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['src' => null, 'alt' => null, 'size' => 88, 'fluid' => false, 'loading' => 'lazy', 'srcExpr' => null, 'altExpr' => null])
@php
    $srcJs = $srcExpr ?? ($src ? \Illuminate\Support\Js::from((string) $src)->toHtml() : 'null');
    $altJs = $altExpr ?? \Illuminate\Support\Js::from((string) ($alt ?? ''))->toHtml();
    $has = $srcExpr !== null ? false : filled($src);
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'store-image') }}" data-state="{{ $has ? 'image' : 'placeholder' }}" x-data="{ failed: false }"
    x-effect="void ({{ $srcJs }}); failed = false" x-bind:data-state="!!({{ $srcJs }}) &amp;&amp; !failed ? 'image' : 'placeholder'"
    @unless ($fluid) style="width: {{ (int) $size }}px; height: {{ (int) $size }}px" @endunless
    {{ $attributes->except('data-slot')->cn([
        'size-full' => $fluid,
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary text-muted-foreground',
    ]) }}>
    <img @if ($has) src="{{ $src }}" alt="{{ $alt }}" @else style="display: none" @endif width="{{ (int) $size }}" height="{{ (int) $size }}" loading="{{ $loading }}" decoding="async"
        x-show="!!({{ $srcJs }}) &amp;&amp; !failed" x-bind:src="{{ $srcJs }}" x-bind:alt="{{ $altJs }}" x-on:error="failed = true" class="size-full object-cover">
    <span @if ($has) style="display: none" @endif @if ($alt && ! $srcExpr) role="img" aria-label="{{ $alt }}" @endif x-show="!({{ $srcJs }}) || failed"
        @if ($srcExpr) x-bind:role="{{ $altJs }} ? 'img' : null" x-bind:aria-label="{{ $altJs }} || null" @endif class="inline-flex items-center justify-center">
        <x-lucide-image-off aria-hidden="true" class="size-1/3 min-h-4 min-w-4" />
    </span>
</span>
