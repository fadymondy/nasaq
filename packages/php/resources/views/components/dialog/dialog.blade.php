{{-- <x-nq::dialog> trigger + content </x-nq::dialog>
     open: start open. Bind it to Livewire with wire:model or x-model (open is x-modelable).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['open' => false])
<div data-slot="{{ $attributes->get('data-slot', 'dialog') }}" x-data="nqDialog(@js((bool) $open))" x-modelable="open" x-id="['nq-dialog']" {{ $attributes->except('data-slot')->cn('contents') }}>
    {{ $slot }}
</div>
