{{-- <x-nq::brand-guidelines.og-card :card="['id' => 'home', 'title' => 'Nasaq', 'description' => 'A design system.']" brand="nasaq" />
     A social share card: the finished image when you have one, otherwise a live layout with the mark and the text.
     card: ['id', 'title', 'description'?, 'image'?, 'imageAlt'?, 'size'? "1200 × 630" or [w, h], 'href'?, 'filename'?, 'brand'?]. brand: used for the drawn layout. --}}
@props(['card', 'brand' => null])
@php
    $size = $card['size'] ?? null;
    $ratio = is_array($size) ? $size[0].' / '.$size[1] : '1200 / 630';
    $sizeLabel = $size === null ? '1200 × 630' : (is_array($size) ? $size[0].' × '.$size[1] : $size);
    $download = str_replace('{name}', $card['title'], \Nasaq\Nasaq::t('Download {name}', 'تنزيل {name}'));
@endphp
<figure data-slot="{{ $attributes->get('data-slot', 'brand-og-card') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-2') }}>
    <div class="overflow-hidden rounded-card border border-border bg-card" style="aspect-ratio: {{ $ratio }}">
        @if (! empty($card['image']))
            <img src="{{ $card['image'] }}" alt="{{ $card['imageAlt'] ?? $card['title'] }}" class="size-full object-cover">
        @else
            <div class="flex size-full flex-col justify-between gap-2 p-[6%]">
                <x-nq::product-mark.logo :brand="$card['brand'] ?? $brand" :size="28" />
                <div class="flex flex-col gap-1">
                    <x-nq::text-utilities.user-text block :lines="2" class="text-h2 text-foreground">{{ $card['title'] }}</x-nq::text-utilities.user-text>
                    @if (! empty($card['description']))<x-nq::text-utilities.user-text block :lines="2" class="text-body-sm text-muted-foreground">{{ $card['description'] }}</x-nq::text-utilities.user-text>@endif
                </div>
            </div>
        @endif
    </div>
    <figcaption class="flex items-center justify-between gap-3 text-caption text-muted-foreground">
        <span class="flex items-center gap-2">
            <x-nq::text-utilities.user-text class="text-label text-foreground">{{ $card['title'] }}</x-nq::text-utilities.user-text>
            <bdi dir="ltr" class="tabular-nums">{{ $sizeLabel }}</bdi>
        </span>
        @if (! empty($card['href']))
            <x-nq::button variant="ghost" size="sm" :href="$card['href']" :download="$card['filename'] ?? null" :aria-label="$download">
                <x-nq::icon name="download" aria-hidden="true" />
                {{ \Nasaq\Nasaq::t('Download', 'تنزيل') }}
            </x-nq::button>
        @endif
    </figcaption>
</figure>
