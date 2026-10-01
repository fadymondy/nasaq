{{-- <x-nq::switch checked />   <x-nq::switch name="alerts" />
     On/off for a setting that applies immediately. The thumb travels to the inline end, so it mirrors in RTL.
     checked is x-modelable: wire:model="alerts" and x-model work. With a name it submits a hidden input while on.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['checked' => false, 'required' => false, 'name' => null, 'value' => 'on'])
@aware(['disabled' => false, 'invalid' => false])
@php
    $checked = (bool) $checked;
    $off = ($disabled ?? false) || $attributes->flag('disabled');
@endphp
<button type="button" role="switch" data-slot="switch" x-data="nqSwitch(@js($checked))" x-modelable="checked" x-bind="root"
    aria-checked="{{ $checked ? 'true' : 'false' }}"
    @if ($checked) data-checked @else data-unchecked @endif
    @if ($required) aria-required="true" @endif
    @if ($invalid) data-invalid aria-invalid="true" @endif
    @if ($off) disabled data-disabled @endif
    {{ $attributes->except('disabled')->cn([
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-nq-line-strong p-0.5 outline-none',
        'transition-colors duration-150 ease-nq data-checked:bg-primary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
    ]) }}>
    <span data-slot="switch-thumb" @if ($checked) data-checked @else data-unchecked @endif
        x-bind:data-checked="checked ? '' : undefined" x-bind:data-unchecked="checked ? undefined : ''"
        class="block size-4 rounded-full bg-background shadow-xs data-checked:bg-primary-foreground transition-[translate] duration-150 ease-nq data-checked:translate-x-3.5 rtl:data-checked:-translate-x-3.5"></span>
    @if ($name)<input type="hidden" name="{{ $name }}" value="{{ $value }}" x-bind:disabled="! checked" @unless ($checked) disabled @endunless>@endif
</button>
