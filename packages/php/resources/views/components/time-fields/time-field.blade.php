{{-- <x-nq::time-fields.time-field x-model="time" aria-label="Remind me at" />   <x-nq::time-fields.time-field value="09:00" min="08:00" max="18:00" :step="15" name="opens" />
     A 24 hour time you type into: 930 becomes 09:30 (also 9, 9.30, 0930, 9:30 pm, Arabic digits) on blur or Enter. Arrow keys step by `step` minutes, PageUp / PageDown by an hour,
     Escape puts back the last accepted time. A time outside min / max, or text that is not a time, is refused with a message. value ("HH:mm" or empty) is x-modelable (x-model / wire:model).
     Fires a bubbling "change" ({ value }). allow-end-of-day accepts 24:00. hide-preview hides "Will be 09:30". error: a message from outside, shown in place of the built-in ones.
     disabled, read-only, required, name (a hidden input carries "HH:mm"), input-id (for <label for>), placeholder, aria-label (lands on the text input). labels: override the strings.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => null, 'min' => null, 'max' => null, 'step' => 5, 'allowEndOfDay' => false, 'hidePreview' => false, 'error' => null, 'disabled' => false, 'readOnly' => false, 'required' => false, 'name' => null, 'inputId' => null, 'placeholder' => null, 'labels' => [], 'locale' => null])
@php
    $N = \Nasaq\Nasaq::class;
    $locale ??= $N::rtl() ? 'ar' : str_replace('_', '-', app()->getLocale());
    $L = array_merge(['time' => $N::t('Time', 'الوقت'), 'placeholder' => $N::t('HH:mm', 'س:د'), 'becomes' => $N::t('Will be', 'سيصبح')], (array) $labels);
    $aria = $attributes->get('aria-label') ?? ($inputId ? null : $L['time']);
    $options = array_filter([
        'value' => $value ?: null,
        'min' => $min,
        'max' => $max,
        'step' => (int) $step,
        'allowEndOfDay' => $allowEndOfDay ? true : null,
        'hidePreview' => $hidePreview ? true : null,
        'readOnly' => $readOnly ? true : null,
        'disabled' => $disabled ? true : null,
        'error' => $error,
        'locale' => $locale,
        'labels' => $labels ?: null,
    ], fn ($v) => $v !== null);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'time-field') }}" x-data="nqTimeField({!! \Illuminate\Support\Js::from((object) $options) !!})" x-modelable="value" x-id="['nq-time']"
    {{ $attributes->except(['data-slot', 'aria-label'])->cn('flex min-w-0 flex-col gap-1') }}>
    <div class="relative">
        <x-lucide-clock aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
        <x-nq::field.input ltr x-bind="input" inputmode="numeric" autocomplete="off" spellcheck="false" :value="$value" :disabled="$disabled" :readonly="$readOnly" :required="$required"
            :id="$inputId" :aria-label="$aria" placeholder="{{ $placeholder ?? $L['placeholder'] }}" class="ps-9 tabular-nums" />
        @if ($name)<input type="hidden" name="{{ $name }}" x-bind:value="value ?? ''" value="{{ $value }}">@endif
    </div>
    <p x-bind="messageEl" class="min-h-4 text-caption empty:hidden" @unless ($error) hidden @endunless>
        <span x-bind="textEl" @unless ($error) style="display: none" @endunless>{{ $error }}</span>
        <span x-bind="previewEl" style="display: none">{{ $L['becomes'] }} <bdi dir="ltr" class="font-mono text-foreground" x-text="preview"></bdi></span>
    </p>
</div>
