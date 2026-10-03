{{-- <x-nq::app-shell.main> page </x-nq::app-shell.main>   The page. id and tabindex make it the skip link's target. --}}
<main id="app-main" tabindex="-1" data-slot="{{ $attributes->get('data-slot', 'app-main') }}" {{ $attributes->except('data-slot')->cn('flex-1 px-4 py-page outline-none md:px-page') }}>{{ $slot }}</main>
