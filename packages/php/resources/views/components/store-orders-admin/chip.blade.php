{{-- Internal: a status chip drawn from an Alpine expression that evaluates to { label, variant } (see nqStoreOrdersAdmin helpers).
     <x-nq::store-orders-admin.chip expr="statusChip(order.status)" /> --}}
@props(['expr'])
<span data-slot="{{ $attributes->get('data-slot', 'badge') }}" x-bind:class="chipClass({{ $expr }}.variant)" x-text="{{ $expr }}.label"
    {{ $attributes->except('data-slot')->cn('inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3') }}></span>
