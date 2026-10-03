{{-- <x-nq::toggle-group :default-value="['list']" aria-label="View mode"> <x-nq::toggle-group.toggle value="list">List</x-nq::toggle-group.toggle> ... </x-nq::toggle-group>
     A row of toggle buttons. One item is pressed at a time (a segmented control); add multiple for several (text formatting).
     value is always an array and x-modelable: wire:model works. Arrow keys follow the reading direction.
     variant: segmented (default, a tinted track, the pressed item raised) | outline (bordered, joined buttons).
     For switching panels of content use <x-nq::tabs>. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['variant' => 'segmented', 'defaultValue' => [], 'multiple' => false, 'disabled' => false, 'orientation' => 'horizontal'])
<div role="group" data-slot="{{ $attributes->get('data-slot', 'toggle-group') }}" data-variant="{{ $variant }}" data-orientation="{{ $orientation }}"
    x-data="nqToggleGroup(@js(array_values((array) $defaultValue)), @js((bool) $multiple))" x-modelable="value" x-bind="root"
    @if ($multiple) data-multiple @endif
    @if ($disabled) data-disabled @endif
    {{ $attributes->except('data-slot')->cn(['flex w-fit max-w-full', $variant === 'segmented' ? 'gap-0.5 rounded-control bg-secondary p-0.5' : 'rounded-control']) }}>
    {{ $slot }}
</div>
