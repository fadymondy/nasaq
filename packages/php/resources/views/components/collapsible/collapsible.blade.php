{{-- <x-nq::collapsible> trigger + panel </x-nq::collapsible>
     open: start open. Bind it to Livewire with wire:model or x-model (open is x-modelable).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['open' => false])
<div data-slot="collapsible" x-data="nqCollapsible(@js((bool) $open))" x-modelable="open" x-id="['nq-collapsible']"
    :data-open="open ? '' : undefined" :data-closed="open ? undefined : ''"
    @if ($open) data-open @else data-closed @endif
    {{ $attributes }}>
    {{ $slot }}
</div>
