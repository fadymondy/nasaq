{{-- <x-nq::select name="type" value="bug"> trigger + content </x-nq::select>
     value: the starting choice. name: adds a hidden input for plain forms. multiple: pick several (value is then an array).
     Bind it to Livewire with wire:model or x-model (value is x-modelable). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => null, 'name' => null, 'multiple' => false])
<div data-slot="select" x-data="nqSelect(@js($value), @js((bool) $multiple))" x-modelable="value" x-id="['nq-select']" {{ $attributes->cn('contents') }}>
    {{ $slot }}
    @if ($name)
        <template x-if="multiple">
            <template x-for="v in value" :key="v"><input type="hidden" name="{{ $name }}[]" :value="v"></template>
        </template>
        <template x-if="!multiple"><input type="hidden" name="{{ $name }}" :value="value ?? ''"></template>
    @endif
</div>
