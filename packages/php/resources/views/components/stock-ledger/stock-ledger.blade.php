{{-- <x-nq::stock-ledger :products="$products" :warehouses="$warehouses" :movements="$movements" can-record @nq-stock-record="$event.detail.waitUntil(save($event.detail.movements))" />
     On-hand per warehouse from receive, issue and adjust movements, the movements of the product you pick with a running balance,
     and a dialog to record a movement (receive, issue, adjust or transfer). Stock changes only through movements.
     products: [['id', 'name', 'sku', 'unit', 'reorderPoint']]; warehouses: [['id', 'name', 'code']];
     movements: [['id', 'date' (ISO), 'productId', 'warehouseId', 'type' => receive|issue|adjust, 'quantity' (signed), 'reference', 'note']].
     as-of: ISO date, on-hand ignores later movements. can-record: show the Record movement button and the row actions (false, read-only).
     labels: override any built-in string by key. Quantities have up to three decimals.
     Recording fires "nq-stock-record" on the root with detail { movements, waitUntil(promise), resolve(), reject(message) }; nobody claiming it
     adds the movements locally. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['products' => [], 'warehouses' => [], 'movements' => [], 'asOf' => null, 'canRecord' => false, 'labels' => []])
@php
    $n = \Nasaq\Nasaq::class;
    $strings = [
        'inStock' => $n::t('In stock', 'متوفر'), 'low' => $n::t('Low', 'منخفض'), 'out' => $n::t('Out', 'نافد'),
        'errQuantity' => $n::t('Enter a quantity above zero.', 'أدخل كمية أكبر من صفر.'),
        'errProduct' => $n::t('Pick a product.', 'اختر منتجًا.'),
        'errWarehouse' => $n::t('Pick a warehouse.', 'اختر مستودعًا.'),
        'errSame' => $n::t('Pick two different warehouses.', 'اختر مستودعين مختلفين.'),
        'errStock' => $n::t('Not enough stock: only {n} available here.', 'المخزون لا يكفي: المتاح هنا {n} فقط.'),
        'errSave' => $n::t('Could not save the movement.', 'تعذر حفظ الحركة.'),
        'receive' => $n::t('Receive', 'استلام'), 'issue' => $n::t('Issue', 'صرف'), 'adjust' => $n::t('Adjust', 'تسوية'), 'transfer' => $n::t('Transfer', 'تحويل'),
        'reorderAt' => $n::t('Reorder at', 'حد إعادة الطلب'),
        ...$labels,
    ];
    $s = fn (string $key, string $en, string $ar) => $labels[$key] ?? $n::t($en, $ar);
    $config = [
        'products' => array_values($products), 'warehouses' => array_values($warehouses), 'movements' => array_values($movements),
        'asOf' => $asOf, 'canRecord' => (bool) $canRecord, 'locale' => $n::rtl() ? 'ar' : 'en', 'today' => \Carbon\Carbon::now()->toDateString(), 't' => $strings,
    ];
    $th = 'px-3 py-2 text-start text-caption font-medium text-muted-foreground';
    $thNum = 'px-3 py-2 text-end text-caption font-medium text-muted-foreground';
    $td = 'px-3 py-2.5 text-body-sm text-foreground';
    $tdNum = 'px-3 py-2.5 text-end text-body-sm text-foreground tabular-nums';
    $label = 'flex flex-col gap-1.5 text-label text-foreground';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'stock-ledger') }}" x-data="nqStockLedger(@js($config))" {{ $attributes->except('data-slot')->cn('flex w-full min-w-0 flex-col gap-6') }}>
    <div class="flex min-w-0 flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-title-sm text-foreground">{{ $s('onHand', 'On hand', 'المتوفر') }}</h2>
            @if ($canRecord)
                <x-nq::button type="button" x-on:click="openRecord('receive', productId)">
                    <x-lucide-plus aria-hidden="true" />
                    {{ $s('record', 'Record movement', 'تسجيل حركة') }}
                </x-nq::button>
            @endif
        </div>
        <template x-if="products.length === 0">
            <x-nq::states.empty icon="package-open" :title="$s('noProducts', 'No products to track', 'لا توجد منتجات للتتبع')" :description="$s('noProductsText', 'Add products and warehouses to see stock.', 'أضف منتجات ومستودعات لعرض المخزون.')" />
        </template>
        <div x-show="products.length > 0" data-slot="stock-on-hand" class="relative w-full overflow-x-auto rounded-card border border-border bg-card">
            <div role="table" class="table w-full min-w-[34rem] border-collapse">
                <div role="caption" class="sr-only">{{ $s('onHand', 'On hand', 'المتوفر') }}</div>
                <div role="rowgroup" class="table-header-group border-b border-border">
                    <div role="row" class="table-row">
                        <div role="columnheader" class="table-cell {{ $th }} sticky start-0 z-10 bg-card">{{ $s('product', 'Product', 'المنتج') }}</div>
                        @foreach ($warehouses as $w)
                            <div role="columnheader" dir="ltr" class="table-cell {{ $thNum }}" title="{{ $w['name'] }}">{{ $w['code'] ?? $w['name'] }}</div>
                        @endforeach
                        <div role="columnheader" dir="ltr" class="table-cell {{ $thNum }}">{{ $s('total', 'Total', 'الإجمالي') }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $s('status', 'Status', 'الحالة') }}</div>
                        <div role="columnheader" class="table-cell w-10"><span class="sr-only">{{ $s('rowActions', 'Product actions', 'إجراءات المنتج') }}</span></div>
                    </div>
                </div>
                <div role="rowgroup" class="table-row-group divide-y divide-border">
                    <template x-for="row in matrix.rows" :key="row.product.id">
                        <div role="row" data-slot="stock-row" x-data="nqContextMenu()" x-bind="trigger" x-bind:data-level="row.level" x-bind:data-selected="productId === row.product.id ? '' : null" class="table-row data-[selected]:bg-nq-hover">
                            <div role="cell" class="table-cell {{ $td }} sticky start-0 z-10 bg-card">
                                <div class="flex min-w-0 flex-col">
                                    <button type="button" class="truncate text-start font-medium hover:underline" x-on:click="select(row.product.id)" x-text="row.product.name"></button>
                                    <span class="flex items-center gap-1.5 text-caption text-muted-foreground">
                                        <bdi dir="ltr" class="tabular-nums" x-text="row.product.sku"></bdi>
                                        <span x-show="row.product.unit" x-text="row.product.unit"></span>
                                    </span>
                                </div>
                            </div>
                            @foreach ($warehouses as $w)
                                <div role="cell" dir="ltr" class="table-cell {{ $tdNum }}" x-bind:class="(row.cells['{{ $w['id'] }}'] ?? 0) < 0 ? 'text-danger' : ''" x-text="num(row.cells['{{ $w['id'] }}'] ?? 0, true)"></div>
                            @endforeach
                            <div role="cell" dir="ltr" class="table-cell {{ $tdNum }} font-medium" x-text="num(row.total)"></div>
                            <div role="cell" class="table-cell {{ $td }}">
                                <x-nq::badge variant="success" x-bind:class="{ 'hidden': row.level !== 'ok' }" x-text="levelLabel('ok')"></x-nq::badge>
                                <x-nq::badge variant="warning" x-bind:class="{ 'hidden': row.level !== 'low' }" x-text="levelLabel('low')" x-bind:title="row.product.reorderPoint != null ? '{{ $strings['reorderAt'] }} ' + row.product.reorderPoint : null"></x-nq::badge>
                                <x-nq::badge variant="danger" x-bind:class="{ 'hidden': row.level !== 'out' }" x-text="levelLabel('out')"></x-nq::badge>
                            </div>
                            <div role="cell" class="table-cell px-1">
                                <x-nq::dropdown-menu>
                                    <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="line-item-actions" x-bind:aria-label="'{{ $s('rowActions', 'Product actions', 'إجراءات المنتج') }}, ' + row.product.name" class="text-muted-foreground data-popup-open:text-foreground">
                                        <x-lucide-ellipsis aria-hidden="true" />
                                    </x-nq::dropdown-menu.trigger>
                                    <x-nq::dropdown-menu.content align="end" class="min-w-44">
                                        <x-nq::dropdown-menu.item x-on:click="select(row.product.id)"><x-lucide-list-tree aria-hidden="true" />{{ $s('viewMovements', 'View movements', 'عرض الحركات') }}</x-nq::dropdown-menu.item>
                                        @if ($canRecord)
                                            <x-nq::dropdown-menu.separator />
                                            <x-nq::dropdown-menu.item x-on:click="openRecord('receive', row.product.id)"><x-lucide-arrow-right-to-line aria-hidden="true" />{{ $strings['receive'] }}</x-nq::dropdown-menu.item>
                                            <x-nq::dropdown-menu.item x-on:click="openRecord('issue', row.product.id)"><x-lucide-arrow-right-from-line aria-hidden="true" />{{ $strings['issue'] }}</x-nq::dropdown-menu.item>
                                            <x-nq::dropdown-menu.item x-on:click="openRecord('adjust', row.product.id)"><x-lucide-sliders-horizontal aria-hidden="true" />{{ $strings['adjust'] }}</x-nq::dropdown-menu.item>
                                        @endif
                                    </x-nq::dropdown-menu.content>
                                </x-nq::dropdown-menu>
                            </div>
                            <template x-teleport="body">
                                <div data-slot="context-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open"
                                    class="fixed z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none max-h-[var(--available-height)] overflow-y-auto transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
                                    <x-nq::context-menu.item x-on:click="select(row.product.id)"><x-lucide-list-tree aria-hidden="true" />{{ $s('viewMovements', 'View movements', 'عرض الحركات') }}</x-nq::context-menu.item>
                                    @if ($canRecord)
                                        <x-nq::context-menu.separator />
                                        <x-nq::context-menu.item x-on:click="openRecord('receive', row.product.id)"><x-lucide-arrow-right-to-line aria-hidden="true" />{{ $strings['receive'] }}</x-nq::context-menu.item>
                                        <x-nq::context-menu.item x-on:click="openRecord('issue', row.product.id)"><x-lucide-arrow-right-from-line aria-hidden="true" />{{ $strings['issue'] }}</x-nq::context-menu.item>
                                        <x-nq::context-menu.item x-on:click="openRecord('adjust', row.product.id)"><x-lucide-sliders-horizontal aria-hidden="true" />{{ $strings['adjust'] }}</x-nq::context-menu.item>
                                    @endif
                                </div>
                            </template>
                        </div>
                    </template>
                </div>
                <div role="rowgroup" class="table-footer-group border-t border-border bg-muted/40">
                    <div role="row" class="table-row">
                        <div role="rowheader" class="table-cell {{ $th }} sticky start-0 z-10 bg-muted/40 font-semibold text-foreground">{{ $s('total', 'Total', 'الإجمالي') }}</div>
                        @foreach ($warehouses as $w)
                            <div role="cell" dir="ltr" class="table-cell {{ $tdNum }} font-medium" x-text="num(matrix.warehouseTotals['{{ $w['id'] }}'] ?? 0)"></div>
                        @endforeach
                        <div role="cell" dir="ltr" class="table-cell {{ $tdNum }} font-semibold" x-text="num(matrix.total)"></div>
                        <div role="cell" colspan="2" class="table-cell"></div>
                    </div>
                </div>
            </div>
        </div>
        <p class="text-caption text-muted-foreground">{{ $s('reorderNote', 'Flagged low at or under the reorder point.', 'يُعلَّم منخفضًا عند حد إعادة الطلب أو أقل.') }}</p>
    </div>
    @if (count($products) > 0)
        <div class="flex min-w-0 flex-col gap-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-title-sm text-foreground">{{ $s('movements', 'Movements', 'الحركات') }}</h2>
                <div class="flex flex-wrap gap-2">
                    <x-nq::select :value="$products[0]['id']" x-model="productId">
                        <x-nq::select.trigger aria-label="{{ $s('filterProduct', 'Product', 'المنتج') }}" class="min-w-44"><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($products as $p)
                                <x-nq::select.item :value="$p['id']">{{ $p['name'] }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                    <x-nq::select value="__all__" x-model="warehouseId">
                        <x-nq::select.trigger aria-label="{{ $s('filterWarehouse', 'Warehouse', 'المستودع') }}" class="min-w-44"><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            <x-nq::select.item value="__all__">{{ $s('allWarehouses', 'All warehouses', 'كل المستودعات') }}</x-nq::select.item>
                            @foreach ($warehouses as $w)
                                <x-nq::select.item :value="$w['id']">{{ $w['name'] }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </div>
            </div>
            <template x-if="statement.length === 0">
                <x-nq::states.empty icon="list-tree" :title="$s('noMovements', 'No movements yet', 'لا توجد حركات بعد')" :description="$s('noMovementsText', 'Record a receive, issue or adjustment and it shows here.', 'سجّل استلامًا أو صرفًا أو تسوية وستظهر هنا.')" />
            </template>
            <div x-show="statement.length > 0" data-slot="stock-movements" class="relative w-full overflow-x-auto rounded-card border border-border bg-card">
                <div role="table" class="table w-full min-w-[36rem] border-collapse">
                    <div role="caption" class="sr-only">{{ $s('movements', 'Movements', 'الحركات') }}. {{ $s('asOf', 'Balance after each movement', 'الرصيد بعد كل حركة') }}.</div>
                    <div role="rowgroup" class="table-header-group border-b border-border">
                        <div role="row" class="table-row">
                            <div role="columnheader" class="table-cell {{ $th }}">{{ $s('date', 'Date', 'التاريخ') }}</div>
                            <div role="columnheader" class="table-cell {{ $th }}">{{ $s('movement', 'Movement', 'الحركة') }}</div>
                            <div role="columnheader" class="table-cell {{ $th }}">{{ $s('warehouse', 'Warehouse', 'المستودع') }}</div>
                            <div role="columnheader" class="table-cell {{ $th }}">{{ $s('reference', 'Reference', 'المرجع') }}</div>
                            <div role="columnheader" dir="ltr" class="table-cell {{ $thNum }}">{{ $s('change', 'Change', 'التغيير') }}</div>
                            <div role="columnheader" dir="ltr" class="table-cell {{ $thNum }}">{{ $s('balance', 'Balance', 'الرصيد') }}</div>
                        </div>
                    </div>
                    <div role="rowgroup" class="table-row-group divide-y divide-border">
                        <template x-for="r in statement" :key="r.movement.id">
                            <div role="row" data-slot="stock-movement" class="table-row">
                                <div role="cell" class="table-cell {{ $td }} whitespace-nowrap" x-text="date(r.movement.date)"></div>
                                <div role="cell" class="table-cell {{ $td }}">
                                    <x-nq::badge variant="success" x-show="r.movement.type === 'receive'" x-text="t.receive"></x-nq::badge>
                                    <x-nq::badge variant="danger" x-show="r.movement.type === 'issue'" x-text="t.issue"></x-nq::badge>
                                    <x-nq::badge variant="info" x-show="r.movement.type === 'adjust'" x-text="t.adjust"></x-nq::badge>
                                    <div x-show="r.movement.note" class="mt-0.5 text-caption text-muted-foreground" x-text="r.movement.note"></div>
                                </div>
                                <div role="cell" class="table-cell {{ $td }}" x-text="warehouseName(r.movement.warehouseId)"></div>
                                <div role="cell" class="table-cell {{ $td }}"><bdi dir="ltr" class="tabular-nums" x-text="r.movement.reference || '–'"></bdi></div>
                                <div role="cell" dir="ltr" class="table-cell {{ $tdNum }}" x-bind:class="r.change < 0 ? 'text-danger' : 'text-success'" x-text="num(r.change, false, true)"></div>
                                <div role="cell" dir="ltr" class="table-cell {{ $tdNum }} font-medium" x-bind:class="r.balance < 0 ? 'text-danger' : ''" x-text="num(r.balance)"></div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    @endif
    @if ($canRecord)
        <x-nq::dialog x-model="dialogOpen">
            <x-nq::dialog.content data-slot="stock-record" class="max-w-lg">
                <form class="flex flex-col gap-4" novalidate x-on:submit.prevent="submit()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title>{{ $s('record', 'Record movement', 'تسجيل حركة') }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $s('recordText', 'Stock changes only through movements. Pick what happened and how many.', 'لا يتغير المخزون إلا بحركة. اختر ما حدث وكم الكمية.') }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <x-nq::toggle-group aria-label="{{ $s('movementType', 'Movement type', 'نوع الحركة') }}" x-model="kind" class="grid w-full grid-cols-4">
                        <x-nq::toggle-group.toggle value="receive" class="flex-col gap-1 py-2 @container"><x-lucide-arrow-right-to-line aria-hidden="true" /><span class="text-caption">{{ $strings['receive'] }}</span></x-nq::toggle-group.toggle>
                        <x-nq::toggle-group.toggle value="issue" class="flex-col gap-1 py-2 @container"><x-lucide-arrow-right-from-line aria-hidden="true" /><span class="text-caption">{{ $strings['issue'] }}</span></x-nq::toggle-group.toggle>
                        <x-nq::toggle-group.toggle value="adjust" class="flex-col gap-1 py-2 @container"><x-lucide-sliders-horizontal aria-hidden="true" /><span class="text-caption">{{ $strings['adjust'] }}</span></x-nq::toggle-group.toggle>
                        <x-nq::toggle-group.toggle value="transfer" class="flex-col gap-1 py-2 @container"><x-lucide-arrow-left-right aria-hidden="true" /><span class="text-caption">{{ $strings['transfer'] }}</span></x-nq::toggle-group.toggle>
                    </x-nq::toggle-group>
                    <div class="grid gap-3 sm:grid-cols-2">
                        <div class="{{ $label }} sm:col-span-2">
                            <span>{{ $s('product', 'Product', 'المنتج') }}</span>
                            <x-nq::select x-model="formProduct">
                                <x-nq::select.trigger aria-label="{{ $s('product', 'Product', 'المنتج') }}" x-bind:aria-invalid="badProduct ? 'true' : null"><x-nq::select.value placeholder="{{ $s('product', 'Product', 'المنتج') }}" /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    @foreach ($products as $p)
                                        <x-nq::select.item :value="$p['id']">{{ $p['name'] }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                        </div>
                        <div class="{{ $label }}">
                            <span x-text="kindValue === 'transfer' ? '{{ $s('from', 'From', 'من') }}' : '{{ $s('warehouse', 'Warehouse', 'المستودع') }}'"></span>
                            <x-nq::select x-model="formWarehouse">
                                <x-nq::select.trigger aria-label="{{ $s('warehouse', 'Warehouse', 'المستودع') }}"><x-nq::select.value placeholder="{{ $s('warehouse', 'Warehouse', 'المستودع') }}" /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    @foreach ($warehouses as $w)
                                        <x-nq::select.item :value="$w['id']">{{ $w['name'] }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                        </div>
                        <div class="{{ $label }}" x-show="kindValue === 'transfer'">
                            <span>{{ $s('to', 'To', 'إلى') }}</span>
                            <x-nq::select x-model="formTo">
                                <x-nq::select.trigger aria-label="{{ $s('to', 'To', 'إلى') }}" x-bind:aria-invalid="badTo ? 'true' : null"><x-nq::select.value placeholder="{{ $s('warehouse', 'Warehouse', 'المستودع') }}" /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    @foreach ($warehouses as $w)
                                        <x-nq::select.item :value="$w['id']">{{ $w['name'] }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                        </div>
                        <div class="{{ $label }}" x-show="kindValue === 'adjust'">
                            <span id="stock-dir">{{ $s('direction', 'Direction', 'الاتجاه') }}</span>
                            <x-nq::toggle-group aria-labelledby="stock-dir" x-model="dir" class="grid w-full grid-cols-2">
                                <x-nq::toggle-group.toggle value="increase">{{ $s('increase', 'Increase', 'زيادة') }}</x-nq::toggle-group.toggle>
                                <x-nq::toggle-group.toggle value="decrease">{{ $s('decrease', 'Decrease', 'نقصان') }}</x-nq::toggle-group.toggle>
                            </x-nq::toggle-group>
                        </div>
                        <div class="{{ $label }}">
                            <span>{{ $s('quantity', 'Quantity', 'الكمية') }}</span>
                            <x-nq::line-item-editor.decimal-field x-model="qty" :scale="3" kind="qty" :min="0" aria-label="{{ $s('quantity', 'Quantity', 'الكمية') }}" />
                        </div>
                        <div class="{{ $label }}">
                            <span>{{ $s('date', 'Date', 'التاريخ') }}</span>
                            <x-nq::field.input type="date" x-model="day" ltr />
                        </div>
                        <div class="{{ $label }}">
                            <span>{{ $s('reference', 'Reference', 'المرجع') }}</span>
                            <x-nq::field.input x-model="reference" ltr placeholder="{{ $s('referencePlaceholder', 'PO-2041, SO-5520, count sheet', 'أمر شراء، أمر بيع، ورقة جرد') }}" />
                        </div>
                        <div class="{{ $label }} sm:col-span-2">
                            <span>{{ $s('note', 'Note', 'ملاحظة') }}</span>
                            <x-nq::field.input x-model="note" />
                        </div>
                    </div>
                    <p x-show="formProduct && formWarehouse" class="flex items-center justify-between gap-3 text-caption text-muted-foreground">
                        <span>{{ $s('available', 'Available here', 'المتاح هنا') }}</span>
                        <span dir="ltr" class="text-body-sm font-medium text-foreground tabular-nums" data-slot="stock-available" x-text="num(available)"></span>
                    </p>
                    <div aria-live="polite" class="min-h-5">
                        <p x-show="shownError" role="alert" class="text-caption text-danger" x-text="shownError"></p>
                    </div>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="secondary" x-bind:disabled="busy" x-on:click="dialogOpen = false">{{ $s('cancel', 'Cancel', 'إلغاء') }}</x-nq::button>
                        <x-nq::button type="submit" x-bind:disabled="busy">{{ $s('save', 'Save movement', 'حفظ الحركة') }}</x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
</section>
