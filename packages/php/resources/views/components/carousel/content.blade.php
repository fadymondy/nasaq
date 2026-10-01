{{-- <x-nq::carousel.content> items </x-nq::carousel.content>: the scrolling track. Its children are the slides. --}}
<div data-slot="carousel-viewport" class="overflow-x-auto overflow-y-hidden rounded-[inherit] snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div data-slot="{{ $attributes->get('data-slot', 'carousel-content') }}" {{ $attributes->except('data-slot')->cn('-ms-4 flex touch-pan-y') }}>
        {{ $slot }}
    </div>
</div>
