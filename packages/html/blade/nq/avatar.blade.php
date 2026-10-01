{{-- <x-nq.avatar :src="$user->avatar_url" :name="$user->name" size="sm" />   size: xs | sm | md | lg   shape: circle | square --}}
@props(['name', 'src' => null, 'size' => 'md', 'shape' => 'circle'])
@php
    $parts = array_slice(array_values(array_filter(preg_split('/\s+/u', trim($name)))), 0, 2);
    $initials = implode('', array_map(fn ($p) => mb_strtoupper(mb_substr($p, 0, 1)), $parts));
@endphp
<span {{ $attributes->merge(['class' => 'nq-avatar']) }} @if ($size !== 'md') data-size="{{ $size }}" @endif @if ($shape === 'square') data-shape="square" @endif>
    @if ($src)<img src="{{ $src }}" alt="{{ $name }}">@else<span role="img" aria-label="{{ $name }}">{{ $initials }}</span>@endif
</span>
