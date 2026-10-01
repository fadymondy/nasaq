<div data-slot="{{ $attributes->get('data-slot', 'navigation-menu-layout') }}" {{ $attributes->except('data-slot')->cn(['flex flex-col gap-3 sm:flex-row']) }}>{{ $slot }}</div>
