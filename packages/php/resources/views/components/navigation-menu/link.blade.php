{{-- <x-nq::navigation-menu.link href="/pricing" :active="true">Pricing</x-nq::navigation-menu.link>   a top-level link in the bar. --}}
@props(['href' => '#', 'active' => false])
<a data-slot="navigation-menu-link" href="{{ $href }}" @if ($active) data-active aria-current="page" @endif
    {{ $attributes->cn([
        'inline-flex h-control min-h-[var(--nq-touch-min,0px)] select-none items-center justify-center gap-1.5 rounded-control px-3 text-label text-foreground no-underline outline-none',
        'transition-colors duration-150 ease-nq hover:bg-nq-hover data-popup-open:bg-nq-selected data-pressed:bg-nq-selected',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
        'data-active:bg-nq-selected',
    ]) }}>{{ $slot }}</a>
