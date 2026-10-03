{{-- <x-nq::alert-dialog.action wire:click="delete">Delete</x-nq::alert-dialog.action>
     The confirming button. A close that looks like a button (default variant "danger"), so pressing it closes the dialog.
     Add wire:click, x-on:click or @click to act as well. --}}
@props(['variant' => 'danger'])
<x-nq::button :variant="$variant" {{ $attributes->merge(['data-slot' => 'alert-dialog-action', 'x-on:click.capture' => 'close()']) }}>{{ $slot }}</x-nq::button>
