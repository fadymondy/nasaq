{{-- <x-nq::carousel.item>Slide</x-nq::carousel.item>: full width by default; basis-1/2, basis-1/3 on it shows several.
     The "Slide n of total" label is added when Alpine starts. --}}
@aware(['align' => 'start'])
@php($snap = ['start' => 'snap-start', 'center' => 'snap-center', 'end' => 'snap-end'][$align] ?? 'snap-start')
<div role="group" aria-roledescription="slide" data-slot="{{ $attributes->get('data-slot', 'carousel-item') }}" {{ $attributes->except('data-slot')->cn(['min-w-0 shrink-0 grow-0 basis-full ps-4', $snap, '-scroll-ms-4']) }}>{{ $slot }}</div>
