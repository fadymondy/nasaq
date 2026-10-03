{{-- <x-nq::product-detail.quantity-stepper :value="1" :max="5" x-model="quantity" />
     A minus / number / plus control for a cart quantity. value is x-modelable (x-model or wire:model). max: the most allowed
     (a hint "Only 5 available" shows when someone asks for more). disabled greys it out. Arrow keys step, Enter commits a typed
     number; Arabic digits are read. Inside <x-nq::product-detail> the root drives max and disabled from the picked variant.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => 1, 'max' => null, 'disabled' => false])
@php
    $btn = 'inline-flex h-control w-11 items-center justify-center text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent [&_svg]:size-4';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'product-quantity') }}" x-data="nqProductQuantity(@js((int) $value), @js($max))" x-modelable="value"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-1') }}>
    <div role="group" aria-label="{{ \Nasaq\Nasaq::t('Quantity', 'الكمية') }}" class="inline-flex w-fit items-center overflow-hidden rounded-control border border-border bg-card">
        <button type="button" aria-label="{{ \Nasaq\Nasaq::t('Decrease quantity', 'تقليل الكمية') }}" class="{{ $btn }}"
            x-on:click="commit(clamped - 1)" :disabled="disabled || clamped <= 1" @if ($disabled || (int) $value <= 1) disabled @endif>
            <x-lucide-minus aria-hidden="true" />
        </button>
        <input type="text" inputmode="numeric" role="spinbutton" aria-label="{{ \Nasaq\Nasaq::t('Quantity', 'الكمية') }}" aria-valuemin="1"
            @if ($max !== null) aria-valuemax="{{ $max }}" @endif aria-valuenow="{{ (int) $value }}" dir="ltr" value="{{ (int) $value }}"
            @if ($disabled) disabled @endif
            :value="display" :aria-valuemax="limit" :aria-valuenow="clamped" :disabled="disabled"
            x-on:input="onInput($event)" x-on:focus="$event.target.select()" x-on:blur="onBlur()" x-on:keydown="onKey($event)"
            class="h-control w-12 border-x border-border bg-transparent text-center text-body tabular-nums text-foreground outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-50 pointer-coarse:text-[16px]">
        <button type="button" aria-label="{{ \Nasaq\Nasaq::t('Increase quantity', 'زيادة الكمية') }}" class="{{ $btn }}"
            x-on:click="commit(clamped + 1)" :disabled="disabled || atMax" @if ($disabled || ($max !== null && (int) $value >= $max)) disabled @endif>
            <x-lucide-plus aria-hidden="true" />
        </button>
    </div>
    <p aria-live="polite" class="text-caption text-nq-warning-text sr-only" x-effect="$el.classList.toggle('sr-only', !hint)" x-text="hintText"></p>
</div>
