{{-- <x-nq::avatar.fallback>FM</x-nq::avatar.fallback>  Shown while the image is missing or loading. --}}
<span data-slot="{{ $attributes->get('data-slot', 'avatar-fallback') }}" x-bind="fallback" {{ $attributes->except('data-slot')->cn('flex size-full items-center justify-center') }}>{{ $slot }}</span>
