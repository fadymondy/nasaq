{{-- <x-nq::source-badge label="Postgres" icon="database" />
     <x-nq::source-badge label="Blog feed" icon="rss" color="var(--nq-accent-brand)" />
     <x-nq::source-badge compact label="Postgres" icon="database" />
     icon: a lucide icon name, or an <x-slot:icon> (a brand mark svg or img). color tints the icon only.
     compact: icon only, the label becomes the accessible name. size: sm | md. href: external link. --}}
@props(['label', 'icon' => null, 'color' => null, 'compact' => false, 'size' => 'sm', 'href' => null])
@php
    $classes = [
        'inline-flex shrink-0 items-center gap-1.5 rounded-control border border-border bg-secondary text-foreground',
        $size === 'sm' ? 'h-6 px-2 text-caption [&_svg]:size-3.5' : 'h-7 px-2.5 text-label [&_svg]:size-4',
        'w-6 justify-center px-0' => $compact && $size === 'sm',
        'w-7 justify-center px-0' => $compact && $size !== 'sm',
        'transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus' => (bool) $href,
    ];
    $tag = $href ? 'a' : 'span';
    $hasIcon = $icon instanceof \Illuminate\View\ComponentSlot ? ! $icon->isEmpty() : (bool) $icon;
@endphp
<{{ $tag }} data-slot="source-badge"
    @if ($href) href="{{ $href }}" target="_blank" rel="noopener noreferrer" @elseif ($compact) role="img" @endif
    @if ($compact) aria-label="{{ $label }}" title="{{ $label }}" @endif
    {{ $attributes->cn($classes) }}>
    @if ($hasIcon)
        <span data-slot="source-badge-icon" class="inline-flex items-center [&_img]:size-3.5" @if ($color) style="color: {{ $color }}" @endif>
            @if ($icon instanceof \Illuminate\View\ComponentSlot){{ $icon }}@else<x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />@endif
        </span>
    @endif
    @unless ($compact)<span class="truncate">{{ $label }}</span>@endunless
</{{ $tag }}>
