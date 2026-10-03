{{-- <x-nq::store-merch.category-tiles :items="[['id' => 'tops', 'label' => 'Tops', 'count' => 42, 'image' => '/tops.jpg', 'href' => '/c/tops']]" />
     A responsive grid of image tiles that lead into categories.
     items: id, label, href? (default #id), image?, count? (products, shown under the name).
     title: heading (default "Shop by category"; pass null to hide). ratio: square (default) | landscape. labels: string overrides.
     A click on a tile bubbles; the link's data-id says which one. --}}
@include('nasaq::components.store-merch._strings')
@props(['items' => [], 'title' => '__default', 'ratio' => 'square', 'labels' => null])
@php $heading = $title === '__default' ? nq_merch_t('categories', [], $labels) : $title; @endphp
<section data-slot="{{ $attributes->get('data-slot', 'store-category-tiles') }}" @if ($heading) aria-labelledby="store-cats-h" @else aria-label="{{ nq_merch_t('categories', [], $labels) }}" @endif {{ $attributes->except('data-slot') }}>
    @if ($heading)
        <div class="mb-4 flex items-end justify-between gap-4"><h2 id="store-cats-h" class="text-h2 text-foreground">{{ $heading }}</h2></div>
    @endif
    <ul class="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-6">
        @foreach ($items as $item)
            <li>
                <a href="{{ $item['href'] ?? '#'.$item['id'] }}" data-id="{{ $item['id'] }}" class="group flex flex-col gap-2 rounded-card no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                    <span class="relative overflow-hidden rounded-card bg-secondary {{ $ratio === 'square' ? 'aspect-square' : 'aspect-[4/3]' }}">
                        <x-nq::store-listing.product-image :src="$item['image'] ?? null" alt="" class="transition-transform duration-300 ease-nq group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                    </span>
                    <span class="flex flex-col">
                        <span class="text-label text-foreground group-hover:underline">{{ $item['label'] }}</span>
                        @if (isset($item['count']))<span class="text-caption text-muted-foreground">{{ nq_merch_t('itemsCount', ['n' => number_format((int) $item['count'])], $labels) }}</span>@endif
                    </span>
                </a>
            </li>
        @endforeach
    </ul>
</section>
