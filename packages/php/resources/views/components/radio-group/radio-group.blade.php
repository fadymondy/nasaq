{{-- <x-nq::radio-group default-value="email" aria-label="Contact by"> <label><x-nq::radio-group.radio value="email" /> Email</label> ... </x-nq::radio-group>
     Pick exactly one option. Arrow keys move and select, following the reading direction. value is x-modelable: wire:model works.
     Put it inside <x-nq::field> and name it with <x-nq::field.label>, or give it aria-label / aria-labelledby.
     With a name it submits a hidden input. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['defaultValue' => null, 'required' => false, 'name' => null, 'orientation' => 'vertical'])
@aware(['disabled' => false, 'invalid' => false])
<div role="radiogroup" data-slot="radio-group" aria-orientation="{{ $orientation }}" x-data="nqRadioGroup(@js($defaultValue))" x-modelable="value" x-bind="root"
    @if ($required) aria-required="true" @endif
    @if ($invalid) data-invalid aria-invalid="true" @endif
    @if ($disabled || $attributes->has('disabled')) aria-disabled="true" data-disabled @endif
    {{ $attributes->except('disabled')->cn('flex flex-col gap-2') }}>
    {{ $slot }}
    @if ($name)<input type="hidden" name="{{ $name }}" x-bind:value="value ?? ''" value="{{ $defaultValue }}" @if ($defaultValue === null) disabled @endif x-bind:disabled="value == null">@endif
</div>
