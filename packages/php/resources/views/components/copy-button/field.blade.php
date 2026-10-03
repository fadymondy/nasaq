{{-- <x-nq::copy-button.field value="https://nasaq.app/invite/9" label="Invite link" />
     A read-only field with a copy button, for API keys, invite links and URLs. The value is always left-to-right, also in
     Arabic, and selects on focus. label names the input; copy-label and copied-label go to the button. --}}
@props(['value', 'label' => null, 'copyLabel' => null, 'copiedLabel' => null])
<div data-slot="copy-field" class="contents">
    <x-nq::input-group {{ $attributes }}>
        <x-nq::input-group.input readonly ltr value="{{ $value }}" aria-label="{{ $label }}" x-on:focus="$el.select()" />
        <x-nq::input-group.addon align="end">
            <x-nq::copy-button :value="$value" :label="$copyLabel" :copied-label="$copiedLabel" />
        </x-nq::input-group.addon>
    </x-nq::input-group>
</div>
