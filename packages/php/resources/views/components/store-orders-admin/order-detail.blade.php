{{-- <x-nq::store-orders-admin.order-detail :order="$order" :refunds="$refunds" currency="USD" actor="Mona" can-back @nq-order-change="save($event.detail)" />
     One order in the store admin: lines and money, customer, address and payment cards, and the actions that change it: ship some or all of it
     with tracking, refund by line or by amount, cancel, and add notes to the timeline. Changes apply on screen at once.
     order: the CommerceOrder shape (see orders-list); refunds: [['id', 'amount', 'at', 'note', 'restock', 'shipping']], oldest first. currency: USD, or SAR in Arabic.
     actor: who is acting, written on the timeline. carriers: offered when shipping. tracking-template: URL with {number}. can-back: show the back button.
     now: ISO time written on new events. labels: override any built-in string by key.
     Events from the root: nq-order-change { order, refunds, restock? } (store it), nq-print { orders, document }, nq-back. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-orders-admin._strings')
@props(['order', 'refunds' => [], 'currency' => null, 'actor' => null, 'carriers' => ['Bosta', 'Aramex', 'DHL', 'Egypt Post'], 'trackingTemplate' => null, 'canBack' => false, 'now' => null, 'labels' => []])
@php
    $t = nq_store_admin_t($labels);
    $currency ??= \Nasaq\Nasaq::currency();
    $config = [
        'order' => $order, 'refunds' => array_values($refunds), 'currency' => $currency, 'actor' => $actor, 'carriers' => array_values($carriers),
        'trackingTemplate' => $trackingTemplate, 'canBack' => (bool) $canBack, 'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 't' => $t,
        'labels' => nq_store_admin_labels(), 'now' => $now ?? now()->toIso8601String(),
    ];
    $label = 'flex flex-col gap-1.5 text-label text-foreground';
    $addr = 'flex min-w-0 flex-col text-body-sm not-italic text-foreground';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'store-order-detail') }}" x-data="nqStoreOrderDetail(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <header class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-2">
            <x-nq::button type="button" variant="ghost" size="sm" class="-ms-2 w-fit" x-show="canBack" x-on:click="back()">
                <x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" />
                {{ $t['backToOrders'] }}
            </x-nq::button>
            <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-h2 font-semibold text-foreground" x-text="order.number"></h1>
                <x-nq::store-orders-admin.chip expr="statusChip(order.status)" />
                <x-nq::store-orders-admin.chip expr="paymentChip(order.payment)" />
                <x-nq::store-orders-admin.chip expr="fulfilmentChip(order)" />
            </div>
            <p class="text-body-sm text-muted-foreground">{{ $t['placedOn'] }} <time class="tabular-nums [unicode-bidi:isolate]" x-bind:datetime="order.placedAt" x-text="date(order.placedAt, 'long', true)"></time></p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <x-nq::button type="button" variant="secondary" size="sm" x-on:click="print('packing-slip')"><x-lucide-truck aria-hidden="true" />{{ $t['packingSlip'] }}</x-nq::button>
            <x-nq::button type="button" variant="secondary" size="sm" x-on:click="print('invoice')"><x-lucide-printer aria-hidden="true" />{{ $t['invoice'] }}</x-nq::button>
            <x-nq::button type="button" variant="secondary" size="sm" data-action="cancel" x-bind:disabled="! cancellable" x-bind:title="cancellable ? null : '{{ $t['cannotCancel'] }}'" x-on:click="cancelOpen = true"><x-lucide-ban aria-hidden="true" />{{ $t['cancelOrder'] }}</x-nq::button>
            <x-nq::button type="button" variant="secondary" size="sm" data-action="refund" x-bind:disabled="! refundable" x-on:click="openRefund()"><x-lucide-undo-2 aria-hidden="true" />{{ $t['refund'] }}</x-nq::button>
            <x-nq::button type="button" variant="primary" size="sm" data-action="fulfil" x-bind:disabled="! shippable" x-on:click="openFulfil()"><x-lucide-package-check aria-hidden="true" />{{ $t['fulfil'] }}</x-nq::button>
        </div>
    </header>

    <template x-if="order.payment === 'pending'">
        <x-nq::alert tone="warning" :title="$t['unpaidTitle']">{{ $t['unpaidText'] }}</x-nq::alert>
    </template>

    <div class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div class="flex min-w-0 flex-col gap-4">
            <x-nq::card>
                <x-nq::card.header>
                    <x-nq::card.title as="h2">{{ $t['items'] }}</x-nq::card.title>
                    <x-nq::card.action class="text-body-sm text-muted-foreground"><span x-text="tt('shippedOf', { a: num(progress.shipped), b: num(progress.total) })"></span></x-nq::card.action>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col">
                    <ul class="m-0 flex list-none flex-col divide-y divide-border p-0">
                        <template x-for="line in order.lines" x-bind:key="line.id">
                            <li data-slot="store-order-line" class="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                                <img x-show="line.image" x-bind:src="line.image" alt="" class="size-14 shrink-0 rounded-control border border-border bg-secondary object-cover" />
                                <span x-show="! line.image" aria-hidden="true" class="size-14 shrink-0 rounded-control border border-border bg-secondary"></span>
                                <div class="flex min-w-0 flex-1 basis-40 flex-col gap-1">
                                    <span class="truncate text-body-sm font-medium text-foreground" x-text="line.name"></span>
                                    <span class="text-caption text-muted-foreground" x-show="line.variantLabel" x-text="line.variantLabel"></span>
                                    <span class="flex flex-wrap gap-1.5">
                                        <span data-slot="badge" x-show="lineFulfilled(line) > 0" x-text="tt('shippedCount', { n: lineFulfilled(line) })" class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium border-nq-success/40 bg-nq-success-soft text-nq-success-text"></span>
                                        <span data-slot="badge" x-show="lineOutstanding(line) > 0" x-text="tt('toShipCount', { n: lineOutstanding(line) })" class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text"></span>
                                        <span data-slot="badge" x-show="lineRefunded(line) > 0" x-text="tt('refundedCount', { n: lineRefunded(line) })" class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium border-border bg-secondary text-foreground"></span>
                                    </span>
                                </div>
                                <div class="flex shrink-0 items-baseline gap-2 text-body-sm text-muted-foreground tabular-nums">
                                    <span x-text="money(line.unitPrice)"></span>
                                    <span aria-hidden="true">×</span>
                                    <span x-text="num(line.quantity)"></span>
                                </div>
                                <span class="w-24 shrink-0 text-end text-body-sm font-medium text-foreground tabular-nums" x-text="money(line.unitPrice * line.quantity)"></span>
                            </li>
                        </template>
                    </ul>
                </x-nq::card.content>
            </x-nq::card>

            <x-nq::card>
                <x-nq::card.header>
                    <x-nq::card.title as="h2">{{ $t['payment'] }}</x-nq::card.title>
                    <x-nq::card.action><x-nq::store-orders-admin.chip expr="paymentChip(order.payment)" /></x-nq::card.action>
                </x-nq::card.header>
                <x-nq::card.content>
                    <dl class="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-body-sm">
                        <dt class="text-muted-foreground">{{ $t['subtotal'] }}</dt>
                        <dd class="m-0 text-end tabular-nums" x-text="money(order.totals.subtotal)"></dd>
                        <dt class="text-muted-foreground" x-show="order.totals.discount > 0">{{ $t['discount'] }}</dt>
                        <dd class="m-0 text-end tabular-nums" x-show="order.totals.discount > 0" x-text="money(order.totals.discount, true)"></dd>
                        <dt class="text-muted-foreground">{{ $t['shipping'] }}<span x-show="order.shippingMethod" x-text="order.shippingMethod ? ' (' + order.shippingMethod.label + ')' : ''"></span></dt>
                        <dd class="m-0 text-end tabular-nums" x-text="order.totals.shipping > 0 ? money(order.totals.shipping) : '{{ $t['free'] }}'"></dd>
                        <dt class="text-muted-foreground" x-show="order.totals.tax > 0">{{ $t['tax'] }}</dt>
                        <dd class="m-0 text-end tabular-nums" x-show="order.totals.tax > 0" x-text="money(order.totals.tax)"></dd>
                        <dt class="border-t border-border pt-2 font-medium text-foreground">{{ $t['total'] }}</dt>
                        <dd class="m-0 border-t border-border pt-2 text-end font-semibold text-foreground tabular-nums" x-text="money(summary.total)"></dd>
                        <dt class="text-muted-foreground" x-show="summary.refunded > 0">{{ $t['refunded'] }}</dt>
                        <dd class="m-0 text-end tabular-nums" x-show="summary.refunded > 0" x-text="money(summary.refunded, true)"></dd>
                        <dt class="font-medium text-foreground" x-show="summary.refunded > 0">{{ $t['netPaid'] }}</dt>
                        <dd class="m-0 text-end font-medium tabular-nums" x-show="summary.refunded > 0" x-text="money(summary.net)"></dd>
                        <dt class="font-medium text-foreground" x-show="summary.due > 0">{{ $t['due'] }}</dt>
                        <dd class="m-0 text-end font-medium tabular-nums" x-show="summary.due > 0" x-text="money(summary.due)"></dd>
                    </dl>
                    <ul x-show="refunds.length > 0" class="m-0 mt-3 flex list-none flex-col gap-1 border-t border-border p-0 pt-3 text-caption text-muted-foreground">
                        <template x-for="(r, i) in refunds" x-bind:key="r.id ?? i">
                            <li class="flex flex-wrap justify-between gap-2">
                                <span x-text="(r.at ? date(r.at) : '{{ $t['refunded'] }}') + (r.note && r.note !== 'cancel' ? ' · ' + r.note : '') + (r.restock ? ' · {{ $t['restocked'] }}' : '')"></span>
                                <span class="tabular-nums" x-text="money(r.amount, true)"></span>
                            </li>
                        </template>
                    </ul>
                </x-nq::card.content>
            </x-nq::card>

            <x-nq::card>
                <x-nq::card.header><x-nq::card.title as="h2">{{ $t['timeline'] }}</x-nq::card.title></x-nq::card.header>
                <x-nq::card.content>
                    <section data-slot="store-order-timeline" data-variant="activity" aria-label="{{ $t['timeline'] }}" class="flex flex-col gap-4">
                        <form class="flex flex-col gap-2" x-on:submit.prevent="addNote()">
                            <x-nq::field.textarea aria-label="{{ \Nasaq\Nasaq::t('Add a note', 'أضف ملاحظة') }}" placeholder="{{ \Nasaq\Nasaq::t('Only your team can see notes.', 'الملاحظات يراها فريقك فقط.') }}" rows="2" x-model="note" />
                            <x-nq::button type="submit" size="sm" variant="secondary" class="self-end" x-bind:disabled="note.trim() === ''">{{ \Nasaq\Nasaq::t('Add note', 'إضافة ملاحظة') }}</x-nq::button>
                        </form>
                        <ol class="m-0 flex list-none flex-col gap-3 p-0">
                            <template x-for="(e, i) in events" x-bind:key="i">
                                <li data-slot="store-order-event" class="flex flex-col gap-0.5 border-s-2 border-border ps-3 text-body-sm">
                                    <span class="flex flex-wrap items-center gap-2 text-foreground"><span x-text="e.label"></span></span>
                                    <span class="text-muted-foreground" x-show="e.note ?? e.by" x-text="e.note ?? ('{{ \Nasaq\Nasaq::t('by', 'بواسطة') }} ' + e.by)"></span>
                                    <time class="text-caption text-muted-foreground tabular-nums" x-bind:datetime="e.at" x-text="date(e.at, 'medium', true)"></time>
                                </li>
                            </template>
                        </ol>
                    </section>
                </x-nq::card.content>
            </x-nq::card>
        </div>

        <aside class="flex min-w-0 flex-col gap-4">
            <x-nq::card>
                <x-nq::card.header><x-nq::card.title as="h3">{{ $t['customer'] }}</x-nq::card.title></x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-2">
                    <span class="text-body-sm font-medium text-foreground" x-text="order.customer.name"></span>
                    <a x-show="order.customer.email" x-bind:href="'mailto:' + order.customer.email" dir="ltr" class="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-foreground">
                        <x-lucide-mail aria-hidden="true" class="size-3.5" /><span class="text-start" x-text="order.customer.email"></span>
                    </a>
                    <a x-show="order.customer.phone" x-bind:href="'tel:' + order.customer.phone" dir="ltr" class="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-foreground">
                        <x-lucide-phone aria-hidden="true" class="size-3.5" /><span class="text-start" x-text="order.customer.phone"></span>
                    </a>
                </x-nq::card.content>
            </x-nq::card>
            @foreach (['shippingAddress' => ['shippingAddress', 'noAddress'], 'billingAddress' => ['billingAddress', 'sameAsShipping']] as $key => [$title, $fallback])
                <x-nq::card>
                    <x-nq::card.header><x-nq::card.title as="h3">{{ $t[$title] }}</x-nq::card.title></x-nq::card.header>
                    <x-nq::card.content class="flex flex-col gap-2">
                        <address x-show="order.{{ $key }}" class="{{ $addr }}">
                            <span class="font-medium" x-text="order.{{ $key }}?.name"></span>
                            <span x-text="order.{{ $key }}?.line1"></span>
                            <span x-show="order.{{ $key }}?.line2" x-text="order.{{ $key }}?.line2"></span>
                            <span x-text="order.{{ $key }} ? [order.{{ $key }}.region, order.{{ $key }}.city].filter(Boolean).join(', ') : ''"></span>
                            <bdi dir="ltr" class="text-start" x-show="order.{{ $key }}?.postalCode" x-text="order.{{ $key }}?.postalCode"></bdi>
                            <bdi dir="ltr" class="text-start" x-show="order.{{ $key }}?.phone" x-text="order.{{ $key }}?.phone"></bdi>
                        </address>
                        <p x-show="! order.{{ $key }}" class="text-body-sm text-muted-foreground">{{ $t[$fallback] }}</p>
                        @if ($key === 'shippingAddress')
                            <span x-show="order.shippingMethod" class="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                                <x-lucide-map-pin aria-hidden="true" class="size-3.5" /><span x-text="order.shippingMethod?.label"></span>
                            </span>
                        @endif
                    </x-nq::card.content>
                </x-nq::card>
            @endforeach
            <x-nq::card>
                <x-nq::card.header><x-nq::card.title as="h3">{{ $t['shipment'] }}</x-nq::card.title></x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-2">
                    <div x-show="order.tracking" class="flex flex-col gap-2">
                        <span class="text-body-sm text-foreground" x-text="order.tracking?.carrier"></span>
                        <bdi dir="ltr" class="text-start font-mono text-body-sm text-muted-foreground" x-text="order.tracking?.number"></bdi>
                        <a x-show="trackUrl" x-bind:href="trackUrl" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1.5 text-body-sm text-foreground underline underline-offset-4">
                            <x-lucide-file-text aria-hidden="true" class="size-3.5" />{{ $t['trackShipment'] }}
                        </a>
                    </div>
                    <p x-show="! order.tracking" class="text-body-sm text-muted-foreground">{{ $t['noTracking'] }}</p>
                </x-nq::card.content>
            </x-nq::card>
        </aside>
    </div>

    <x-nq::dialog x-model="fulfilOpen">
        <x-nq::dialog.content data-slot="store-fulfil-dialog" class="max-w-lg">
            <form class="flex flex-col gap-4" x-on:submit.prevent="confirmFulfil()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['fulfilTitle'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['fulfilText'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <ul class="m-0 flex list-none flex-col gap-2 p-0">
                    <template x-for="line in order.lines" x-bind:key="line.id">
                        <li class="flex flex-wrap items-center justify-between gap-2">
                            <span class="min-w-0 flex-1 basis-40 truncate text-body-sm text-foreground" x-text="line.name"></span>
                            <div class="flex items-center gap-2">
                                <x-nq::field.input type="number" inputmode="numeric" min="0" ltr class="w-20" x-model.number="fqty[line.id]" x-bind:max="lineOutstanding(line)" x-bind:disabled="lineOutstanding(line) === 0" x-bind:aria-label="'{{ $t['quantity'] }}: ' + line.name" />
                                <span class="text-caption text-muted-foreground tabular-nums">/ <span x-text="num(lineOutstanding(line))"></span></span>
                            </div>
                        </li>
                    </template>
                </ul>
                <div class="grid gap-3 sm:grid-cols-2">
                    <label class="{{ $label }}">
                        {{ $t['carrier'] }}
                        <x-nq::select :value="$carriers[0] ?? ''" x-model="carrier">
                            <x-nq::select.trigger aria-label="{{ $t['carrier'] }}"><x-nq::select.value /></x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach ($carriers as $c)
                                    <x-nq::select.item :value="$c">{{ $c }}</x-nq::select.item>
                                @endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    </label>
                    <label class="{{ $label }}">
                        {{ $t['trackingNumber'] }}
                        <x-nq::field.input placeholder="BST880124" ltr x-model="trackNo" />
                    </label>
                </div>
                <p aria-live="polite" class="text-body-sm text-muted-foreground" x-text="fMessage"></p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="secondary" x-on:click="fulfilOpen = false">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="! fOk"><x-lucide-package-check aria-hidden="true" />{{ $t['markShipped'] }}</x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    <x-nq::dialog x-model="refundOpen">
        <x-nq::dialog.content data-slot="store-refund-dialog" class="max-w-lg">
            <form class="flex flex-col gap-4" x-on:submit.prevent="confirmRefund()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['refundTitle'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['refundLeft'] }} <span class="tabular-nums" x-text="money(remaining)"></span></x-nq::dialog.description>
                </x-nq::dialog.header>
                <x-nq::toggle-group :default-value="['lines']" aria-label="{{ $t['refundBy'] }}" class="grid w-full grid-cols-2" x-model="rMode">
                    <x-nq::toggle-group.toggle value="lines">{{ $t['byLines'] }}</x-nq::toggle-group.toggle>
                    <x-nq::toggle-group.toggle value="amount">{{ $t['byAmount'] }}</x-nq::toggle-group.toggle>
                </x-nq::toggle-group>
                <div x-show="rLines" class="flex flex-col gap-4">
                    <ul class="m-0 flex list-none flex-col gap-2 p-0">
                        <template x-for="line in order.lines" x-bind:key="line.id">
                            <li class="flex flex-wrap items-center justify-between gap-2">
                                <span class="flex min-w-0 flex-1 basis-40 flex-col">
                                    <span class="truncate text-body-sm text-foreground" x-text="line.name"></span>
                                    <span class="text-caption text-muted-foreground tabular-nums" x-show="rLineValue(line.id) > 0" x-text="money(rLineValue(line.id))"></span>
                                </span>
                                <div class="flex items-center gap-2">
                                    <x-nq::field.input type="number" inputmode="numeric" min="0" ltr class="w-20" x-model.number="rqty[line.id]" x-bind:max="lineRefundable(line)" x-bind:disabled="lineRefundable(line) === 0" x-bind:aria-label="'{{ $t['quantity'] }}: ' + line.name" />
                                    <span class="text-caption text-muted-foreground tabular-nums">/ <span x-text="num(lineRefundable(line))"></span></span>
                                </div>
                            </li>
                        </template>
                    </ul>
                    <label class="flex items-center justify-between gap-3 text-body-sm">
                        <span class="text-foreground">{{ $t['refundShipping'] }}</span>
                        <x-nq::switch x-model="rShipping" x-bind:disabled="! shippingAvailable" aria-label="{{ $t['refundShipping'] }}" />
                    </label>
                    <label class="flex items-center justify-between gap-3 text-body-sm">
                        <span class="flex flex-col">
                            <span class="text-foreground">{{ $t['restock'] }}</span>
                            <span class="text-caption text-muted-foreground">{{ $t['restockText'] }}</span>
                        </span>
                        <x-nq::switch :checked="true" x-model="rRestock" aria-label="{{ $t['restock'] }}" />
                    </label>
                </div>
                <label x-show="! rLines" class="{{ $label }}">
                    {{ $t['refundAmount'] }}
                    <x-nq::field.input type="number" inputmode="decimal" min="0" step="0.01" ltr placeholder="0.00" x-model="rAmount" />
                    <span class="text-caption text-muted-foreground">{{ $t['byAmountText'] }}</span>
                </label>
                <label class="{{ $label }}">
                    {{ $t['reason'] }}
                    <x-nq::field.textarea rows="2" placeholder="{{ $t['reasonPlaceholder'] }}" x-model="rNote" />
                </label>
                <p role="alert" class="text-body-sm text-nq-danger-text" x-show="rMessage" x-text="rMessage"></p>
                <p aria-live="polite" class="flex items-baseline justify-between gap-2 border-t border-border pt-3 text-body-sm">
                    <span class="text-muted-foreground">{{ $t['refundTotal'] }}</span>
                    <span class="text-h3 font-semibold text-foreground tabular-nums" x-text="money(rTotal)"></span>
                </p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="secondary" x-on:click="refundOpen = false">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="! rPlan.ok"><x-lucide-undo-2 aria-hidden="true" />{{ $t['issueRefund'] }}</x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    <x-nq::alert-dialog x-model="cancelOpen">
        <x-nq::alert-dialog.content data-slot="store-cancel-dialog">
            <x-nq::alert-dialog.header>
                <x-nq::alert-dialog.title><span x-text="tt('cancelTitle', { n: order.number })"></span></x-nq::alert-dialog.title>
                <x-nq::alert-dialog.description>
                    <span x-show="cancelPlan.refundAmount > 0">{{ $t['cancelRefunds'] }} <span class="tabular-nums" x-text="money(cancelPlan.refundAmount) + '.'"></span></span>
                    <span x-show="cancelPlan.refundAmount <= 0">{{ $t['cancelNoRefund'] }}</span>
                </x-nq::alert-dialog.description>
            </x-nq::alert-dialog.header>
            <x-nq::alert-dialog.footer>
                <x-nq::alert-dialog.cancel>{{ $t['keepOrder'] }}</x-nq::alert-dialog.cancel>
                <x-nq::alert-dialog.action variant="danger" x-on:click="confirmCancel()">{{ $t['cancelOrder'] }}</x-nq::alert-dialog.action>
            </x-nq::alert-dialog.footer>
        </x-nq::alert-dialog.content>
    </x-nq::alert-dialog>
</div>
