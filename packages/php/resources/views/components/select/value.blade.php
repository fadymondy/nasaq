{{-- <x-nq::select.value placeholder="Choose" />
     The chosen item's label, or the placeholder while nothing is chosen. icon: also show the chosen item's icon before the label, as React's <SelectValue> does when its render function returns icon and label;
     mark the icon inside the item with data-select-icon (<span data-select-icon class="contents"><x-lucide-bug /></span>). --}}
@props(['placeholder' => null, 'icon' => false])
@if ($icon)
<span data-slot="{{ $attributes->get('data-slot', 'select-value') }}" :data-placeholder="empty() ? '' : undefined"
    {{ $attributes->except('data-slot')->cn('min-w-0 flex-1 truncate text-start data-placeholder:text-muted-foreground') }}>
    <span class="flex min-w-0 items-center gap-2"><span class="contents" x-html="icon()"></span><span class="truncate" x-text="label() ?? @js($placeholder ?? '')"></span></span>
</span>
@else
<span data-slot="{{ $attributes->get('data-slot', 'select-value') }}" x-text="label() ?? @js($placeholder ?? '')" :data-placeholder="empty() ? '' : undefined"
    {{ $attributes->except('data-slot')->cn('min-w-0 flex-1 truncate text-start data-placeholder:text-muted-foreground') }}></span>
@endif
