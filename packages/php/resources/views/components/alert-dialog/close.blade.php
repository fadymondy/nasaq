{{-- <x-nq::alert-dialog.close variant="ghost">Later</x-nq::alert-dialog.close>
     A Nasaq button (takes the button props) that closes the dialog. Prefer .action and .cancel. --}}
<x-nq::button {{ $attributes->merge(['data-slot' => 'alert-dialog-close', 'x-on:click' => 'close()']) }}>{{ $slot }}</x-nq::button>
