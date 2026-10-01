{{-- <x-nq::otp-input name="code" :length="6" />
     One-time-code entry: length boxes, paste fills them all, Backspace steps back; always left-to-right.
     value: initial code. type: numeric | alphanumeric. invalid, disabled, autofocus. name: a hidden input carries the code.
     value is x-modelable (wire:model / x-model). It fires a "complete" event with the full code: @complete="verify($event.detail)".
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['length' => 6, 'value' => '', 'type' => 'numeric', 'name' => null, 'disabled' => false, 'invalid' => false, 'autofocus' => false])
@php
    $value = substr((string) $value, 0, $length);
    $box = [
        'size-control min-h-[var(--nq-touch-min,0px)] min-w-0 rounded-control border border-input bg-card p-0 text-center text-body font-medium tabular-nums text-foreground',
        'transition-colors duration-150 ease-nq outline-none',
        'focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus',
        'data-invalid:border-nq-danger aria-invalid:border-nq-danger',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'pointer-coarse:text-[16px]',
    ];
@endphp
<div role="group" dir="ltr" data-slot="otp-input" x-data="nqOtpInput(@js($value), {{ (int) $length }}, @js($type))" x-modelable="value"
    {{ $attributes->cn('inline-flex items-center gap-2') }}>
    @for ($i = 0; $i < $length; $i++)
        <input data-slot="otp-input-box" x-bind="box({{ $i }})" type="text" value="{{ $value[$i] ?? '' }}"
            @if (isset($value[$i])) data-filled @endif
            aria-label="{{ \Nasaq\Nasaq::t('Digit '.($i + 1).' of '.$length, 'الخانة '.($i + 1).' من '.$length) }}"
            inputmode="{{ $type === 'numeric' ? 'numeric' : 'text' }}" autocomplete="one-time-code" autocapitalize="off" spellcheck="false"
            @if ($invalid) aria-invalid="true" data-invalid @endif @if ($disabled) disabled @endif @if ($autofocus && $i === 0) autofocus @endif
            class="{{ \Nasaq\Cn::merge(implode(' ', $box)) }}" />
    @endfor
    @if ($name)<input type="hidden" name="{{ $name }}" :value="value" value="{{ $value }}" />@endif
</div>
