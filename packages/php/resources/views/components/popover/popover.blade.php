{{-- <x-nq::popover> trigger + content </x-nq::popover>
     open: start open. Bind it to Livewire with wire:model or x-model (open is x-modelable).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['open' => false])
<div data-slot="{{ $attributes->get('data-slot', 'popover') }}" x-data="nqPopover(@js((bool) $open))" x-modelable="open" x-id="['nq-popover']" {{ $attributes->except('data-slot')->cn('contents') }}>
    {{ $slot }}
</div>
