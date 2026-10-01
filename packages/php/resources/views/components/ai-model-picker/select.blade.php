{{-- <x-nq::ai-model-picker.select :models="[['id' => 'opus', 'label' => 'Opus 5.5'], ['id' => 'haiku', 'label' => 'Haiku 4.5']]" value="opus" name="model" />
     The compact model chooser: one select listing the models. It is what a chat composer shows; <x-nq::ai-model-picker> is the full version with effort and agent.
     value is x-modelable (x-model / wire:model get the model id). name adds a hidden input. label is the accessible name (default "Model" / "النموذج"). Classes land on the trigger.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['models' => [], 'value' => null, 'name' => null, 'disabled' => false, 'label' => null])
<x-nq::select :value="$value" :name="$name" {{ $attributes->whereStartsWith(['x-model', 'wire:model']) }}>
    <x-nq::select.trigger data-slot="ai-model-select" aria-label="{{ $label ?? \Nasaq\Nasaq::t('Model', 'النموذج') }}" :disabled="$disabled" {{ $attributes->whereDoesntStartWith(['x-model', 'wire:model']) }}>
        <x-nq::select.value />
    </x-nq::select.trigger>
    <x-nq::select.content>
        @foreach ($models as $m)
            <x-nq::select.item :value="$m['id']">{{ $m['label'] }}</x-nq::select.item>
        @endforeach
    </x-nq::select.content>
</x-nq::select>
