{{-- <x-nq::chip-group.chip value="all">All</x-nq::chip-group.chip>  Put a leading icon straight in the slot.
     Pressed state is aria-pressed and data-selected. --}}
@aware(['defaultValue' => null])
@props(['value', 'disabled' => false])
@php
    $selected = $defaultValue !== null && (string) $defaultValue === (string) $value;
@endphp
<x-nq::button data-slot="{{ $attributes->get('data-slot', 'chip') }}" size="sm" variant="ghost" :disabled="$disabled" :data-value="(string) $value"
    :data-selected="$selected ? '' : null" :aria-pressed="$selected ? 'true' : 'false'"
    x-on:click="select($el.dataset.value)"
    x-bind:aria-pressed="String(value === $el.dataset.value)"
    x-bind:data-selected="value === $el.dataset.value ? '' : null"
    {{ $attributes->except('data-slot')->cn('shrink-0 rounded-full px-3 text-muted-foreground', 'data-selected:bg-nq-selected data-selected:text-foreground') }}>{{ $slot }}</x-nq::button>
