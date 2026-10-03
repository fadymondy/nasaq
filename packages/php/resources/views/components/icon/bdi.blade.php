{{-- <x-nq::icon.bdi>{{ $user->name }}</x-nq::icon.bdi>  Isolates user-provided text of unknown direction (names, titles). --}}
<bdi data-slot="{{ $attributes->get('data-slot', 'bdi') }}" {{ $attributes->except('data-slot') }}>{{ $slot }}</bdi>
