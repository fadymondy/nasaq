{{-- <x-nq::product-switcher.sidebar-products :products="[...]" current="mahaam"> <x-slot:action><x-nq::product-switcher :products="[...]" /></x-slot:action> </x-nq::product-switcher.sidebar-products>
     The sidebar's products group: official marks, the current product selected, badges at the end. Goes inside <x-nq::app-shell.sidebar-content>.
     products: see product-switcher. pinned-only: only pinned products (default true; all when none is pinned). order: ids, your order and choice (overrides pinned). label: the group heading.
     The action slot is a group header action. A product without href is a button; every press fires a bubbling "nq-select" { id }. Not ported: dragging the items (sortable). --}}
@props(['products' => [], 'current' => null, 'label' => null, 'pinnedOnly' => true, 'order' => null, 'action' => null])
@php
    $byId = collect($products)->keyBy('id');
    $pinned = collect($products)->filter(fn ($p) => ! empty($p['pinned']))->values();
    $shown = $order !== null ? collect($order)->map(fn ($id) => $byId[$id] ?? null)->filter()->values() : ($pinnedOnly && $pinned->isNotEmpty() ? $pinned : collect($products)->values());
    $click = 'if (! $el.dataset.href) $event.preventDefault(); $dispatch(`nq-select`, { id: $el.dataset.id })';
@endphp
@if ($shown->isNotEmpty())
    <x-nq::app-shell.sidebar-group :label="$label ?? \Nasaq\Nasaq::t('Apps', 'التطبيقات')" collapsible :action="$action">
        @foreach ($shown as $p)
            @if (! empty($p['badge']))
            <x-nq::app-shell.sidebar-item :href="$p['href'] ?? '#'" :active="$current !== null && $p['id'] === $current" :tooltip="$p['name']" data-id="{{ $p['id'] }}" data-href="{{ $p['href'] ?? '' }}" :x-on:click="$click">
                <x-slot:icon><x-nq::product-switcher.product-icon :product="$p" :size="16" /></x-slot:icon>
                {{ $p['name'] }}
                <x-slot:trailing>{{ $p['badge'] }}</x-slot:trailing>
            </x-nq::app-shell.sidebar-item>
            @else
            <x-nq::app-shell.sidebar-item :href="$p['href'] ?? '#'" :active="$current !== null && $p['id'] === $current" :tooltip="$p['name']" data-id="{{ $p['id'] }}" data-href="{{ $p['href'] ?? '' }}" :x-on:click="$click">
                <x-slot:icon><x-nq::product-switcher.product-icon :product="$p" :size="16" /></x-slot:icon>
                {{ $p['name'] }}
            </x-nq::app-shell.sidebar-item>
            @endif
        @endforeach
    </x-nq::app-shell.sidebar-group>
@endif
