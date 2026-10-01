{{-- <x-nq.select name="status" :options="['open' => 'Open', 'closed' => 'Closed']" placeholder="Choose…" wire:model="status" /> --}}
@props(['name' => null, 'options' => [], 'placeholder' => null, 'value' => null, 'invalid' => null])
@php
    $invalid = $invalid ?? ($name && isset($errors) && $errors->has($name));
    $id = $attributes->get('id', $name ? 'nq-'.$name : null);
@endphp
<select @if ($name) name="{{ $name }}" @endif @if ($id) id="{{ $id }}" @endif
    @if ($invalid) aria-invalid="true" aria-describedby="{{ $id }}-error" @endif
    {{ $attributes->except('id')->merge(['class' => 'nq-select']) }}>
    @if ($placeholder)<option value="" disabled @selected($value === null)>{{ $placeholder }}</option>@endif
    @foreach ($options as $key => $label)
        <option value="{{ $key }}" @selected((string) $value === (string) $key)>{{ $label }}</option>
    @endforeach
    {{ $slot }}
</select>
