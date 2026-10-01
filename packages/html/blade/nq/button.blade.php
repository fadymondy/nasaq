{{-- <x-nq.button variant="primary" size="sm" href="/new" :loading="$saving">Save</x-nq.button>
     variant: primary | secondary | ghost | danger | link   size: sm | md | lg | icon | icon-sm --}}
@props(['variant' => 'secondary', 'size' => 'md', 'href' => null, 'type' => 'button', 'loading' => false, 'full' => false])
@php
    $attrs = $attributes->merge(['class' => 'nq-button', 'data-variant' => $variant, 'data-size' => $size]);
    if ($full) $attrs = $attrs->merge(['data-full' => '']);
@endphp
@if ($href)
    <a href="{{ $href }}" {{ $attrs }}>{{ $slot }}</a>
@else
    <button type="{{ $type }}" {{ $attrs }} @if ($loading) aria-busy="true" disabled @endif>
        @if ($loading)<span class="nq-spinner" aria-hidden="true"></span>@endif
        {{ $slot }}
    </button>
@endif
