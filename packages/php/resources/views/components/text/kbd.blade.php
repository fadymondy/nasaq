{{-- <x-nq::text.kbd>K</x-nq::text.kbd>   <x-nq::text.kbd aria-label="Command">&#8984;</x-nq::text.kbd>
     Pass aria-label for glyph keys so screen readers say the key name. --}}
<kbd data-slot="kbd" @if ($attributes->has('aria-label')) role="img" @endif dir="ltr"
    {{ $attributes->cn('inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-border bg-card px-1 font-mono text-[11px] text-muted-foreground') }}>{{ $slot }}</kbd>
