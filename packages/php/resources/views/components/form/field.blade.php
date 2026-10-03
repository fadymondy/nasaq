{{-- <x-nq::form.field name="email" label="Email" description="We never share it."> <x-nq::field.input type="email" /> </x-nq::form.field>
     Label, control, description and error for one field of <x-nq::form>, wired by name. The control is the slot (a field.input, field.textarea, a picker ...).
     invalid forces the invalid state (the form's error for the name also sets it). disabled dims the field. Typing in the control clears its error. --}}
@aware(['errors' => []])
@props(['name', 'label' => null, 'description' => null, 'invalid' => null, 'disabled' => false])
@php
    $messages = collect((array) $errors)->map(fn ($m) => is_array($m) ? ($m[0] ?? null) : $m)->filter()->all();
    $error = $messages[$name] ?? null;
@endphp
<x-nq::field :name="$name" :invalid="$invalid ?? filled($error)" :disabled="$disabled" :data-name="$name" x-effect="invalid = Boolean(errors[$root.dataset.name])"
    x-on:input="clear($root.dataset.name)" x-on:change="clear($root.dataset.name)" {{ $attributes }}>
    @if ($label)
        <x-nq::field.label>{{ $label }}</x-nq::field.label>
    @endif
    {{ $slot }}
    @if ($description)
        <x-nq::field.description>{{ $description }}</x-nq::field.description>
    @endif
    <x-nq::field.error><span x-text="errors[$root.dataset.name] ?? ''">{{ $error }}</span></x-nq::field.error>
</x-nq::field>
