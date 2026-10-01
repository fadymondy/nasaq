{{-- <x-nq.checkbox name="terms" label="I agree" wire:model="terms" />
     A switch: <x-nq.checkbox switch name="notify" label="Email me" />   A radio: use <input type="radio" class="nq-radio"> --}}
@props(['label' => null, 'switch' => false])
<label class="nq-choice">
    <input type="checkbox" @if ($switch) role="switch" @endif {{ $attributes->merge(['class' => $switch ? 'nq-switch' : 'nq-checkbox']) }} />
    @if ($label)<span>{{ $label }}</span>@else{{ $slot }}@endif
</label>
