{{-- <x-nq::app-shell.sidebar-footer> settings, status, account </x-nq::app-shell.sidebar-footer>   Pinned to the bottom of the sidebar. --}}
<div data-slot="sidebar-footer" {{ $attributes->cn('mt-auto flex shrink-0 flex-col gap-1 pt-2') }}>{{ $slot }}</div>
