{{-- <x-nq::product-detail.gallery :images="[['src' => '/a.jpg', 'alt' => 'Front'], ['src' => '/b.jpg', 'alt' => 'Back']]" name="Everyday tee" />
     A product image gallery: a square stage with hover zoom, swipe and arrow-key stepping (flipped in RTL), previous / next buttons,
     a thumbnail strip, an "n / total" counter and a full-screen viewer (click the stage or the expand button; click inside to zoom).
     images: [src, alt?, width?, height?, kind? ("video" shows a play badge)]. zoom: false removes zoom and the viewer.
     A broken image falls back to a neutral placeholder. Inside <x-nq::product-detail> it follows the picked variant: the root
     sends "nq-gallery-show" { src } to it. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['images' => [], 'name' => null, 'zoom' => true])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $many = count($images) > 1;
    $total = count($images);
    $first = $images[0] ?? null;
    $position = $t('Image 1 of '.$total, 'الصورة 1 من '.$total);
    $stageBtn = 'block size-full outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus';
    $imgClass = 'size-full select-none object-contain transition-transform duration-200 ease-nq motion-reduce:transition-none';
@endphp
<div data-slot="product-gallery" role="group" aria-roledescription="carousel" aria-label="{{ $t('Product images', 'صور المنتج') }}"
    x-data="nqProductGallery(@js(array_values($images)), @js($name ?? ''))"
    x-on:nq-gallery-show="show($event.detail.src)"
    {{ $attributes->cn('flex min-w-0 flex-col gap-3') }}>
    <div class="relative">
        <div data-slot="product-gallery-viewport" x-bind="viewport" class="relative aspect-square overflow-hidden rounded-card border border-border bg-secondary [touch-action:pan-y]">
            <button type="button" data-slot="product-gallery-stage" x-bind="stage"
                aria-label="{{ $zoom ? $t('View full screen', 'عرض بملء الشاشة') : $position }}"
                @unless ($zoom) :aria-label="position" @endunless
                class="{{ $stageBtn }} {{ $zoom ? 'cursor-zoom-in' : 'cursor-pointer' }}">
                @if ($first)
                    <img src="{{ $first['src'] }}" x-effect="$el.setAttribute('src', images[index]?.src ?? '')" alt="{{ $first['alt'] ?? $name ?? '' }}" :alt="images[index]?.alt || @js($name ?? '')"
                        width="{{ $first['width'] ?? 800 }}" height="{{ $first['height'] ?? 800 }}" loading="eager" decoding="async" draggable="false"
                        x-show="!currentFailed" x-on:error="failed[images[index].src] = true" class="{{ $imgClass }}"
                        :style="{ transform: origin ? 'scale(2)' : undefined, transformOrigin: origin ? `${origin.x}% ${origin.y}%` : undefined }">
                @endif
                <div role="img" aria-label="{{ $t('No image available', 'لا توجد صورة') }}" x-show="currentFailed" @if ($first) style="display:none" @endif
                    class="flex size-full items-center justify-center bg-secondary text-muted-foreground"><x-lucide-image-off aria-hidden="true" class="size-8" /></div>
            </button>
            @if ($first && ($first['kind'] ?? null) === 'video')
                <span class="pointer-events-none absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-caption font-medium text-foreground">
                    <x-lucide-play aria-hidden="true" class="size-3 fill-current" />{{ $t('Video', 'فيديو') }}
                </span>
            @endif
        </div>
        @if ($many)
            <x-nq::button variant="secondary" size="icon-sm" aria-label="{{ $t('Previous image', 'الصورة السابقة') }}" x-on:click="step(-1)" class="absolute start-2 top-1/2 -translate-y-1/2 rounded-full opacity-90 shadow-sm">
                <x-nq::icon name="chevron-left" directional />
            </x-nq::button>
            <x-nq::button variant="secondary" size="icon-sm" aria-label="{{ $t('Next image', 'الصورة التالية') }}" x-on:click="step(1)" class="absolute end-2 top-1/2 -translate-y-1/2 rounded-full opacity-90 shadow-sm">
                <x-nq::icon name="chevron-right" directional />
            </x-nq::button>
        @endif
        @if ($zoom)
            <x-nq::button variant="secondary" size="icon-sm" aria-label="{{ $t('View full screen', 'عرض بملء الشاشة') }}" x-on:click="lightbox = true" class="absolute end-2 top-2 rounded-full opacity-90 shadow-sm">
                <x-lucide-maximize-2 aria-hidden="true" />
            </x-nq::button>
        @endif
        <span class="pointer-events-none absolute bottom-2 end-2 rounded-full bg-background/90 px-2 py-0.5 text-caption tabular-nums text-muted-foreground" aria-hidden="true">
            <bdi x-text="index + 1">1</bdi> / <bdi>{{ $total }}</bdi>
        </span>
    </div>
    <p class="sr-only" aria-live="polite" x-text="position">{{ $position }}</p>
    @if ($many)
        @include('nasaq::components.product-detail._thumbs', ['images' => $images, 'name' => $name, 'class' => ''])
    @endif

    @if ($zoom)
        <x-nq::dialog x-model="lightbox">
            <x-nq::dialog.content class="h-[calc(100dvh-1rem)] max-h-none w-[calc(100%-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-3">
                <div class="flex items-center justify-between gap-3 pe-10">
                    <x-nq::dialog.title class="text-body font-medium">{{ $name ?? $t('Product images, full screen', 'صور المنتج بملء الشاشة') }}</x-nq::dialog.title>
                    <x-nq::dialog.description class="text-caption tabular-nums"><span x-text="position">{{ $position }}</span></x-nq::dialog.description>
                </div>
                <div class="relative min-h-0">
                    <div data-slot="product-gallery-viewport" x-bind="lbViewport" class="relative size-full overflow-hidden rounded-card bg-secondary [touch-action:pan-y]">
                        <button type="button" data-slot="product-gallery-stage" x-bind="lbStage" aria-label="{{ $t('Zoom in', 'تكبير') }}" class="{{ $stageBtn }} cursor-zoom-in" :class="lbOrigin ? 'cursor-zoom-out' : 'cursor-zoom-in'">
                            @if ($first)
                                <img src="{{ $first['src'] }}" x-effect="$el.setAttribute('src', images[index]?.src ?? '')" alt="{{ $first['alt'] ?? $name ?? '' }}" :alt="images[index]?.alt || @js($name ?? '')"
                                    width="{{ $first['width'] ?? 800 }}" height="{{ $first['height'] ?? 800 }}" loading="lazy" decoding="async" draggable="false"
                                    x-show="!currentFailed" class="{{ $imgClass }}"
                                    :style="{ transform: lbOrigin ? 'scale(2)' : undefined, transformOrigin: lbOrigin ? `${lbOrigin.x}% ${lbOrigin.y}%` : undefined }">
                            @endif
                        </button>
                    </div>
                    @if ($many)
                        <x-nq::button variant="secondary" size="icon" aria-label="{{ $t('Previous image', 'الصورة السابقة') }}" x-on:click="step(-1)" class="absolute start-2 top-1/2 -translate-y-1/2 rounded-full">
                            <x-nq::icon name="chevron-left" directional />
                        </x-nq::button>
                        <x-nq::button variant="secondary" size="icon" aria-label="{{ $t('Next image', 'الصورة التالية') }}" x-on:click="step(1)" class="absolute end-2 top-1/2 -translate-y-1/2 rounded-full">
                            <x-nq::icon name="chevron-right" directional />
                        </x-nq::button>
                    @endif
                    <span class="pointer-events-none absolute bottom-2 start-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-caption text-muted-foreground" aria-hidden="true">
                        <x-lucide-zoom-in class="size-3" />
                    </span>
                </div>
                @if ($many)
                    @include('nasaq::components.product-detail._thumbs', ['images' => $images, 'name' => $name, 'class' => 'justify-center'])
                @endif
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
</div>
