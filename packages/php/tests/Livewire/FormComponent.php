<?php

namespace Nasaq\Tests\Livewire;

use Livewire\Component;

/** A Livewire component that wires Nasaq controls with wire:model. */
class FormComponent extends Component
{
    public string $name = 'Nasaq';

    public string $bio = '';

    public bool $agree = false;

    public bool $alerts = true;

    public string $country = 'eg';

    public string $plan = 'pro';

    public int $volume = 40;

    public ?string $date = '2026-09-15';

    public bool $open = false;

    public string $type = 'bug';

    public array $rows = [['id' => 'MH-1', 'title' => 'Fix login']];

    public string $contact = 'email';

    public function render(): string
    {
        return <<<'BLADE'
        <div>
            <x-nq::field name="name">
                <x-nq::field.label>Name</x-nq::field.label>
                <x-nq::field.input wire:model.live="name" />
                <x-nq::field.textarea wire:model="bio" />
            </x-nq::field>
            <x-nq::checkbox wire:model="agree" />
            <x-nq::switch wire:model.live="alerts" />
            <x-nq::native-select wire:model.live="country" class="w-64" :options="[['value' => 'eg', 'label' => 'Egypt'], ['value' => 'sa', 'label' => 'Saudi Arabia']]" />
            <x-nq::radio-group wire:model="contact" aria-label="Contact by">
                <label><x-nq::radio-group.radio value="email" /> Email</label>
                <label><x-nq::radio-group.radio value="sms" /> SMS</label>
            </x-nq::radio-group>
            <x-nq::slider wire:model.live="volume" label="Volume" />
            <x-nq::date-picker wire:model="date" />
            <x-nq::select wire:model="type"></x-nq::select>
            <x-nq::dialog wire:model="open"></x-nq::dialog>
            <x-nq::data-table wire:model="rows" label="Issues" :columns="[['id' => 'title', 'header' => 'Title']]" :rows="$rows" />
        </div>
        BLADE;
    }
}
