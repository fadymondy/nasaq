{{-- <x-nq::sidebar-layout.trigger variant="ghost" size="sm">Customize sidebar</x-nq::sidebar-layout.trigger>
     A Nasaq button (takes the button props) that opens the customize dialog. Put it in the user menu or the sidebar footer. --}}
<x-nq::button {{ $attributes->merge(['data-slot' => 'sidebar-layout-trigger', 'aria-haspopup' => 'dialog', 'x-on:click' => 'show()', ':aria-expanded' => 'open']) }}>{{ $slot }}</x-nq::button>
