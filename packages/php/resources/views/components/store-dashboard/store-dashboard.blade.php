{{-- <x-nq::store-dashboard currency="USD" :totals="['sales' => 4820000, 'orders' => 312, 'sessions' => 9400, 'customers' => 280, 'returningCustomers' => 96, 'addToCart' => 1320, 'checkouts' => 540]"
         :series="[['date' => '2026-09-28', 'sales' => 1610000, 'orders' => 104, 'sessions' => 3100]]" :top-products="[]" :categories="[]" :channels="[]" :cities="[]" :products="[]" :recent-orders="[]" />
     The home screen of a store admin: five KPIs with the change against the previous period and live visitors, then a board of widgets (sales over time, conversion funnel,
     top products and categories, sales by channel and city, low stock, recent orders) that the owner can rearrange with Customise. Presentational: pass the numbers for the period, it does the ratios.
     Money is integer minor units (cents) in `currency` (USD, or SAR in Arabic, when omitted).
     totals / previous-totals: sales, orders, sessions, customers, returningCustomers, addToCart, checkouts. series / previous-series: one row per day ('date', 'sales', 'orders', 'sessions'), index-aligned.
     top-products: id, name, image, units, revenue, previousRevenue. categories / channels / cities: id, label, value, previous. products: the catalogue scanned for low stock (id, name, status, images, options, variants with stock, sku, options, image).
     low-stock-threshold: default 5. recent-orders: id, number, placedAt, status (pending, paid, processing, partially-fulfilled, fulfilled, shipped, out-for-delivery, delivered, cancelled, refunded, partially-refunded, returned), customer ['name'], totals ['total'].
     live-visitors: ['count' => 74, 'history' => [60, 64, 70]]. comparison-label: text after each change (default "vs previous period"). The toolbar slot sits above the figures.
     can-open-product / can-open-order / can-restock: show the open and Restock controls. They dispatch bubbling events: "nq-open-product" ({ id }), "nq-restock" ({ productId, variantId, sku }),
     the table's "nq-data-table-row-click" and "nq-data-table-action" ({ action: "open", row }) for orders; every top-product and low-stock row also opens a context menu (right-click, long press, Shift+F10).
     layout: the board layout (default the store's own), row-height (160). Saving the layout fires the board's bubbling "save" event. loading. empty (default: no orders, no sessions and no series).
     error (true or a message) with can-retry adds a retry button dispatching a bubbling "nq-retry". labels: array overriding the built-in words. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-dashboard._logic')
@props([
    'currency' => null, 'totals' => [], 'previousTotals' => null, 'series' => [], 'previousSeries' => [], 'topProducts' => [], 'categories' => [], 'channels' => [], 'cities' => [],
    'products' => [], 'lowStockThreshold' => 5, 'recentOrders' => [], 'liveVisitors' => null, 'comparisonLabel' => null, 'canOpenOrder' => false, 'canOpenProduct' => false, 'canRestock' => false,
    'layout' => null, 'rowHeight' => 160, 'loading' => false, 'empty' => null, 'error' => null, 'canRetry' => false, 'labels' => [], 'locale' => null, 'toolbar' => null,
])
@php
    $locale ??= app()->getLocale();
    $t = nq_sd_words($locale, $labels);
    $currency = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $vs = $comparisonLabel ?? $t['vsPrevious'];
    $money = ['style' => 'currency', 'currency' => $currency, 'maxFraction' => 0];
    $major = fn ($minor) => nq_sd_major($minor, $currency);
    $series = array_values($series);
    $kpis = nq_sd_kpis($totals, $previousTotals);
    $isEmpty = $empty ?? (count($series) === 0 && ($totals['orders'] ?? 0) === 0 && ($totals['sessions'] ?? 0) === 0);
    $funnel = nq_sd_funnel($totals);
    $lowStock = nq_sd_low_stock($products, (int) $lowStockThreshold);
    $spark = fn ($f) => count($series) > 1 ? array_map($f, $series) : null;
    $sparks = [
        'sales' => $spark(fn ($p) => $p['sales']),
        'orders' => $spark(fn ($p) => $p['orders']),
        'aov' => $spark(fn ($p) => (int) round(nq_sd_divide($p['sales'], $p['orders']))),
        'conversion' => $spark(fn ($p) => nq_sd_divide($p['orders'], $p['sessions'])),
        'returning' => null,
    ];
    $tiles = [
        ['key' => 'sales', 'label' => $t['sales'], 'icon' => 'banknote', 'value' => $major($kpis['sales']['value']), 'format' => $money],
        ['key' => 'orders', 'label' => $t['orders'], 'icon' => 'shopping-bag', 'value' => $kpis['orders']['value'], 'format' => []],
        ['key' => 'aov', 'label' => $t['aov'], 'icon' => 'receipt', 'value' => $major($kpis['aov']['value']), 'format' => $money],
        ['key' => 'conversion', 'label' => $t['conversion'], 'icon' => 'percent', 'value' => $kpis['conversion']['value'], 'format' => ['style' => 'percent', 'maxFraction' => 1]],
        ['key' => 'returning', 'label' => $t['returning'], 'icon' => 'repeat', 'value' => $kpis['returning']['value'], 'format' => ['style' => 'percent', 'maxFraction' => 0]],
    ];
    $liveLabel = $liveVisitors ? new \Illuminate\Support\HtmlString('<span class="flex items-center gap-2">'.e($t['live']).' '.\Illuminate\Support\Facades\Blade::render('<x-nq::badge variant="success"><span aria-hidden="true" class="size-1.5 rounded-full bg-current motion-safe:animate-pulse"></span>{{ $b }}</x-nq::badge>', ['b' => $t['liveBadge']]).'</span>') : null;

    $defaultLayout = [
        ['id' => 'sales', 'type' => 'sales', 'cols' => 4, 'rows' => 3],
        ['id' => 'funnel', 'type' => 'funnel', 'cols' => 2, 'rows' => 4],
        ['id' => 'top-products', 'type' => 'top-products', 'cols' => 2, 'rows' => 2],
        ['id' => 'categories', 'type' => 'categories', 'cols' => 2, 'rows' => 2],
        ['id' => 'channels', 'type' => 'channels', 'cols' => 2, 'rows' => 2],
        ['id' => 'cities', 'type' => 'cities', 'cols' => 2, 'rows' => 2],
        ['id' => 'low-stock', 'type' => 'low-stock', 'cols' => 2, 'rows' => 2],
        ['id' => 'recent-orders', 'type' => 'recent-orders', 'cols' => 2, 'rows' => 2],
    ];
    $std = ['minCols' => 1, 'minRows' => 2, 'defaultCols' => 2, 'defaultRows' => 2];
    $widgets = [
        ['type' => 'sales', 'title' => $t['widgets']['sales'], 'description' => $t['widgetHints']['sales'], 'unique' => true, 'minCols' => 2, 'minRows' => 3, 'defaultCols' => 4, 'defaultRows' => 3],
        ['type' => 'funnel', 'title' => $t['widgets']['funnel'], 'description' => $t['widgetHints']['funnel'], 'unique' => true, 'minCols' => 2, 'minRows' => 4, 'defaultCols' => 2, 'defaultRows' => 4],
        ['type' => 'top-products', 'title' => $t['widgets']['topProducts'], 'description' => $t['widgetHints']['topProducts'], 'fields' => [['key' => 'limit', 'label' => $t['widgets']['topProducts'], 'type' => 'number', 'min' => 3, 'max' => 10]], 'defaultSettings' => ['limit' => 5]] + $std,
        ['type' => 'categories', 'title' => $t['widgets']['categories'], 'description' => $t['widgetHints']['categories']] + $std,
        ['type' => 'channels', 'title' => $t['widgets']['channels'], 'description' => $t['widgetHints']['channels']] + $std,
        ['type' => 'cities', 'title' => $t['widgets']['cities'], 'description' => $t['widgetHints']['cities']] + $std,
        ['type' => 'low-stock', 'title' => $t['widgets']['lowStock'], 'description' => $t['widgetHints']['lowStock'], 'unique' => true] + $std,
        ['type' => 'recent-orders', 'title' => $t['widgets']['recentOrders'], 'description' => $t['widgetHints']['recentOrders'], 'unique' => true, 'minCols' => 2] + array_diff_key($std, ['minCols' => 1]),
    ];

    $pointRows = fn ($list) => array_map(fn ($p) => ['date' => $p['date'], 'sales' => $major($p['sales']), 'orders' => $p['orders'], 'sessions' => $p['sessions']], array_values($list));
    $metrics = [
        ['id' => 'sales', 'label' => $t['metrics']['sales'], 'format' => $money],
        ['id' => 'orders', 'label' => $t['metrics']['orders'], 'color' => 'var(--nq-tag-teal)'],
        ['id' => 'sessions', 'label' => $t['metrics']['sessions'], 'color' => 'var(--nq-tag-violet)'],
    ];
    $breakdown = fn ($list) => array_map(fn ($r) => ['id' => $r['id'], 'label' => $r['label'], 'value' => $major($r['value'])] + (isset($r['previous']) ? ['previous' => $major($r['previous'])] : []), array_values($list));
    $funnelSteps = [
        ['id' => 'sessions', 'label' => $t['funnelSteps']['sessions'], 'count' => $funnel['sessions'], 'detail' => 'session_start'],
        ['id' => 'cart', 'label' => $t['funnelSteps']['addToCart'], 'count' => $funnel['addToCart'], 'detail' => 'add_to_cart'],
        ['id' => 'checkout', 'label' => $t['funnelSteps']['checkout'], 'count' => $funnel['checkout'], 'detail' => 'begin_checkout'],
        ['id' => 'purchase', 'label' => $t['funnelSteps']['purchase'], 'count' => $funnel['purchase'], 'detail' => 'purchase'],
    ];
    $top = nq_sd_top(array_map(fn ($p) => $p + ['value' => $p['revenue']], array_values($topProducts)), 10);
    $palette = ['var(--nq-chart-1)', 'var(--nq-chart-2)', 'var(--nq-chart-3)', 'var(--nq-chart-4)', 'var(--nq-chart-5)', 'var(--nq-chart-6)'];
    $channelRows = nq_sd_top(array_values($channels), count($channels));
    $channelSegments = array_map(fn ($c, $i) => ['id' => $c['id'], 'label' => $c['label'], 'value' => $c['value'], 'color' => $palette[$i % count($palette)]], $channelRows, array_keys($channelRows));

    $statusOptions = [];
    foreach ($t['orderStatus'] as $value => $label) {
        $statusOptions[] = ['value' => $value, 'label' => $label, 'tone' => $t['variant'][$value] ?? 'neutral'];
    }
    $orderCols = [
        ['id' => 'number', 'header' => $t['order'], 'key' => 'number', 'type' => 'mono', 'sortKey' => 'placedSort', 'sortable' => true, 'searchable' => true],
        ['id' => 'customer', 'header' => $t['customer'], 'key' => 'customer'],
        ['id' => 'status', 'header' => $t['status'], 'key' => 'status', 'type' => 'status', 'options' => $statusOptions],
        ['id' => 'total', 'header' => $t['total'], 'key' => 'total', 'type' => 'currency', 'currency' => $currency, 'align' => 'end'],
        ['id' => 'placed', 'header' => $t['placed'], 'key' => 'placed', 'type' => 'datetime'],
    ];
    $orders = array_values($recentOrders);
    usort($orders, fn ($a, $b) => strcmp($b['number'], $a['number']));
    $orderRows = array_map(fn ($o) => ['id' => (string) $o['id'], 'number' => $o['number'], 'customer' => $o['customer']['name'], 'status' => $o['status'], 'total' => $major($o['totals']['total']), 'placed' => $o['placedAt'], 'placedSort' => strtotime($o['placedAt'])], $orders);
    $errorText = is_string($error) ? $error : ($error ? $t['errorTitle'] : null);
    $flat = 'h-full border-0 py-0 shadow-none';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'store-dashboard') }}" aria-label="{{ $t['region'] }}" @if ($loading) aria-busy="true" @endif {{ $attributes->except('data-slot')->cn('flex w-full min-w-0 flex-col gap-4') }}>
    @if ($toolbar){{ $toolbar }}@endif
    @if ($errorText)
        <x-nq::states.error :title="$errorText">
            @if ($canRetry)
                <x-slot:actions><x-nq::button x-on:click="$el.dispatchEvent(new CustomEvent(`nq-retry`, { bubbles: true }))">{{ $t['retry'] }}</x-nq::button></x-slot:actions>
            @endif
        </x-nq::states.error>
    @elseif ($isEmpty && ! $loading)
        <x-nq::states.empty icon="store" :title="$t['emptyTitle']" :description="$t['emptyBody']" />
    @else
        <x-nq::stat-card.grid role="group" :aria-label="$t['kpis']" data-slot="store-dashboard-kpis" class="grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))]">
            @foreach ($tiles as $tile)
                <x-nq::stat-card :label="$tile['label']" :value="$tile['value']" :format="$tile['format']" :delta="$kpis[$tile['key']]['change']" :delta-label="$kpis[$tile['key']]['change'] === null ? null : $vs"
                    :sparkline="$sparks[$tile['key']]" :sparkline-label="$sparks[$tile['key']] ? sprintf($t['salesSpark'], $tile['label']) : null" :loading="$loading" :locale="$locale">
                    <x-slot:icon><x-dynamic-component :component="'lucide-'.$tile['icon']" /></x-slot:icon>
                </x-nq::stat-card>
            @endforeach
            @if ($liveVisitors)
                <x-nq::stat-card data-slot="store-dashboard-live" :label="$liveLabel" :sparkline="count($liveVisitors['history'] ?? []) > 1 ? $liveVisitors['history'] : null" :sparkline-label="$t['live']" :loading="$loading" :locale="$locale">
                    <x-slot:icon><x-lucide-users /></x-slot:icon>
                    <span class="flex flex-col">
                        <x-nq::numeric :value="$liveVisitors['count']" :locale="$locale" />
                        <span class="text-caption font-normal text-muted-foreground">{{ $t['liveHint'] }}</span>
                    </span>
                </x-nq::stat-card>
            @endif
        </x-nq::stat-card.grid>
        <x-nq::dashboard-board :widgets="$widgets" :layout="$layout ?? $defaultLayout" :default-layout="$defaultLayout" :row-height="$rowHeight" :loading="$loading" :locale="$locale">
            <x-nq::dashboard-board.widget type="sales">
                <x-nq::time-series-panel :class="$flat" :metrics="$metrics" :data="$pointRows($series)" :previous-data="$previousSeries ? $pointRows($previousSeries) : []" chart-class-name="h-56" :labels="['compare' => $vs]" :locale="$locale" />
            </x-nq::dashboard-board.widget>
            <x-nq::dashboard-board.widget type="funnel">
                <div class="[&_[data-slot=card-header]]:hidden [&_[data-slot=card]]:border-0 [&_[data-slot=card]]:py-0 [&_[data-slot=card]]:shadow-none [&_[data-slot=card-content]]:px-0">
                    <x-nq::funnel-chart :steps="$funnelSteps" :locale="$locale" />
                </div>
            </x-nq::dashboard-board.widget>
            <x-nq::dashboard-board.widget type="top-products">
                @if (! $top)
                    <p class="py-6 text-center text-body-sm text-muted-foreground">{{ $t['noRows'] }}</p>
                @else
                    <ol data-slot="store-dashboard-top-products" class="flex flex-col divide-y divide-border">
                        @foreach ($top as $i => $p)
                            <li x-show="Number(setting(card, `limit`) ?? 5) > {{ $i }}" @if ($i >= 5) style="display: none" @endif>
                                <x-nq::context-menu>
                                    <x-nq::context-menu.trigger class="flex items-center gap-3 py-2" :data-id="$p['id']">
                                        <span data-slot="store-dashboard-thumb" class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-control bg-muted text-muted-foreground">
                                            @if (! empty($p['image']))<img src="{{ $p['image'] }}" alt="" width="40" height="40" loading="lazy" class="size-full object-cover" />@else<x-lucide-image-off aria-hidden="true" class="size-4" />@endif
                                        </span>
                                        <div class="min-w-0 flex-1">
                                            @if ($canOpenProduct)
                                                <button type="button" dir="auto" data-id="{{ $p['id'] }}" x-on:click="$el.dispatchEvent(new CustomEvent(`nq-open-product`, { bubbles: true, detail: { id: $el.dataset.id } }))"
                                                    class="block max-w-full truncate rounded-control text-start text-label text-foreground outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus">{{ $p['name'] }}</button>
                                            @else
                                                <span dir="auto" class="block truncate text-label text-foreground">{{ $p['name'] }}</span>
                                            @endif
                                            <span class="text-caption text-muted-foreground">{{ nq_sd_units($t, (int) $p['units']) }}</span>
                                        </div>
                                        <div class="flex shrink-0 flex-col items-end">
                                            <x-nq::price :amount="$major($p['revenue'])" :currency="$currency" :fraction-digits="0" size="sm" />
                                            @php($change = nq_sd_change($p['revenue'], $p['previousRevenue'] ?? null))
                                            @if ($change)
                                                <span class="text-caption tabular-nums {{ $change > 0 ? 'text-nq-success-text' : 'text-nq-danger-text' }}"><bdi data-slot="num" data-numeric class="tabular-nums">{{ nq_br_number($change, ['style' => 'percent', 'maxFraction' => 0], $locale, true) }}</bdi></span>
                                            @endif
                                        </div>
                                    </x-nq::context-menu.trigger>
                                    @if ($canOpenProduct)
                                        <x-nq::context-menu.content class="min-w-44">
                                            <x-nq::context-menu.item x-on:click="$refs.trigger.dispatchEvent(new CustomEvent(`nq-open-product`, { bubbles: true, detail: { id: $refs.trigger.dataset.id } }))">{{ $t['openProduct'] }}</x-nq::context-menu.item>
                                        </x-nq::context-menu.content>
                                    @endif
                                </x-nq::context-menu>
                            </li>
                        @endforeach
                    </ol>
                @endif
            </x-nq::dashboard-board.widget>
            <x-nq::dashboard-board.widget type="categories">
                <x-nq::breakdown-table :class="$flat" :rows="$breakdown($categories)" :dimension-label="$t['dimension']['category']" :value-label="$t['revenue']" :format="$money" :limit="5" :label="$t['widgets']['categories']" :labels="['empty' => $t['noRows']]" :locale="$locale" />
            </x-nq::dashboard-board.widget>
            <x-nq::dashboard-board.widget type="channels">
                <div class="flex flex-col gap-3">
                    @if ($channelSegments)
                        <x-nq::chart-extras.segment-bar :legend="false" :inline-labels="false" size="md" :segments="$channelSegments" :label="$t['widgets']['channels']" :locale="$locale" />
                        <ul data-slot="segment-bar-legend" class="flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
                            @foreach ($channelSegments as $s)
                                <li class="flex min-w-0 items-center gap-2"><span aria-hidden="true" class="size-2.5 shrink-0 rounded-[2px]" style="background-color: {{ $s['color'] }}"></span><span dir="auto" class="truncate text-muted-foreground">{{ $s['label'] }}</span></li>
                            @endforeach
                        </ul>
                    @endif
                    <x-nq::breakdown-table :class="$flat" :rows="$breakdown($channelRows)" :dimension-label="$t['dimension']['channel']" :value-label="$t['sales']" :format="$money" :limit="6" :label="$t['widgets']['channels']" :labels="['empty' => $t['noRows']]" :locale="$locale" />
                </div>
            </x-nq::dashboard-board.widget>
            <x-nq::dashboard-board.widget type="cities">
                <x-nq::breakdown-table :class="$flat" :rows="$breakdown($cities)" :dimension-label="$t['dimension']['city']" :value-label="$t['sales']" :format="$money" :limit="6" :label="$t['widgets']['cities']" :labels="['empty' => $t['noRows']]" :locale="$locale" />
            </x-nq::dashboard-board.widget>
            <x-nq::dashboard-board.widget type="low-stock">
                @if (! $lowStock)
                    <x-nq::states.empty class="border-0 py-6" :title="$t['noLowStock']" :description="sprintf($t['noLowStockHint'], (int) $lowStockThreshold)" />
                @else
                    <ul data-slot="store-dashboard-low-stock" class="flex flex-col divide-y divide-border">
                        @foreach ($lowStock as $item)
                            @php($out = $item['level'] === 'out')
                            <li>
                                <x-nq::context-menu>
                                    <x-nq::context-menu.trigger class="flex items-center gap-3 py-2" :data-product-id="$item['productId']" :data-variant-id="$item['variantId']" :data-sku="$item['sku']">
                                        <span data-slot="store-dashboard-thumb" class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-control bg-muted text-muted-foreground">
                                            @if (! empty($item['image']))<img src="{{ $item['image'] }}" alt="" width="40" height="40" loading="lazy" class="size-full object-cover" />@else<x-lucide-image-off aria-hidden="true" class="size-4" />@endif
                                        </span>
                                        <div class="min-w-0 flex-1">
                                            <span dir="auto" class="block truncate text-label text-foreground">{{ $item['productName'] }}</span>
                                            <span class="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
                                                @if ($item['variantLabel'])<span dir="auto" class="truncate">{{ $item['variantLabel'] }}</span>@endif
                                                @if ($item['sku'])<bdi dir="ltr" class="shrink-0 tabular-nums">{{ $item['sku'] }}</bdi>@endif
                                            </span>
                                        </div>
                                        <x-nq::badge :variant="$out ? 'danger' : 'warning'">
                                            @if ($out)<x-lucide-package-x aria-hidden="true" />@else<x-lucide-triangle-alert aria-hidden="true" />@endif
                                            {{ $out ? $t['outOfStock'] : nq_sd_left($t, $item['stock']) }}
                                        </x-nq::badge>
                                        @if ($canRestock)
                                            <x-nq::button size="sm" variant="secondary" :aria-label="sprintf($t['restockItem'], $item['productName'])" :data-product-id="$item['productId']" :data-variant-id="$item['variantId']" :data-sku="$item['sku']"
                                                x-on:click="$el.dispatchEvent(new CustomEvent(`nq-restock`, { bubbles: true, detail: { productId: $el.dataset.productId, variantId: $el.dataset.variantId, sku: $el.dataset.sku } }))">{{ $t['restock'] }}</x-nq::button>
                                        @endif
                                    </x-nq::context-menu.trigger>
                                    @if ($canRestock || $canOpenProduct)
                                        <x-nq::context-menu.content class="min-w-44">
                                            @if ($canRestock)
                                                <x-nq::context-menu.item x-on:click="$refs.trigger.dispatchEvent(new CustomEvent(`nq-restock`, { bubbles: true, detail: { productId: $refs.trigger.dataset.productId, variantId: $refs.trigger.dataset.variantId, sku: $refs.trigger.dataset.sku } }))">{{ $t['restock'] }}</x-nq::context-menu.item>
                                            @endif
                                            @if ($canRestock && $canOpenProduct)<x-nq::context-menu.separator />@endif
                                            @if ($canOpenProduct)
                                                <x-nq::context-menu.item x-on:click="$refs.trigger.dispatchEvent(new CustomEvent(`nq-open-product`, { bubbles: true, detail: { id: $refs.trigger.dataset.productId } }))">{{ $t['openProduct'] }}</x-nq::context-menu.item>
                                            @endif
                                        </x-nq::context-menu.content>
                                    @endif
                                </x-nq::context-menu>
                            </li>
                        @endforeach
                    </ul>
                @endif
            </x-nq::dashboard-board.widget>
            <x-nq::dashboard-board.widget type="recent-orders">
                <x-nq::data-table :label="$t['ordersTable']" name-key="number" :columns="$orderCols" :rows="$orderRows" :search="false" :view-options="false" :row-click="$canOpenOrder"
                    :row-actions="$canOpenOrder ? [['id' => 'open', 'label' => $t['openOrder']]] : []" :labels="['empty' => $t['noOrders']]" :locale="$locale" />
            </x-nq::dashboard-board.widget>
        </x-nq::dashboard-board>
    @endif
</section>
