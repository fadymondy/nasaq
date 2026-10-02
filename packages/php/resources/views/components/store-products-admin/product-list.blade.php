{{-- <x-nq::store-products-admin.product-list :products="$products" currency="USD" @nq-open="edit($event.detail.product)" @nq-create="newProduct()" />
     The merchant's product list: search, status and stock facets, sortable columns, pagination, a bulk edit (price, stock, status, with a live before and after preview),
     and per-row actions in a menu and the context menu (open, set active, move to drafts, archive, delete).
     products: the CommerceProduct shape ['id', 'name', 'status', 'brand', 'category', 'tags', 'images' => [['src', 'alt']], 'options', 'variants' => [['id', 'options', 'price', 'stock', 'sku']]]; money is integer minor units.
     currency: ISO 4217 (USD, or SAR in Arabic). low-stock-at: units counted as low (5). page-size: 10. loading / error: states. can-create / can-bulk / can-status / can-delete: hide an action.
     labels: override any built-in string by key.
     Events from the root: nq-open { product }, nq-create, nq-retry, nq-bulk-edit { ids, edit, wait }, nq-status-change { product, status, wait }, nq-delete { product, wait }.
     Hand wait(promise) a promise that resolves, or resolves { error } to keep the dialog open and show the message; with no listener the change is applied locally. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-products-admin._strings')
@props(['products' => [], 'currency' => null, 'lowStockAt' => 5, 'pageSize' => 10, 'loading' => false, 'error' => false, 'canCreate' => true, 'canBulk' => true, 'canStatus' => true, 'canDelete' => true, 'labels' => []])
@php
    $t = nq_product_admin_t($labels);
    $currency ??= \Nasaq\Nasaq::currency();
    $config = [
        'products' => array_values($products), 'currency' => $currency, 'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 't' => $t,
        'lowStockAt' => $lowStockAt, 'pageSize' => $pageSize, 'loading' => (bool) $loading, 'error' => $error ? ($error === true ? true : (string) $error) : false,
        'canCreate' => (bool) $canCreate, 'canBulk' => (bool) $canBulk, 'canStatus' => (bool) $canStatus, 'canDelete' => (bool) $canDelete,
    ];
    $th = 'px-3 py-2 text-start text-caption font-medium text-muted-foreground';
    $td = 'px-3 py-2.5 text-body-sm text-foreground';
    $sortable = ['product' => $t['productCol'], 'status' => $t['statusCol'], 'stock' => $t['stockCol'], 'variants' => $t['variantsCol'], 'price' => $t['priceCol']];
    $statusFacet = ['active' => $t['statuses.active'], 'draft' => $t['statuses.draft'], 'archived' => $t['statuses.archived']];
    $stockFacet = ['in' => $t['stockLevels.in'], 'low' => $t['stockLevels.low'], 'out' => $t['stockLevels.out'], 'untracked' => $t['stockLevels.untracked']];
    $priceModes = collect(['set', 'increase-percent', 'decrease-percent', 'increase-amount', 'decrease-amount'])->map(fn ($m) => ['value' => $m, 'label' => $t['priceModes.'.$m]])->prepend(['value' => 'keep', 'label' => $t['keep']])->all();
    $stockModes = collect(['set', 'add', 'remove'])->map(fn ($m) => ['value' => $m, 'label' => $t['stockModes.'.$m]])->prepend(['value' => 'keep', 'label' => $t['keep']])->all();
    $statusModes = collect(['active', 'draft', 'archived'])->map(fn ($m) => ['value' => $m, 'label' => $t['statuses.'.$m]])->prepend(['value' => 'keep', 'label' => $t['keep']])->all();
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'product-list') }}" x-data="nqProductAdminList(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-h3 text-foreground">{{ $t['products'] }}</h2>
        <div x-show="canCreate">
            <x-nq::button type="button" variant="primary" x-on:click="create()">
                <x-lucide-plus aria-hidden="true" />
                {{ $t['newProduct'] }}
            </x-nq::button>
        </div>
    </div>

    <div data-slot="data-table-toolbar" class="flex flex-wrap items-center gap-2">
        <div class="relative w-full min-w-40 sm:w-64">
            <x-lucide-search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground" />
            <x-nq::field.input type="search" aria-label="{{ $t['searchProducts'] }}" placeholder="{{ $t['searchProducts'] }}" class="h-control-sm ps-8" x-model="query" x-on:keydown.escape="query = ''" />
        </div>
        <x-nq::dropdown-menu>
            <x-nq::dropdown-menu.trigger variant="secondary" size="sm" data-facet="status">
                <x-lucide-circle-plus aria-hidden="true" />
                {{ $t['statusCol'] }}
                <span class="text-caption text-muted-foreground tabular-nums" x-show="on('status').length > 0" x-text="on('status').length"></span>
            </x-nq::dropdown-menu.trigger>
            <x-nq::dropdown-menu.content align="start" class="min-w-44">
                @foreach ($statusFacet as $value => $label)
                    <x-nq::dropdown-menu.checkbox-item x-model="facet.status['{{ $value }}']">{{ $label }}</x-nq::dropdown-menu.checkbox-item>
                @endforeach
            </x-nq::dropdown-menu.content>
        </x-nq::dropdown-menu>
        <x-nq::dropdown-menu>
            <x-nq::dropdown-menu.trigger variant="secondary" size="sm" data-facet="stock">
                <x-lucide-circle-plus aria-hidden="true" />
                {{ $t['stockCol'] }}
                <span class="text-caption text-muted-foreground tabular-nums" x-show="on('stock').length > 0" x-text="on('stock').length"></span>
            </x-nq::dropdown-menu.trigger>
            <x-nq::dropdown-menu.content align="start" class="min-w-44">
                @foreach ($stockFacet as $value => $label)
                    <x-nq::dropdown-menu.checkbox-item x-model="facet.stock['{{ $value }}']">{{ $label }}</x-nq::dropdown-menu.checkbox-item>
                @endforeach
            </x-nq::dropdown-menu.content>
        </x-nq::dropdown-menu>
    </div>

    <div data-slot="data-table-bulk-actions" x-show="selected.length > 0 ? canBulk : false" class="flex flex-wrap items-center gap-2 rounded-card border border-border bg-secondary px-3 py-2">
        <span class="text-label text-foreground" x-text="tt(`selectedCount`, num(selected.length))"></span>
        <x-nq::button type="button" size="sm" variant="secondary" x-on:click="openBulk()">
            <x-lucide-pencil aria-hidden="true" />
            {{ $t['bulkEdit'] }}
        </x-nq::button>
    </div>

    <p x-show="notice ? ! (bulkOpen || delOpen) : false" role="alert" class="text-body-sm text-nq-danger-text" x-text="notice"></p>

    <template x-if="failed">
        <div class="flex flex-col items-center gap-3">
            <x-nq::states.empty icon="triangle-alert" :title="$t['loadFailed']" />
            <x-nq::button type="button" size="sm" variant="secondary" x-on:click="retry()">{{ $t['retry'] }}</x-nq::button>
        </div>
    </template>
    <div x-show="loading" aria-busy="true" class="flex flex-col gap-2">
        <x-nq::states.skeleton class="h-12" /><x-nq::states.skeleton class="h-12" /><x-nq::states.skeleton class="h-12" />
    </div>
    <template x-if="showEmpty">
        <div class="flex flex-col items-center gap-3">
            <x-nq::states.empty icon="package-open" :title="$t['noProducts']" :description="$t['noProductsHint']" />
            <x-nq::button type="button" size="sm" variant="secondary" x-show="canCreate" x-on:click="create()">{{ $t['newProduct'] }}</x-nq::button>
        </div>
    </template>
    <template x-if="showNoMatch">
        <div class="flex flex-col items-center gap-3">
            <x-nq::states.empty icon="search-x" :title="\Nasaq\Nasaq::t('No products match', 'لا منتجات مطابقة')" />
            <x-nq::button type="button" size="sm" variant="secondary" x-on:click="clear()">{{ \Nasaq\Nasaq::t('Clear filters', 'مسح التصفية') }}</x-nq::button>
        </div>
    </template>

    <div x-show="showTable" data-slot="data-table" class="relative w-full overflow-x-auto rounded-card border border-border bg-card">
        <div role="table" aria-label="{{ $t['productListLabel'] }}" class="table w-full min-w-[44rem] border-collapse">
            <div role="rowgroup" class="table-header-group border-b border-border">
                <div role="row" class="table-row">
                    <div role="columnheader" class="table-cell w-10 px-3">
                        <x-nq::checkbox aria-label="{{ $t['productListLabel'] }}" x-on:click="toggleAll(! allOnPage)" x-bind:checked="allOnPage" />
                    </div>
                    @foreach ($sortable as $key => $label)
                        <div role="columnheader" class="table-cell {{ $th }} {{ $key === 'price' ? 'text-end' : '' }}" x-bind:aria-sort="ariaSort('{{ $key }}')">
                            <button type="button" class="inline-flex items-center gap-1 font-medium hover:text-foreground" x-on:click="sortBy('{{ $key }}')">{{ $label }}</button>
                        </div>
                    @endforeach
                    <div role="columnheader" class="table-cell w-10"><span class="sr-only">{{ $t['actions'] }}</span></div>
                </div>
            </div>
            <div role="rowgroup" class="table-row-group divide-y divide-border">
                <template x-for="p in rows" x-bind:key="p.id">
                    <div role="row" data-slot="product-row" x-data="nqContextMenu()" x-bind="trigger" x-bind:data-selected="sel[p.id] ? '' : null"
                        x-on:click="openProduct(p)" class="table-row cursor-pointer hover:bg-nq-hover data-[selected]:bg-nq-selected">
                        <div role="cell" class="table-cell px-3" x-on:click.stop>
                            <x-nq::checkbox x-model="sel[p.id]" x-bind:aria-label="p.name" />
                        </div>
                        <div role="cell" class="table-cell {{ $td }}">
                            <span class="flex min-w-0 items-center gap-3">
                                <x-nq::store-products-admin.thumb src="p.images[0]?.src" :size="40" />
                                <span class="flex min-w-0 flex-col">
                                    <span class="truncate font-medium" x-text="p.name"></span>
                                    <span class="truncate text-caption text-muted-foreground" x-show="p.category" x-text="p.category"></span>
                                </span>
                            </span>
                        </div>
                        <div role="cell" class="table-cell {{ $td }}">
                            <span data-slot="badge" class="inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium" x-bind:class="statusClass(p)" x-text="statusLabel(p)"></span>
                        </div>
                        <div role="cell" class="table-cell {{ $td }}">
                            <span class="flex flex-col items-start gap-0.5">
                                <span data-slot="badge" class="inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium" x-bind:class="levelClass(p)" x-text="levelLabel(p)"></span>
                                <span class="text-caption text-muted-foreground tabular-nums" x-text="unitsText(p)"></span>
                            </span>
                        </div>
                        <div role="cell" class="table-cell {{ $td }} tabular-nums" x-text="variantsText(p)"></div>
                        <div role="cell" dir="ltr" class="table-cell {{ $td }} text-end tabular-nums" x-text="priceText(p)"></div>
                        <div role="cell" class="table-cell px-1" x-on:click.stop>
                            <x-nq::dropdown-menu>
                                <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="row-actions" x-bind:aria-label="`{{ $t['actions'] }}, ${p.name}`" class="text-muted-foreground data-popup-open:text-foreground">
                                    <x-lucide-ellipsis aria-hidden="true" />
                                </x-nq::dropdown-menu.trigger>
                                <x-nq::dropdown-menu.content align="end" class="min-w-48">
                                    <x-nq::dropdown-menu.item x-on:click="openProduct(p)"><x-lucide-pencil aria-hidden="true" />{{ $t['edit'] }}</x-nq::dropdown-menu.item>
                                    <x-nq::dropdown-menu.item x-show="can(p, `active`)" x-on:click="setStatus(p, `active`)"><x-lucide-circle-check aria-hidden="true" />{{ $t['setActive'] }}</x-nq::dropdown-menu.item>
                                    <x-nq::dropdown-menu.item x-show="can(p, `draft`)" x-on:click="setStatus(p, `draft`)"><x-lucide-file-pen aria-hidden="true" />{{ $t['setDraft'] }}</x-nq::dropdown-menu.item>
                                    <x-nq::dropdown-menu.item x-show="can(p, `archived`)" x-on:click="setStatus(p, `archived`)"><x-lucide-archive aria-hidden="true" />{{ $t['archive'] }}</x-nq::dropdown-menu.item>
                                    <x-nq::dropdown-menu.separator x-show="canDelete" />
                                    <x-nq::dropdown-menu.item variant="danger" x-show="canDelete" x-on:click="askDelete(p)"><x-lucide-trash-2 aria-hidden="true" />{{ $t['delete'] }}</x-nq::dropdown-menu.item>
                                </x-nq::dropdown-menu.content>
                            </x-nq::dropdown-menu>
                        </div>
                        <template x-teleport="body">
                            <div data-slot="context-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open"
                                class="fixed z-50 min-w-48 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none max-h-[var(--available-height)] overflow-y-auto transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
                                <x-nq::context-menu.item x-on:click="openProduct(p)"><x-lucide-pencil aria-hidden="true" />{{ $t['edit'] }}</x-nq::context-menu.item>
                                <x-nq::context-menu.item x-show="can(p, `active`)" x-on:click="setStatus(p, `active`)"><x-lucide-circle-check aria-hidden="true" />{{ $t['setActive'] }}</x-nq::context-menu.item>
                                <x-nq::context-menu.item x-show="can(p, `draft`)" x-on:click="setStatus(p, `draft`)"><x-lucide-file-pen aria-hidden="true" />{{ $t['setDraft'] }}</x-nq::context-menu.item>
                                <x-nq::context-menu.item x-show="can(p, `archived`)" x-on:click="setStatus(p, `archived`)"><x-lucide-archive aria-hidden="true" />{{ $t['archive'] }}</x-nq::context-menu.item>
                                <x-nq::context-menu.separator x-show="canDelete" />
                                <x-nq::context-menu.item variant="danger" x-show="canDelete" x-on:click="askDelete(p)"><x-lucide-trash-2 aria-hidden="true" />{{ $t['delete'] }}</x-nq::context-menu.item>
                            </div>
                        </template>
                    </div>
                </template>
            </div>
        </div>
    </div>
    <div x-show="showPager" class="flex items-center justify-between gap-2 text-body-sm text-muted-foreground">
        <span class="tabular-nums" x-text="num(Math.min(page, pages)) + ' / ' + num(pages)"></span>
        <div class="flex gap-2">
            <x-nq::button type="button" size="sm" variant="secondary" x-bind:disabled="page <= 1" x-on:click="page = page - 1"><x-lucide-chevron-left aria-hidden="true" class="rtl:-scale-x-100" /><span class="sr-only">{{ \Nasaq\Nasaq::t('Previous page', 'الصفحة السابقة') }}</span></x-nq::button>
            <x-nq::button type="button" size="sm" variant="secondary" x-bind:disabled="page >= pages" x-on:click="page = page + 1"><x-lucide-chevron-right aria-hidden="true" class="rtl:-scale-x-100" /><span class="sr-only">{{ \Nasaq\Nasaq::t('Next page', 'الصفحة التالية') }}</span></x-nq::button>
        </div>
    </div>

    <x-nq::dialog x-model="bulkOpen">
        <x-nq::dialog.content data-slot="product-bulk-edit" class="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
            <form class="grid gap-4" x-on:submit.prevent="applyBulk()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="tt(`bulkTitle`, num(selected.length))"></span></x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['bulkDescription'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>

                <fieldset class="grid gap-2">
                    <legend class="text-label text-foreground">{{ $t['bulkPrice'] }}</legend>
                    <x-nq::native-select :options="$priceModes" aria-label="{{ $t['bulkPrice'] }}" x-model="priceMode" />
                    <div x-show="percentMode">
                        <x-nq::field.input type="text" inputmode="decimal" aria-label="{{ $t['percent'] }}" placeholder="{{ $t['percent'] }}" x-model="percentText" />
                    </div>
                    <div x-show="priceMode !== 'keep' ? ! percentMode : false">
                        <x-nq::currency-input :currency="$currency" aria-label="{{ $t['amount'] }}" x-model="amount" />
                    </div>
                    <label x-show="priceMode !== 'keep'" class="flex items-center gap-2 text-body-sm text-foreground">
                        <x-nq::checkbox x-model="alsoCompare" />
                        {{ $t['alsoCompareAt'] }}
                    </label>
                </fieldset>

                <fieldset class="grid gap-2">
                    <legend class="text-label text-foreground">{{ $t['bulkStock'] }}</legend>
                    <x-nq::native-select :options="$stockModes" aria-label="{{ $t['bulkStock'] }}" x-model="stockMode" />
                    <div x-show="stockMode !== 'keep'">
                        <x-nq::field.input type="text" inputmode="numeric" aria-label="{{ $t['quantity'] }}" placeholder="{{ $t['quantity'] }}" x-model="stockText" />
                    </div>
                </fieldset>

                <fieldset class="grid gap-2">
                    <legend class="text-label text-foreground">{{ $t['bulkStatus'] }}</legend>
                    <x-nq::native-select :options="$statusModes" aria-label="{{ $t['bulkStatus'] }}" x-model="bulkStatus" />
                </fieldset>

                <div role="status" aria-live="polite" data-slot="bulk-preview" class="grid gap-2 rounded-card border border-border bg-nq-surface-soft p-3">
                    <p class="text-label text-foreground">{{ $t['preview'] }}</p>
                    <p x-show="preview.length === 0" class="text-body-sm text-muted-foreground">{{ $t['previewEmpty'] }}</p>
                    <ul class="grid gap-1">
                        <template x-for="r in previewShown" x-bind:key="r.id">
                            <li class="flex flex-wrap items-center gap-x-3 text-body-sm">
                                <span class="min-w-0 flex-1 truncate" x-text="r.name"></span>
                                <span class="tabular-nums text-muted-foreground" dir="ltr" x-show="r.price" x-text="r.price"></span>
                                <span class="tabular-nums text-muted-foreground" dir="ltr" x-show="r.stock" x-text="r.stock"></span>
                                <span class="text-muted-foreground" x-show="r.status" x-text="r.status"></span>
                            </li>
                        </template>
                        <li class="text-caption text-muted-foreground" x-show="previewMore > 0" x-text="`+` + num(previewMore)"></li>
                    </ul>
                </div>

                <p x-show="notice" role="alert" class="text-body-sm text-nq-danger-text" x-text="notice"></p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-bind:disabled="busy" x-on:click="bulkOpen = false">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="! hasChange || busy"><span x-text="tt(`applyToProducts`, num(selected.length))"></span></x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    <x-nq::dialog x-model="delOpen">
        <x-nq::dialog.content data-slot="product-delete" class="max-w-md">
            <x-nq::dialog.header>
                <x-nq::dialog.title>{{ $t['deleteTitle'] }}</x-nq::dialog.title>
                <x-nq::dialog.description><span x-text="tt(`deleteDescription`, deleting ? deleting.name : ``)"></span></x-nq::dialog.description>
            </x-nq::dialog.header>
            <p x-show="notice" role="alert" class="text-body-sm text-nq-danger-text" x-text="notice"></p>
            <x-nq::dialog.footer>
                <x-nq::button type="button" variant="ghost" x-bind:disabled="busy" x-on:click="delOpen = false">{{ $t['cancel'] }}</x-nq::button>
                <x-nq::button type="button" variant="danger" x-bind:disabled="busy" x-on:click="confirmDelete()">{{ $t['delete'] }}</x-nq::button>
            </x-nq::dialog.footer>
        </x-nq::dialog.content>
    </x-nq::dialog>
</div>
