{{-- <x-nq::store-merch.hero-banner :items="[['id' => 'summer', 'title' => 'Summer collection', 'description' => '...', 'cta' => 'Shop now', 'href' => '/summer', 'image' => '/hero.jpg', 'tone' => 'brand']]" />
     The large banner at the top of the home page. One banner shows as is; several rotate in a carousel with arrows and dots.
     items: id, title, description?, cta? (default "Shop now"), href?, image?, imageAlt?, eyebrow?, tone? (brand | soft | dark).
     autoplay: milliseconds between slides, or false for none (default 6000; stops under reduced motion). labels: string overrides.
     A click on a call to action bubbles; its data-banner-id says which banner.
     Needs the Alpine runtime (@nasaqScripts) when there are several banners. --}}
@include('nasaq::components.store-merch._strings')
@props(['items' => [], 'autoplay' => 6000, 'labels' => null])
@php $items = array_values($items); @endphp
@if (count($items) === 1)
    <section data-slot="{{ $attributes->get('data-slot', 'store-hero-banner') }}" aria-label="{{ nq_merch_t('promotions', [], $labels) }}" {{ $attributes->except('data-slot') }}>
        @include('nasaq::components.store-merch._hero-slide', ['banner' => $items[0], 'eager' => true])
    </section>
@elseif (count($items) > 1)
    <section data-slot="{{ $attributes->get('data-slot', 'store-hero-banner') }}" aria-label="{{ nq_merch_t('promotions', [], $labels) }}" {{ $attributes->except('data-slot') }}>
        <x-nq::carousel :label="nq_merch_t('promotions', [], $labels)" :loop="true" :autoplay="$autoplay ?: false" class="group relative">
            <x-nq::carousel.content>
                @foreach ($items as $i => $banner)
                    <x-nq::carousel.item>
                        @include('nasaq::components.store-merch._hero-slide', ['banner' => $banner, 'eager' => $i === 0])
                    </x-nq::carousel.item>
                @endforeach
            </x-nq::carousel.content>
            <x-nq::carousel.previous />
            <x-nq::carousel.next />
            <x-nq::carousel.dots />
        </x-nq::carousel>
    </section>
@endif
