{{-- <x-nq::select.value placeholder="Choose" />
     The chosen item's label, or the placeholder while nothing is chosen. --}}
@props(['placeholder' => null])
<span data-slot="select-value" x-text="label() ?? @js($placeholder ?? '')" :data-placeholder="empty() ? '' : undefined"
    {{ $attributes->cn('min-w-0 flex-1 truncate text-start data-placeholder:text-muted-foreground') }}></span>
