{{-- <x-nq.textarea name="notes" rows="4" wire:model="notes" /> --}}
@props(['name' => null, 'invalid' => null])
@php
    $invalid = $invalid ?? ($name && isset($errors) && $errors->has($name));
    $id = $attributes->get('id', $name ? 'nq-'.$name : null);
@endphp
<textarea @if ($name) name="{{ $name }}" @endif @if ($id) id="{{ $id }}" @endif
    @if ($invalid) aria-invalid="true" aria-describedby="{{ $id }}-error" @endif
    {{ $attributes->except('id')->merge(['class' => 'nq-textarea']) }}>{{ $slot }}</textarea>
