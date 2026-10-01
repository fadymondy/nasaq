{{-- <x-nq::app-shell.footer> <x-slot:start>© Acme</x-slot:start> <x-nq::app-shell.footer-link href="/terms">Terms</x-nq::app-shell.footer-link> </x-nq::app-shell.footer>
     The quiet last row of a top-navigation app: copyright or status in the start slot, links at the end. --}}
@props(['start' => null])
<footer data-slot="app-footer" {{ $attributes->cn('mt-auto flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-t border-border px-4 py-3 text-caption text-muted-foreground md:px-page') }}>
    @if ($start !== null && ! $start->isEmpty())<div class="flex min-w-0 items-center gap-2">{{ $start }}</div>@endif
    <div class="ms-auto flex flex-wrap items-center gap-x-5 gap-y-1">{{ $slot }}</div>
</footer>
