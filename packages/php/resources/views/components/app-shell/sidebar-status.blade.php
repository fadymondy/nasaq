{{-- <x-nq::app-shell.sidebar-status href="/status" tone="success">All systems normal</x-nq::app-shell.sidebar-status>
     The service status line at the foot of the sidebar, usually a link to the status page. On the rail it is a dot with a tooltip.
     tone: success (default) | warning | danger | info. --}}
@props(['tone' => 'success'])
@php
    $name = trim(preg_replace('/\s+/', ' ', strip_tags((string) $slot))) ?: null;
    $dot = ['success' => 'bg-nq-success', 'warning' => 'bg-nq-warning', 'danger' => 'bg-nq-danger', 'info' => 'bg-nq-info'][$tone] ?? 'bg-nq-success';
@endphp
<x-nq::app-shell.rail-tip :name="$name">
    <a data-slot="{{ $attributes->get('data-slot', 'sidebar-status') }}" data-tone="{{ $tone }}" @if ($name) x-bind:aria-label="(rail && collapsed) ? @js($name) : null" @endif
        {{ $attributes->except('data-slot')->cn([
            'flex h-nav-row items-center gap-2 rounded-control px-2 text-caption text-muted-foreground outline-none',
            'transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
            'group-data-collapsed/sidebar:size-control group-data-collapsed/sidebar:justify-center group-data-collapsed/sidebar:px-0',
        ]) }}>
        <span aria-hidden="true" class="size-2 shrink-0 rounded-full {{ $dot }} {{ $tone !== 'success' ? 'animate-pulse motion-reduce:animate-none' : '' }}"></span>
        <span class="min-w-0 flex-1 truncate group-data-collapsed/sidebar:hidden">{{ $slot }}</span>
    </a>
</x-nq::app-shell.rail-tip>
