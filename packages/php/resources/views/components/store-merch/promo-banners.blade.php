{{-- <x-nq::store-merch.promo-banners :items="[['id' => 'a', 'title' => 'New in', 'href' => '/new', 'image' => '/a.jpg']]" />
     Two or three side-by-side promo tiles: image behind, text over a token panel.
     items: id, title, description?, cta? (default "Shop now"), href?, image?, imageAlt?, eyebrow?, tone? (brand | soft (default) | dark).
     labels: string overrides. A click on a tile bubbles; the link's data-id says which one. --}}
@include('nasaq::components.store-merch._strings')
@props(['items' => [], 'labels' => null])
@php
    $tones = ['brand' => 'bg-primary text-primary-foreground', 'soft' => 'bg-secondary text-secondary-foreground', 'dark' => 'bg-foreground text-background'];
    $grid = count($items) >= 3 ? 'md:grid-cols-3' : (count($items) === 2 ? 'md:grid-cols-2' : '');
@endphp
@if (count($items))
    <section data-slot="{{ $attributes->get('data-slot', 'store-promo-banners') }}" aria-label="{{ nq_merch_t('promotions', [], $labels) }}" {{ $attributes->except('data-slot') }}>
        <ul class="m-0 grid list-none gap-4 p-0 {{ $grid }}">
            @foreach ($items as $b)
                <li>
                    <a href="{{ $b['href'] ?? '#' }}" data-id="{{ $b['id'] ?? '' }}" class="group relative flex min-h-44 overflow-hidden rounded-card no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus {{ $tones[$b['tone'] ?? 'soft'] ?? $tones['soft'] }}">
                        <span class="z-10 flex w-3/5 flex-col items-start justify-center gap-1 p-5">
                            @if (! empty($b['eyebrow']))<span class="text-caption opacity-80">{{ $b['eyebrow'] }}</span>@endif
                            <span class="text-h3 text-balance">{{ $b['title'] }}</span>
                            @if (! empty($b['description']))<span class="text-body-sm opacity-90">{{ $b['description'] }}</span>@endif
                            <span class="mt-2 inline-flex items-center gap-1 text-label underline underline-offset-4">
                                {{ $b['cta'] ?? nq_merch_t('shopNow', [], $labels) }}
                                <x-nq::icon name="arrow-right" :directional="true" />
                            </span>
                        </span>
                        <span class="absolute inset-y-0 end-0 w-2/5">
                            <x-nq::store-listing.product-image :src="$b['image'] ?? null" :alt="$b['imageAlt'] ?? ''" class="transition-transform duration-300 ease-nq group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                        </span>
                    </a>
                </li>
            @endforeach
        </ul>
    </section>
@endif
