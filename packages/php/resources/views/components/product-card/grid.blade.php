{{-- <x-nq::product-card.grid> <x-nq::product-card …/> … </x-nq::product-card.grid>
     Responsive shelf for product cards: 1 column, then 2, 3 and 4 as its own width grows. Establishes the container. --}}
<div data-slot="product-grid" class="@container">
    <div {{ $attributes->cn('grid grid-cols-1 gap-x-5 gap-y-8 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4') }}>{{ $slot }}</div>
</div>
