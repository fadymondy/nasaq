{{-- <x-nq::store-account.return-status :request="$rma" :order="$order" currency="USD" can-cancel @nq-cancel-return="cancel($event.detail.request)" />
     One return request: its number, the items, the five-step RMA progress, the refund and, when it was refused, why.
     request: ['id', 'number', 'orderId', 'createdAt', 'status' => requested | approved | shipped-back | received | refunded | rejected | cancelled, 'lines' => [['lineId', 'quantity']],
     'reason', 'refundMethod' => original | store-credit | bank, 'refundAmount' (minor units), 'rejectionReason'?, 'stoppedAfter'?]. order: names the items (lines, number).
     can-cancel: shows "Cancel request" while the request is requested or approved; confirming dispatches a bubbling "nq-cancel-return" { request }. labels: override strings by key.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-account._strings')
@props(['request', 'order', 'currency' => null, 'canCancel' => false, 'labels' => []])
@php
    $t = nq_store_account_t($labels);
    $currency ??= \Nasaq\Nasaq::currency();
    $config = [
        'request' => $request, 'order' => ['number' => $order['number'] ?? '', 'lines' => array_map(fn ($l) => ['id' => $l['id'], 'name' => $l['name']], $order['lines'] ?? [])],
        'canCancel' => (bool) $canCancel, 'currency' => $currency, 'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 't' => $t,
    ];
@endphp
<article data-slot="{{ $attributes->get('data-slot', 'store-return-status') }}" data-status="{{ $request['status'] }}" x-data="nqStoreReturnStatus(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-4') }}>
    <header class="flex flex-wrap items-start justify-between gap-2">
        <div class="flex min-w-0 flex-col gap-0.5">
            <span class="font-semibold">{{ $t['rma'] }} <bdi x-text="request.number"></bdi></span>
            <span class="text-body-sm text-muted-foreground">{{ $t['requestedOn'] }} <span x-text="date(request.createdAt)"></span></span>
        </div>
        <x-nq::store-orders-admin.chip expr="rmaChip(request.status)" />
    </header>
    <ol aria-label="{{ $t['rma'] }}" class="m-0 grid list-none gap-2 p-0 sm:grid-cols-5">
        <template x-for="step in steps" x-bind:key="step.key">
            <li x-bind:data-state="step.state" x-bind:aria-current="step.state === 'current' ? 'step' : null" x-bind:class="stepClass(step.state)"
                class="flex items-center gap-1.5 border-s-4 ps-2 text-body-sm sm:flex-col sm:items-start sm:border-s-0 sm:border-t-4 sm:ps-0 sm:pt-2">
                <x-lucide-check x-show="step.state === 'done'" aria-hidden="true" class="size-4 text-primary" />
                <span x-text="stepLabel(step.key)"></span>
            </li>
        </template>
    </ol>
    <p class="m-0 flex items-start gap-2 text-body-sm" x-bind:class="stopped ? 'text-foreground' : 'text-muted-foreground'">
        <x-lucide-circle-x x-show="request.status === 'rejected'" aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
        <x-lucide-ban x-show="request.status === 'cancelled'" aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
        <span x-text="hint"></span>
    </p>
    <p class="m-0 rounded-control border border-border bg-secondary px-3 py-2 text-body-sm" x-show="request.status === 'rejected' ? Boolean(request.rejectionReason) : false" style="display: none">
        <span class="font-medium">{{ $t['rejectionReason'] }}:</span> <span x-text="request.rejectionReason"></span>
    </p>
    <ul class="m-0 flex list-none flex-col gap-1 p-0 text-body-sm">
        <template x-for="pick in request.lines" x-bind:key="pick.lineId">
            <li class="flex items-center justify-between gap-3">
                <span class="min-w-0 truncate" x-text="lineName(pick.lineId)"></span>
                <span class="shrink-0 text-muted-foreground">{{ $t['quantity'] }} <span class="tabular-nums" x-text="num(pick.quantity)"></span></span>
            </li>
        </template>
    </ul>
    <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <span class="text-body-sm">
            <span class="text-muted-foreground">{{ $t['refundTotal'] }}:</span> <span class="font-semibold tabular-nums" x-text="money(request.refundAmount)"></span>
            <span class="text-muted-foreground" x-text="'(' + methodText + ')'"></span>
        </span>
        @if ($canCancel)
            <x-nq::button type="button" size="sm" variant="ghost" x-show="canCancel" style="display: none" x-on:click="confirm = true">{{ $t['cancelRequest'] }}</x-nq::button>
        @endif
    </footer>
    @if ($canCancel)
        <x-nq::alert-dialog x-model="confirm">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title>{{ $t['cancelRequestTitle'] }}</x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description>{{ $t['cancelRequestText'] }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel>{{ $t['keepRequest'] }}</x-nq::alert-dialog.cancel>
                    <x-nq::alert-dialog.action variant="danger" x-on:click="cancel()">{{ $t['cancelRequest'] }}</x-nq::alert-dialog.action>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</article>
