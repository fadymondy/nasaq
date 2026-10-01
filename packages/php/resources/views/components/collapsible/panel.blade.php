{{-- <x-nq::collapsible.panel>Hidden content</x-nq::collapsible.panel>
     Animates height and opacity (200ms). Server-rendered open or closed to match the root. --}}
@aware(['open' => false])
<div data-slot="collapsible-panel" x-ref="panel" x-nq-presence="open" :id="$id('nq-collapsible', 'panel')"
    @if ($open) data-open @else data-closed style="display:none" @endif
    {{ $attributes->cn([
        'h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-nq motion-reduce:transition-none',
        'data-starting-style:h-0 data-starting-style:opacity-0 data-ending-style:h-0 data-ending-style:opacity-0',
    ]) }}>{{ $slot }}</div>
