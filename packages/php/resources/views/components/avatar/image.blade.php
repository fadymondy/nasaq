{{-- <x-nq::avatar.image src="/a.jpg" alt="Fady" />  Renders nothing visible until it has loaded, so avatar.fallback shows meanwhile. --}}
@props(['src', 'alt' => ''])
<img data-slot="{{ $attributes->get('data-slot', 'avatar-image') }}" src="{{ $src }}" alt="{{ $alt }}" style="display: none" x-bind="image" {{ $attributes->except('data-slot')->cn('size-full object-cover') }}>
