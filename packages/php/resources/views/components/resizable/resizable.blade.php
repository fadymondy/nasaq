{{-- <x-nq::resizable orientation="horizontal"> panels and handles </x-nq::resizable>
     The group fills its parent (size-full), so the parent needs a height.
     orientation: horizontal (default, side by side) | vertical (stacked). In RTL the first panel sits on the right.
     id: persist the layout in localStorage. keyboard-resize-by: arrow-key step in percent (default 10).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['orientation' => 'horizontal', 'id' => null, 'keyboardResizeBy' => 10])
@php
    $orientation = $orientation === 'vertical' ? 'vertical' : 'horizontal';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'resizable-group') }}" data-orientation="{{ $orientation }}"
    x-data="nqResizable(@js(['orientation' => $orientation, 'id' => $id, 'keyboardResizeBy' => (int) $keyboardResizeBy]))"
    style="display:flex;flex-direction:{{ $orientation === 'vertical' ? 'column' : 'row' }};overflow:hidden"
    {{ $attributes->except('data-slot')->cn('size-full') }}>
    {{ $slot }}
</div>
