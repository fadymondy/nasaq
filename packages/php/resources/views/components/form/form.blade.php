{{-- <x-nq::form :errors="['email' => 'This email already has an account.']" form-error="Sign-up failed.">
         <x-nq::form.field name="email" label="Email"><x-nq::field.input type="email" /></x-nq::form.field>
         <x-nq::button type="submit" variant="primary" x-bind:disabled="submitting">Create account</x-nq::button>
     </x-nq::form>
     A <form> that connects errors to Nasaq fields by name: a <x-nq::form.field> with an error is invalid and shows the message, and it clears when the user edits it.
     errors: field name => message (or a list of messages; the first shows; empty ones are ignored). With Laravel validation: :errors="$errors->messages()".
     form-error: one error for the whole form, shown in a danger alert above the fields. The form has no behaviour of its own: it posts, or wire:submit / x-on:submit handles it.
     Scope for your own markup: errors, formError, submitting (true after submit, bind it to the button), clear(name), setErrors({ ... }, message), done(). Fires "clear-errors" ({ errors }).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['errors' => [], 'formError' => null])
@php
    $messages = collect((array) $errors)->map(fn ($m) => is_array($m) ? ($m[0] ?? null) : $m)->filter()->all();
    $init = ['errors' => (object) $messages, 'formError' => $formError];
@endphp
<form data-slot="{{ $attributes->get('data-slot', 'form') }}" novalidate x-data="nqForm({!! \Illuminate\Support\Js::from($init) !!})" x-on:submit="submit($event)" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <x-nq::alert tone="danger" x-show="formError" :style="$formError ? null : 'display: none'"><span x-text="formError">{{ $formError }}</span></x-nq::alert>
    {{ $slot }}
</form>
