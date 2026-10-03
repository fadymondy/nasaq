{{-- <x-nq::alert-dialog.trigger variant="danger">Delete project</x-nq::alert-dialog.trigger>
     A Nasaq button (takes the button props) that opens the dialog. --}}
<x-nq::button {{ $attributes->merge(['data-slot' => 'alert-dialog-trigger', 'aria-haspopup' => 'dialog', 'x-on:click' => 'show()', ':aria-expanded' => 'open']) }}>{{ $slot }}</x-nq::button>
