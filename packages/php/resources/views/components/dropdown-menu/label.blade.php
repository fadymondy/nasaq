{{-- <x-nq::dropdown-menu.label>Account</x-nq::dropdown-menu.label> A heading in the menu. --}}
<div data-slot="{{ $attributes->get('data-slot', 'dropdown-menu-label') }}" role="presentation" {{ $attributes->except('data-slot')->cn('px-2.5 pt-1.5 pb-1 text-caption font-medium text-muted-foreground') }}>{{ $slot }}</div>
