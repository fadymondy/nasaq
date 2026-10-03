{{-- Internal: one slide of the hero banner. Needs $banner, $eager, $labels. --}}
@php $tones = ['brand' => 'bg-primary text-primary-foreground', 'soft' => 'bg-secondary text-secondary-foreground', 'dark' => 'bg-foreground text-background']; @endphp
<div data-id="{{ $banner['id'] ?? '' }}" class="relative grid min-h-64 overflow-hidden rounded-card md:min-h-96 md:grid-cols-2 {{ $tones[$banner['tone'] ?? 'brand'] ?? $tones['brand'] }}">
    <div class="z-10 flex flex-col items-start justify-center gap-3 p-6 md:p-12">
        @if (! empty($banner['eyebrow']))<span class="text-label opacity-80">{{ $banner['eyebrow'] }}</span>@endif
        <h2 class="text-h1 text-balance">{{ $banner['title'] }}</h2>
        @if (! empty($banner['description']))<p class="max-w-md text-body opacity-90">{{ $banner['description'] }}</p>@endif
        <x-nq::button size="lg" variant="secondary" :href="$banner['href'] ?? '#'" data-banner-id="{{ $banner['id'] ?? '' }}">
            {{ $banner['cta'] ?? nq_merch_t('shopNow', [], $labels) }}
            <x-nq::icon name="arrow-right" :directional="true" />
        </x-nq::button>
    </div>
    <div class="relative order-first aspect-[16/9] md:absolute md:inset-y-0 md:end-0 md:order-none md:aspect-auto md:w-1/2">
        <x-nq::store-listing.product-image :src="$banner['image'] ?? null" :alt="$banner['imageAlt'] ?? ''" :eager="$eager" />
    </div>
</div>
