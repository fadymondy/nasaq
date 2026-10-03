{{-- <x-nq::upgrade-prompt.trigger variant="primary">Upgrade</x-nq::upgrade-prompt.trigger>
     A Nasaq button (takes the button props) that opens the upgrade dialog. Put it inside <x-nq::upgrade-prompt>. --}}
<x-nq::button {{ $attributes->merge(['data-slot' => 'dialog-trigger', 'aria-haspopup' => 'dialog', 'x-on:click' => 'show()', ':aria-expanded' => 'open']) }}>{{ $slot }}</x-nq::button>
