{{-- <x-nq::context-menu.separator /> A divider between items. --}}
<div data-slot="{{ $attributes->get('data-slot', 'context-menu-separator') }}" role="separator" aria-orientation="horizontal" {{ $attributes->except('data-slot')->cn('-mx-1.5 my-1.5 h-px bg-border') }}></div>
