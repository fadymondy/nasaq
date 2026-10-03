{{-- <x-nq::navigation-menu.featured href="/launch"> any content </x-nq::navigation-menu.featured>   a highlighted card link next to the link list. --}}
@props(['href' => '#'])
<a data-slot="{{ $attributes->get('data-slot', 'navigation-menu-featured') }}" href="{{ $href }}"
    {{ $attributes->except('data-slot')->cn([
        'flex min-w-56 flex-col items-start justify-end gap-1.5 rounded-card border border-border bg-nq-surface-soft p-4 text-start no-underline outline-none transition-colors duration-150 ease-nq',
        'hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
    ]) }}>{{ $slot }}</a>
