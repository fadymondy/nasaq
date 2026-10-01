{{-- <x-nq::button variant="primary" size="sm">Save</x-nq::button>
     variant: primary | secondary | ghost | danger | link   size: sm | md | lg | icon | icon-sm
     href renders an <a>. loading shows a spinner, sets aria-busy and blocks clicks. --}}
@props(['variant' => 'secondary', 'size' => 'md', 'href' => null, 'type' => 'button', 'loading' => false, 'disabled' => false])
@php
    $variants = [
        'primary' => 'bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--nq-action)_88%,var(--nq-fg))]',
        'secondary' => 'border-border bg-card text-foreground hover:bg-nq-hover',
        'ghost' => 'text-foreground hover:bg-nq-hover',
        'danger' => 'bg-destructive text-destructive-foreground hover:bg-[color-mix(in_oklab,var(--nq-danger-solid)_88%,var(--nq-fg))]',
        'link' => 'text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current',
    ];
    $sizes = [
        'sm' => 'h-control-sm px-2.5',
        'md' => 'h-control px-[var(--nq-control-pad)]',
        'lg' => 'h-[calc(var(--nq-control)+8px)] px-5 text-body',
        'icon' => 'size-control p-0',
        'icon-sm' => 'size-control-sm p-0',
    ];
    $iconOnly = in_array($size, ['icon', 'icon-sm'], true);
    $classes = [
        'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent',
        'font-sans text-label transition-colors duration-150 ease-nq',
        'min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        'disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
        $variants[$variant] ?? $variants['secondary'],
        $sizes[$size] ?? $sizes['md'],
        'h-auto px-0' => $variant === 'link' && ! $iconOnly,
    ];
    $tag = $href ? 'a' : 'button';
@endphp
<{{ $tag }} data-slot="{{ $attributes->get('data-slot', 'button') }}"
    @if ($href) href="{{ $href }}" @else type="{{ $type }}" @endif
    @if ($loading) aria-busy="true" @endif
    @if ($href && ($disabled || $loading)) aria-disabled="true" tabindex="-1" @endif
    @if (! $href && ($disabled || $loading)) disabled @endif
    @if ($disabled || $loading) data-disabled @endif
    {{ $attributes->except('data-slot')->cn($classes) }}>
    @if ($loading)<x-nq::spinner />@endif
    @unless ($loading && $iconOnly){{ $slot }}@endunless
</{{ $tag }}>
