{{-- <x-nq::app-shell.sidebar-brand /> <x-nq::app-shell.sidebar-brand brand="mahaam" href="/"> <x-slot:logo>...</x-slot:logo> <x-slot:mark>...</x-slot:mark> </x-nq::app-shell.sidebar-brand>
     The product logo at the top of the sidebar, usually a link home. Put it first in sidebar-header. Expanded it shows the mark and the name; collapsed, the mark alone, with the name in a tooltip.
     brand: the brand key (default: config nasaq.brand). label: the link's name while only the mark shows, and its tooltip (default: the brand key, capitalised). href: default /. logo / mark slots replace what shows. --}}
@props(['brand' => null, 'label' => null, 'href' => '/', 'logo' => null, 'mark' => null])
@php
    $key = $brand ?: (config('nasaq.brand') ?: 'nasaq');
    $name = $label ?? ucfirst($key);
@endphp
<x-nq::app-shell.rail-tip :name="$name">
    <a data-slot="sidebar-brand" href="{{ $href }}" x-bind:aria-label="(rail && collapsed) ? @js($name) : null"
        {{ $attributes->cn([
            'flex h-control shrink-0 items-center gap-2 rounded-control px-2 outline-none',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
            'group-data-collapsed/sidebar:size-control group-data-collapsed/sidebar:justify-center group-data-collapsed/sidebar:px-0',
        ]) }}>
        <span class="contents group-data-collapsed/sidebar:hidden">
            @if ($logo !== null && ! $logo->isEmpty()){{ $logo }}@else<x-nq::product-mark.logo :brand="$brand" :size="20" />@endif
        </span>
        <span class="hidden group-data-collapsed/sidebar:contents">
            @if ($mark !== null && ! $mark->isEmpty()){{ $mark }}@else<x-nq::product-mark :brand="$brand" :size="20" title="" />@endif
        </span>
    </a>
</x-nq::app-shell.rail-tip>
