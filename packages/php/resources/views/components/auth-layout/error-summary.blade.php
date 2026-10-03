{{-- <x-nq::auth-layout.error-summary :error="$error" :field-errors="['email' => 'Required']" :field-labels="['email' => 'Email']" title="Fix these" />
     The form-level error box: the server message, or the list of fields to fix. Focusable (tabindex -1). Each field line has data-focus-field="name". --}}
@props(['error' => null, 'fieldErrors' => [], 'fieldLabels' => [], 'title' => ''])
@php $entries = array_filter($fieldErrors, fn ($m) => filled($m)); @endphp
@if (! $error && ! $entries)
    <div tabindex="-1" class="sr-only"></div>
@else
    <div tabindex="-1" data-slot="auth-error-summary" class="outline-none">
        <x-nq::alert tone="danger" :title="$error ?: $title">
            @if (! $error && $entries)
                <ul class="flex list-disc flex-col gap-0.5 ps-4">
                    @foreach ($entries as $name => $message)
                        <li><button type="button" data-focus-field="{{ $name }}" class="text-start underline underline-offset-2">{{ ! empty($fieldLabels[$name]) ? $fieldLabels[$name].': ' : '' }}{{ $message }}</button></li>
                    @endforeach
                </ul>
            @endif
        </x-nq::alert>
    </div>
@endif
