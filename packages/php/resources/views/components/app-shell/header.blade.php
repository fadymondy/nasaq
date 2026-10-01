{{-- <x-nq::app-shell.header> <x-nq::app-shell.sidebar-trigger /> <x-nq::app-shell.breadcrumbs>...</x-nq::app-shell.breadcrumbs> </x-nq::app-shell.header>   The sticky top bar. --}}
<header data-slot="{{ $attributes->get('data-slot', 'app-header') }}" {{ $attributes->except('data-slot')->cn([
    'sticky top-0 z-30 flex h-header shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-sm md:px-4',
    'in-data-[slot=app-shell-panel]:md:rounded-t-xl',
]) }}>{{ $slot }}</header>
