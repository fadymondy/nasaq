{{-- <x-nq::avatar.fallback>FM</x-nq::avatar.fallback>  Shown while the image is missing or loading. --}}
<span data-slot="avatar-fallback" x-bind="fallback" {{ $attributes->cn('flex size-full items-center justify-center') }}>{{ $slot }}</span>
