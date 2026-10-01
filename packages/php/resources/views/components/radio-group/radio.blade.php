{{-- <x-nq::radio-group.radio value="email" />  One round radio. Pair it with a <label> so the text is clickable. --}}
@aware(['defaultValue' => null, 'disabled' => false])
@props(['value'])
@php
    $checked = $defaultValue !== null && (string) $defaultValue === (string) $value;
    $off = $disabled || $attributes->has('disabled');
@endphp
<button type="button" role="radio" data-slot="radio" x-bind="radio(@js((string) $value))"
    aria-checked="{{ $checked ? 'true' : 'false' }}" tabindex="{{ $checked ? 0 : -1 }}"
    @if ($checked) data-checked @else data-unchecked @endif
    @if ($off) disabled data-disabled @endif
    {{ $attributes->except('disabled')->cn([
        'relative inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-nq-line-strong bg-card outline-none',
        'transition-colors duration-150 ease-nq data-checked:border-primary data-checked:bg-primary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        // A 24px hit area around the 16px circle, without changing layout.
        'after:absolute after:-inset-1 after:rounded-full',
    ]) }}>
    <span data-slot="radio-indicator" class="block size-1.5 rounded-full bg-primary-foreground" x-show="isChecked(@js((string) $value))" @unless ($checked) style="display: none" @endunless></span>
</button>
