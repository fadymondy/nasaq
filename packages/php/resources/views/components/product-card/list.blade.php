{{-- <x-nq::product-card.list> <x-nq::product-card.list-item name="…"/> … </x-nq::product-card.list>
     A borderless list of list items: 1 column, then 2 and 3 as its own width grows. --}}
<div data-slot="product-list" class="@container">
    <ul {{ $attributes->cn('grid grid-cols-1 gap-x-6 gap-y-1 @3xl:grid-cols-2 @6xl:grid-cols-3') }}>{{ $slot }}</ul>
</div>
