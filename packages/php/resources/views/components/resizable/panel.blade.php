{{-- <x-nq::resizable.panel id="nav" default-size="30%" min-size="15%">Navigation</x-nq::resizable.panel>
     Sizes are numbers (pixels) or strings with a unit ("30%", "20rem"). collapsible + collapsed-size let a handle fold it away with Enter. --}}
@props(['defaultSize' => null, 'minSize' => null, 'maxSize' => null, 'collapsible' => false, 'collapsedSize' => null])
@php
    $unit = fn ($v) => $v === null || $v === '' ? null : (is_numeric($v) ? $v.'px' : (string) $v);
    $initial = is_string($defaultSize) && str_ends_with(trim($defaultSize), '%') ? (float) $defaultSize : null;
@endphp
<div data-slot="resizable-panel"
    @if ($unit($defaultSize)) data-default-size="{{ $unit($defaultSize) }}" @endif
    @if ($unit($minSize)) data-min-size="{{ $unit($minSize) }}" @endif
    @if ($unit($maxSize)) data-max-size="{{ $unit($maxSize) }}" @endif
    @if ($unit($collapsedSize)) data-collapsed-size="{{ $unit($collapsedSize) }}" @endif
    @if ($collapsible) data-collapsible @endif
    style="flex:{{ $initial ?? 1 }} 1 0px;overflow:hidden"
    {{ $attributes->cn('min-w-0') }}>{{ $slot }}</div>
