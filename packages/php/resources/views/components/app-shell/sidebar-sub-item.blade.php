{{-- <x-nq::app-shell.sidebar-sub-item href="/projects/web" :active="true">Website</x-nq::app-shell.sidebar-sub-item>   A child link inside sidebar-nest. --}}
@props(['active' => false])
<a data-slot="sidebar-sub-item" @if ($active) aria-current="page" @endif {{ $attributes->cn([
    'flex h-[calc(var(--spacing-nav-row)-4px)] min-h-[var(--nq-touch-min,0px)] items-center truncate rounded-control px-2 text-body-sm text-muted-foreground',
    'transition-colors duration-150 ease-nq outline-none hover:bg-nq-hover hover:text-foreground',
    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
    'bg-nq-selected font-medium text-foreground' => $active,
]) }}>{{ $slot }}</a>
