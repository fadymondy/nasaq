{{-- <x-nq::accordion.panel>Yes, any time from the billing page.</x-nq::accordion.panel>
     Same disclosure motion as the collapsible panel: height + opacity, 200ms. Server-rendered open or closed. --}}
@aware(['value', 'defaultValue' => [], 'multiple' => false])
@php($open = in_array((string) $value, array_map('strval', array_slice(array_values((array) $defaultValue), 0, $multiple ? null : 1)), true))
<div data-slot="{{ $attributes->get('data-slot', 'accordion-panel') }}" role="region" x-nq-presence="isOpen(v)"
    :id="$id('nq-accordion', 'panel-' + v)" :aria-labelledby="$id('nq-accordion', 'trigger-' + v)"
    @if ($open) data-open @else data-closed style="display:none" @endif
    {{ $attributes->except('data-slot')->cn([
        'h-(--accordion-panel-height) overflow-hidden text-body-sm text-muted-foreground transition-[height,opacity] duration-200 ease-nq motion-reduce:transition-none',
        'data-starting-style:h-0 data-starting-style:opacity-0 data-ending-style:h-0 data-ending-style:opacity-0',
    ]) }}>
    <div class="px-4 pb-4">{{ $slot }}</div>
</div>
