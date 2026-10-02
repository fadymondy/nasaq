{{-- <x-nq::entity-list.card-meta label="Plan">Pro</x-nq::entity-list.card-meta>   A quiet "label: value" line for card bodies. --}}
@props(['label'])
<div data-slot="{{ $attributes->get('data-slot', 'card-meta') }}" {{ $attributes->except('data-slot')->cn('flex items-center justify-between gap-3 text-body-sm') }}>
    <span class="shrink-0 text-muted-foreground">{{ $label }}</span>
    <span class="min-w-0 truncate text-end">{{ $slot }}</span>
</div>
