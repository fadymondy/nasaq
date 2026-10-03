{{-- Internal. Wraps a sidebar part in a tooltip that only shows on the collapsed desktop rail. --}}
@props(['name' => null, 'side' => 'inline-end'])
@if ($name)
    <x-nq::tooltip :content="$name" :side="$side" x-bind:class="rail && collapsed ? '' : 'hidden'">{{ $slot }}</x-nq::tooltip>
@else
    {{ $slot }}
@endif
