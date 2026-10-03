{{-- Internal: the basket simulator body, shared by <x-nq::store-settings.discount-simulator> and the discounts manager. Reads the simulator state from the Alpine scope. --}}
@php
    $label = 'flex flex-col gap-1.5 text-label text-foreground';
    $ship = \Nasaq\Nasaq::t('Shipping', 'الشحن');
    $total = \Nasaq\Nasaq::t('Total', 'الإجمالي');
@endphp
<h3 class="text-h4 text-foreground">{{ $t['simulator'] }}</h3>
<p class="text-caption text-muted-foreground">{{ $t['simulatorHint'] }}</p>
<div class="flex flex-col gap-2">
    <span class="text-label text-foreground">{{ $t['basket'] }}</span>
    <ul class="grid gap-1.5">
        <template x-for="p in simProducts" :key="p.id">
            <li class="flex items-center justify-between gap-2 rounded-control border border-border px-2.5 py-1.5 text-body-sm">
                <span class="flex min-w-0 flex-col"><span class="truncate" x-text="p.name"></span><bdi dir="ltr" class="text-caption text-muted-foreground" x-text="money(p.price)"></bdi></span>
                <span class="flex items-center gap-1.5">
                    <x-nq::button type="button" size="icon-sm" variant="ghost" aria-label="{{ $t['decrease'] }}" x-on:click="bump(p.id, -1)"><x-lucide-minus aria-hidden="true" /></x-nq::button>
                    <bdi dir="ltr" class="w-6 text-center tabular-nums" x-text="qtyText(p.id)"></bdi>
                    <x-nq::button type="button" size="icon-sm" variant="ghost" aria-label="{{ $t['increase'] }}" x-on:click="bump(p.id, 1)"><x-lucide-plus aria-hidden="true" /></x-nq::button>
                </span>
            </li>
        </template>
    </ul>
</div>
<div class="grid gap-3 sm:grid-cols-3">
    <div class="{{ $label }}"><span>{{ $t['shippingCharge'] }}</span><x-nq::currency-input x-model="simShipping" :currency="$code" aria-label="{{ $t['shippingCharge'] }}" /></div>
    <div class="{{ $label }}"><span>{{ $t['codesTyped'] }}</span><x-nq::field.input x-model="simCodes" ltr class="uppercase" /></div>
    <div class="{{ $label }}"><span>{{ $t['pastOrders'] }}</span><x-nq::field.input x-model="simOrders" ltr inputmode="numeric" x-on:input="onOrders()" /></div>
</div>
<p x-show="simEmpty" class="text-body-sm text-muted-foreground">{{ $t['basketEmpty'] }}</p>
<div x-show="!simEmpty" style="display: none" role="status" aria-live="polite" class="flex flex-col gap-2 text-body-sm">
    <div class="flex justify-between gap-2"><span class="text-muted-foreground">{{ $t['subtotal'] }}</span><bdi dir="ltr" class="tabular-nums" x-text="simSubtotal"></bdi></div>
    <ul class="flex flex-col gap-1">
        <template x-for="a in simApplied" :key="a.id">
            <li class="flex items-center justify-between gap-2"><span class="flex items-center gap-2"><span x-text="a.title"></span><x-nq::badge x-show="a.capped" style="display: none">{{ $t['capped'] }}</x-nq::badge><span class="text-caption text-muted-foreground" x-text="a.freeText"></span></span><bdi dir="ltr" class="tabular-nums text-nq-success-text" x-text="'−' + a.amount"></bdi></li>
        </template>
    </ul>
    <p x-show="simNothing" style="display: none" class="text-muted-foreground">{{ $t['nothingApplies'] }}</p>
    <div class="flex justify-between gap-2"><span class="text-muted-foreground">{{ $ship }}</span><span class="flex gap-2"><bdi dir="ltr" x-show="simShippingCut" style="display: none" class="tabular-nums text-muted-foreground line-through" x-text="simShippingText"></bdi><bdi dir="ltr" class="tabular-nums" x-text="simShippingAfter"></bdi></span></div>
    <div class="flex justify-between gap-2 font-semibold"><span>{{ $total }}</span><bdi dir="ltr" class="tabular-nums" x-text="simTotal"></bdi></div>
    <div x-show="simRejected.length !== 0" style="display: none" class="flex flex-col gap-1">
        <span class="text-caption font-medium text-muted-foreground">{{ $t['notApplied'] }}</span>
        <template x-for="r in simRejected" :key="r.id"><span class="text-caption text-muted-foreground" x-text="r.text"></span></template>
    </div>
</div>
