{{-- <x-nq::store-settings.tax-settings :rates="$rates" currency="USD" can-delete />
     Tax rates by country and region (inclusive or added on top, optionally on shipping), a duplicate-region warning and a calculator that shows the tax on a sample order.
     rates: [['id', 'name', 'country' => 'EG', 'region'?, 'bps' => 1400 (basis points: 1400 is 14%), 'inclusive', 'onShipping'?, 'active'?]]. currency: USD, or SAR in Arabic. error / loading: the list states.
     Each row has a menu (edit, turn on or off, delete) that also opens on context-click, long-press or the Menu key. labels: override any string by key.
     Saving or toggling fires "nq-tax-save" { rate }, deleting "nq-tax-delete" { rate }; each carries waitUntil(promise), resolve(), reject(message).
     Nobody claiming the event applies the change locally; a rejection or a resolved { error } keeps the dialog open and shows the message. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-settings._words')
@props(['rates' => [], 'currency' => null, 'canDelete' => false, 'error' => null, 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_store_settings_words($locale, (array) $labels);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $config = ['rates' => array_values(array_map(fn ($r) => (array) $r, (array) $rates)), 'currency' => $code, 'locale' => str_starts_with($locale, 'ar') ? 'ar' : 'en', 'labels' => (array) $labels, 'canDelete' => (bool) $canDelete];
    $id = 'nq-tax-'.substr(md5(json_encode($config['rates'])), 0, 8);
    $label = 'flex flex-col gap-1.5 text-label text-foreground';
    $th = 'px-3 py-2 text-start text-caption font-medium text-muted-foreground';
    $td = 'px-3 py-2.5 text-body-sm text-foreground';
    $items = [
        ['icon' => 'pencil', 'label' => $t['edit'], 'on' => 'openEditor(r)'],
        ['icon' => 'power', 'label' => $t['disable'], 'on' => 'toggle(r)', 'if' => "r.active !== false", 'sep' => true],
        ['icon' => 'power', 'label' => $t['enable'], 'on' => 'toggle(r)', 'if' => "r.active === false", 'sep' => true],
    ];
    if ($canDelete) { $items[] = ['icon' => 'trash-2', 'label' => $t['delete'], 'on' => 'openDelete(r)', 'danger' => true, 'sep' => true]; }
    $cancel = \Nasaq\Nasaq::t('Cancel', 'إلغاء');
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'tax-settings') }}" aria-labelledby="{{ $id }}" @if ($loading) aria-busy="true" @endif x-data="nqTaxSettings(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="{{ $id }}" class="text-h3 text-foreground">{{ $t['taxRates'] }}</h2>
        <x-nq::button type="button" size="sm" x-on:click="openEditor()"><x-lucide-plus aria-hidden="true" /><span>{{ $t['addTax'] }}</span></x-nq::button>
    </div>
    <x-nq::field.input type="search" class="max-w-60" aria-label="{{ $t['searchTax'] }}" placeholder="{{ $t['searchTax'] }}" x-model="query" />
    <div x-show="hasDupes" style="display: none"><x-nq::alert tone="warning" :title="$t['taxOverlapTitle']"><span x-text="dupesText"></span></x-nq::alert></div>
    <p x-show="listError" style="display: none" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text"><x-lucide-circle-x aria-hidden="true" class="size-4" /><span x-text="listError"></span></p>
    @if ($error)
        <x-nq::states.error :title="$t['loadFailed']" :description="$error" />
    @elseif ($loading)
        <div class="flex flex-col gap-2"><x-nq::states.skeleton class="h-10 w-full" /><x-nq::states.skeleton class="h-10 w-full" /></div>
    @else
        <div x-show="visible.length === 0" @if (count($config['rates']) > 0) style="display: none" @endif><x-nq::states.empty icon="percent" :title="$t['taxEmpty']" :description="$t['taxEmptyHint']" class="border-0" /></div>
        <div x-show="visible.length !== 0" @if (count($config['rates']) === 0) style="display: none" @endif data-slot="tax-table" class="relative w-full overflow-x-auto rounded-card border border-border bg-card">
            <div role="table" aria-label="{{ $t['taxRates'] }}" class="table w-full min-w-[40rem] border-collapse">
                <div role="rowgroup" class="table-header-group border-b border-border">
                    <div role="row" class="table-row">
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['taxName'] }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['region'] }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['rate'] }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['mode'] }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['onShipping'] }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['statusCol'] }}</div>
                        <div role="columnheader" class="table-cell w-10"></div>
                    </div>
                </div>
                <div role="rowgroup" class="table-row-group divide-y divide-border">
                    <template x-for="r in visible" :key="r.id">
                        <div role="row" data-slot="tax-row" x-data="nqContextMenu()" x-bind="trigger" class="table-row">
                            <div role="cell" class="table-cell {{ $td }} font-medium" x-text="r.name"></div>
                            <div role="cell" class="table-cell {{ $td }}" x-text="regionText(r)"></div>
                            <div role="cell" class="table-cell {{ $td }} tabular-nums"><bdi dir="ltr" x-text="pct(r.bps)"></bdi></div>
                            <div role="cell" class="table-cell {{ $td }}" x-text="modeText(r)"></div>
                            <div role="cell" class="table-cell {{ $td }}" x-text="r.onShipping ? t.yes : t.no"></div>
                            <div role="cell" class="table-cell {{ $td }}">
                                <x-nq::status tone="success" x-show="r.active !== false" style="display: none"><span x-text="statusText(r)"></span></x-nq::status>
                                <x-nq::status tone="neutral" x-show="r.active === false" style="display: none"><span x-text="statusText(r)"></span></x-nq::status>
                            </div>
                            <div role="cell" class="table-cell px-1">
                                @include('nasaq::components.store-settings._menu', ['items' => $items, 'aria' => '`'.$t['edit'].', ${r.name}`', 'slotName' => 'tax-actions'])
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    @endif

    <section data-slot="tax-calculator" aria-label="{{ $t['tryTax'] }}" class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <h3 class="text-h4 text-foreground">{{ $t['tryTax'] }}</h3>
        <div class="grid gap-3 sm:grid-cols-4">
            <div class="{{ $label }}"><span>{{ $t['country'] }}</span><x-nq::field.input x-model="cCountry" ltr maxlength="2" class="uppercase" /></div>
            <div class="{{ $label }}"><span>{{ $t['regionOptional'] }}</span><x-nq::field.input x-model="cRegion" /></div>
            <div class="{{ $label }}"><span>{{ $t['goods'] }}</span><x-nq::currency-input x-model="cGoods" :currency="$code" aria-label="{{ $t['goods'] }}" /></div>
            <div class="{{ $label }}"><span>{{ $t['shippingCharge'] }}</span><x-nq::currency-input x-model="cShipping" :currency="$code" aria-label="{{ $t['shippingCharge'] }}" /></div>
        </div>
        <p x-show="!cRate" class="text-body-sm text-muted-foreground">{{ $t['noTaxRate'] }}</p>
        <dl x-show="cRate" style="display: none" class="grid gap-1 text-body-sm">
            <p class="text-caption text-muted-foreground" x-text="cHead"></p>
            <div class="flex justify-between gap-2"><dt>{{ $t['taxAmount'] }}</dt><dd><bdi dir="ltr" class="tabular-nums" x-text="money(cTax.tax)"></bdi></dd></div>
            <div class="flex justify-between gap-2"><dt>{{ $t['netAmount'] }}</dt><dd><bdi dir="ltr" class="tabular-nums" x-text="money(cSplit ? cSplit.net : 0)"></bdi></dd></div>
            <div class="flex justify-between gap-2"><dt>{{ $t['addedToTotal'] }}</dt><dd><bdi dir="ltr" class="tabular-nums" x-text="money(cTax.added)"></bdi></dd></div>
            <div class="flex justify-between gap-2 font-semibold"><dt>{{ $t['customerPays'] }}</dt><dd><bdi dir="ltr" class="tabular-nums" x-text="money(cTax.total)"></bdi></dd></div>
        </dl>
    </section>

    <x-nq::dialog x-model="editorOpen">
        <x-nq::dialog.content data-slot="tax-editor" class="max-w-lg">
            <form class="flex flex-col gap-4" novalidate x-on:submit.prevent="save()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="isNew ? t.addTax : t.editTax">{{ $t['addTax'] }}</span></x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['taxHint'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <div class="{{ $label }}"><span>{{ $t['taxName'] }}</span><x-nq::field.input x-model="d.name" placeholder="{{ $t['taxNamePlaceholder'] }}" x-bind:aria-invalid="!!nameBad" /></div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="{{ $label }}"><span>{{ $t['country'] }}</span><x-nq::field.input x-model="d.country" ltr maxlength="2" class="uppercase" x-bind:aria-invalid="!!countryBad" /><span class="text-caption text-muted-foreground" x-text="countryHint"></span></div>
                    <div class="{{ $label }}"><span>{{ $t['regionOptional'] }}</span><x-nq::field.input x-model="d.region" /><span class="text-caption text-muted-foreground">{{ $t['regionHint'] }}</span></div>
                </div>
                <div class="{{ $label }}"><span>{{ $t['ratePercent'] }}</span><x-nq::field.input x-model="d.percent" ltr inputmode="decimal" x-bind:aria-invalid="!!percentBad" /><span class="text-caption text-muted-foreground" x-text="rateHint"></span></div>
                <div class="flex flex-col gap-2">
                    <label class="flex items-center gap-2 text-body-sm"><x-nq::switch x-model="d.inclusive" /><span>{{ $t['inclusive'] }}</span></label>
                    <p class="text-caption text-muted-foreground"><span x-show="d.inclusive">{{ $t['inclusiveHint'] }}</span><span x-show="!d.inclusive" style="display: none">{{ $t['exclusiveHint'] }}</span></p>
                    <label class="flex items-center gap-2 text-body-sm"><x-nq::switch x-model="d.onShipping" /><span>{{ $t['onShipping'] }}</span></label>
                    <label class="flex items-center gap-2 text-body-sm"><x-nq::switch x-model="d.active" /><span>{{ $t['enableTax'] }}</span></label>
                </div>
                <p x-show="failed" style="display: none" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text"><x-lucide-circle-x aria-hidden="true" class="size-4" /><span x-text="failed"></span></p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-bind:disabled="busy" x-on:click="editorOpen = false"><span>{{ $cancel }}</span></x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="busy"><span>{{ $t['saveTax'] }}</span></x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    @if ($canDelete)
        <x-nq::dialog x-model="deleteOpen">
            <x-nq::dialog.content data-slot="tax-delete" class="max-w-md">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['deleteTaxTitle'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description><span x-text="deleteText"></span></x-nq::dialog.description>
                </x-nq::dialog.header>
                <p x-show="failed" style="display: none" role="alert" class="text-body-sm text-nq-danger-text" x-text="failed"></p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="deleteOpen = false"><span>{{ $cancel }}</span></x-nq::button>
                    <x-nq::button type="button" variant="danger" x-bind:disabled="busy" x-on:click="confirmDelete()"><span>{{ $t['delete'] }}</span></x-nq::button>
                </x-nq::dialog.footer>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
</section>
