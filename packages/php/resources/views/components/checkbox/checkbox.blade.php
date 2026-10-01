{{-- <x-nq::checkbox id="copy" checked />   <x-nq::checkbox indeterminate />   <x-nq::checkbox name="terms" value="yes" required />
     A choice applied on submit, or a row in a selection. indeterminate shows a dash (aria-checked="mixed").
     checked is x-modelable: wire:model="copy" and x-model work. With a name it submits a hidden input while checked.
     Pair it with <x-nq::field.label for="copy"> or wrap it in a <label>. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['checked' => false, 'indeterminate' => false, 'required' => false, 'name' => null, 'value' => 'on'])
@aware(['disabled' => false, 'invalid' => false])
@php
    $checked = (bool) $checked;
    $indeterminate = (bool) $indeterminate;
    $mark = $checked || $indeterminate;
    $off = ($disabled ?? false) || $attributes->flag('disabled');
@endphp
<button type="button" role="checkbox" data-slot="checkbox" x-data="nqCheckbox(@js($checked), @js($indeterminate))" x-modelable="checked" x-bind="root"
    aria-checked="{{ $indeterminate ? 'mixed' : ($checked ? 'true' : 'false') }}"
    @if ($indeterminate) data-indeterminate @elseif ($checked) data-checked @else data-unchecked @endif
    @if ($required) aria-required="true" @endif
    @if ($invalid) data-invalid aria-invalid="true" @endif
    @if ($off) disabled data-disabled @endif
    {{ $attributes->except('disabled')->cn([
        'relative inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-nq-line-strong bg-card text-primary-foreground outline-none',
        'transition-colors duration-150 ease-nq data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        // A 24px hit area around the 16px box, without changing layout.
        'after:absolute after:-inset-1',
    ]) }}>
    <span data-slot="checkbox-indicator" class="flex items-center justify-center [&_svg]:size-3 [&_svg]:stroke-3" x-show="checked || indeterminate" @unless ($mark) style="display: none" @endunless>
        <x-lucide-minus aria-hidden="true" x-show="indeterminate" :style="$indeterminate ? '' : 'display: none'" />
        <x-lucide-check aria-hidden="true" x-show="! indeterminate" :style="$indeterminate ? 'display: none' : ''" />
    </span>
    @if ($name)<input type="hidden" name="{{ $name }}" value="{{ $value }}" x-bind:disabled="! checked" @unless ($checked) disabled @endunless>@endif
</button>
