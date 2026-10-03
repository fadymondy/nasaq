{{-- <x-nq::sheet> trigger + content </x-nq::sheet>
     A side panel (the same behaviour as <x-nq::dialog>: teleported, focus-trapped, Escape and backdrop close).
     open: start open. Bind it to Livewire with wire:model or x-model (open is x-modelable).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['open' => false])
<div data-slot="{{ $attributes->get('data-slot', 'sheet') }}" x-data="nqDialog(@js((bool) $open))" x-modelable="open" x-id="['nq-dialog']" {{ $attributes->except('data-slot')->cn('contents') }}>
    {{ $slot }}
</div>
