{{-- <x-nq::combobox.separator /> --}}
<div data-slot="{{ $attributes->get('data-slot', 'combobox-separator') }}" role="separator" {{ $attributes->except('data-slot')->cn('-mx-1.5 my-1.5 h-px bg-border') }}></div>
