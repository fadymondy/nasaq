{{-- <x-nq.field name="email" label="Email" hint="Work address" required>
         <x-nq.input name="email" type="email" wire:model="email" />
     </x-nq.field>
     The label points at id "nq-{name}" (what x-nq.input/textarea/select use). The error comes from
     Laravel's $errors bag for `name`, or pass error="…". --}}
@props(['name' => null, 'label' => null, 'hint' => null, 'error' => null, 'required' => false])
@php
    $id = $name ? 'nq-'.$name : null;
    $error = $error ?? ($name && isset($errors) ? $errors->first($name) : null);
@endphp
<div {{ $attributes->merge(['class' => 'nq-field']) }}>
    @if ($label)
        <label class="nq-field-label" @if ($id) for="{{ $id }}" @endif>{{ $label }}@if ($required)<span aria-hidden="true"> *</span>@endif</label>
    @endif
    {{ $slot }}
    @if ($hint)<p class="nq-field-description" @if ($id) id="{{ $id }}-hint" @endif>{{ $hint }}</p>@endif
    @if ($error)<p class="nq-field-error" @if ($id) id="{{ $id }}-error" @endif role="alert">{{ $error }}</p>@endif
</div>
