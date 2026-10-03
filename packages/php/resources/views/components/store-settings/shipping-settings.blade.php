{{-- <x-nq::store-settings.shipping-settings :zones="$zones" :pickups="$pickups" currency="USD" can-delete-zone can-save-pickup can-delete-pickup />
     Shipping zones with their rates (flat, by weight, by order price, free over an amount), local pickup points and a "try a destination" tester.
     zones: [['id', 'name', 'countries' => ['EG', '*'], 'cities'?, 'rates' => [['id', 'label', 'type' => flat|weight|price|free-over, 'amount'?, 'freeOver'?, 'tiers'?, 'etaDays'? => [2, 3], 'express'?, 'active'?]]]].
     pickups: [['id', 'name', 'address', 'country', 'city'?, 'fee'?, 'readyInHours'?, 'active'?]]. Money is minor units. currency: USD, or SAR in Arabic. error / loading: the list states. labels: override any string by key.
     Every zone and pickup card has a menu (edit, delete) that also opens on context-click, long-press or the Menu key.
     Saving fires "nq-shipping-save-zone" { zone }, "nq-shipping-save-pickup" { pickup }, deleting "nq-shipping-delete-zone" { zone } and "nq-shipping-delete-pickup" { pickup }; each carries waitUntil(promise), resolve(), reject(message).
     Nobody claiming the event applies the change locally; a rejection or a resolved { error } keeps the dialog open and shows the message. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-settings._words')
@props(['zones' => [], 'pickups' => [], 'currency' => null, 'canDeleteZone' => false, 'canSavePickup' => false, 'canDeletePickup' => false, 'error' => null, 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_store_settings_words($locale, (array) $labels);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $config = [
        'zones' => array_values(array_map(fn ($z) => (array) $z, (array) $zones)), 'pickups' => array_values(array_map(fn ($p) => (array) $p, (array) $pickups)),
        'currency' => $code, 'locale' => str_starts_with($locale, 'ar') ? 'ar' : 'en', 'labels' => (array) $labels,
        'canDeleteZone' => (bool) $canDeleteZone, 'canSavePickup' => (bool) $canSavePickup, 'canDeletePickup' => (bool) $canDeletePickup,
    ];
    $id = 'nq-ship-'.substr(md5(json_encode($config['zones'])), 0, 8);
    $label = 'flex flex-col gap-1.5 text-label text-foreground';
    $card = 'flex min-w-0 items-start justify-between gap-2 rounded-card border border-border bg-card p-4';
    $zoneItems = [['icon' => 'pencil', 'label' => $t['edit'], 'on' => 'openZone(z)']];
    if ($canDeleteZone) { $zoneItems[] = ['icon' => 'trash-2', 'label' => $t['delete'], 'on' => 'askZone(z)', 'danger' => true, 'sep' => true]; }
    $pickItems = [];
    if ($canSavePickup) { $pickItems[] = ['icon' => 'pencil', 'label' => $t['edit'], 'on' => 'openPickup(p)']; }
    if ($canDeletePickup) { $pickItems[] = ['icon' => 'trash-2', 'label' => $t['delete'], 'on' => 'askPickup(p)', 'danger' => true, 'sep' => $canSavePickup]; }
    $cancel = \Nasaq\Nasaq::t('Cancel', 'إلغاء');
    $saveL = \Nasaq\Nasaq::t('Save', 'حفظ');
    $remove = \Nasaq\Nasaq::t('Remove', 'إزالة');
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'shipping-settings') }}" aria-labelledby="{{ $id }}" @if ($loading) aria-busy="true" @endif x-data="nqShippingSettings(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-6') }}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="{{ $id }}" class="text-h3 text-foreground">{{ $t['shipping'] }}</h2>
        <div class="flex flex-wrap gap-2">
            @if ($canSavePickup)
                <x-nq::button type="button" size="sm" variant="secondary" x-on:click="openPickup()"><x-lucide-store aria-hidden="true" /><span>{{ $t['addPickup'] }}</span></x-nq::button>
            @endif
            <x-nq::button type="button" size="sm" x-on:click="openZone()"><x-lucide-plus aria-hidden="true" /><span>{{ $t['addZone'] }}</span></x-nq::button>
        </div>
    </div>
    @if ($error)
        <x-nq::states.error :title="$t['loadFailed']" :description="$error" />
    @elseif ($loading)
        <div class="flex flex-col gap-2"><x-nq::states.skeleton class="h-20 w-full" /><x-nq::states.skeleton class="h-20 w-full" /></div>
    @else
        <div x-show="hasOverlap" style="display: none"><x-nq::alert tone="warning" :title="$t['overlapTitle']"><span x-text="overlapText"></span></x-nq::alert></div>
        <div x-show="zones.length === 0" @if (count($config['zones']) > 0) style="display: none" @endif><x-nq::states.empty icon="truck" :title="$t['zonesEmpty']" :description="$t['zonesEmptyHint']" class="border-0" /></div>
        <ul data-slot="shipping-zones" class="grid gap-3">
            <template x-for="z in zones" :key="z.id">
                <li data-slot="shipping-zone" x-data="nqContextMenu()" x-bind="trigger" class="{{ $card }}">
                    <div class="flex min-w-0 flex-col gap-2">
                        <div class="flex flex-col"><span class="text-label font-medium text-foreground" x-text="z.name"></span><span class="text-caption text-muted-foreground" x-text="zoneRegions(z)"></span></div>
                        <ul class="flex flex-col gap-1">
                            <template x-for="r in z.rates" :key="r.id">
                                <li class="flex flex-wrap items-center gap-x-2 text-body-sm">
                                    <span class="font-medium" x-text="r.label"></span>
                                    <span class="text-muted-foreground" x-text="rateTypeText(r)"></span>
                                    <bdi dir="ltr" class="tabular-nums" x-text="rateAmount(r)"></bdi>
                                    <span class="text-caption text-muted-foreground" x-text="rateEta(r)"></span>
                                    <x-nq::badge x-show="r.express" style="display: none">{{ $t['express'] }}</x-nq::badge>
                                    <x-nq::badge x-show="r.active === false" style="display: none">{{ $t['off'] }}</x-nq::badge>
                                </li>
                            </template>
                            <li x-show="z.rates.length === 0" style="display: none" class="text-body-sm text-muted-foreground">{{ $t['noRates'] }}</li>
                        </ul>
                    </div>
                    @include('nasaq::components.store-settings._menu', ['items' => $zoneItems, 'aria' => '`'.$t['edit'].', ${z.name}`', 'slotName' => 'zone-actions'])
                </li>
            </template>
        </ul>
        <div class="flex flex-col gap-3">
            <h3 class="text-h4 text-foreground">{{ $t['pickup'] }}</h3>
            <div x-show="pickups.length === 0" @if (count($config['pickups']) > 0) style="display: none" @endif><x-nq::states.empty icon="store" :title="$t['pickupEmpty']" :description="$t['pickupEmptyHint']" class="border-0" /></div>
            <ul data-slot="shipping-pickups" class="grid gap-3">
                <template x-for="p in pickups" :key="p.id">
                    <li data-slot="shipping-pickup" x-data="nqContextMenu()" x-bind="trigger" class="{{ $card }}">
                        <div class="flex min-w-0 flex-col">
                            <span class="flex items-center gap-2 text-label font-medium text-foreground"><span x-text="p.name"></span><x-nq::badge>{{ $t['pickupBadge'] }}</x-nq::badge><x-nq::badge x-show="p.active === false" style="display: none">{{ $t['off'] }}</x-nq::badge></span>
                            <span class="text-caption text-muted-foreground" x-text="p.address"></span>
                            <span class="text-caption text-muted-foreground"><span x-text="pickupMeta(p)"></span> · <bdi dir="ltr" x-text="pickupFee(p)"></bdi></span>
                        </div>
                        @include('nasaq::components.store-settings._menu', ['items' => $pickItems, 'aria' => '`'.$t['edit'].', ${p.name}`', 'slotName' => 'pickup-actions'])
                    </li>
                </template>
            </ul>
        </div>
        <section data-slot="shipping-tester" aria-label="{{ $t['tryDestination'] }}" class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
            <h3 class="text-h4 text-foreground">{{ $t['tryDestination'] }}</h3>
            <div class="grid gap-3 sm:grid-cols-4">
                <div class="{{ $label }}"><span>{{ $t['country'] }}</span><x-nq::field.input x-model="tCountry" ltr maxlength="2" class="uppercase" /></div>
                <div class="{{ $label }}"><span>{{ $t['city'] }}</span><x-nq::field.input x-model="tCity" /></div>
                <div class="{{ $label }}"><span>{{ $t['cartTotal'] }}</span><x-nq::currency-input x-model="tSubtotal" :currency="$code" aria-label="{{ $t['cartTotal'] }}" /></div>
                <div class="{{ $label }}"><span>{{ $t['cartWeight'] }}</span><x-nq::field.input x-model="tGrams" ltr inputmode="numeric" /></div>
            </div>
            <p class="text-caption text-muted-foreground" x-text="testNote"></p>
            <ul class="flex flex-col gap-1">
                <template x-for="o in testOptions" :key="o.id">
                    <li class="flex flex-wrap items-center gap-x-2 text-body-sm"><span class="font-medium" x-text="o.label"></span><bdi dir="ltr" class="tabular-nums" x-text="o.priceText"></bdi><span class="text-caption text-muted-foreground" x-text="o.etaText"></span></li>
                </template>
            </ul>
            <p x-show="testNone" style="display: none" class="text-body-sm text-muted-foreground">{{ $t['noOptions'] }}</p>
            <ul class="flex flex-col gap-1">
                <template x-for="h in testHidden" :key="h.id"><li class="text-caption text-muted-foreground"><span x-text="h.text"></span> <bdi dir="ltr" x-text="h.more"></bdi></li></template>
            </ul>
        </section>
    @endif

    <x-nq::dialog x-model="zoneOpen">
        <x-nq::dialog.content data-slot="zone-editor" class="max-w-2xl">
            <form class="flex flex-col gap-4" novalidate x-on:submit.prevent="saveZone()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="zoneIsNew ? t.addZone : t.editZone">{{ $t['addZone'] }}</span></x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['zoneHint'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <div class="{{ $label }}"><span>{{ $t['zoneName'] }}</span><x-nq::field.input x-model="zone.name" x-bind:aria-invalid="!!zoneNameBad" /></div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="{{ $label }}"><span>{{ $t['countries'] }}</span><x-nq::tag-input x-model="zone.countries" placeholder="{{ $t['countriesPlaceholder'] }}" /><span class="text-caption text-muted-foreground">{{ $t['countriesHint'] }}</span></div>
                    <div class="{{ $label }}"><span>{{ $t['cities'] }}</span><x-nq::tag-input x-model="zone.cities" placeholder="{{ $t['citiesPlaceholder'] }}" /><span class="text-caption text-muted-foreground">{{ $t['citiesHint'] }}</span></div>
                </div>
                <div class="flex items-center justify-between gap-2"><h3 class="text-h4 text-foreground">{{ $t['rates'] }}</h3><x-nq::button type="button" size="sm" variant="secondary" x-on:click="addRate()"><x-lucide-plus aria-hidden="true" /><span>{{ $t['addRate'] }}</span></x-nq::button></div>
                <div class="flex flex-col gap-3">
                    <template x-for="r in zone.rates" :key="r.id">
                        <div data-slot="rate-editor" class="flex flex-col gap-3 rounded-card border border-border p-3">
                            <div class="grid gap-3 sm:grid-cols-2">
                                <div class="{{ $label }}"><span>{{ $t['rateName'] }}</span><x-nq::field.input x-model="r.label" placeholder="{{ $t['rateNamePlaceholder'] }}" x-bind:aria-invalid="!!rateBad(r)" /></div>
                                <div class="{{ $label }}"><span>{{ $t['rateType'] }}</span>
                                    <x-nq::native-select :options="[['value' => 'flat', 'label' => $t['rateTypes']['flat']], ['value' => 'weight', 'label' => $t['rateTypes']['weight']], ['value' => 'price', 'label' => $t['rateTypes']['price']], ['value' => 'free-over', 'label' => $t['rateTypes']['free-over']]]" aria-label="{{ $t['rateType'] }}" x-bind:value="r.type" x-on:change="setType(r, $event.target.value)" />
                                </div>
                            </div>
                            <div x-show="r.type === 'flat'" class="{{ $label }}"><span>{{ $t['price'] }}</span><x-nq::currency-input x-model="r.amount" :currency="$code" aria-label="{{ $t['price'] }}" /></div>
                            <div x-show="r.type === 'free-over'" style="display: none" class="grid gap-3 sm:grid-cols-2">
                                <div class="{{ $label }}"><span>{{ $t['freeOverAmount'] }}</span><x-nq::currency-input x-model="r.freeOver" :currency="$code" aria-label="{{ $t['freeOverAmount'] }}" /></div>
                                <div class="{{ $label }}"><span>{{ $t['belowPrice'] }}</span><x-nq::currency-input x-model="r.amount" :currency="$code" aria-label="{{ $t['belowPrice'] }}" /><span class="text-caption text-muted-foreground">{{ $t['belowPriceHint'] }}</span></div>
                            </div>
                            <div x-show="r.type === 'weight' || r.type === 'price'" style="display: none" class="flex flex-col gap-2">
                                <template x-for="(tier, i) in r.tiers" :key="i">
                                    <div data-slot="tier-row" class="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                                        <div x-show="r.type === 'weight'" class="{{ $label }}"><span>{{ $t['tierFrom'] }} ({{ $t['grams'] }})</span><x-nq::field.input x-model.number="tier.min" ltr inputmode="numeric" /></div>
                                        <div x-show="r.type === 'weight'" class="{{ $label }}"><span>{{ $t['tierTo'] }} ({{ $t['grams'] }})</span><x-nq::field.input x-model.number="tier.max" ltr inputmode="numeric" placeholder="{{ $t['andAbove'] }}" /></div>
                                        <div x-show="r.type === 'price'" style="display: none" class="{{ $label }}"><span>{{ $t['tierFrom'] }}</span><x-nq::currency-input x-model="tier.min" :currency="$code" aria-label="{{ $t['tierFrom'] }}" /></div>
                                        <div x-show="r.type === 'price'" style="display: none" class="{{ $label }}"><span>{{ $t['tierTo'] }}</span><x-nq::currency-input x-model="tier.max" :currency="$code" aria-label="{{ $t['tierTo'] }}" placeholder="{{ $t['andAbove'] }}" /></div>
                                        <div class="{{ $label }}"><span>{{ $t['tierPrice'] }}</span><x-nq::currency-input x-model="tier.amount" :currency="$code" aria-label="{{ $t['tierPrice'] }}" /></div>
                                        <x-nq::button type="button" size="icon-sm" variant="ghost" aria-label="{{ $remove }}" x-on:click="removeTier(r, i)"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                                    </div>
                                </template>
                                <div><x-nq::button type="button" size="sm" variant="ghost" x-on:click="addTier(r)"><x-lucide-plus aria-hidden="true" /><span>{{ $t['addTier'] }}</span></x-nq::button></div>
                                <p x-show="tierProblem(r)" style="display: none" role="alert" class="text-caption text-nq-danger-text" x-text="tierProblem(r)"></p>
                            </div>
                            <div class="grid gap-3 sm:grid-cols-2">
                                <div class="{{ $label }}"><span>{{ $t['etaFrom'] }}</span><x-nq::field.input x-model="r.etaFrom" ltr inputmode="numeric" /></div>
                                <div class="{{ $label }}"><span>{{ $t['etaTo'] }}</span><x-nq::field.input x-model="r.etaTo" ltr inputmode="numeric" /></div>
                            </div>
                            <div class="flex flex-wrap items-center justify-between gap-3">
                                <div class="flex flex-wrap gap-x-6 gap-y-2">
                                    <label class="flex items-center gap-2 text-body-sm"><x-nq::switch x-model="r.express" /><span>{{ $t['express'] }}</span></label>
                                    <label class="flex items-center gap-2 text-body-sm"><x-nq::switch x-model="r.active" /><span>{{ $t['active'] }}</span></label>
                                </div>
                                <x-nq::button type="button" size="sm" variant="ghost" x-on:click="removeRate(r.id)"><x-lucide-trash-2 aria-hidden="true" /><span>{{ $remove }}</span></x-nq::button>
                            </div>
                        </div>
                    </template>
                </div>
                <p x-show="zoneError" style="display: none" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text"><x-lucide-circle-x aria-hidden="true" class="size-4" /><span x-text="zoneError"></span></p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-bind:disabled="busy" x-on:click="zoneOpen = false"><span>{{ $cancel }}</span></x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="busy"><span>{{ $t['saveZone'] }}</span></x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    @if ($canSavePickup)
        <x-nq::dialog x-model="pickupOpen">
            <x-nq::dialog.content data-slot="pickup-editor" class="max-w-lg">
                <form class="flex flex-col gap-4" novalidate x-on:submit.prevent="savePickup()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title><span x-text="pickupIsNew ? t.addPickup : t.editPickup">{{ $t['addPickup'] }}</span></x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $t['pickupHint'] }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <div class="{{ $label }}"><span>{{ $t['pickupName'] }}</span><x-nq::field.input x-model="pk.name" /></div>
                    <div class="{{ $label }}"><span>{{ $t['address'] }}</span><x-nq::field.input x-model="pk.address" /></div>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="{{ $label }}"><span>{{ $t['country'] }}</span><x-nq::field.input x-model="pk.country" ltr maxlength="2" class="uppercase" /><span class="text-caption text-muted-foreground" x-text="pkCountryHint"></span></div>
                        <div class="{{ $label }}"><span>{{ $t['city'] }}</span><x-nq::field.input x-model="pk.city" /></div>
                    </div>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="{{ $label }}"><span>{{ $t['pickupFee'] }}</span><x-nq::currency-input x-model="pk.fee" :currency="$code" aria-label="{{ $t['pickupFee'] }}" /></div>
                        <div class="{{ $label }}"><span>{{ $t['readyInHoursLabel'] }}</span><x-nq::field.input x-model="pk.ready" ltr inputmode="numeric" /></div>
                    </div>
                    <label class="flex items-center gap-2 text-body-sm"><x-nq::switch x-model="pk.active" /><span>{{ $t['active'] }}</span></label>
                    <p x-show="failed" style="display: none" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text"><x-lucide-circle-x aria-hidden="true" class="size-4" /><span x-text="failed"></span></p>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-bind:disabled="busy" x-on:click="pickupOpen = false"><span>{{ $cancel }}</span></x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:disabled="busy"><span>{{ $t['savePickup'] }}</span></x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    <x-nq::dialog x-model="deleteOpen">
        <x-nq::dialog.content data-slot="shipping-delete" class="max-w-md">
            <x-nq::dialog.header>
                <x-nq::dialog.title><span x-text="deleteTitle">{{ $t['deleteZoneTitle'] }}</span></x-nq::dialog.title>
                <x-nq::dialog.description><span x-text="deleteText"></span></x-nq::dialog.description>
            </x-nq::dialog.header>
            <p x-show="failed" style="display: none" role="alert" class="text-body-sm text-nq-danger-text" x-text="failed"></p>
            <x-nq::dialog.footer>
                <x-nq::button type="button" variant="ghost" x-on:click="deleteOpen = false"><span>{{ $cancel }}</span></x-nq::button>
                <x-nq::button type="button" variant="danger" x-bind:disabled="busy" x-on:click="confirmDelete()"><span>{{ $t['delete'] }}</span></x-nq::button>
            </x-nq::dialog.footer>
        </x-nq::dialog.content>
    </x-nq::dialog>
</section>
