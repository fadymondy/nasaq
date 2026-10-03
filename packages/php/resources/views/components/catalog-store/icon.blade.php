{{-- <x-nq::catalog-store.icon icon="wrench" />  The tile an item shows in the card and the sheet. icon: a lucide name (default package). --}}
@props(['icon' => null])
<span aria-hidden="true" data-slot="{{ $attributes->get('data-slot', 'catalog-icon') }}" {{ $attributes->except('data-slot')->cn('flex size-10 shrink-0 items-center justify-center rounded-card border border-border bg-secondary text-foreground [&_svg]:size-5') }}>
    <x-dynamic-component :component="'lucide-'.($icon ?: 'package')" />
</span>
