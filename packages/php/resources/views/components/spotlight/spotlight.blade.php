{{-- <x-nq::spotlight brand="mahaam" title="Mahaam"><x-slot:description>A pitch.</x-slot:description><x-slot:actions><x-nq::button>Start free</x-nq::button></x-slot:actions></x-nq::spotlight>
     A featured product banner: the product's artwork field with its mark, name, pitch and call to action, in the product's own brand scope.
     brand: the product. size: lg (default, the hero) | md (compact tile). title (or the default slot): the product name, the section's heading;
     title-as: h1 | h2 (default) | h3. Slots: eyebrow, mark (replaces the product mark), description, actions, meta, media (lg only). --}}
@props(['brand', 'size' => 'lg', 'title' => null, 'titleAs' => 'h2', 'titleId' => null, 'eyebrow' => null, 'mark' => null, 'description' => null, 'actions' => null, 'meta' => null, 'media' => null])
@php
    $id = $titleId ?? 'nq-spotlight-'.substr(md5(json_encode([$brand, $title, $size])), 0, 8);
    $tag = in_array($titleAs, ['h1', 'h2', 'h3'], true) ? $titleAs : 'h2';
    $lg = $size === 'lg';
    $has = fn ($s) => $s && ! $s->isEmpty();
    $heading = $title ?? ($slot->isEmpty() ? '' : $slot);
@endphp
<section data-slot="spotlight" data-size="{{ $size }}" aria-labelledby="{{ $id }}" {{ $attributes->cn('flex') }}>
    <x-nq::product-artwork :brand="$brand" class="@container w-full items-stretch justify-stretch {{ $lg ? 'min-h-[22rem]' : '' }}">
        @if ($lg)
            <div class="grid w-full gap-8 p-6 @md:p-8 @3xl:grid-cols-[minmax(0,1fr)_auto]">
                <div class="flex max-w-md flex-col items-start justify-center gap-4">
                    @if ($has($eyebrow)){{ $eyebrow }}@endif
                    <div class="flex items-center gap-3">
                        @if ($has($mark)){{ $mark }}@else<x-nq::product-mark :brand="$brand" :size="44" title="" />@endif
                        <{{ $tag }} id="{{ $id }}" class="text-display leading-none text-foreground">{{ $heading }}</{{ $tag }}>
                    </div>
                    @if ($has($description))<div class="text-pretty text-body text-foreground/90">{{ $description }}</div>@endif
                    @if ($has($actions))<div class="flex flex-wrap items-center gap-3 pt-1">{{ $actions }}</div>@endif
                    @if ($has($meta))<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">{{ $meta }}</div>@endif
                </div>
                @if ($has($media))<div class="hidden items-center justify-center @md:flex">{{ $media }}</div>@endif
            </div>
        @else
            <div class="flex w-full flex-col justify-between gap-6 p-5">
                <div class="flex items-start justify-between gap-3">
                    @if ($has($mark)){{ $mark }}@else<x-nq::product-mark :brand="$brand" :size="40" title="" />@endif
                    @if ($has($eyebrow)){{ $eyebrow }}@endif
                </div>
                <div class="flex flex-col gap-1">
                    <{{ $tag }} id="{{ $id }}" class="text-h3 text-foreground">{{ $heading }}</{{ $tag }}>
                    @if ($has($description))<div class="line-clamp-2 text-body-sm text-muted-foreground">{{ $description }}</div>@endif
                </div>
                @if ($has($meta) || $has($actions))
                    <div class="flex items-center justify-between gap-3">
                        <div class="min-w-0">@if ($has($meta)){{ $meta }}@endif</div>
                        @if ($has($actions)){{ $actions }}@endif
                    </div>
                @endif
            </div>
        @endif
    </x-nq::product-artwork>
</section>
