{{-- <x-nq::line-item-editor :products="$products" :lines="$lines" currency="SAR" :default-tax-bps="1500" x-on:nq-change="save($event.detail)" />
     The lines of an invoice, quote or order: pick a product to fill its name, price and tax, or type a free line; quantity, unit price,
     discount and tax per line; totals computed in integer minor units. Needs the Alpine runtime (@nasaqScripts).
     lines: [{ id, productId?, name, quantity, unitPrice (minor units), discountBps?, taxBps? }]   products: [{ id, name, sku?, price (minor), taxBps?, stock?, unit? }]
     currency: ISO 4217 (USD, or SAR in Arabic)   tax-mode: exclusive | inclusive   tax-rounding: line | invoice   default-tax-bps   tax-rates: [0, 500, 1500]
     show-tax / show-discount (true)   allow-free-lines (true)   max-lines   read-only   disabled
     order-discount: true or { type: percent|amount, bps|minor } shows the basket discount editor
     labels: an array overriding any built-in text.
     Events on the root: nq-change { lines, totals } after every edit, nq-order-discount-change { orderDiscount }.
     The per-line context menu of the React/Vue component is not ported: the ⋯ button holds the same actions. --}}
@props(['lines' => [], 'products' => [], 'currency' => null, 'taxMode' => 'exclusive', 'taxRounding' => 'line', 'defaultTaxBps' => 0, 'taxRates' => [0, 500, 1500], 'showTax' => true, 'showDiscount' => true, 'allowFreeLines' => true, 'maxLines' => null, 'orderDiscount' => false, 'readOnly' => false, 'disabled' => false, 'labels' => []])
@php
    $locale = app()->getLocale();
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $strings = [
        'item' => ['Item', 'الصنف'], 'itemPlaceholder' => ['Search products or type a name', 'ابحث عن منتج أو اكتب اسمًا'],
        'quantity' => ['Qty', 'الكمية'], 'unitPrice' => ['Unit price', 'سعر الوحدة'], 'discount' => ['Disc.', 'الخصم'], 'tax' => ['Tax', 'الضريبة'],
        'total' => ['Total', 'الإجمالي'], 'addProduct' => ['Add product', 'إضافة منتج'], 'addFree' => ['Add free line', 'إضافة بند حر'],
        'remove' => ['Remove line', 'حذف البند'], 'duplicate' => ['Duplicate line', 'تكرار البند'], 'moveUp' => ['Move up', 'نقل لأعلى'],
        'moveDown' => ['Move down', 'نقل لأسفل'], 'lineActions' => ['Line actions', 'إجراءات البند'], 'line' => ['Line', 'البند'],
        'increase' => ['Increase quantity', 'زيادة الكمية'], 'decrease' => ['Decrease quantity', 'تقليل الكمية'],
        'noMatch' => ['No matching product. The text becomes a free line.', 'لا يوجد منتج مطابق. سيصبح النص بندًا حرًا.'],
        'open' => ['Open list', 'فتح القائمة'], 'clear' => ['Clear', 'مسح'], 'nameRequired' => ['Name the item or pick a product.', 'اكتب اسم الصنف أو اختر منتجًا.'],
        'freeLine' => ['Free line', 'بند حر'], 'empty' => ['No lines yet', 'لا توجد بنود بعد'],
        'emptyText' => ['Pick a product to fill its name, price and tax, or add a free line.', 'اختر منتجًا ليملأ الاسم والسعر والضريبة، أو أضف بندًا حرًا.'],
        'lines' => ['Lines', 'البنود'], 'subtotal' => ['Subtotal', 'المجموع الفرعي'], 'discountRow' => ['Discounts', 'الخصومات'],
        'orderDiscount' => ['Order discount', 'خصم على الطلب'], 'percent' => ['Percent', 'نسبة'], 'amount' => ['Amount', 'مبلغ'],
        'taxRow' => ['Tax', 'الضريبة'], 'taxIncluded' => ['Tax included', 'شامل الضريبة'], 'taxRate' => ['Tax rate', 'نسبة الضريبة'],
        'exempt' => ['No tax', 'بدون ضريبة'], 'totalDue' => ['Total', 'الإجمالي'], 'totals' => ['Totals', 'الإجماليات'], 'inStock' => ['in stock', 'في المخزون'],
    ];
    $t = [];
    foreach ($strings as $key => [$en, $ar]) {
        $t[$key] = $labels[$key] ?? \Nasaq\Nasaq::t($en, $ar);
    }
    $lines = array_values((array) $lines);
    $products = array_values((array) $products);
    $od = is_array($orderDiscount) ? $orderDiscount : null;
    $config = [
        'lines' => $lines, 'products' => $products, 'currency' => $code, 'locale' => str_replace('_', '-', $locale),
        'taxMode' => $taxMode, 'taxRounding' => $taxRounding, 'defaultTaxBps' => (int) $defaultTaxBps, 'showTax' => (bool) $showTax,
        'allowFreeLines' => (bool) $allowFreeLines, 'maxLines' => $maxLines, 'readOnly' => (bool) $readOnly, 'disabled' => (bool) $disabled,
        'orderDiscount' => $od, 'labels' => $t,
    ];
    // The tax select is server-drawn and static: offer every rate the editor can start from.
    $rates = collect((array) $taxRates)->push((int) $defaultTaxBps)
        ->merge(collect($products)->pluck('taxBps')->filter(fn ($v) => $v !== null))
        ->merge(collect($lines)->pluck('taxBps')->filter(fn ($v) => $v !== null))
        ->map(fn ($v) => (int) $v)->unique()->sort()->values()->all();
    $pct = function (int $bps): string {
        $s = rtrim(rtrim(number_format($bps / 100, 2, '.', ''), '0'), '.');
        return $s === '' ? '0' : $s;
    };
    $grid = $showTax && $showDiscount
        ? '@2xl:grid-cols-[minmax(12rem,1fr)_8.5rem_9.5rem_6.5rem_6rem_8rem_2rem]'
        : ($showTax ? '@2xl:grid-cols-[minmax(12rem,1fr)_8.5rem_9.5rem_6rem_8rem_2rem]'
            : ($showDiscount ? '@2xl:grid-cols-[minmax(12rem,1fr)_8.5rem_9.5rem_6.5rem_8rem_2rem]' : '@2xl:grid-cols-[minmax(12rem,1fr)_8.5rem_9.5rem_8rem_2rem]'));
    $orderOn = $orderDiscount !== false && $orderDiscount !== null;
    $odType = $od['type'] ?? 'percent';
@endphp
<div data-slot="line-item-editor" data-tax-mode="{{ $taxMode }}" x-data="nqLineItemEditor(@js($config))" x-id="['nq-lines']"
    {{ $attributes->cn('@container flex min-w-0 flex-col gap-4') }}>
    <template x-if="rows.length === 0">
        <x-nq::states.empty :title="$t['empty']" :description="$t['emptyText']" />
    </template>
    <div x-show="rows.length > 0" class="flex flex-col gap-2">
        <div aria-hidden="true" class="hidden gap-3 px-3 text-caption text-muted-foreground @2xl:grid {{ $grid }}">
            <span>{{ $t['item'] }}</span>
            <span class="text-center">{{ $t['quantity'] }}</span>
            <span class="text-end">{{ $t['unitPrice'] }}</span>
            @if ($showDiscount)<span class="text-end">{{ $t['discount'] }}</span>@endif
            @if ($showTax)<span class="text-end">{{ $t['tax'] }}</span>@endif
            <span class="text-end">{{ $t['total'] }}</span>
            <span></span>
        </div>
        <ul aria-label="{{ $t['lines'] }}" class="flex flex-col gap-2">
            <template x-for="(row, index) in rows" :key="row.id">
                <li data-slot="line-item" x-bind:data-free="row.productId ? null : ''" x-bind:aria-label="`${t.line} ${index + 1}: ${nameOf(row, index)}`"
                    class="grid grid-cols-2 items-start gap-x-3 gap-y-3 rounded-floating border border-border bg-card p-3 @2xl:items-start @2xl:gap-y-0 @2xl:rounded-control {{ $grid }}">
                    <div class="col-span-2 @2xl:col-span-1" x-init="focusNew(row, $el)">
                        <template x-if="readOnly">
                            <div class="min-w-0 py-1.5">
                                <p class="truncate text-body text-foreground" x-text="row.name"></p>
                                <p class="truncate text-caption text-muted-foreground" x-show="productOf(row)?.sku"><bdi dir="ltr" x-text="productOf(row)?.sku"></bdi></p>
                            </div>
                        </template>
                        <template x-if="!readOnly">
                            <div class="flex min-w-0 flex-col gap-1">
                                <x-nq::combobox x-model="row.productId" x-init="$watch('value', (v) => v && pick(row, v))"
                                    x-effect="if (!open && text !== row.name) text = row.name">
                                    <x-nq::combobox.input :clearable="false" placeholder="{{ $t['itemPlaceholder'] }}" :trigger-label="$t['open']" :clear-label="$t['clear']"
                                        x-bind:aria-label="`${t.item}, ${t.line} ${index + 1}`" x-bind:disabled="disabled" x-on:input="typed(row, $event.target.value)"
                                        x-on:blur="row.touched = true" />
                                    <x-nq::combobox.content>
                                        <x-nq::combobox.empty>{{ $allowFreeLines ? $t['noMatch'] : explode('.', $t['noMatch'])[0].'.' }}</x-nq::combobox.empty>
                                        <x-nq::combobox.list>
                                            @foreach ($products as $p)
                                                <x-nq::combobox.item :value="(string) $p['id']">
                                                    <bdi>{{ $p['name'] }}</bdi>@if (! empty($p['sku'])) <span class="ms-2 text-caption text-muted-foreground"><bdi dir="ltr">{{ $p['sku'] }}</bdi></span>@endif
                                                </x-nq::combobox.item>
                                            @endforeach
                                        </x-nq::combobox.list>
                                    </x-nq::combobox.content>
                                </x-nq::combobox>
                                <p x-show="row.touched && !row.name.trim()" x-cloak style="display: none" role="alert" class="text-caption text-nq-danger-text">{{ $t['nameRequired'] }}</p>
                                <p x-show="hint(row) && !(row.touched && !row.name.trim())" x-cloak style="display: none" class="truncate text-caption text-muted-foreground"><bdi x-text="hint(row)"></bdi></p>
                            </div>
                        </template>
                    </div>

                    <div class="flex min-w-0 flex-col gap-1">
                        <span aria-hidden="true" class="text-caption text-muted-foreground @2xl:hidden">{{ $t['quantity'] }}</span>
                        <template x-if="readOnly"><span class="py-1.5 text-center tabular-nums"><bdi x-text="qtyText(row)"></bdi></span></template>
                        <template x-if="!readOnly">
                            <div class="flex items-center gap-1">
                                <x-nq::button variant="ghost" size="icon-sm" class="shrink-0 pointer-coarse:size-control" x-bind:aria-label="`${t.decrease}, ${nameOf(row, index)}`"
                                    x-bind:disabled="!editable || row.qtyMilli <= 1000" x-on:click="step(row, -1)"><x-lucide-minus aria-hidden="true" /></x-nq::button>
                                <x-nq::line-item-editor.decimal-field x-model="row.qtyMilli" :scale="3" kind="qty" :min="1" x-bind:disabled="disabled"
                                    x-bind:aria-label="`${t.quantity}, ${nameOf(row, index)}`" />
                                <x-nq::button variant="ghost" size="icon-sm" class="shrink-0 pointer-coarse:size-control" x-bind:aria-label="`${t.increase}, ${nameOf(row, index)}`"
                                    x-bind:disabled="!editable" x-on:click="step(row, 1)"><x-lucide-plus aria-hidden="true" /></x-nq::button>
                            </div>
                        </template>
                    </div>

                    <div class="flex min-w-0 flex-col gap-1">
                        <span aria-hidden="true" class="text-caption text-muted-foreground @2xl:hidden">{{ $t['unitPrice'] }}</span>
                        <template x-if="readOnly"><span class="py-1.5 text-end"><bdi class="tabular-nums" x-text="money(row.unitPrice)"></bdi></span></template>
                        <template x-if="!readOnly">
                            <x-nq::currency-input x-model="row.unitPrice" :currency="$code" symbol="none" :min="0" x-bind:disabled="disabled"
                                x-bind:aria-label="`${t.unitPrice}, ${nameOf(row, index)}`" />
                        </template>
                    </div>

                    @if ($showDiscount)
                        <div class="flex min-w-0 flex-col gap-1">
                            <span aria-hidden="true" class="text-caption text-muted-foreground @2xl:hidden">{{ $t['discount'] }}</span>
                            <template x-if="readOnly"><span class="py-1.5 text-end tabular-nums"><bdi x-text="percent(row.discountBps)"></bdi></span></template>
                            <template x-if="!readOnly">
                                <x-nq::line-item-editor.decimal-field x-model="row.discountBps" :scale="2" kind="bps" :max="10000" suffix="%" x-bind:disabled="disabled"
                                    x-bind:aria-label="`${t.discount} %, ${nameOf(row, index)}`" />
                            </template>
                        </div>
                    @endif

                    @if ($showTax)
                        <div class="flex min-w-0 flex-col gap-1">
                            <span aria-hidden="true" class="text-caption text-muted-foreground @2xl:hidden">{{ $t['tax'] }}</span>
                            <template x-if="readOnly"><span class="py-1.5 text-end tabular-nums"><bdi x-text="percent(row.taxBps)"></bdi></span></template>
                            <template x-if="!readOnly">
                                <x-nq::select x-model="row.taxKey" x-effect="setTax(row, row.taxKey)">
                                    <x-nq::select.trigger x-bind:aria-label="`${t.taxRate}, ${nameOf(row, index)}`" x-bind:disabled="disabled"><x-nq::select.value /></x-nq::select.trigger>
                                    <x-nq::select.content>
                                        @foreach ($rates as $r)
                                            <x-nq::select.item :value="(string) $r"><bdi>{{ $r === 0 ? $t['exempt'] : $pct($r).'%' }}</bdi></x-nq::select.item>
                                        @endforeach
                                    </x-nq::select.content>
                                </x-nq::select>
                            </template>
                        </div>
                    @endif

                    <div class="flex min-w-0 flex-col gap-1 @2xl:items-end @2xl:pt-2">
                        <span aria-hidden="true" class="text-caption text-muted-foreground @2xl:hidden">{{ $t['total'] }}</span>
                        <span class="text-end font-medium text-foreground @2xl:w-full" data-slot="line-item-total"><bdi class="tabular-nums" x-text="money(result(row)?.total ?? 0)"></bdi></span>
                    </div>

                    <div class="col-span-2 flex justify-end @2xl:col-span-1 @2xl:justify-center">
                        <template x-if="editable">
                            <x-nq::dropdown-menu>
                                <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" class="text-muted-foreground" x-bind:aria-label="`${t.lineActions}, ${nameOf(row, index)}`">
                                    <x-lucide-ellipsis aria-hidden="true" />
                                </x-nq::dropdown-menu.trigger>
                                <x-nq::dropdown-menu.content align="end" class="min-w-44">
                                    <x-nq::dropdown-menu.group>
                                        <x-nq::dropdown-menu.item x-on:click="duplicate(index)"><x-lucide-copy aria-hidden="true" />{{ $t['duplicate'] }}</x-nq::dropdown-menu.item>
                                    </x-nq::dropdown-menu.group>
                                    <x-nq::dropdown-menu.separator />
                                    <x-nq::dropdown-menu.group>
                                        <x-nq::dropdown-menu.item x-on:click="move(index, -1)"><x-lucide-arrow-up aria-hidden="true" />{{ $t['moveUp'] }}</x-nq::dropdown-menu.item>
                                        <x-nq::dropdown-menu.item x-on:click="move(index, 1)"><x-lucide-arrow-down aria-hidden="true" />{{ $t['moveDown'] }}</x-nq::dropdown-menu.item>
                                    </x-nq::dropdown-menu.group>
                                    <x-nq::dropdown-menu.separator />
                                    <x-nq::dropdown-menu.group>
                                        <x-nq::dropdown-menu.item variant="danger" x-on:click="remove(row.id)"><x-lucide-trash-2 aria-hidden="true" />{{ $t['remove'] }}</x-nq::dropdown-menu.item>
                                    </x-nq::dropdown-menu.group>
                                </x-nq::dropdown-menu.content>
                            </x-nq::dropdown-menu>
                        </template>
                    </div>
                </li>
            </template>
        </ul>
    </div>

    <div x-show="editable" x-cloak class="flex flex-wrap gap-2">
        <x-nq::button variant="secondary" size="sm" x-bind:disabled="!canAdd" x-on:click="add()"><x-lucide-package-plus aria-hidden="true" />{{ $t['addProduct'] }}</x-nq::button>
        @if ($allowFreeLines)
            <x-nq::button variant="ghost" size="sm" x-bind:disabled="!canAdd" x-on:click="add()"><x-lucide-plus aria-hidden="true" />{{ $t['addFree'] }}</x-nq::button>
        @endif
    </div>

    <section aria-label="{{ $t['totals'] }}" class="flex flex-col gap-3 self-end @2xl:w-80">
        <dl class="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-body-sm">
            <dt class="text-muted-foreground">{{ $t['subtotal'] }}</dt>
            <dd class="text-end"><bdi class="tabular-nums" x-text="money(totals.subtotal)"></bdi></dd>
            <template x-if="totals.discountTotal > 0">
                <div class="contents">
                    <dt class="text-muted-foreground">{{ $t['discountRow'] }}</dt>
                    <dd class="text-end text-nq-success-text"><bdi class="tabular-nums" x-text="money(-totals.discountTotal)"></bdi></dd>
                </div>
            </template>
            @if ($orderOn)
                <dt class="flex items-center text-muted-foreground">{{ $t['orderDiscount'] }}</dt>
                <dd class="flex items-center justify-end gap-2">
                    <x-nq::toggle-group :default-value="[$odType]" x-model="odType" aria-label="{{ $t['orderDiscount'] }}">
                        <x-nq::toggle-group.toggle value="percent" aria-label="{{ $t['percent'] }}" x-bind:disabled="!editable">%</x-nq::toggle-group.toggle>
                        <x-nq::toggle-group.toggle value="amount" aria-label="{{ $t['amount'] }}" x-bind:disabled="!editable">{{ $code }}</x-nq::toggle-group.toggle>
                    </x-nq::toggle-group>
                    <div class="w-28">
                        <template x-if="odType[0] === 'amount'">
                            <x-nq::currency-input x-model="odMinor" :currency="$code" symbol="none" :min="0" aria-label="{{ $t['orderDiscount'] }}" />
                        </template>
                        <template x-if="odType[0] !== 'amount'">
                            <x-nq::line-item-editor.decimal-field x-model="odBps" :scale="2" kind="bps" :max="10000" suffix="%" aria-label="{{ $t['orderDiscount'] }}" />
                        </template>
                    </div>
                </dd>
            @endif
            @if ($showTax)
                <template x-for="g in totals.taxGroups" :key="g.bps">
                    <div class="contents">
                        <dt class="text-muted-foreground"><span x-text="taxMode === 'inclusive' ? t.taxIncluded : t.taxRow"></span> <bdi class="tabular-nums" x-text="percent(g.bps)"></bdi></dt>
                        <dd class="text-end"><bdi class="tabular-nums" x-text="money(g.tax)"></bdi></dd>
                    </div>
                </template>
            @endif
        </dl>
        <div class="flex items-baseline justify-between gap-6 border-t border-border pt-3" aria-live="polite">
            <span class="text-body font-medium text-foreground">{{ $t['totalDue'] }}</span>
            <span class="text-h3 font-semibold text-foreground" data-slot="line-item-grand-total"><bdi class="tabular-nums" x-text="money(totals.total)"></bdi></span>
        </div>
        {{ $slot }}
    </section>
</div>
