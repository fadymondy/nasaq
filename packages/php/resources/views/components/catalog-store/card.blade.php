{{-- Internal: one store card. The whole card opens the detail (or fires nq-select); the install button works on its own.
     item: the catalog item array (see <x-nq::catalog-store>). --}}
@props(['item', 'installed' => false, 'labels' => []])
@include('nasaq::components.catalog-store._strings')
@php
    $t = nq_catalog_labels((array) $labels);
    $price = $item['price'] ?? null;
    $free = empty($price) || (float) ($price['amount'] ?? 0) === 0.0;
@endphp
<article data-slot="{{ $attributes->get('data-slot', 'catalog-card') }}" data-item="{{ $item['id'] }}" data-state="{{ $installed ? 'installed' : 'available' }}"
    x-bind:data-state="stateOf('{{ $item['id'] }}')"
    {{ $attributes->except('data-slot')->cn('relative flex h-full flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-xs transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nq-focus hover:bg-nq-hover') }}>
    <div class="flex items-start gap-3">
        <x-nq::catalog-store.icon :icon="$item['icon'] ?? null" />
        <div class="min-w-0 flex-1">
            <h3 class="text-label text-foreground">
                <button type="button" class="text-start outline-none after:absolute after:inset-0 after:content-['']" x-on:click="openDetail('{{ $item['id'] }}')">{{ $item['name'] }}</button>
            </h3>
            @if (! empty($item['publisher']))<p class="truncate text-caption text-muted-foreground">{{ str_replace(':p', $item['publisher'], $t['by']) }}</p>@endif
        </div>
        @if (! empty($item['badge']))<x-nq::badge variant="outline">{{ $item['badge'] }}</x-nq::badge>@endif
    </div>
    <p class="line-clamp-2 text-body-sm text-muted-foreground">{{ $item['summary'] }}</p>
    <div class="mt-auto flex items-center justify-between gap-2">
        <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
            @if (isset($item['rating']))<x-nq::rating :value="$item['rating']" :count="$item['ratingCount'] ?? null" />@endif
            @if (isset($item['installs']))<span><bdi>{{ nq_catalog_compact($item['installs']) }}</bdi> {{ $t['installs'] }}</span>@endif
            @if (! $free)<x-nq::price :amount="$price['amount']" :currency="$price['currency'] ?? null" :period="$price['period'] ?? 'once'" size="sm" />@endif
        </div>
        <x-nq::catalog-store.install class="relative z-10 shrink-0" :id="$item['id']" :name="$item['name']" :free="$free" :installed="$installed" />
    </div>
</article>
