{{-- <x-nq::field name="project"> <x-nq::field.label>Project name</x-nq::field.label> <x-nq::field.input /> <x-nq::field.description>…</x-nq::field.description> </x-nq::field>
     Wires a label, a control, a description and an error together (for/id, aria-describedby, aria-invalid).
     invalid shows <x-nq::field.error> and marks the control; it is x-modelable, so wire:model / x-model can drive it.
     Needs the Alpine runtime (@nasaqScripts) for the id wiring. --}}
@props(['name' => null, 'invalid' => false, 'disabled' => false])
@php $invalid = (bool) $invalid; @endphp
<div data-slot="field" x-data="nqField(@js($invalid))" x-modelable="invalid" x-id="['nq-field']"
    @if ($disabled) data-disabled @endif
    @if ($invalid) data-invalid @else data-valid @endif
    {{ $attributes->cn('flex flex-col gap-1.5') }}>
    {{ $slot }}
</div>
