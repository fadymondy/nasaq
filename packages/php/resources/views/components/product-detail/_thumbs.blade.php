{{-- Internal: the thumbnail strip of product-detail.gallery (inside its nqProductGallery scope). --}}
@php
    $on = 'border-foreground ring-1 ring-foreground';
    $off = 'border-border opacity-80 hover:opacity-100';
@endphp
<ul data-slot="product-gallery-thumbs" class="flex gap-2 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden {{ $class ?? '' }}">
    @foreach ($images as $i => $image)
        <li class="shrink-0">
            <button type="button" aria-label="{{ \Nasaq\Nasaq::t('Show image '.($i + 1), 'عرض الصورة '.($i + 1)) }}"
                @if ($i === 0) aria-current="true" @endif
                :aria-current="index === {{ $i }} ? 'true' : undefined" x-on:click="go({{ $i }})"
                class="relative block size-16 overflow-hidden rounded-control border bg-secondary outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus {{ $i === 0 ? $on : $off }}"
                :class="index === {{ $i }} ? @js($on) : @js($off)">
                <img src="{{ $image['src'] }}" alt="{{ $image['alt'] ?? $name ?? '' }}" width="{{ $image['width'] ?? 800 }}" height="{{ $image['height'] ?? 800 }}" loading="lazy" decoding="async" draggable="false" class="size-full select-none object-cover">
                @if (($image['kind'] ?? null) === 'video')
                    <span class="absolute inset-0 flex items-center justify-center bg-nq-fg/25 text-background">
                        <x-lucide-play aria-hidden="true" class="size-4 fill-current" />
                        <span class="sr-only">{{ \Nasaq\Nasaq::t('Video', 'فيديو') }}</span>
                    </span>
                @endif
            </button>
        </li>
    @endforeach
</ul>
