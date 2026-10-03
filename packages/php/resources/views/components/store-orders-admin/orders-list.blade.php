{{-- <x-nq::store-orders-admin.orders-list :orders="$orders" currency="USD" @nq-open-order="open($event.detail.order)" />
     The store admin's order list: status, payment and fulfilment chips, search and facet filters, saved views with live counts, sortable
     columns, pagination, bulk actions (mark fulfilled, print, export) and per-row actions in a menu and the context menu.
     orders: the CommerceOrder shape ['id', 'number', 'placedAt', 'status', 'payment', 'customer' => ['name', 'email'], 'lines' => [...], 'totals' => [...]].
     currency: ISO 4217 (USD, or SAR in Arabic). views: saved views [['id', 'name', 'filters' => ['status' => []], 'query']]. page-size: 10. loading / error: states.
     now: ISO time written on orders shipped from the bulk action. labels: override any built-in string by key.
     Events from the root: nq-open-order { order }, nq-mark-fulfilled { orders } (cancelable, otherwise shipped locally), nq-print { orders, document },
     nq-export { orders, csv } (cancelable, otherwise orders.csv downloads), nq-views-change { views }. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-orders-admin._strings')
@props(['orders' => [], 'currency' => null, 'views' => [], 'pageSize' => 10, 'loading' => false, 'error' => false, 'now' => null, 'labels' => []])
@php
    $t = nq_store_admin_t($labels);
    $chips = nq_store_admin_labels();
    $currency ??= \Nasaq\Nasaq::currency();
    $builtIn = [
        ['id' => 'all', 'name' => $t['viewAll'], 'filters' => (object) []],
        ['id' => 'to-fulfil', 'name' => $t['viewToFulfil'], 'filters' => ['payment' => ['paid', 'cod'], 'fulfilment' => ['unfulfilled', 'partial']]],
        ['id' => 'unpaid', 'name' => $t['viewUnpaid'], 'filters' => ['payment' => ['pending', 'authorized', 'failed']]],
        ['id' => 'delivered', 'name' => $t['viewDelivered'], 'filters' => ['status' => ['delivered']]],
        ['id' => 'refunds', 'name' => $t['viewRefunds'], 'filters' => ['payment' => ['refunded', 'partially-refunded']]],
    ];
    $config = [
        'orders' => array_values($orders), 'views' => array_values($views), 'builtIn' => $builtIn, 'pageSize' => $pageSize, 'currency' => $currency,
        'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 't' => $t, 'labels' => $chips, 'now' => $now ?? now()->toIso8601String(),
        'loading' => (bool) $loading, 'error' => (bool) $error,
    ];
    $facets = ['status' => $t['status'], 'payment' => $t['payment'], 'fulfilment' => $t['fulfilment']];
    $th = 'px-3 py-2 text-start text-caption font-medium text-muted-foreground';
    $td = 'px-3 py-2.5 text-body-sm text-foreground';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'store-orders-list') }}" x-data="nqStoreOrdersList(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <div role="group" aria-label="{{ $t['views'] }}" class="flex flex-wrap items-center gap-1.5">
        <template x-for="view in allViews" x-bind:key="view.id">
            <span class="inline-flex items-center rounded-control border" x-bind:class="current && current.id === view.id ? 'border-primary bg-nq-selected' : 'border-border bg-card'">
                <button type="button" x-bind:aria-pressed="current && current.id === view.id ? 'true' : 'false'" x-on:click="pick(view)"
                    class="inline-flex h-control-sm items-center gap-1.5 rounded-control px-2.5 text-label text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                    <span x-text="view.name"></span>
                    <span class="text-caption text-muted-foreground tabular-nums" x-text="num(counts[view.id] ?? 0)"></span>
                </button>
                <button type="button" x-show="isSaved(view.id)" x-on:click="removeSaved(view)" x-bind:aria-label="'{{ $t['deleteView'] }}: ' + view.name"
                    class="me-1 inline-flex size-5 items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                    <x-lucide-x aria-hidden="true" class="size-3" />
                </button>
            </span>
        </template>
        <x-nq::button type="button" size="sm" variant="ghost" x-show="isFiltered ? ! current : false" x-on:click="openSave()">
            <x-lucide-plus aria-hidden="true" />
            {{ $t['saveView'] }}
        </x-nq::button>
    </div>

    <div data-slot="data-table-toolbar" class="flex flex-wrap items-center gap-2">
        <div class="relative w-full min-w-40 sm:w-64">
            <x-lucide-search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground" />
            <x-nq::field.input type="search" aria-label="{{ $t['searchOrders'] }}" placeholder="{{ $t['searchOrders'] }}" class="h-control-sm ps-8" x-model="query" x-on:keydown.escape="query = ''" />
        </div>
        @foreach ($facets as $facet => $title)
            <x-nq::dropdown-menu>
                <x-nq::dropdown-menu.trigger variant="secondary" size="sm" data-facet="{{ $facet }}">
                    <x-lucide-circle-plus aria-hidden="true" />
                    {{ $title }}
                    <span class="text-caption text-muted-foreground tabular-nums" x-show="Object.keys(filters.{{ $facet }} ?? []).length > 0" x-text="(filters.{{ $facet }} ?? []).length"></span>
                </x-nq::dropdown-menu.trigger>
                <x-nq::dropdown-menu.content align="start" class="min-w-44">
                    @foreach ($chips[$facet] as $value => $chip)
                        <x-nq::dropdown-menu.checkbox-item x-model="facet.{{ $facet }}['{{ $value }}']">{{ $chip['label'] }}</x-nq::dropdown-menu.checkbox-item>
                    @endforeach
                </x-nq::dropdown-menu.content>
            </x-nq::dropdown-menu>
        @endforeach
        <x-nq::button type="button" size="sm" variant="secondary" class="ms-auto" x-bind:disabled="filtered.length === 0" x-on:click="exportOrders(filtered)">
            <x-lucide-download aria-hidden="true" />
            {{ $t['exportCsv'] }}
        </x-nq::button>
    </div>

    <div data-slot="data-table-bulk-actions" x-show="selected.length > 0" class="flex flex-wrap items-center gap-2 rounded-card border border-border bg-secondary px-3 py-2">
        <x-nq::button type="button" size="sm" variant="secondary" x-bind:disabled="eligible.length === 0" x-bind:title="skippedHint" x-on:click="markFulfilled(eligible)">
            <x-lucide-package-check aria-hidden="true" />
            <span x-text="markLabel"></span>
        </x-nq::button>
        <x-nq::button type="button" size="sm" variant="secondary" x-on:click="print(selected, 'packing-slip')">
            <x-lucide-truck aria-hidden="true" />
            {{ $t['printSlips'] }}
        </x-nq::button>
        <x-nq::button type="button" size="sm" variant="secondary" x-on:click="print(selected, 'invoice')">
            <x-lucide-printer aria-hidden="true" />
            {{ $t['printInvoices'] }}
        </x-nq::button>
        <x-nq::button type="button" size="sm" variant="secondary" x-on:click="exportOrders(selected)">
            <x-lucide-download aria-hidden="true" />
            {{ $t['exportSelected'] }}
        </x-nq::button>
    </div>

    <template x-if="error">
        <x-nq::states.empty icon="triangle-alert" :title="$t['loadError']" />
    </template>
    <div x-show="loading ? ! error : false" class="flex flex-col gap-2">
        <x-nq::states.skeleton class="h-10" /><x-nq::states.skeleton class="h-10" /><x-nq::states.skeleton class="h-10" />
    </div>
    <template x-if="loading ? false : (error ? false : orders.length === 0)">
        <x-nq::states.empty icon="package-open" :title="$t['noOrders']" :description="$t['noOrdersText']" />
    </template>
    <template x-if="loading ? false : (error ? false : (orders.length > 0 ? filtered.length === 0 : false))">
        <div class="flex flex-col items-center gap-3">
            <x-nq::states.empty icon="search-x" :title="$t['noMatch']" :description="$t['noMatchHint']" />
            <x-nq::button type="button" size="sm" variant="secondary" x-on:click="clear()">{{ $t['clearFilters'] }}</x-nq::button>
        </div>
    </template>

    <div x-show="loading ? false : (error ? false : filtered.length > 0)" data-slot="data-table" class="relative w-full overflow-x-auto rounded-card border border-border bg-card">
        <div role="table" aria-label="{{ $t['orders'] }}" class="table w-full min-w-[48rem] border-collapse">
            <div role="rowgroup" class="table-header-group border-b border-border">
                <div role="row" class="table-row">
                    <div role="columnheader" class="table-cell w-10 px-3">
                        <x-nq::checkbox aria-label="{{ $t['orders'] }}" x-on:click="toggleAll(! allOnPage)" x-bind:checked="allOnPage" />
                    </div>
                    @foreach (['number' => 'order', 'date' => 'date', 'customer' => 'customer'] as $key => $label)
                        <div role="columnheader" class="table-cell {{ $th }}" x-bind:aria-sort="ariaSort('{{ $key }}')">
                            <button type="button" class="inline-flex items-center gap-1 font-medium hover:text-foreground" x-on:click="sortBy('{{ $key }}')">{{ $t[$label] }}</button>
                        </div>
                    @endforeach
                    <div role="columnheader" class="table-cell {{ $th }}">{{ $t['payment'] }}</div>
                    <div role="columnheader" class="table-cell {{ $th }}">{{ $t['fulfilment'] }}</div>
                    <div role="columnheader" class="table-cell {{ $th }}">{{ $t['status'] }}</div>
                    <div role="columnheader" class="table-cell {{ $th }} text-end" x-bind:aria-sort="ariaSort('total')">
                        <button type="button" class="inline-flex items-center gap-1 font-medium hover:text-foreground" x-on:click="sortBy('total')">{{ $t['total'] }}</button>
                    </div>
                    <div role="columnheader" class="table-cell w-10"><span class="sr-only">{{ $t['openOrder'] }}</span></div>
                </div>
            </div>
            <div role="rowgroup" class="table-row-group divide-y divide-border">
                <template x-for="o in rows" x-bind:key="o.id">
                    <div role="row" data-slot="store-order-row" x-data="nqContextMenu()" x-bind="trigger" x-bind:data-selected="sel[o.id] ? '' : null"
                        x-on:click="open(o)" class="table-row cursor-pointer hover:bg-nq-hover data-[selected]:bg-nq-selected">
                        <div role="cell" class="table-cell px-3" x-on:click.stop>
                            <x-nq::checkbox x-model="sel[o.id]" x-bind:aria-label="o.number" />
                        </div>
                        <div role="cell" class="table-cell {{ $td }} font-medium" x-text="o.number"></div>
                        <div role="cell" class="table-cell {{ $td }} text-muted-foreground" x-text="date(o.placedAt)"></div>
                        <div role="cell" class="table-cell {{ $td }}">
                            <span class="flex min-w-0 flex-col">
                                <span class="truncate" x-text="o.customer.name"></span>
                                <span dir="ltr" class="truncate text-start text-caption text-muted-foreground" x-show="o.customer.email" x-text="o.customer.email"></span>
                            </span>
                        </div>
                        <div role="cell" class="table-cell {{ $td }}"><x-nq::store-orders-admin.chip expr="paymentChip(o.payment)" /></div>
                        <div role="cell" class="table-cell {{ $td }}"><x-nq::store-orders-admin.chip expr="fulfilmentChip(o)" /></div>
                        <div role="cell" class="table-cell {{ $td }}"><x-nq::store-orders-admin.chip expr="statusChip(o.status)" /></div>
                        <div role="cell" dir="ltr" class="table-cell {{ $td }} text-end tabular-nums" x-text="money(o.totals.total)"></div>
                        <div role="cell" class="table-cell px-1" x-on:click.stop>
                            <x-nq::dropdown-menu>
                                <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="row-actions" x-bind:aria-label="'{{ $t['openOrder'] }}, ' + o.number" class="text-muted-foreground data-popup-open:text-foreground">
                                    <x-lucide-ellipsis aria-hidden="true" />
                                </x-nq::dropdown-menu.trigger>
                                <x-nq::dropdown-menu.content align="end" class="min-w-48">
                                    <x-nq::dropdown-menu.item x-on:click="open(o)"><x-lucide-file-text aria-hidden="true" />{{ $t['openOrder'] }}</x-nq::dropdown-menu.item>
                                    <x-nq::dropdown-menu.item x-show="canFulfil(o)" x-on:click="markFulfilled([o])"><x-lucide-package-check aria-hidden="true" />{{ $t['markFulfilledOne'] }}</x-nq::dropdown-menu.item>
                                    <x-nq::dropdown-menu.separator />
                                    <x-nq::dropdown-menu.item x-on:click="print([o], 'packing-slip')"><x-lucide-truck aria-hidden="true" />{{ $t['printSlip'] }}</x-nq::dropdown-menu.item>
                                    <x-nq::dropdown-menu.item x-on:click="print([o], 'invoice')"><x-lucide-printer aria-hidden="true" />{{ $t['printInvoice'] }}</x-nq::dropdown-menu.item>
                                </x-nq::dropdown-menu.content>
                            </x-nq::dropdown-menu>
                        </div>
                        <template x-teleport="body">
                            <div data-slot="context-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open"
                                class="fixed z-50 min-w-48 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none max-h-[var(--available-height)] overflow-y-auto transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
                                <x-nq::context-menu.item x-on:click="open(o)"><x-lucide-file-text aria-hidden="true" />{{ $t['openOrder'] }}</x-nq::context-menu.item>
                                <x-nq::context-menu.item x-show="canFulfil(o)" x-on:click="markFulfilled([o])"><x-lucide-package-check aria-hidden="true" />{{ $t['markFulfilledOne'] }}</x-nq::context-menu.item>
                                <x-nq::context-menu.separator />
                                <x-nq::context-menu.item x-on:click="print([o], 'packing-slip')"><x-lucide-truck aria-hidden="true" />{{ $t['printSlip'] }}</x-nq::context-menu.item>
                                <x-nq::context-menu.item x-on:click="print([o], 'invoice')"><x-lucide-printer aria-hidden="true" />{{ $t['printInvoice'] }}</x-nq::context-menu.item>
                            </div>
                        </template>
                    </div>
                </template>
            </div>
        </div>
    </div>
    <div x-show="filtered.length > pageSize" class="flex items-center justify-between gap-2 text-body-sm text-muted-foreground">
        <span class="tabular-nums" x-text="num(Math.min(page, pages)) + ' / ' + num(pages)"></span>
        <div class="flex gap-2">
            <x-nq::button type="button" size="sm" variant="secondary" x-bind:disabled="page <= 1" x-on:click="page = page - 1"><x-lucide-chevron-left aria-hidden="true" class="rtl:-scale-x-100" /><span class="sr-only">{{ \Nasaq\Nasaq::t('Previous page', 'الصفحة السابقة') }}</span></x-nq::button>
            <x-nq::button type="button" size="sm" variant="secondary" x-bind:disabled="page >= pages" x-on:click="page = page + 1"><x-lucide-chevron-right aria-hidden="true" class="rtl:-scale-x-100" /><span class="sr-only">{{ \Nasaq\Nasaq::t('Next page', 'الصفحة التالية') }}</span></x-nq::button>
        </div>
    </div>

    <x-nq::dialog x-model="saving">
        <x-nq::dialog.content data-slot="store-save-view" class="max-w-sm">
            <form class="flex flex-col gap-4" x-on:submit.prevent="saveView()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['saveView'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['saveViewText'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <x-nq::field.input aria-label="{{ $t['viewName'] }}" placeholder="{{ $t['viewName'] }}" x-model="viewName" />
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="secondary" x-on:click="saving = false">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="viewName.trim() === ''">{{ $t['save'] }}</x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>
</div>
