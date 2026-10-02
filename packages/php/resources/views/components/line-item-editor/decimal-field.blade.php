{{-- <x-nq::line-item-editor.decimal-field x-model="row.qtyMilli" :scale="3" kind="qty" aria-label="Qty" />
     Internal part of line-item-editor: a number field that keeps an integer at a fixed scale (quantity in thousandths, a percent in basis points).
     kind: qty | bps. suffix: text after the field ("%"). min / max: scaled bounds that mark the field invalid. Use x-bind:aria-label for dynamic names. --}}
@props(['scale' => 3, 'kind' => 'qty', 'min' => null, 'max' => null, 'suffix' => null, 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $options = ['scale' => (int) $scale, 'kind' => $kind, 'min' => $min, 'max' => $max, 'locale' => str_replace('_', '-', $locale)];
@endphp
<div x-data="nqLineItemDecimal(@js($options))" x-modelable="value" {{ $attributes->only(['x-model'])->cn('contents') }}>
    <x-nq::input-group class="min-w-0" x-bind:data-invalid="out ? '' : null">
        <input data-slot="{{ $attributes->get('data-slot', 'input-group-input') }}" dir="ltr" inputmode="decimal" autocomplete="off" spellcheck="false" x-bind="field"
            {{ $attributes->except('data-slot')->except(['x-model', 'class'])->cn('h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-body text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed pointer-coarse:text-[16px] text-end tabular-nums') }}>
        @if ($suffix)
            <x-nq::input-group.addon align="end"><x-nq::input-group.text>{{ $suffix }}</x-nq::input-group.text></x-nq::input-group.addon>
        @endif
    </x-nq::input-group>
</div>
