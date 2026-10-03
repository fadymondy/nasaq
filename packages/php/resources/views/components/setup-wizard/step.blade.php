{{-- <x-nq::setup-wizard.step id="name"> ...your form... </x-nq::setup-wizard.step>
     One step's body inside <x-nq::setup-wizard>: shown only while its step is the current one. id matches the id in the wizard's steps. --}}
@aware(['steps' => [], 'current' => 0])
@props(['id'])
@php
    $list = array_values($steps);
    $shown = (string) ($list[(int) $current]['id'] ?? '') === (string) $id;
@endphp
<div data-slot="setup-wizard-step" data-step-id="{{ $id }}" x-show="stepId() === '{{ $id }}'" @style(['display: none' => ! $shown]) {{ $attributes->cn('flex flex-col gap-4') }}>
    {{ $slot }}
</div>
