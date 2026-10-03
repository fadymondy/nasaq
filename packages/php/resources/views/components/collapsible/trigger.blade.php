{{-- <x-nq::collapsible.trigger variant="ghost">Advanced settings</x-nq::collapsible.trigger>
     A Nasaq button (takes the button props) that shows and hides the panel. --}}
<x-nq::button x-bind:aria-controls="$id('nq-collapsible', 'panel')" x-bind:data-panel-open="open ? '' : undefined"
    {{ $attributes->merge(['data-slot' => 'collapsible-trigger', 'x-on:click' => 'toggle()', ':aria-expanded' => 'open']) }}>{{ $slot }}</x-nq::button>
