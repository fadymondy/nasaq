{{-- <x-nq::store-cart.announcer />
     The polite live region (visually hidden) that reads cart changes aloud: "Everyday tee added to your cart, quantity 2". Inside the cart or mini cart.
     The same words are read again when they repeat (a trailing space alternates). Needs the Alpine runtime (@nasaqScripts). --}}
<div data-slot="{{ $attributes->get('data-slot', 'store-cart-announcer') }}" role="status" aria-live="polite" aria-atomic="true" x-text="announcement"
    {{ $attributes->except('data-slot')->cn('sr-only') }}></div>
