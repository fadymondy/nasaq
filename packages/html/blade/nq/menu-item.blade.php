{{-- Inside <x-nq.menu>. href renders a link; otherwise a button (use wire:click / @click). variant="danger" for destructive items. --}}
@props(['href' => null, 'variant' => null])
@php($attrs = $attributes->merge(['x-bind' => 'item', 'tabindex' => '-1'])->merge($variant ? ['data-variant' => $variant] : []))
@if ($href)
    <a href="{{ $href }}" {{ $attrs }}>{{ $slot }}</a>
@else
    <button type="button" {{ $attrs }}>{{ $slot }}</button>
@endif
