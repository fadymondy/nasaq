{{-- <x-nq::app-shell.footer-link href="/terms">Terms</x-nq::app-shell.footer-link> --}}
<a data-slot="{{ $attributes->get('data-slot', 'app-footer-link') }}" {{ $attributes->except('data-slot')->cn('rounded-xs outline-none transition-colors duration-150 ease-nq hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus') }}>{{ $slot }}</a>
