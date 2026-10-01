{{-- <x-nq::auth-layout.backdrop />
     The decorative lattice behind the auth page. Hidden from assistive tech; the cubes under the pointer light up while it moves
     (Alpine nqAuthBackdrop, off for touch and reduced motion). --}}
<div data-slot="auth-backdrop" aria-hidden="true" x-data="nqAuthBackdrop()" {{ $attributes->cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden') }}>
    <div data-auth-layer="cubes"></div>
    <div data-auth-layer="pointer"></div>
</div>
