{{-- <x-nq::app-shell.sidebar-header> brand, switcher </x-nq::app-shell.sidebar-header>   The fixed top of the sidebar. --}}
<div data-slot="{{ $attributes->get('data-slot', 'sidebar-header') }}" {{ $attributes->except('data-slot')->cn('flex shrink-0 flex-col gap-2') }}>{{ $slot }}</div>
