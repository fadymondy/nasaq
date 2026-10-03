{{-- <x-nq::store-cart.shipping-estimator :zones="$zones" />
     "Estimate shipping": type a city, press Estimate, and the zone that delivers there shows its methods as radio cards with the cheapest picked.
     A city nobody delivers to says so. The pick drives the cart summary and fires "store-cart-shipping-change" { selection }.
     zones: [['id', 'label', 'cities' => [...], 'methods' => [['id', 'label', 'price' (minor units), 'freeOver'?, 'etaDays'? [min, max]]]]], the same list the cart was given.
     Inside the cart page. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['zones' => []])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $zones = array_values((array) $zones);
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'store-shipping-estimator') }}" x-id="['store-estimator']" x-bind:aria-labelledby="$id('store-estimator')"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-3 rounded-card border border-border bg-card p-4') }}>
    <h2 x-bind:id="$id('store-estimator')" class="text-h3 font-semibold text-foreground">{{ $t('Estimate shipping', 'تقدير الشحن') }}</h2>
    <form class="flex items-end gap-2" x-on:submit.prevent="estimate()">
        <x-nq::field class="min-w-0 flex-1">
            <x-nq::field.label>{{ $t('City', 'المدينة') }}</x-nq::field.label>
            <x-nq::field.input x-model="city" list="store-cities" placeholder="{{ $t('Type your city', 'اكتب مدينتك') }}" autocomplete="address-level2" />
        </x-nq::field>
        <datalist id="store-cities">
            @foreach ($zones as $z)
                @foreach ($z['cities'] ?? [] as $c)
                    <option value="{{ $c }}"></option>
                @endforeach
            @endforeach
        </datalist>
        <x-nq::button type="submit" variant="secondary">{{ $t('Estimate', 'احسب') }}</x-nq::button>
    </form>
    <div aria-live="polite" class="flex flex-col gap-3">
        <p x-show="noZone" style="display: none" class="flex items-center gap-2 text-body-sm text-nq-warning-text">
            <x-lucide-circle-alert aria-hidden="true" class="size-4 shrink-0" />
            <span x-text="noZoneText"></span>
        </p>
        <p x-show="zoneFound" style="display: none" class="text-caption text-muted-foreground" x-text="zoneText"></p>
        @foreach ($zones as $zi => $z)
            <x-nq::radio-group x-show="isZone({{ $zi }})" style="display: none" x-model="pickedKey" aria-label="{{ $t('Shipping estimate', 'تقدير الشحن') }}">
                @foreach ($z['methods'] ?? [] as $mi => $m)
                    <button type="button" data-slot="radio-card" x-bind="radio('{{ $zi }}:{{ $mi }}')" aria-checked="false" tabindex="-1" data-unchecked
                        class="group/card relative flex w-full cursor-pointer items-start gap-3 rounded-card border border-border bg-card p-4 text-start outline-none transition-colors duration-150 ease-nq hover:border-nq-line-strong data-checked:border-primary data-checked:bg-nq-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-disabled:cursor-not-allowed data-disabled:opacity-50">
                        <span data-slot="radio-card-mark" aria-hidden="true" class="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-nq-line-strong bg-card group-data-checked/card:border-primary group-data-checked/card:bg-primary">
                            <span class="block size-1.5 rounded-full bg-primary-foreground" x-show="isChecked('{{ $zi }}:{{ $mi }}')" style="display: none"></span>
                        </span>
                        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span data-slot="radio-card-title" class="text-label text-foreground">{{ $m['label'] }}</span>
                            <span data-slot="radio-card-description" class="text-caption text-muted-foreground">
                                <span class="flex flex-col gap-0.5">
                                    <span x-show="optionEta({{ $zi }}, {{ $mi }})" style="display: none" x-text="optionEta({{ $zi }}, {{ $mi }})"></span>
                                    <span x-show="optionNote({{ $zi }}, {{ $mi }})" style="display: none" x-text="optionNote({{ $zi }}, {{ $mi }})"></span>
                                </span>
                            </span>
                        </span>
                        <span data-slot="radio-card-meta" class="shrink-0 text-label text-foreground">
                            <span x-show="optionFree({{ $zi }}, {{ $mi }})" style="display: none" class="text-label text-nq-success-text">{{ $t('Free', 'مجاني') }}</span>
                            <span x-show="!optionFree({{ $zi }}, {{ $mi }})" class="text-label" x-text="optionCost({{ $zi }}, {{ $mi }})"></span>
                        </span>
                    </button>
                @endforeach
            </x-nq::radio-group>
        @endforeach
    </div>
</section>
