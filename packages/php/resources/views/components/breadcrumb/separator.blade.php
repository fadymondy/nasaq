{{-- <x-nq::breadcrumb.separator />  Between items, as a sibling of breadcrumb.item. A slot replaces the directional chevron. --}}
<li data-slot="{{ $attributes->get('data-slot', 'breadcrumb-separator') }}" role="presentation" aria-hidden="true" {{ $attributes->except('data-slot')->cn('[&_svg]:size-3.5') }}>
    @if ($slot->isNotEmpty())
        <span class="inline-flex rtl:-scale-x-100">{{ $slot }}</span>
    @else
        <x-nq::icon name="chevron-right" directional />
    @endif
</li>
