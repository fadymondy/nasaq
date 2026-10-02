{{-- <x-nq::accordion :default-value="['plan']"> items </x-nq::accordion>
     One panel open at a time; pass multiple to let several stay open. default-value: the open item values (an array).
     value is x-modelable and always an array: wire:model="open" works. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['defaultValue' => [], 'multiple' => false, 'disabled' => false])
<div data-slot="{{ $attributes->get('data-slot', 'accordion') }}" x-data="nqAccordion(@js(array_values((array) $defaultValue)), @js((bool) $multiple))" x-modelable="value" x-id="['nq-accordion']"
    x-on:keydown="onKeydown($event)"
    @if ($disabled) data-disabled @endif
    {{ $attributes->except('data-slot')->cn('flex w-full flex-col rounded-card border border-border bg-card') }}>
    {{ $slot }}
</div>
