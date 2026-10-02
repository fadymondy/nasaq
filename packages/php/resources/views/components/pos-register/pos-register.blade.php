{{-- <x-nq::pos-register :products="$products" :categories="$categories" currency="SAR" :default-tax-bps="1500" cashier="Lina" @nq-pos-checkout="$event.detail.waitUntil(save($event.detail.sale))" />
     A touch point-of-sale register: a product grid, a basket, split-tender checkout (cash, card, wallet), held sales and a cash-drawer session.
     Money is integer minor units end to end. The register records nothing itself: it fires events and you save.
     products: [['id', 'name', 'sku', 'barcode', 'price' (minor), 'taxBps', 'category', 'stock']]; categories: [['id', 'label']].
     currency: ISO 4217 code, default USD, or SAR in Arabic. tax-mode: exclusive | inclusive. default-tax-bps: rate for products without their own.
     session: ['id', 'cashier', 'openedAt' (ISO), 'openingFloat' (minor)] to start open; omit it to start on the closed register.
     cashier: who opens the register. sales: sales already in the session (for the drawer count). parked: sales already on hold.
     labels: override any built-in string by key. Product artwork is not carried over; the tile shows the name, price and stock.
     Events on the root (bubbling, cancelable): "nq-pos-session" { session | null }, "nq-pos-parked" { parked }, "nq-pos-park" { sale },
     "nq-pos-resume" { sale }, "nq-pos-checkout" { sale, waitUntil(promise), resolve(), reject(message) } and "nq-pos-close" { report, waitUntil, resolve, reject }.
     A checkout or close nobody claims goes through at once; when claimed the dialog waits, and a rejection keeps it open with an error.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['products' => [], 'categories' => [], 'currency' => null, 'taxMode' => 'exclusive', 'defaultTaxBps' => 0, 'session' => null, 'cashier' => '', 'sales' => [], 'parked' => [], 'labels' => []])
@php
    $n = \Nasaq\Nasaq::class;
    $defs = [
        'search' => ['Search or scan', 'بحث أو مسح'],
        'searchHint' => ['Type a name, or scan a barcode and press Enter', 'اكتب اسمًا، أو امسح الباركود واضغط Enter'],
        'all' => ['All', 'الكل'],
        'noProducts' => ['No products match', 'لا توجد منتجات مطابقة'],
        'noProductsText' => ['Clear the search or pick another category.', 'امسح البحث أو اختر فئة أخرى.'],
        'left' => ['left', 'متبقي'],
        'outOfStock' => ['Out of stock', 'نفد المخزون'],
        'basket' => ['Basket', 'السلة'],
        'walkIn' => ['Walk-in customer', 'عميل عابر'],
        'emptyBasket' => ['The basket is empty', 'السلة فارغة'],
        'emptyBasketText' => ['Tap a product to add it.', 'المس منتجًا لإضافته.'],
        'increase' => ['Add one', 'إضافة واحدة'],
        'decrease' => ['Remove one', 'إزالة واحدة'],
        'remove' => ['Remove line', 'حذف البند'],
        'lineActions' => ['Line actions', 'إجراءات البند'],
        'clear' => ['Clear basket', 'تفريغ السلة'],
        'subtotal' => ['Subtotal', 'المجموع الفرعي'],
        'discount' => ['Discounts', 'الخصومات'],
        'tax' => ['Tax', 'الضريبة'],
        'total' => ['Total', 'الإجمالي'],
        'charge' => ['Charge', 'الدفع'],
        'items' => ['items', 'أصناف'],
        'sessionOpen' => ['Register open', 'الصندوق مفتوح'],
        'sessionSince' => ['since', 'منذ'],
        'drawer' => ['Cash drawer', 'درج النقد'],
        'closedTitle' => ['The register is closed', 'الصندوق مغلق'],
        'closedText' => ['Count the cash in the drawer and open a session to start selling.', 'عُدّ النقد في الدرج وافتح جلسة لبدء البيع.'],
        'openingFloat' => ['Opening float', 'رصيد الافتتاح'],
        'openRegister' => ['Open register', 'فتح الصندوق'],
        'closeRegister' => ['Close register', 'إغلاق الصندوق'],
        'closeText' => ['Count the cash in the drawer. The difference from what the sales say should be there is recorded.', 'عُدّ النقد في الدرج. يُسجَّل الفرق عن المبلغ المتوقع من المبيعات.'],
        'floatRow' => ['Opening float', 'رصيد الافتتاح'],
        'cashSales' => ['Cash sales', 'مبيعات نقدية'],
        'cardSales' => ['Card sales', 'مبيعات بالبطاقة'],
        'walletSales' => ['Wallet sales', 'مبيعات بالمحفظة'],
        'salesCount' => ['Sales', 'عدد المبيعات'],
        'expectedCash' => ['Expected in drawer', 'المتوقع في الدرج'],
        'countedCash' => ['Counted cash', 'النقد المعدود'],
        'variance' => ['Difference', 'الفرق'],
        'exact' => ['The drawer balances', 'الدرج متطابق'],
        'short' => ['Short', 'عجز'],
        'over' => ['Over', 'زيادة'],
        'payTitle' => ['Take payment', 'استلام الدفع'],
        'payText' => ['Walk-in sale', 'بيع لعميل عابر'],
        'method' => ['Payment method', 'طريقة الدفع'],
        'cash' => ['Cash', 'نقدًا'],
        'card' => ['Card', 'بطاقة'],
        'wallet' => ['Wallet', 'محفظة'],
        'tendered' => ['Cash received', 'النقد المستلم'],
        'exactAmount' => ['Exact', 'المبلغ بالضبط'],
        'change' => ['Change due', 'الباقي للعميل'],
        'confirm' => ['Confirm payment', 'تأكيد الدفع'],
        'cancel' => ['Cancel', 'إلغاء'],
        'saleDone' => ['Sale complete', 'تمت العملية'],
        'receiptNo' => ['Receipt', 'الإيصال'],
        'newSale' => ['New sale', 'عملية جديدة'],
        'paid' => ['Paid', 'المدفوع'],
        'cashier' => ['Cashier', 'الكاشير'],
        'failed' => ['The payment did not go through. Nothing was charged.', 'لم تتم عملية الدفع. لم يُخصم أي مبلغ.'],
        'qty' => ['Quantity', 'الكمية'],
        'hold' => ['Hold sale', 'تعليق العملية'],
        'parked' => ['Parked sales', 'المبيعات المعلّقة'],
        'holdTitle' => ['Hold this sale', 'تعليق هذه العملية'],
        'holdText' => ['Park the basket to serve someone else. Resume it any time.', 'علّق السلة لخدمة عميل آخر، واستأنفها في أي وقت.'],
        'note' => ['Note (optional)', 'ملاحظة (اختياري)'],
        'notePlaceholder' => ['A name or a table', 'اسم أو رقم طاولة'],
        'park' => ['Park sale', 'تعليق'],
        'noParked' => ['Nothing on hold', 'لا توجد عمليات معلّقة'],
        'noParkedText' => ['Sales you hold appear here.', 'تظهر هنا العمليات التي تعلّقها.'],
        'resume' => ['Resume', 'استئناف'],
        'discard' => ['Discard', 'حذف'],
        'discardTitle' => ['Discard this parked sale?', 'حذف هذه العملية المعلّقة؟'],
        'discardText' => ['Its items are removed and cannot be brought back.', 'تُحذف أصنافها ولا يمكن استرجاعها.'],
        'resumeTitle' => ['Replace the current basket?', 'استبدال السلة الحالية؟'],
        'resumeText' => ['The basket has items. Resuming replaces them with the parked sale.', 'السلة تحتوي أصنافًا. الاستئناف يستبدلها بالعملية المعلّقة.'],
        'close' => ['Close', 'إغلاق'],
        'payments' => ['Payments', 'الدفعات'],
        'amount' => ['Amount', 'المبلغ'],
        'addPayment' => ['Add payment', 'إضافة دفعة'],
        'removePayment' => ['Remove payment', 'حذف الدفعة'],
        'remaining' => ['Remaining', 'المتبقي'],
        'overpay' => ['Card and wallet cannot be more than the remaining amount.', 'لا يمكن أن تزيد البطاقة أو المحفظة عن المبلغ المتبقي.'],
        'paidInFull' => ['Paid in full', 'تم السداد بالكامل'],
    ];
    $t = [];
    foreach ($defs as $key => [$en, $ar]) {
        $t[$key] = $labels[$key] ?? $n::t($en, $ar);
    }
    $locale = app()->getLocale();
    $code = strtoupper($currency ?? $n::currency($locale));
    $config = [
        'products' => array_values($products), 'categories' => array_values($categories), 'currency' => $code, 'locale' => str_replace('_', '-', $locale),
        'taxMode' => $taxMode, 'defaultTaxBps' => (int) $defaultTaxBps, 'session' => $session, 'cashier' => $cashier,
        'sales' => array_values($sales), 'parked' => array_values($parked), 't' => $t,
    ];
    $tiles = [['id' => 'all', 'label' => $t['all']], ...array_values($categories)];
    $label = 'flex flex-col gap-1.5 text-label text-foreground';
    $money = 'tabular-nums';
    $row = 'flex items-baseline justify-between gap-3 text-body-sm text-muted-foreground';
    $rowStrong = 'flex items-baseline justify-between gap-3 text-label text-foreground';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'pos-register') }}" data-state="{{ $session ? 'open' : 'closed' }}" x-data="nqPosRegister(@js($config))" x-bind:data-state="session ? 'open' : 'closed'"
    {{ $attributes->except('data-slot')->cn('@container flex w-full flex-col gap-4') }}>
    {{-- closed --}}
    <template x-if="noSession">
        <x-nq::states.empty icon="lock" :title="$t['closedTitle']" :description="$t['closedText']">
            <div class="flex w-full max-w-xs flex-col gap-3">
                <label class="{{ $label }} text-start">
                    {{ $t['openingFloat'] }}
                    <x-nq::currency-input x-model="floatMinor" :currency="$code" :min="0" aria-label="{{ $t['openingFloat'] }}" />
                </label>
                <x-nq::button variant="primary" size="lg" x-bind:disabled="floatMissing" x-on:click="openRegister()">{{ $t['openRegister'] }}</x-nq::button>
            </div>
        </x-nq::states.empty>
    </template>

    {{-- open --}}
    <template x-if="session">
        <div class="flex flex-col gap-4">
            <header class="flex flex-wrap items-center gap-2">
                <x-nq::badge variant="success">{{ $t['sessionOpen'] }}</x-nq::badge>
                <span class="text-body-sm text-muted-foreground">
                    <span x-text="session.cashier ? session.cashier + ' · ' : ''"></span>{{ $t['sessionSince'] }} <bdi x-text="time(session.openedAt)"></bdi>
                </span>
                <x-nq::button variant="secondary" size="sm" class="ms-auto" x-on:click="parkedOpen = true">
                    <x-lucide-clock aria-hidden="true" />
                    {{ $t['parked'] }}
                    <x-nq::badge variant="neutral" x-show="hasParked"><bdi x-text="parked.length"></bdi></x-nq::badge>
                </x-nq::button>
                <x-nq::button variant="secondary" size="sm" x-on:click="closing = true">
                    <x-lucide-banknote aria-hidden="true" />
                    {{ $t['drawer'] }}
                </x-nq::button>
            </header>

            <div class="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_22rem] @3xl:items-start">
                {{-- products --}}
                <div class="flex min-w-0 flex-col gap-3">
                    <div class="relative" x-ref="searchWrap" x-on:keydown.enter.prevent="scan()">
                        <x-lucide-scan-barcode aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
                        <x-nq::field.input x-model="search" placeholder="{{ $t['search'] }}" aria-label="{{ $t['search'] }}" title="{{ $t['searchHint'] }}" autocomplete="off" class="ps-9" />
                    </div>
                    @if (count($categories) > 0)
                        <div role="group" aria-label="{{ $t['all'] }}" class="flex gap-2 overflow-x-auto pb-1">
                            @foreach ($tiles as $c)
                                <x-nq::button size="sm" variant="primary" aria-pressed="true" class="shrink-0" x-show="category === '{{ $c['id'] }}'" x-on:click="category = '{{ $c['id'] }}'">{{ $c['label'] }}</x-nq::button>
                                <x-nq::button size="sm" variant="secondary" aria-pressed="false" class="shrink-0" x-show="category !== '{{ $c['id'] }}'" x-on:click="category = '{{ $c['id'] }}'">{{ $c['label'] }}</x-nq::button>
                            @endforeach
                        </div>
                    @endif
                    <template x-if="noVisible">
                        <x-nq::states.empty :title="$t['noProducts']" :description="$t['noProductsText']" />
                    </template>
                    <ul x-show="!noVisible" class="grid grid-cols-2 gap-2 @lg:grid-cols-3 @5xl:grid-cols-4">
                        <template x-for="p in visible" :key="p.id">
                            <li>
                                <button type="button" x-bind:disabled="isOut(p)" x-on:click="add(p)"
                                    class="flex min-h-24 w-full touch-manipulation flex-col items-start justify-between gap-2 rounded-floating border border-border bg-card p-3 text-start transition-colors hover:bg-nq-hover active:bg-nq-hover disabled:cursor-not-allowed disabled:opacity-50">
                                    <span class="flex w-full items-start gap-2">
                                        <span class="line-clamp-2 text-label text-foreground" x-text="p.name"></span>
                                    </span>
                                    <span class="flex w-full items-end justify-between gap-2">
                                        <bdi class="{{ $money }} text-body-sm text-foreground" x-text="money(p.price)"></bdi>
                                        <x-nq::badge variant="danger" x-show="isOut(p)">{{ $t['outOfStock'] }}</x-nq::badge>
                                        <x-nq::badge variant="warning" x-show="isLow(p)"><bdi x-text="available(p)"></bdi> {{ $t['left'] }}</x-nq::badge>
                                    </span>
                                </button>
                            </li>
                        </template>
                    </ul>
                </div>

                {{-- basket --}}
                <aside aria-label="{{ $t['basket'] }}" class="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-3 @3xl:sticky @3xl:top-2">
                    <div class="flex items-center justify-between gap-2">
                        <h2 class="flex items-center gap-2 text-h3 text-foreground">
                            <x-lucide-shopping-basket aria-hidden="true" class="size-4" />
                            {{ $t['basket'] }}
                            <x-nq::badge variant="neutral" x-show="hasBasket"><bdi x-text="itemCount"></bdi></x-nq::badge>
                        </h2>
                        <span class="text-caption text-muted-foreground">{{ $t['walkIn'] }}</span>
                    </div>
                    <template x-if="noBasket">
                        <x-nq::states.empty :title="$t['emptyBasket']" :description="$t['emptyBasketText']" class="py-8" />
                    </template>
                    <ul x-show="hasBasket" class="flex flex-col divide-y divide-border">
                        <template x-for="l in basket" :key="l.id">
                            <li data-slot="pos-line" x-data="nqContextMenu()" x-bind="trigger" x-ref="trigger" class="flex flex-col gap-2 py-2.5 data-popup-open:bg-nq-hover">
                                <div class="flex items-start justify-between gap-2">
                                    <span class="text-label text-foreground" x-text="l.name"></span>
                                    <bdi class="{{ $money }} text-label text-foreground" x-text="money(lineTotal(l.id))"></bdi>
                                </div>
                                <div class="flex items-center gap-1">
                                    <x-nq::button variant="secondary" size="icon" x-bind:aria-label="t.decrease + ', ' + l.name" x-on:click="dec(l)"><x-lucide-minus aria-hidden="true" /></x-nq::button>
                                    <output x-bind:aria-label="t.qty + ', ' + l.name" class="min-w-10 text-center text-label tabular-nums" x-text="l.quantity"></output>
                                    <x-nq::button variant="secondary" size="icon" x-bind:aria-label="t.increase + ', ' + l.name" x-bind:disabled="!canBump(l)" x-on:click="inc(l)"><x-lucide-plus aria-hidden="true" /></x-nq::button>
                                    <span class="ms-2 text-caption text-muted-foreground"><bdi class="{{ $money }}" x-text="money(l.unitPrice)"></bdi></span>
                                    <x-nq::dropdown-menu>
                                        <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="line-item-actions" x-bind:aria-label="t.lineActions + ', ' + l.name" class="ms-auto text-muted-foreground data-popup-open:text-foreground">
                                            <x-lucide-ellipsis aria-hidden="true" />
                                        </x-nq::dropdown-menu.trigger>
                                        <x-nq::dropdown-menu.content align="end" class="min-w-44">
                                            <x-nq::dropdown-menu.item x-bind:data-disabled="canBump(l) ? null : ''" x-on:click="inc(l)"><x-lucide-plus aria-hidden="true" />{{ $t['increase'] }}</x-nq::dropdown-menu.item>
                                            <x-nq::dropdown-menu.item x-on:click="dec(l)"><x-lucide-minus aria-hidden="true" />{{ $t['decrease'] }}</x-nq::dropdown-menu.item>
                                            <x-nq::dropdown-menu.separator />
                                            <x-nq::dropdown-menu.item variant="danger" x-on:click="remove(l)"><x-lucide-trash-2 aria-hidden="true" />{{ $t['remove'] }}</x-nq::dropdown-menu.item>
                                        </x-nq::dropdown-menu.content>
                                    </x-nq::dropdown-menu>
                                </div>
                                <template x-teleport="body">
                                    <div data-slot="context-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open"
                                        class="fixed z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none max-h-[var(--available-height)] overflow-y-auto transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
                                        <x-nq::context-menu.item x-bind:data-disabled="canBump(l) ? null : ''" x-on:click="inc(l)"><x-lucide-plus aria-hidden="true" />{{ $t['increase'] }}</x-nq::context-menu.item>
                                        <x-nq::context-menu.item x-on:click="dec(l)"><x-lucide-minus aria-hidden="true" />{{ $t['decrease'] }}</x-nq::context-menu.item>
                                        <x-nq::context-menu.separator />
                                        <x-nq::context-menu.item variant="danger" x-on:click="remove(l)"><x-lucide-trash-2 aria-hidden="true" />{{ $t['remove'] }}</x-nq::context-menu.item>
                                    </div>
                                </template>
                            </li>
                        </template>
                    </ul>
                    <dl class="flex flex-col gap-1.5 border-t border-border pt-3">
                        <div class="{{ $row }}"><dt>{{ $t['subtotal'] }}</dt><dd class="{{ $money }}"><bdi x-text="money(totals.subtotal)"></bdi></dd></div>
                        <div class="{{ $row }}" x-show="hasDiscount"><dt>{{ $t['discount'] }}</dt><dd class="{{ $money }}"><bdi x-text="money(-totals.discountTotal)"></bdi></dd></div>
                        <div class="{{ $row }}"><dt>{{ $t['tax'] }}</dt><dd class="{{ $money }}"><bdi x-text="money(totals.taxTotal)"></bdi></dd></div>
                        <div class="{{ $rowStrong }}"><dt>{{ $t['total'] }}</dt><dd class="{{ $money }} text-h3"><bdi x-text="money(totals.total)"></bdi></dd></div>
                    </dl>
                    <div class="flex gap-2">
                        <x-nq::button variant="primary" size="lg" class="flex-1" x-bind:disabled="noBasket" x-on:click="paying = true">{{ $t['charge'] }} <bdi class="{{ $money }}" x-text="money(totals.total)"></bdi></x-nq::button>
                        <x-nq::button variant="secondary" size="lg" x-bind:disabled="noBasket" x-on:click="holding = true" aria-label="{{ $t['hold'] }}" title="{{ $t['hold'] }}"><x-lucide-pause aria-hidden="true" /></x-nq::button>
                        <x-nq::button variant="secondary" size="lg" x-bind:disabled="noBasket" x-on:click="clear()" aria-label="{{ $t['clear'] }}" title="{{ $t['clear'] }}"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                    </div>
                </aside>
            </div>

            <div x-show="hasBasket" class="sticky bottom-2 z-10 flex items-center gap-3 rounded-card border border-border bg-card p-2 shadow-md @3xl:hidden">
                <span class="ps-2 text-body-sm text-muted-foreground"><bdi x-text="itemCount"></bdi> {{ $t['items'] }}</span>
                <x-nq::button variant="secondary" size="lg" class="ms-auto" x-on:click="holding = true" aria-label="{{ $t['hold'] }}" title="{{ $t['hold'] }}"><x-lucide-pause aria-hidden="true" /></x-nq::button>
                <x-nq::button variant="primary" size="lg" x-on:click="paying = true">{{ $t['charge'] }} <bdi class="{{ $money }}" x-text="money(totals.total)"></bdi></x-nq::button>
            </div>
        </div>
    </template>

    {{-- hold --}}
    <x-nq::dialog x-model="holding">
        <x-nq::dialog.content class="max-w-md">
            <form class="flex flex-col gap-4" x-on:submit.prevent="park()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['holdTitle'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['holdText'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <label class="{{ $label }}">
                    {{ $t['note'] }}
                    <x-nq::field.input x-model="holdNote" placeholder="{{ $t['notePlaceholder'] }}" maxlength="80" autocomplete="off" />
                </label>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="secondary" x-on:click="holding = false">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary"><x-lucide-pause aria-hidden="true" />{{ $t['park'] }}</x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    {{-- parked sales --}}
    <x-nq::dialog x-model="parkedOpen">
        <x-nq::dialog.content class="max-w-lg">
            <x-nq::dialog.header>
                <x-nq::dialog.title class="flex items-center gap-2">
                    {{ $t['parked'] }}
                    <x-nq::badge variant="neutral" x-show="hasParked"><bdi x-text="parked.length"></bdi></x-nq::badge>
                </x-nq::dialog.title>
                <x-nq::dialog.description>{{ $t['noParkedText'] }}</x-nq::dialog.description>
            </x-nq::dialog.header>
            <template x-if="noParked">
                <x-nq::states.empty icon="clock" :title="$t['noParked']" :description="$t['noParkedText']" class="py-8" />
            </template>
            <ul x-show="hasParked" aria-label="{{ $t['parked'] }}" class="flex max-h-[50dvh] flex-col divide-y divide-border overflow-y-auto rounded-floating border border-border">
                <template x-for="sale in parkedNewest" :key="sale.id">
                    <li data-slot="pos-parked" class="flex flex-col gap-2 p-3">
                        <div class="flex items-baseline justify-between gap-3">
                            <span class="text-label text-foreground">
                                <bdi x-text="time(sale.at)"></bdi>
                                <span x-show="sale.note" class="text-muted-foreground" x-text="' · ' + sale.note"></span>
                            </span>
                            <bdi class="{{ $money }} text-label text-foreground" x-text="money(sale.totals.total)"></bdi>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="text-body-sm text-muted-foreground"><bdi x-text="parkedCount(sale)"></bdi> {{ $t['items'] }}<span x-text="sale.cashier ? ' · ' + sale.cashier : ''"></span></span>
                            <span class="ms-auto flex gap-2">
                                <x-nq::button type="button" variant="secondary" size="sm" x-bind:aria-label="t.discard + ', ' + time(sale.at)" x-on:click="ask('discard', sale)"><x-lucide-trash-2 aria-hidden="true" />{{ $t['discard'] }}</x-nq::button>
                                <x-nq::button type="button" variant="primary" size="sm" x-bind:aria-label="t.resume + ', ' + time(sale.at)" x-on:click="askResume(sale)">{{ $t['resume'] }}</x-nq::button>
                            </span>
                        </div>
                    </li>
                </template>
            </ul>
            <x-nq::dialog.footer>
                <x-nq::button type="button" variant="secondary" x-on:click="parkedOpen = false">{{ $t['close'] }}</x-nq::button>
            </x-nq::dialog.footer>
            <x-nq::alert-dialog x-model="confirmOpen">
                <x-nq::alert-dialog.content>
                    <x-nq::alert-dialog.header>
                        <x-nq::alert-dialog.title x-text="isDiscard ? t.discardTitle : t.resumeTitle"></x-nq::alert-dialog.title>
                        <x-nq::alert-dialog.description x-text="isDiscard ? t.discardText : t.resumeText"></x-nq::alert-dialog.description>
                    </x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.footer>
                        <x-nq::alert-dialog.cancel>{{ $t['cancel'] }}</x-nq::alert-dialog.cancel>
                        <x-nq::alert-dialog.action variant="danger" x-show="isDiscard" x-on:click="confirm()">{{ $t['discard'] }}</x-nq::alert-dialog.action>
                        <x-nq::alert-dialog.action variant="primary" x-show="!isDiscard" x-on:click="confirm()">{{ $t['resume'] }}</x-nq::alert-dialog.action>
                    </x-nq::alert-dialog.footer>
                </x-nq::alert-dialog.content>
            </x-nq::alert-dialog>
        </x-nq::dialog.content>
    </x-nq::dialog>

    {{-- checkout --}}
    <x-nq::dialog x-model="paying">
        <x-nq::dialog.content class="max-w-md">
            <template x-if="done">
                <div class="flex flex-col items-center gap-4 text-center">
                    <x-lucide-circle-check aria-hidden="true" class="size-10 text-nq-success-text" />
                    <x-nq::dialog.header class="items-center text-center">
                        <x-nq::dialog.title>{{ $t['saleDone'] }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $t['receiptNo'] }} <bdi dir="ltr" x-text="done.number"></bdi></x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <dl class="flex w-full flex-col gap-1.5 rounded-floating border border-border bg-card p-3">
                        <div class="{{ $rowStrong }}"><dt>{{ $t['total'] }}</dt><dd class="{{ $money }} text-h3"><bdi x-text="money(done.totals.total)"></bdi></dd></div>
                        <div class="{{ $row }}"><dt>{{ $t['tax'] }}</dt><dd class="{{ $money }}"><bdi x-text="money(done.totals.taxTotal)"></bdi></dd></div>
                        <template x-for="tn in done.tenders" :key="tn.id">
                            <div class="{{ $row }}"><dt x-text="methodLabel(tn.method)"></dt><dd class="{{ $money }}"><bdi x-text="money(tn.amount)"></bdi></dd></div>
                        </template>
                        <div class="{{ $row }}" x-show="doneShowsPaid"><dt>{{ $t['paid'] }}</dt><dd class="{{ $money }}"><bdi x-text="money(done.tendered)"></bdi></dd></div>
                        <div class="{{ $rowStrong }}" x-show="doneShowsChange"><dt>{{ $t['change'] }}</dt><dd class="{{ $money }} text-h3"><bdi x-text="money(done.change)"></bdi></dd></div>
                    </dl>
                    <x-nq::button variant="primary" size="lg" class="w-full" autofocus x-on:click="newSale()">{{ $t['newSale'] }}</x-nq::button>
                </div>
            </template>
            <template x-if="!done">
                <form class="flex flex-col gap-4" x-on:submit.prevent="submitPay()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title>{{ $t['payTitle'] }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $t['payText'] }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <dl class="flex flex-col gap-1.5 rounded-floating bg-secondary p-3">
                        <div class="flex items-baseline justify-between gap-3">
                            <dt class="text-label text-muted-foreground">{{ $t['total'] }}</dt>
                            <dd><bdi class="{{ $money }} text-h2 text-foreground" x-text="money(due)"></bdi></dd>
                        </div>
                        <div class="flex items-baseline justify-between gap-3" x-show="hasPaid">
                            <dt class="text-body-sm text-muted-foreground">{{ $t['paid'] }}</dt>
                            <dd><bdi class="{{ $money }} text-body-sm text-foreground" x-text="money(settlement.paid)"></bdi></dd>
                        </div>
                        <div class="flex items-baseline justify-between gap-3" aria-live="polite" x-show="hasPaid">
                            <dt class="text-label text-muted-foreground">{{ $t['remaining'] }}</dt>
                            <dd>
                                <bdi class="{{ $money }} text-h3 text-foreground" x-show="hasRemaining" x-text="money(settlement.remaining)"></bdi>
                                <x-nq::badge variant="success" x-show="!hasRemaining">{{ $t['paidInFull'] }}</x-nq::badge>
                            </dd>
                        </div>
                    </dl>
                    <ul x-show="hasTenders" aria-label="{{ $t['payments'] }}" class="flex flex-col divide-y divide-border rounded-floating border border-border">
                        <template x-for="tn in tenders" :key="tn.id">
                            <li class="flex items-center gap-2 px-3 py-1.5">
                                <x-lucide-banknote aria-hidden="true" class="size-4 text-muted-foreground" x-show="tn.method === 'cash'" />
                                <x-lucide-credit-card aria-hidden="true" class="size-4 text-muted-foreground" x-show="tn.method === 'card'" />
                                <x-lucide-wallet aria-hidden="true" class="size-4 text-muted-foreground" x-show="tn.method === 'wallet'" />
                                <span class="text-label text-foreground" x-text="methodLabel(tn.method)"></span>
                                <bdi class="{{ $money }} ms-auto text-label text-foreground" x-text="money(tn.amount)"></bdi>
                                <x-nq::button type="button" variant="ghost" size="icon" x-bind:disabled="payBusy" x-bind:aria-label="t.removePayment + ', ' + methodLabel(tn.method)" x-on:click="removeTender(tn.id)"><x-lucide-x aria-hidden="true" /></x-nq::button>
                            </li>
                        </template>
                    </ul>
                    <div class="flex flex-col gap-4" x-show="notComplete">
                        <x-nq::toggle-group aria-label="{{ $t['method'] }}" :default-value="['cash']" x-model="methodSel" class="grid w-full grid-cols-3">
                            <x-nq::toggle-group.toggle value="cash" aria-label="{{ $t['cash'] }}" class="h-12 gap-2"><x-lucide-banknote aria-hidden="true" />{{ $t['cash'] }}</x-nq::toggle-group.toggle>
                            <x-nq::toggle-group.toggle value="card" aria-label="{{ $t['card'] }}" class="h-12 gap-2"><x-lucide-credit-card aria-hidden="true" />{{ $t['card'] }}</x-nq::toggle-group.toggle>
                            <x-nq::toggle-group.toggle value="wallet" aria-label="{{ $t['wallet'] }}" class="h-12 gap-2"><x-lucide-wallet aria-hidden="true" />{{ $t['wallet'] }}</x-nq::toggle-group.toggle>
                        </x-nq::toggle-group>
                        <div class="flex flex-col gap-3">
                            <label class="{{ $label }}">
                                <span x-text="isCash ? t.tendered : t.amount"></span>
                                <x-nq::currency-input x-model="amount" :currency="$code" :min="0" aria-label="{{ $t['amount'] }}" x-effect="opts.invalid = over" />
                            </label>
                            <p x-show="over" role="alert" class="text-body-sm text-nq-danger-text">{{ $t['overpay'] }}</p>
                            <div class="flex flex-wrap gap-2">
                                <template x-for="quick in quicks" :key="'q' + quick">
                                    <x-nq::button type="button" variant="secondary" x-on:click="amount = quick"><span x-text="quick === base.remaining ? t.exactAmount : money(quick)"></span></x-nq::button>
                                </template>
                                <x-nq::button type="button" variant="secondary" class="ms-auto" x-bind:disabled="cannotAdd" x-on:click="addTender()"><x-lucide-plus aria-hidden="true" />{{ $t['addPayment'] }}</x-nq::button>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-baseline justify-between gap-3" aria-live="polite" x-show="showChange">
                        <span class="text-label text-muted-foreground">{{ $t['change'] }}</span>
                        <bdi class="{{ $money }} text-h3 text-foreground" x-text="money(settlement.change)"></bdi>
                    </div>
                    <p x-show="payError" role="alert" class="text-body-sm text-nq-danger-text">{{ $t['failed'] }}</p>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="secondary" x-bind:disabled="payBusy" x-on:click="paying = false">{{ $t['cancel'] }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" size="lg" x-bind:disabled="confirmDisabled" x-bind:aria-busy="payBusy">{{ $t['confirm'] }}</x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </template>
        </x-nq::dialog.content>
    </x-nq::dialog>

    {{-- close the drawer --}}
    <x-nq::dialog x-model="closing">
        <x-nq::dialog.content class="max-w-md">
            <form class="flex flex-col gap-4" x-on:submit.prevent="submitClose()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['drawer'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['closeText'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <dl class="flex flex-col gap-1.5 rounded-floating border border-border bg-card p-3">
                    <div class="{{ $row }}"><dt>{{ $t['floatRow'] }}</dt><dd class="{{ $money }}"><bdi x-text="money(drawer.openingFloat)"></bdi></dd></div>
                    <div class="{{ $row }}"><dt>{{ $t['cashSales'] }}</dt><dd class="{{ $money }}"><bdi x-text="money(drawer.cash)"></bdi></dd></div>
                    <div class="{{ $row }}"><dt>{{ $t['cardSales'] }}</dt><dd class="{{ $money }}"><bdi x-text="money(drawer.card)"></bdi></dd></div>
                    <div class="{{ $row }}"><dt>{{ $t['walletSales'] }}</dt><dd class="{{ $money }}"><bdi x-text="money(drawer.wallet)"></bdi></dd></div>
                    <div class="{{ $row }}"><dt>{{ $t['salesCount'] }}</dt><dd class="{{ $money }}"><bdi x-text="drawer.sales"></bdi></dd></div>
                    <div class="{{ $rowStrong }}"><dt>{{ $t['expectedCash'] }}</dt><dd class="{{ $money }} text-h3"><bdi x-text="money(drawer.expectedCash)"></bdi></dd></div>
                </dl>
                <label class="{{ $label }}">
                    {{ $t['countedCash'] }}
                    <x-nq::currency-input x-model="counted" :currency="$code" :min="0" aria-label="{{ $t['countedCash'] }}" />
                </label>
                <div class="flex items-center justify-between gap-3" aria-live="polite" x-show="hasVariance">
                    <span class="text-label text-muted-foreground">{{ $t['variance'] }}</span>
                    <span class="flex items-center gap-2">
                        <x-nq::badge variant="success" x-show="varExact">{{ $t['exact'] }}</x-nq::badge>
                        <x-nq::badge variant="danger" x-show="varShort">{{ $t['short'] }}</x-nq::badge>
                        <x-nq::badge variant="warning" x-show="varOver">{{ $t['over'] }}</x-nq::badge>
                        <bdi class="{{ $money }} text-label" x-show="!varExact" x-text="money(variance, true)"></bdi>
                    </span>
                </div>
                <p x-show="closeError" role="alert" class="text-body-sm text-nq-danger-text">{{ $t['failed'] }}</p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="secondary" x-bind:disabled="closeBusy" x-on:click="closing = false">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="danger" x-bind:disabled="noCount" x-bind:aria-busy="closeBusy">{{ $t['closeRegister'] }}</x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>
</section>
