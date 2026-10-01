{{-- <x-nq::product-card name="Zekra" category="AI memory" description="…"> <x-slot:artwork>…</x-slot:artwork> <x-slot:price>…</x-slot:price> </x-nq::product-card>
     A product in a store or catalogue: artwork, name, category, a two-line pitch, social proof, price and the install action.
     name, category, badge, description, artwork, meta, price and action are each an attribute or a named slot.
     layout: auto (row in a narrow container, tile from 36rem; needs an @container ancestor, x-nq::product-card.grid is one) | tile | row. --}}
@props(['artwork' => null, 'name' => null, 'category' => null, 'badge' => null, 'description' => null, 'meta' => null, 'price' => null, 'action' => null, 'layout' => 'auto', 'nameAs' => 'h3'])
@php
    $has = fn ($v) => $v !== null && trim((string) $v) !== '';
    $l = match ($layout) {
        'tile' => ['root' => 'flex-col gap-3', 'art' => 'aspect-[16/10] w-full', 'artBadge' => 'inline-flex', 'nameBadge' => 'hidden'],
        'row' => ['root' => 'flex-row gap-4', 'art' => 'aspect-square w-20', 'artBadge' => 'hidden', 'nameBadge' => 'inline-flex'],
        default => ['root' => 'flex-row gap-4 @xl:flex-col @xl:gap-3', 'art' => 'aspect-square w-20 @xl:aspect-[16/10] @xl:w-full', 'artBadge' => 'hidden @xl:inline-flex', 'nameBadge' => 'inline-flex @xl:hidden'],
    };
@endphp
<article data-slot="product-card" data-layout="{{ $layout }}" {{ $attributes->cn('group/product flex min-w-0 '.$l['root']) }}>
    <div data-slot="product-card-artwork" class="{{ \Nasaq\Cn::merge('relative shrink-0 [&>*]:size-full', $l['art']) }}">
        {{ $artwork }}
        @if ($has($badge))
            <span class="{{ \Nasaq\Cn::merge('absolute start-3 top-3 z-10', $l['artBadge']) }}">{{ $badge }}</span>
        @endif
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-3">
        <div class="flex items-start gap-3">
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                <div class="flex min-w-0 items-center gap-2">
                    <{{ $nameAs }} class="truncate text-body font-medium text-foreground">{{ $name }}</{{ $nameAs }}>
                    @if ($has($badge))
                        <span class="{{ \Nasaq\Cn::merge('shrink-0', $l['nameBadge']) }}">{{ $badge }}</span>
                    @endif
                </div>
                @if ($has($category))
                    <p class="truncate text-caption text-muted-foreground">{{ $category }}</p>
                @endif
            </div>
            @if ($has($action))
                <div class="shrink-0">{{ $action }}</div>
            @endif
        </div>
        @if ($has($description))
            <p class="line-clamp-2 text-pretty text-body-sm text-muted-foreground">{{ $description }}</p>
        @endif
        @if ($has($meta) || $has($price))
            <div class="mt-auto flex min-w-0 items-center justify-between gap-2">
                <div class="min-w-0">{{ $meta }}</div>
                {{ $price }}
            </div>
        @endif
    </div>
</article>
