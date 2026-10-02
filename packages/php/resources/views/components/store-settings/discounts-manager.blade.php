{{-- <x-nq::store-settings.discounts-manager :discounts="$discounts" :products="$products" :usage="['d1' => 12]" currency="USD" now="2026-09-29T09:00:00" can-delete />
     Discounts: percentage off, amount off, buy X get Y and free shipping, each automatic or by code. A searchable list with kind and status filters, an editor (scope, requirements, customers,
     schedule, limits, what it combines with) and, when products are given, a basket simulator. Each row has a menu (edit, duplicate, turn on or off, delete) that also opens on context-click, long-press or the Menu key.
     discounts: [['id', 'title', 'method' => automatic|code, 'code'?, 'kind' => percentage|fixed|bxgy|free-shipping, 'value'? (basis points for percentage, minor units for fixed), 'perItem'?, 'maxDiscount'?, 'scope'?, 'bxgy'?,
     'minSubtotal'?, 'minQuantity'?, 'customers'?, 'firstOrderOnly'?, 'startsAt'?, 'endsAt'?, 'limits'? => ['total', 'perCustomer'], 'combinesWith' => ['product', 'order', 'shipping'], 'active'?]].
     products: [['id', 'name', 'variants' => [['id', 'price']]]]. collections: [['id', 'name', 'productIds']]. segments: ['vip']. usage: ['discountId' => times used]. now: an ISO date-time treated as now.
     currency: USD, or SAR in Arabic. can-delete: show Delete. error / loading: the list states. labels: override any string by key.
     Saving or toggling fires "nq-discount-save" { discount }, deleting "nq-discount-delete" { discount }; each carries waitUntil(promise), resolve(), reject(message).
     Nobody claiming the event applies the change locally; a rejection or a resolved { error } keeps the dialog open and shows the message. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-settings._words')
@props(['discounts' => [], 'products' => [], 'collections' => [], 'segments' => [], 'usage' => [], 'currency' => null, 'now' => null, 'canDelete' => false, 'error' => null, 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_store_settings_words($locale, (array) $labels);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $config = [
        'discounts' => array_values(array_map(fn ($d) => (array) $d, (array) $discounts)), 'products' => array_values((array) $products), 'collections' => array_values((array) $collections), 'segments' => array_values((array) $segments),
        'usage' => (object) (array) $usage, 'currency' => $code, 'locale' => str_starts_with($locale, 'ar') ? 'ar' : 'en', 'labels' => (array) $labels, 'now' => $now, 'canDelete' => (bool) $canDelete,
    ];
    $hasProducts = count((array) $products) > 0;
    $id = 'nq-disc-'.substr(md5(json_encode($config['discounts'])), 0, 8);
    $label = 'flex flex-col gap-1.5 text-label text-foreground';
    $hint = 'text-caption text-muted-foreground';
    $th = 'px-3 py-2 text-start text-caption font-medium text-muted-foreground';
    $thNum = 'px-3 py-2 text-end text-caption font-medium text-muted-foreground';
    $td = 'px-3 py-2.5 text-body-sm text-foreground';
    $items = [
        ['icon' => 'pencil', 'label' => $t['edit'], 'on' => 'openEditor(d)'],
        ['icon' => 'copy', 'label' => $t['duplicate'], 'on' => 'openEditor(d, true)'],
        ['icon' => 'power', 'label' => $t['disable'], 'on' => 'toggle(d)', 'if' => 'd.active !== false', 'sep' => true],
        ['icon' => 'power', 'label' => $t['enable'], 'on' => 'toggle(d)', 'if' => 'd.active === false', 'sep' => true],
    ];
    if ($canDelete) { $items[] = ['icon' => 'trash-2', 'label' => $t['delete'], 'on' => 'openDelete(d)', 'danger' => true, 'sep' => true]; }
    $cancel = \Nasaq\Nasaq::t('Cancel', 'إلغاء');
    $all = \Nasaq\Nasaq::t('All', 'الكل');
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'discounts-manager') }}" aria-labelledby="{{ $id }}" @if ($loading) aria-busy="true" @endif x-data="nqDiscountsManager(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="{{ $id }}" class="text-h3 text-foreground">{{ $t['discounts'] }}</h2>
        <x-nq::button type="button" size="sm" x-on:click="openEditor()"><x-lucide-plus aria-hidden="true" /><span>{{ $t['addDiscount'] }}</span></x-nq::button>
    </div>
    <div class="flex flex-wrap items-center gap-2">
        <x-nq::field.input type="search" class="max-w-60" aria-label="{{ $t['searchDiscounts'] }}" placeholder="{{ $t['searchDiscounts'] }}" x-model="query" />
        <x-nq::select value="all" x-model="kindFilter">
            <x-nq::select.trigger aria-label="{{ $t['type'] }}" class="w-44"><x-nq::select.value /></x-nq::select.trigger>
            <x-nq::select.content>
                <x-nq::select.item value="all">{{ $all }}</x-nq::select.item>
                @foreach (['percentage', 'fixed', 'bxgy', 'free-shipping'] as $k)<x-nq::select.item :value="$k">{{ $t['kinds'][$k] }}</x-nq::select.item>@endforeach
            </x-nq::select.content>
        </x-nq::select>
        <x-nq::select value="all" x-model="statusFilter">
            <x-nq::select.trigger aria-label="{{ $t['statusCol'] }}" class="w-40"><x-nq::select.value /></x-nq::select.trigger>
            <x-nq::select.content>
                <x-nq::select.item value="all">{{ $all }}</x-nq::select.item>
                @foreach (['live', 'scheduled', 'ended', 'off', 'used-up'] as $s)<x-nq::select.item :value="$s">{{ $t['standings'][$s] ?? $s }}</x-nq::select.item>@endforeach
            </x-nq::select.content>
        </x-nq::select>
    </div>
    <div x-show="hasDupes" style="display: none"><x-nq::alert tone="warning" :title="$t['problemDuplicateCode']"><span x-text="dupesText"></span></x-nq::alert></div>
    <p x-show="listError" style="display: none" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text"><x-lucide-circle-x aria-hidden="true" class="size-4" /><span x-text="listError"></span></p>
    @if ($error)
        <x-nq::states.error :title="$t['loadFailed']" :description="$error" />
    @elseif ($loading)
        <div class="flex flex-col gap-2"><x-nq::states.skeleton class="h-10 w-full" /><x-nq::states.skeleton class="h-10 w-full" /></div>
    @else
        <div x-show="visible.length === 0" @if (count($config['discounts']) > 0) style="display: none" @endif><x-nq::states.empty icon="tag" :title="$t['discountsEmpty']" :description="$t['discountsEmptyHint']" class="border-0" /></div>
        <div x-show="visible.length !== 0" @if (count($config['discounts']) === 0) style="display: none" @endif data-slot="discount-table" class="relative w-full overflow-x-auto rounded-card border border-border bg-card">
            <div role="table" aria-label="{{ $t['discounts'] }}" class="table w-full min-w-[44rem] border-collapse">
                <div role="rowgroup" class="table-header-group border-b border-border">
                    <div role="row" class="table-row">
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['discountTitle'] }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['type'] }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['value'] }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['method'] }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['statusCol'] }}</div>
                        <div role="columnheader" class="table-cell {{ $thNum }}">{{ $t['used'] }}</div>
                        <div role="columnheader" class="table-cell w-10"></div>
                    </div>
                </div>
                <div role="rowgroup" class="table-row-group divide-y divide-border">
                    <template x-for="d in visible" :key="d.id">
                        <div role="row" data-slot="discount-row" x-data="nqContextMenu()" x-bind="trigger" x-bind:data-status="standing(d)" class="table-row">
                            <div role="cell" class="table-cell {{ $td }}"><div class="flex min-w-0 flex-col"><span class="font-medium" x-text="d.title"></span><bdi dir="ltr" x-show="d.code" class="font-mono text-caption text-muted-foreground" x-text="d.code"></bdi></div></div>
                            <div role="cell" class="table-cell {{ $td }}" x-text="kindText(d)"></div>
                            <div role="cell" class="table-cell {{ $td }}"><bdi dir="ltr" class="tabular-nums" x-text="valueText(d)"></bdi></div>
                            <div role="cell" class="table-cell {{ $td }}" x-text="methodText(d)"></div>
                            <div role="cell" class="table-cell {{ $td }}">
                                <span x-show="tone(d) === 'success'" style="display: none"><x-nq::status tone="success"><span x-text="standingText(d)"></span></x-nq::status></span>
                                <span x-show="tone(d) === 'info'" style="display: none"><x-nq::status tone="info"><span x-text="standingText(d)"></span></x-nq::status></span>
                                <span x-show="tone(d) === 'warning'" style="display: none"><x-nq::status tone="warning"><span x-text="standingText(d)"></span></x-nq::status></span>
                                <span x-show="tone(d) === 'neutral'" style="display: none"><x-nq::status tone="neutral"><span x-text="standingText(d)"></span></x-nq::status></span>
                            </div>
                            <div role="cell" class="table-cell {{ $td }} text-end tabular-nums"><bdi dir="ltr" x-text="usedText(d)"></bdi></div>
                            <div role="cell" class="table-cell px-1">
                                @include('nasaq::components.store-settings._menu', ['items' => $items, 'aria' => '`'.$t['edit'].', ${d.title}`', 'slotName' => 'discount-actions'])
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    @endif

    @if ($hasProducts)
        <div data-slot="discount-simulator" class="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-4">
            @include('nasaq::components.store-settings._simulator')
        </div>
    @endif

    <x-nq::dialog x-model="editorOpen">
        <x-nq::dialog.content data-slot="discount-editor" class="max-w-2xl">
            <form class="flex max-h-[80dvh] flex-col gap-4 overflow-y-auto" novalidate x-on:submit.prevent="save()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="editorTitle">{{ $t['addDiscount'] }}</span></x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['discountHint'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <div class="{{ $label }}"><span>{{ $t['discountTitle'] }}</span><x-nq::field.input x-model="d.title" x-bind:aria-invalid="!!titleBad" /></div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="{{ $label }}"><span>{{ $t['method'] }}</span>
                        <x-nq::native-select :options="[['value' => 'automatic', 'label' => $t['automatic']], ['value' => 'code', 'label' => $t['byCode']]]" aria-label="{{ $t['method'] }}" x-model="d.method" />
                    </div>
                    <div x-show="d.method === 'code'" style="display: none" class="{{ $label }}"><span>{{ $t['code'] }}</span><x-nq::field.input x-model="d.code" ltr class="uppercase" x-bind:aria-invalid="!!codeBad" /></div>
                </div>
                <div class="{{ $label }}"><span>{{ $t['whatItDoes'] }}</span>
                    <x-nq::native-select :options="[['value' => 'percentage', 'label' => $t['kinds']['percentage']], ['value' => 'fixed', 'label' => $t['kinds']['fixed']], ['value' => 'bxgy', 'label' => $t['kinds']['bxgy']], ['value' => 'free-shipping', 'label' => $t['kinds']['free-shipping']]]" aria-label="{{ $t['whatItDoes'] }}" x-bind:value="d.kind" x-on:change="onKind($event.target.value)" />
                </div>
                <div x-show="d.kind === 'percentage'" class="{{ $label }}"><span>{{ $t['percentOff'] }}</span><x-nq::field.input x-model="d.pct" ltr inputmode="decimal" x-bind:aria-invalid="!!pctBad" /><span class="{{ $hint }}" x-text="pctHint"></span></div>
                <div x-show="d.kind === 'fixed'" style="display: none" class="flex flex-col gap-3">
                    <div class="{{ $label }}"><span>{{ $t['amountOff'] }}</span><x-nq::currency-input x-model="d.amount" :currency="$code" aria-label="{{ $t['amountOff'] }}" x-bind:aria-invalid="!!amountBad" /></div>
                    <label class="flex items-center gap-2 text-body-sm"><x-nq::switch x-model="d.perItem" /><span>{{ $t['perItem'] }}</span></label>
                </div>
                <p x-show="d.kind === 'free-shipping'" style="display: none" class="{{ $hint }}">{{ $t['freeShippingHint'] }}</p>
                <div x-show="d.kind === 'bxgy'" style="display: none" data-slot="discount-bxgy" class="flex flex-col gap-3 rounded-card border border-border p-3">
                    <div class="grid gap-3 sm:grid-cols-4">
                        <div class="{{ $label }}"><span>{{ $t['buyQty'] }}</span><x-nq::field.input x-model="d.buyQty" ltr inputmode="numeric" /></div>
                        <div class="{{ $label }}"><span>{{ $t['getQty'] }}</span><x-nq::field.input x-model="d.getQty" ltr inputmode="numeric" /></div>
                        <div class="{{ $label }}"><span>{{ $t['getPercent'] }}</span><x-nq::field.input x-model="d.getPct" ltr inputmode="decimal" /></div>
                        <div class="{{ $label }}"><span>{{ $t['maxSets'] }}</span><x-nq::field.input x-model="d.maxSets" ltr inputmode="numeric" placeholder="{{ $t['noLimit'] }}" /></div>
                    </div>
                    <p class="{{ $hint }}">{{ $t['getPercentHint'] }}</p>
                    @include('nasaq::components.store-settings._scope', ['model' => 'd.buy', 'label' => $t['buyItems'], 't' => $t])
                    @include('nasaq::components.store-settings._scope', ['model' => 'd.get', 'label' => $t['getItems'], 't' => $t])
                </div>
                <div x-show="isPriceKind || d.kind === 'free-shipping'" class="{{ $label }}"><span x-text="capLabel">{{ $t['cap'] }}</span><x-nq::currency-input x-model="d.maxDiscount" :currency="$code" aria-label="{{ $t['cap'] }}" /><span class="{{ $hint }}">{{ $t['capHint'] }}</span></div>
                <div x-show="isPriceKind" class="flex flex-col gap-3">
                    @include('nasaq::components.store-settings._scope', ['model' => 'd.scope', 'label' => $t['appliesTo'], 't' => $t])
                    <label class="flex items-center gap-2 text-body-sm"><x-nq::switch x-model="d.excludeOnSale" /><span>{{ $t['excludeOnSale'] }}</span></label>
                </div>
                <h3 class="text-h4 text-foreground">{{ $t['requirements'] }}</h3>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="{{ $label }}"><span>{{ $t['minSpend'] }}</span><x-nq::currency-input x-model="d.minSubtotal" :currency="$code" aria-label="{{ $t['minSpend'] }}" /></div>
                    <div class="{{ $label }}"><span>{{ $t['minQuantity'] }}</span><x-nq::field.input x-model="d.minQuantity" ltr inputmode="numeric" /></div>
                </div>
                <h3 class="text-h4 text-foreground">{{ $t['eligibility'] }}</h3>
                <div class="{{ $label }}"><span>{{ $t['customers'] }}</span>
                    <x-nq::native-select :options="[['value' => 'all', 'label' => $t['customersAll']], ['value' => 'segments', 'label' => $t['customersSegments']], ['value' => 'specific', 'label' => $t['customersSpecific']]]" aria-label="{{ $t['customers'] }}" x-model="d.custMode" />
                </div>
                <div x-show="d.custMode === 'segments'" style="display: none" class="{{ $label }}"><span>{{ $t['segmentsLabel'] }}</span><x-nq::tag-input x-model="d.segments" :suggestions="array_values((array) $segments)" placeholder="{{ $t['segmentsPlaceholder'] }}" /></div>
                <div x-show="d.custMode === 'specific'" style="display: none" class="{{ $label }}"><span>{{ $t['customerIdsLabel'] }}</span><x-nq::tag-input x-model="d.customerIds" placeholder="{{ $t['customerIdsPlaceholder'] }}" /></div>
                <label class="flex items-center gap-2 text-body-sm"><x-nq::switch x-model="d.firstOrderOnly" /><span>{{ $t['firstOrderOnly'] }}</span></label>
                <h3 class="text-h4 text-foreground">{{ $t['schedule'] }}</h3>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="{{ $label }}"><span>{{ $t['startsOn'] }}</span><x-nq::date-picker x-model="d.startsOn" aria-label="{{ $t['startsOn'] }}" /></div>
                    <div class="{{ $label }}"><span>{{ $t['endsOn'] }}</span><x-nq::date-picker x-model="d.endsOn" aria-label="{{ $t['endsOn'] }}" x-bind:aria-invalid="!!datesBad" /></div>
                </div>
                <h3 class="text-h4 text-foreground">{{ $t['limits'] }}</h3>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="{{ $label }}"><span>{{ $t['limitTotal'] }}</span><x-nq::field.input x-model="d.limitTotal" ltr inputmode="numeric" placeholder="{{ $t['noLimit'] }}" /></div>
                    <div class="{{ $label }}"><span>{{ $t['limitCustomer'] }}</span><x-nq::field.input x-model="d.limitCustomer" ltr inputmode="numeric" placeholder="{{ $t['noLimit'] }}" /></div>
                </div>
                <h3 class="text-h4 text-foreground">{{ $t['combinesWith'] }}</h3>
                <div class="flex flex-wrap gap-x-6 gap-y-2">
                    <label class="flex items-center gap-2 text-body-sm"><x-nq::checkbox x-model="d.combines.product" /><span>{{ $t['classes']['product'] }}</span></label>
                    <label class="flex items-center gap-2 text-body-sm"><x-nq::checkbox x-model="d.combines.order" /><span>{{ $t['classes']['order'] }}</span></label>
                    <label class="flex items-center gap-2 text-body-sm"><x-nq::checkbox x-model="d.combines.shipping" /><span>{{ $t['classes']['shipping'] }}</span></label>
                </div>
                <p class="{{ $hint }}">{{ $t['combinesHint'] }}</p>
                <p x-show="editorError" style="display: none" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text"><x-lucide-circle-x aria-hidden="true" class="size-4" /><span x-text="editorError"></span></p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-bind:disabled="busy" x-on:click="editorOpen = false"><span>{{ $cancel }}</span></x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="busy"><span>{{ $t['saveDiscount'] }}</span></x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    @if ($canDelete)
        <x-nq::dialog x-model="deleteOpen">
            <x-nq::dialog.content data-slot="discount-delete" class="max-w-md">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['deleteDiscountTitle'] }}</x-nq::dialog.title>
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
