{{-- <x-nq.input name="email" type="email" wire:model="email" />
     id defaults to "nq-{name}" so <x-nq.field name="…"> labels it; invalid follows $errors->has(name). --}}
@props(['name' => null, 'type' => 'text', 'invalid' => null, 'hint' => false])
@php
    $invalid = $invalid ?? ($name && isset($errors) && $errors->has($name));
    $id = $attributes->get('id', $name ? 'nq-'.$name : null);
    $described = trim(($hint && $id ? $id.'-hint ' : '').($invalid && $id ? $id.'-error' : ''));
@endphp
<input type="{{ $type }}" @if ($name) name="{{ $name }}" @endif @if ($id) id="{{ $id }}" @endif
    @if ($invalid) aria-invalid="true" @endif @if ($described) aria-describedby="{{ $described }}" @endif
    {{ $attributes->except('id')->merge(['class' => 'nq-input']) }} />
