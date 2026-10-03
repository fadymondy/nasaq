{{-- <x-nq::store-orders-admin.abandoned-carts :carts="$carts" now="2026-09-29T09:00:00Z" @nq-send-recovery="queue($event.detail)" />
     Carts that were left behind: how long they have been idle, what they are worth and whether the shopper can be emailed again. Sending is gated: idle long
     enough, not in cooldown, under the email limit. carts: [['id', 'customer' => ['name', 'email'], 'lines' => [['name', 'quantity', 'unitPrice']], 'stage' => 'cart|checkout|payment',
     'updatedAt', 'emailsSent', 'lastEmailAt', 'recovered']]. now: reference time (ISO string, timestamp or DateTime; default the current time). rules: min-idle, cooldown, max-emails, lost-after.
     max-discount-percent: 20. currency: USD, or SAR in Arabic. loading / error: states. can-send: false hides the send action.
     Event nq-send-recovery { cartId, discountPercent, discountAmount, message } (cancelable; otherwise the cart is marked emailed on screen); nq-retry. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-orders-admin._strings')
@props(['carts' => [], 'currency' => null, 'now' => null, 'rules' => [], 'maxDiscountPercent' => 20, 'loading' => false, 'error' => false, 'canSend' => true, 'labels' => []])
@php
    $t = nq_store_admin_t($labels);
    $currency ??= \Nasaq\Nasaq::currency();
    $clock = $now === null ? now() : ($now instanceof \DateTimeInterface ? \Carbon\Carbon::instance($now) : (is_numeric($now) ? \Carbon\Carbon::createFromTimestampMs((int) $now) : \Carbon\Carbon::parse($now)));
    $config = [
        'carts' => array_values($carts), 'now' => (int) $clock->getTimestampMs(), 'rules' => (object) $rules, 'maxDiscountPercent' => $maxDiscountPercent,
        'loading' => (bool) $loading, 'error' => (bool) $error, 'canSend' => (bool) $canSend, 'currency' => $currency,
        'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 't' => $t, 'labels' => nq_store_admin_labels(),
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'store-abandoned-carts') }}" role="region" aria-label="{{ $t['abandoned'] }}" x-data="nqStoreAbandonedCarts({{ \Illuminate\Support\Js::from($config) }})" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    @if ($error)
        <x-nq::states :title="$t['loadErrorCarts']" icon="triangle-alert">
            <x-slot:actions>
                <x-nq::button type="button" size="sm" variant="secondary" x-on:click="$root.dispatchEvent(new CustomEvent('nq-retry', { bubbles: true }))">{{ $t['retry'] }}</x-nq::button>
            </x-slot:actions>
        </x-nq::states>
    @else
        <x-nq::stat-card.grid>
            <x-nq::stat-card :loading="$loading" :label="$t['statAbandoned']">
                <x-slot:icon><x-lucide-shopping-cart /></x-slot:icon>
                <span x-text="num(stats.carts)"></span>
            </x-nq::stat-card>
            <x-nq::stat-card :loading="$loading" :label="$t['statAtRisk']">
                <x-slot:icon><x-lucide-wallet /></x-slot:icon>
                <span class="[unicode-bidi:isolate]" x-text="atRisk"></span>
            </x-nq::stat-card>
            <x-nq::stat-card :loading="$loading" :label="$t['statRecovered']">
                <x-slot:icon><x-lucide-mail-check /></x-slot:icon>
                <span x-text="num(stats.recovered)"></span>
            </x-nq::stat-card>
            <x-nq::stat-card :loading="$loading" :label="$t['statRate']">
                <x-slot:icon><x-lucide-mail /></x-slot:icon>
                <span x-text="rate"></span>
            </x-nq::stat-card>
        </x-nq::stat-card.grid>

        @if ($loading)
            <div class="flex flex-col gap-2">
                <x-nq::states.skeleton class="h-16" />
                <x-nq::states.skeleton class="h-16" />
                <x-nq::states.skeleton class="h-16" />
            </div>
        @else
            <template x-if="carts.length === 0">
                <x-nq::states :title="$t['noCarts']" :description="$t['noCartsText']" />
            </template>
            <ul x-show="carts.length > 0" class="m-0 flex list-none flex-col gap-2 p-0">
                <template x-for="row in rows" x-bind:key="row.id">
                    <li data-slot="store-abandoned-cart" class="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-border bg-card p-3">
                        <div class="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
                            <span class="truncate font-medium" x-text="row.cart.customer?.name ?? t.guest"></span>
                            <bdi dir="ltr" class="truncate text-start text-body-sm text-muted-foreground" x-show="row.cart.customer?.email" x-text="row.cart.customer?.email"></bdi>
                            <span class="truncate text-body-sm text-muted-foreground" x-text="row.names"></span>
                        </div>
                        <div class="flex flex-col gap-0.5 text-body-sm">
                            <span class="font-medium tabular-nums [unicode-bidi:isolate]" x-text="row.value"></span>
                            <span class="text-muted-foreground"><span class="tabular-nums" x-text="row.count"></span> {{ $t['items'] }}</span>
                        </div>
                        <div class="flex flex-col gap-0.5 text-body-sm text-muted-foreground">
                            <span x-text="t['stage.' + row.cart.stage]"></span>
                            <span x-text="row.idle"></span>
                        </div>
                        <div class="flex flex-col items-start gap-1">
                            <span data-slot="badge" x-bind:class="chipClass(statusVariant(row.status))" x-text="t['recovery.' + row.status]" class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium"></span>
                            <span class="text-caption text-muted-foreground" x-show="row.cart.emailsSent > 0" x-text="emailsText(row.cart)"></span>
                        </div>
                        <div class="ms-auto flex flex-col items-end gap-1">
                            <x-nq::button type="button" size="sm" variant="secondary" data-action="send-recovery" x-bind:disabled="row.gate.ok && canSend ? null : ''" x-on:click="open(row.cart)">
                                <x-lucide-mail aria-hidden="true" />
                                {{ $t['sendRecovery'] }}
                            </x-nq::button>
                            <span class="text-caption text-muted-foreground" x-show="row.why" x-text="row.why"></span>
                        </div>
                    </li>
                </template>
            </ul>

            <x-nq::dialog x-model="dialogOpen">
                <x-nq::dialog.content class="max-w-md">
                    <form class="flex flex-col gap-4" x-on:submit.prevent="send()">
                        <x-nq::dialog.header>
                            <x-nq::dialog.title>{{ $t['recoveryTitle'] }}</x-nq::dialog.title>
                            <x-nq::dialog.description>{{ $t['recoveryText'] }} <bdi dir="ltr" x-text="target?.customer?.email"></bdi></x-nq::dialog.description>
                        </x-nq::dialog.header>
                        <label class="flex flex-col gap-1 text-body-sm">
                            <span class="font-medium">{{ $t['discountPercent'] }}</span>
                            <x-nq::field.input type="number" inputmode="numeric" min="0" x-bind:max="maxPercent" ltr x-model="percent" />
                            <span class="text-caption text-muted-foreground"><span x-text="tt('discountHint', { max: maxPercent })"></span> <span class="tabular-nums [unicode-bidi:isolate]" x-text="discountText"></span></span>
                        </label>
                        <label class="flex flex-col gap-1 text-body-sm">
                            <span class="font-medium">{{ $t['recoveryMessage'] }}</span>
                            <x-nq::field.textarea rows="3" placeholder="{{ $t['recoveryPlaceholder'] }}" x-model="message" />
                        </label>
                        <x-nq::dialog.footer>
                            <x-nq::button type="button" variant="ghost" x-on:click="dialogOpen = false">{{ $t['cancel'] }}</x-nq::button>
                            <x-nq::button type="submit" variant="primary">
                                <x-lucide-mail aria-hidden="true" />
                                {{ $t['sendRecovery'] }}
                            </x-nq::button>
                        </x-nq::dialog.footer>
                    </form>
                </x-nq::dialog.content>
            </x-nq::dialog>
        @endif
    @endif
</div>
