{{-- <x-nq::address-input :value="['street' => '']" x-model="address" />
     An address form: country, city and area comboboxes that cascade (each is disabled until its parent is chosen and resets when the parent changes),
     street and detail fields, and an optional phone field. Places come from a CircleXO-style locations API: hub (default true; a base URL string
     points it at another hub). Pages that load Alpine themselves can pass a JS data source to nqAddressInput. No map: lat and lng pass through untouched.
     value: ['country_id' => 187, 'city_id' => 10, 'area_id' => 1001, 'street', 'building', 'floor', 'apartment', 'landmark', 'postal_code', 'phone' (E.164), 'lat', 'lng'];
     snake_case keys, as the React Address. Empty optional keys are left out of the value.
     show-phone (default true), invalid, disabled, locale. labels: ['street' => 'Street name', 'empty' => '...'] overrides a built-in string (keys as the React AddressInputLabels).
     x-model / wire:model work on the address object (x-modelable="address"); each change dispatches "address-change" ({ value }).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => [], 'hub' => true, 'showPhone' => true, 'invalid' => false, 'disabled' => false, 'locale' => null, 'labels' => []])
@php
    $locale ??= app()->getLocale();
    $dir = \Nasaq\Nasaq::rtl($locale) ? 'rtl' : 'ltr';
    $address = array_merge(['street' => ''], (array) $value);
    $t = array_merge([
        'country' => \Nasaq\Nasaq::t('Country', 'الدولة'),
        'city' => \Nasaq\Nasaq::t('City', 'المدينة'),
        'area' => \Nasaq\Nasaq::t('Area', 'المنطقة'),
        'street' => \Nasaq\Nasaq::t('Street', 'الشارع'),
        'building' => \Nasaq\Nasaq::t('Building', 'المبنى'),
        'floor' => \Nasaq\Nasaq::t('Floor', 'الطابق'),
        'apartment' => \Nasaq\Nasaq::t('Apartment', 'الشقة'),
        'landmark' => \Nasaq\Nasaq::t('Landmark', 'أقرب معلم'),
        'postalCode' => \Nasaq\Nasaq::t('Postal code', 'الرمز البريدي'),
        'phone' => \Nasaq\Nasaq::t('Phone', 'الهاتف'),
        'selectCountry' => \Nasaq\Nasaq::t('Select a country', 'اختر الدولة'),
        'selectCity' => \Nasaq\Nasaq::t('Select a city', 'اختر المدينة'),
        'selectArea' => \Nasaq\Nasaq::t('Select an area', 'اختر المنطقة'),
        'clear' => \Nasaq\Nasaq::t('Clear', 'مسح'),
        'open' => \Nasaq\Nasaq::t('Open', 'فتح'),
    ], (array) $labels);
    $options = array_filter([
        'locale' => str_replace('_', '-', $locale),
        'hub' => $hub ?: null,
        'disabled' => $disabled ?: null,
        'labels' => $labels ? (array) $labels : null,
    ], fn ($v) => $v !== null);
    $uid = 'nq-address-'.\Illuminate\Support\Str::random(6);
    $places = [
        'country' => [$t['country'], $t['selectCountry']],
        'city' => [$t['city'], $t['selectCity']],
        'area' => [$t['area'], $t['selectArea']],
    ];
    $texts = [
        ['building', $t['building'], false, null],
        ['floor', $t['floor'], false, null],
        ['apartment', $t['apartment'], false, null],
        ['postal_code', $t['postalCode'], true, 'postal-code'],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'address-input') }}" dir="{{ $dir }}" lang="{{ str_replace('_', '-', $locale) }}" x-data="nqAddressInput(@js($address), @js($options))" x-modelable="address"
    @if ($invalid) data-invalid @endif
    {{ $attributes->except('data-slot')->cn('grid gap-3 sm:grid-cols-2') }}>
    @foreach ($places as $kind => [$label, $placeholder])
        <div data-slot="address-input-{{ $kind }}" :data-disabled="placeDisabled('{{ $kind }}') ? '' : null" class="group/field flex flex-col gap-1.5">
            <label data-slot="field-label" for="{{ $uid }}-{{ $kind }}" class="text-label text-foreground group-data-disabled/field:opacity-50">{{ $label }}</label>
            <div x-data="nqPlaceSelect({ options: () => placeOptions('{{ $kind }}'), value: () => address.{{ $kind }}_id, set: (v) => setPlace('{{ $kind }}', v), disabled: () => placeDisabled('{{ $kind }}'), empty: () => placeEmpty('{{ $kind }}') })" class="contents">
                <x-nq::combobox.input id="{{ $uid }}-{{ $kind }}" :invalid="(bool) $invalid" :placeholder="$placeholder" :clear-label="$t['clear']" :trigger-label="$t['open']" />
                <x-nq::combobox.content>
                    <x-nq::combobox.empty />
                    <div data-slot="combobox-list" class="outline-none">
                        <template x-if="open"><div class="contents"><template x-for="o in matches()" :key="o.value">
                            <div data-slot="combobox-item" x-bind="item(o)"
                                class="relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 text-body-sm text-foreground outline-none data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50">
                                <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
                                    <span x-show="String(cfg.value()) === String(o.value)" x-cloak class="contents"><x-lucide-check class="size-4" /></span>
                                </span>
                                <span data-slot="combobox-item-text" class="min-w-0 flex-1 truncate">
                                    @if ($kind === 'country')
                                        <span class="flex items-center gap-2">
                                            <span data-slot="country-flag" aria-hidden="true" x-data="nqCountryFlag(o.iso || '')" x-html="svg"
                                                class="relative inline-block aspect-[3/2] h-[1em] shrink-0 overflow-hidden rounded-[2px] bg-muted align-[-0.125em] text-[1rem] [&>svg]:block [&>svg]:size-full after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-foreground/15 after:ring-inset"></span>
                                            <span class="min-w-0 flex-1 truncate" x-text="o.label"></span>
                                        </span>
                                    @else
                                        <span x-text="o.label"></span>
                                    @endif
                                </span>
                            </div>
                        </template></div></template>
                    </div>
                </x-nq::combobox.content>
            </div>
        </div>
    @endforeach
    <x-nq::field data-slot="address-input-street" :disabled="(bool) $disabled" :invalid="(bool) $invalid" class="sm:col-span-2">
        <x-nq::field.label>{{ $t['street'] }}</x-nq::field.label>
        <x-nq::field.input x-model="address.street" autocomplete="address-line1" />
    </x-nq::field>
    @foreach ($texts as [$key, $label, $ltr, $autocomplete])
        <x-nq::field data-slot="address-input-{{ str_replace('_', '-', $key) }}" :disabled="(bool) $disabled">
            <x-nq::field.label>{{ $label }}</x-nq::field.label>
            <x-nq::field.input x-model="address.{{ $key }}" :ltr="$ltr" :autocomplete="$autocomplete" />
        </x-nq::field>
    @endforeach
    <div class="sm:col-span-2">
        <x-nq::field data-slot="address-input-landmark" :disabled="(bool) $disabled">
            <x-nq::field.label>{{ $t['landmark'] }}</x-nq::field.label>
            <x-nq::field.input x-model="address.landmark" />
        </x-nq::field>
    </div>
    @if ($showPhone)
        <x-nq::field data-slot="address-input-phone" :disabled="(bool) $disabled" class="sm:col-span-2">
            <x-nq::field.label>{{ $t['phone'] }}</x-nq::field.label>
            <x-nq::phone-input x-model="address.phone" :value="$address['phone'] ?? ''" :locale="$locale" :disabled="(bool) $disabled" :invalid="(bool) $invalid" :aria-label="$t['phone']" />
        </x-nq::field>
    @endif
</div>
