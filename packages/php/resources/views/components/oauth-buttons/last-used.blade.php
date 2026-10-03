{{-- <x-nq::oauth-buttons.last-used>Last used</x-nq::oauth-buttons.last-used>
     A neutral badge at the inline end of the sign-in method used last time. The parent needs `relative`. --}}
<x-nq::badge variant="neutral" {{ $attributes->merge(['data-slot' => 'last-used'])->cn('pointer-events-none absolute end-2 top-1/2 -translate-y-1/2') }}>{{ $slot }}</x-nq::badge>
