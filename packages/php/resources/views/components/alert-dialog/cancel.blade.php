{{-- <x-nq::alert-dialog.cancel>Keep project</x-nq::alert-dialog.cancel>
     The dismissing button (default variant "ghost"). Put it first in the footer; it takes initial focus so Enter never destroys. --}}
@props(['variant' => 'ghost'])
<x-nq::button :variant="$variant" {{ $attributes->merge(['data-slot' => 'alert-dialog-cancel', 'autofocus' => true, 'x-on:click' => 'close()']) }}>{{ $slot }}</x-nq::button>
