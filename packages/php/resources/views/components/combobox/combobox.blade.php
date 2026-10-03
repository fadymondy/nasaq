{{-- <x-nq::combobox name="country" value="sa"> control + content </x-nq::combobox>
     A typeahead over a list. value: the starting choice (an array with multiple). name: adds hidden input(s) for plain forms.
     multiple: pick several, shown as chips (use combobox.chips instead of combobox.input).
     Bind it to Livewire with wire:model or x-model (value is x-modelable). Filtering is client side and Arabic-aware.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => null, 'name' => null, 'multiple' => false])
<div data-slot="{{ $attributes->get('data-slot', 'combobox') }}" x-data="nqCombobox(@js($value), @js((bool) $multiple))" x-modelable="value" x-id="['nq-combobox']" {{ $attributes->except('data-slot')->cn('contents') }}>
    {{ $slot }}
    @if ($name)
        <template x-if="multiple">
            <template x-for="v in value" :key="v"><input type="hidden" name="{{ $name }}[]" :value="v"></template>
        </template>
        <template x-if="!multiple"><input type="hidden" name="{{ $name }}" :value="value ?? ''"></template>
    @endif
</div>
