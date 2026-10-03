{{-- <x-nq::store-checkout.address-form which="shipping" />   <x-nq::store-checkout.address-form which="billing" hide-phone />
     One address as the checkout shows it: country first, then the fields that country needs (postal code and region appear, change or go away with it; the postal code is
     normalised on blur). It lives inside <x-nq::store-checkout> and edits state.data.<which> ("shipping" | "billing"). hide-phone leaves the phone out (billing).
     labels: string overrides keyed like the checkout strings. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-checkout._strings')
@props(['which' => 'shipping', 'hidePhone' => false, 'labels' => []])
@php
    $t = nq_store_checkout_t((array) $labels);
    $a = 'state.data.'.$which;
    $p = fn (string $field) => "problem('{$which}', {$a}, '{$field}')";
    $f = fn (string $field) => 'nq-co-'.$which.'-'.$field;
@endphp
<div data-slot="store-address-form" x-bind:data-country="countryOf({{ $a }})" class="grid gap-4 sm:grid-cols-2">
    @include('nasaq::components.store-checkout._field', [
        'id' => $f('country'), 'label' => $t['country'], 'model' => $a.'.country', 'msg' => "''", 'kind' => 'select', 'class' => 'sm:col-span-2',
        'extra' => 'name="'.$which.'.country" autocomplete="country" x-on:change="countryChanged('.$a.')"',
        'options' => '<template x-for="c in countryList" x-bind:key="c.code"><option x-bind:value="c.code" x-text="c.name" x-bind:selected="c.code === '.$a.'.country"></option></template>',
    ])
    @include('nasaq::components.store-checkout._field', ['id' => $f('name'), 'label' => $t['fullName'], 'model' => $a.'.name', 'msg' => $p('name'), 'class' => $hidePhone ? 'sm:col-span-2' : '', 'extra' => 'name="'.$which.'.name" autocomplete="name"'])
    @unless ($hidePhone)
        @include('nasaq::components.store-checkout._field', ['id' => $f('phone'), 'label' => $t['phone'], 'model' => $a.'.phone', 'msg' => $p('phone'), 'ltr' => true, 'extra' => 'name="'.$which.'.phone" type="tel" inputmode="tel" autocomplete="tel" x-bind:placeholder="phonePlaceholder('.$a.')"'])
    @endunless
    @include('nasaq::components.store-checkout._field', ['id' => $f('line1'), 'label' => $t['line1'], 'model' => $a.'.line1', 'msg' => $p('line1'), 'class' => 'sm:col-span-2', 'extra' => 'name="'.$which.'.line1" autocomplete="address-line1"'])
    @include('nasaq::components.store-checkout._field', ['id' => $f('line2'), 'label' => $t['line2'], 'model' => $a.'.line2', 'msg' => $p('line2'), 'class' => 'sm:col-span-2', 'extra' => 'name="'.$which.'.line2" autocomplete="address-line2"'])
    @include('nasaq::components.store-checkout._field', ['id' => $f('city'), 'label' => $t['city'], 'model' => $a.'.city', 'msg' => $p('city'), 'extra' => 'name="'.$which.'.city" autocomplete="address-level2"'])
    <div data-slot="store-address-region" class="contents" x-show="hasRegion({{ $a }})" style="display: none">
        <div class="contents" x-show="hasRegionList({{ $a }})" style="display: none">
            @include('nasaq::components.store-checkout._field', [
                'id' => $f('region'), 'labelExpr' => 'regionLabel('.$a.')', 'model' => $a.'.region', 'msg' => $p('region'), 'kind' => 'select',
                'extra' => 'name="'.$which.'.region"',
                'options' => '<option value="">'.e($t['choose']).'</option><template x-for="r in regionList('.$a.')" x-bind:key="r.id"><option x-bind:value="r.id" x-text="r.name" x-bind:selected="r.id === '.$a.'.region"></option></template>',
            ])
        </div>
        <div class="contents" x-show="hasFreeRegion({{ $a }})" style="display: none">
            @include('nasaq::components.store-checkout._field', ['id' => $f('region-text'), 'labelExpr' => 'regionLabel('.$a.')', 'model' => $a.'.region', 'msg' => $p('region'), 'extra' => 'name="'.$which.'.region" autocomplete="address-level1"'])
        </div>
    </div>
    <div class="contents" x-show="hasPostal({{ $a }})" style="display: none">
        @include('nasaq::components.store-checkout._field', ['id' => $f('postal'), 'labelExpr' => 'postalLabel('.$a.')', 'label' => $t['postalCode'], 'model' => $a.'.postalCode', 'msg' => $p('postalCode'), 'ltr' => true, 'extra' => 'name="'.$which.'.postalCode" autocomplete="postal-code" x-bind:placeholder="postalPlaceholder('.$a.')" x-on:blur="normalizePostal('.$a.')"'])
    </div>
</div>
