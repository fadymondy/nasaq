{{-- <x-nq::accordion.item value="plan"> trigger + panel </x-nq::accordion.item>
     One section. value identifies it in the root's value. --}}
@aware(['defaultValue' => [], 'multiple' => false, 'disabled' => false])
@props(['value', 'disabled' => false])
@php($open = in_array((string) $value, array_map('strval', array_slice(array_values((array) $defaultValue), 0, $multiple ? null : 1)), true))
<div data-slot="{{ $attributes->get('data-slot', 'accordion-item') }}" x-data="{ v: @js((string) $value) }"
    :data-open="isOpen(v) ? '' : undefined" :data-closed="isOpen(v) ? undefined : ''"
    @if ($open) data-open @else data-closed @endif
    @if ($disabled) data-disabled @endif
    {{ $attributes->except('data-slot')->cn('border-b border-border first:rounded-t-card last:rounded-b-card last:border-b-0') }}>
    {{ $slot }}
</div>
