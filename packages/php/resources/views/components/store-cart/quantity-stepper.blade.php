{{-- <x-nq::store-cart.quantity-stepper :value="2" :max="5" name="Everyday cotton tee" x-on:store-quantity-change="qty = $event.detail.quantity" />
     Minus, a number you can type in, plus. A spin button: Arrow Up and Down step, Home and End jump to the limits, a typed number above max is lowered
     to it, Arabic digits are read, and at the limit a note says "Only 5 available". name is the product, so the buttons read "Increase quantity of ...".
     Every change fires "store-quantity-change" { quantity } on the root. Inside a cart line it is wired for you (the line passes bind).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => 1, 'max' => null, 'min' => 1, 'name' => '', 'disabled' => false, 'bind' => false])
@php
    $top = $max === null ? null : max((int) $max, (int) $min);
    $decOff = (bool) $disabled || (int) $value <= (int) $min;
    $incOff = (bool) $disabled || ($top !== null && (int) $value >= $top);
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'store-quantity-stepper') }}" x-data="nqStoreQuantity(@js((int) $value), @js($max), @js((int) $min), @js((string) $name), @js((bool) $disabled))" x-id="['store-qty-hint']"
    @if ($bind) x-effect="sync(line)" x-on:store-quantity-change="setQuantity(line.id, $event.detail.quantity)" @endif
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-1') }}>
    <div role="group" x-bind:aria-label="groupLabel" aria-label="{{ $t('Quantity of '.$name, 'كمية '.$name) }}" class="inline-flex w-fit items-center rounded-control border border-input bg-card">
        <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t('Decrease quantity of '.$name, 'تقليل كمية '.$name) }}" x-bind:aria-label="decreaseLabel"
            x-bind:disabled="disabled || atMin" x-on:click="set(value - 1)" :disabled="$decOff">
            <x-lucide-minus aria-hidden="true" />
        </x-nq::button>
        <input role="spinbutton" type="text" inputmode="numeric" dir="ltr" aria-label="{{ $t('Quantity', 'الكمية') }}" aria-valuemin="{{ (int) $min }}" aria-valuenow="{{ (int) $value }}"
            @if ($max !== null) aria-valuemax="{{ (int) $max }}" @endif @if ($disabled) disabled @endif value="{{ (int) $value }}"
            x-bind:aria-valuemin="min" x-bind:aria-valuenow="value" x-bind:aria-valuemax="top" x-bind:aria-describedby="atMax ? $id('store-qty-hint') : null"
            x-bind:disabled="disabled" x-bind:value="display"
            x-on:input="onInput($event)" x-on:focus="$event.target.select()" x-on:blur="commit()" x-on:keydown="onKey($event)"
            class="h-control-sm w-10 border-0 bg-transparent text-center text-body tabular-nums text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus pointer-coarse:text-[16px]">
        <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t('Increase quantity of '.$name, 'زيادة كمية '.$name) }}" x-bind:aria-label="increaseLabel"
            x-bind:disabled="disabled || atMax" x-on:click="set(value + 1)" :disabled="$incOff">
            <x-lucide-plus aria-hidden="true" />
        </x-nq::button>
    </div>
    <span x-show="atMax" style="display: none" x-bind:id="$id('store-qty-hint')" class="text-caption text-muted-foreground" x-text="hintText"></span>
</div>
