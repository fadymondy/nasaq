{{-- <x-nq::app-shell.sidebar-expanded-only> ... </x-nq::app-shell.sidebar-expanded-only>   Shows its content only when the sidebar is expanded (or in the phone sheet). --}}
<div data-slot="{{ $attributes->get('data-slot', 'sidebar-expanded-only') }}" {{ $attributes->except('data-slot')->cn('contents group-data-collapsed/sidebar:hidden') }}>{{ $slot }}</div>
