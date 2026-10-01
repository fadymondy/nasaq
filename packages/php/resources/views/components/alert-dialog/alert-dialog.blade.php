{{-- <x-nq::alert-dialog> trigger + content </x-nq::alert-dialog>
     A confirmation that interrupts: modal, no × button, no outside-press dismissal. For the common "button that asks
     first" use <x-nq::alert-dialog.confirm-button>.
     open: start open. Bind it to Livewire with wire:model or x-model (open is x-modelable).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['open' => false])
<div data-slot="alert-dialog" x-data="nqAlertDialog(@js((bool) $open))" x-modelable="open" x-id="['nq-alert-dialog']" {{ $attributes->cn('contents') }}>
    {{ $slot }}
</div>
