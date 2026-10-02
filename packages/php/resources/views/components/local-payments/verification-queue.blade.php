{{-- <x-nq::local-payments.verification-queue :submissions="$submissions" />
     The reviewer's side: receipts waiting to be matched with the bank, with Verify, Reject (with a reason) and a receipt link in each row's menu.
     submissions: [['id', 'customer', 'methodName', 'amount' => minor units, 'currency', 'reference', 'receiptName'?, 'receiptUrl'?, 'submittedAt', 'status' => submitted | verifying | verified | rejected]].
     loading, labels: array overriding any built-in text ({who} is filled in).
     Events on the root (bubbling, claimable): nq-payment-verify { submission, resolve(), reject(message), waitUntil(promise) } and nq-payment-reject { submission, reason, resolve(), reject(message), waitUntil(promise) }:
     the dialog stays busy until it settles and a rejection shows its message in an alert. Verify and Reject only act on submitted and verifying rows.
     Not ported here: the inline Verify / Reject buttons (the same actions are in the row menu and the row's context menu, shown only on submitted and verifying rows) and the time of the sent column. Mixed currencies show the amount as text, which cannot be sorted. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.local-payments._logic')
@props(['submissions' => [], 'loading' => false, 'labels' => []])
@php
    $t = nq_payments_words(app()->getLocale(), (array) $labels);
    $rows = array_values(array_map(fn ($r) => (array) $r, (array) $submissions));
    $currencies = array_values(array_unique(array_map(fn ($r) => strtoupper((string) $r['currency']), $rows)));
    $single = count($currencies) <= 1;
    $code = $currencies[0] ?? strtoupper(\Nasaq\Nasaq::currency());
    foreach ($rows as &$r) {
        $r['amountMajor'] = nq_payments_major((int) $r['amount'], (string) $r['currency']);
        $r['amountText'] = \Nasaq\Nasaq::money($r['amountMajor'], strtoupper((string) $r['currency']));
        $r['receiptUrl'] = $r['receiptUrl'] ?? null;
        $at = $r['submittedAt'] instanceof \DateTimeInterface ? \Carbon\Carbon::instance($r['submittedAt']) : (is_numeric($r['submittedAt']) ? \Carbon\Carbon::createFromTimestamp($r['submittedAt']) : \Carbon\Carbon::parse($r['submittedAt']));
        $r['sentAt'] = $at->getTimestamp();
        $r['sentDate'] = $at->format('Y-m-d');
    }
    unset($r);
    usort($rows, fn ($a, $b) => $a['sentAt'] <=> $b['sentAt']);
    $open = fn ($r) => in_array($r['status'], ['submitted', 'verifying'], true);
    $pending = count(array_filter($rows, $open));
    $tones = ['unpaid' => 'neutral', 'submitted' => 'info', 'verifying' => 'warning', 'verified' => 'success', 'rejected' => 'danger'];
    $columns = [
        ['id' => 'customer', 'header' => $t['customer'], 'sortable' => true, 'searchable' => true],
        ['id' => 'methodName', 'header' => $t['methodCol'], 'sortable' => true],
        ['id' => 'reference', 'header' => $t['referenceCol'], 'type' => 'mono', 'searchable' => true],
        $single
            ? ['id' => 'amount', 'header' => $t['amountCol'], 'key' => 'amountMajor', 'type' => 'currency', 'currency' => $code, 'align' => 'end', 'sortable' => true]
            : ['id' => 'amount', 'header' => $t['amountCol'], 'key' => 'amountText', 'align' => 'end'],
        ['id' => 'sent', 'header' => $t['sent'], 'key' => 'sentDate', 'type' => 'date', 'sortable' => true],
        ['id' => 'status', 'header' => $t['statusCol'], 'type' => 'status', 'sortable' => true, 'filter' => true,
            'options' => array_map(fn ($s) => ['value' => $s, 'label' => $t['statuses'][$s], 'tone' => $tones[$s]], ['submitted', 'verifying', 'verified', 'rejected'])],
    ];
    $hasReceipt = count(array_filter($rows, fn ($r) => ! empty($r['receiptUrl']))) > 0;
    $actions = array_values(array_filter([
        $hasReceipt ? ['id' => 'receipt', 'label' => $t['viewReceipt'], 'icon' => 'eye'] : null,
        ['id' => 'verify', 'label' => $t['verify'], 'icon' => 'check', 'group' => 'verdict', 'visibleWhen' => ['field' => 'status', 'in' => ['submitted', 'verifying']]],
        ['id' => 'reject', 'label' => $t['reject'], 'icon' => 'x', 'danger' => true, 'group' => 'verdict', 'visibleWhen' => ['field' => 'status', 'in' => ['submitted', 'verifying']]],
    ]));
    $config = ['failed' => $t['failed'], 'rejectDescription' => $t['rejectDescription']];
    $uid = 'nq-pq-'.substr(md5(json_encode(array_column($rows, 'id'))), 0, 6);
    $fade = 'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'payment-verification-queue') }}" aria-labelledby="{{ $uid }}-title" x-data="nqPaymentQueue({!! \Illuminate\Support\Js::from($config) !!})" x-on:nq-data-table-action="onAction($event)"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
    <h2 id="{{ $uid }}-title" class="text-h3 text-foreground">{{ $t['queue'] }}</h2>
    <p role="alert" x-show="error" x-text="error" x-cloak style="display: none" class="flex items-center gap-2 text-body-sm text-nq-danger-text"></p>
    <x-nq::data-table :label="$t['queueLabel']" :columns="$columns" :rows="$rows" name-key="customer" :page-size="10" :search="$t['search']" :row-actions="$actions" :loading="$loading">
        <x-slot:empty><x-nq::states.empty icon="receipt-text" :title="$t['emptyQueue']" :description="$t['emptyQueueDescription']" class="border-0" /></x-slot:empty>
    </x-nq::data-table>

    <template x-teleport="body">
        <div data-slot="dialog-portal" x-on:keydown.escape.window="rejecting && cancelReject()">
            <div data-slot="dialog-backdrop" x-nq-presence="rejecting !== null" class="fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60 {{ $fade }}"></div>
            <div data-slot="payment-reject" role="dialog" aria-modal="true" x-nq-presence="rejecting !== null" x-trap.noscroll="rejecting !== null"
                class="fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-lg gap-4 rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none max-h-[calc(100dvh-2rem)] overflow-y-auto {{ $fade }}">
                <form class="grid gap-4" x-on:submit.prevent="confirmReject()">
                    <div class="flex flex-col gap-1.5">
                        <h2 data-slot="dialog-title" class="text-h3 text-foreground">{{ $t['rejectTitle'] }}</h2>
                        <p data-slot="dialog-description" class="text-body-sm text-muted-foreground" x-text="rejectText()"></p>
                    </div>
                    <a x-show="rejecting && rejecting.receiptUrl" x-cloak style="display: none" x-bind:href="rejecting ? rejecting.receiptUrl : null" target="_blank" rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 text-body-sm text-primary underline-offset-4 hover:underline">
                        <x-lucide-external-link aria-hidden="true" class="size-3.5" />
                        {{ $t['viewReceipt'] }}
                        <bdi dir="ltr" x-show="rejecting && rejecting.receiptName" x-text="rejecting ? ' (' + rejecting.receiptName + ')' : ''"></bdi>
                    </a>
                    <div class="flex flex-col gap-1.5">
                        <label for="{{ $uid }}-reason" class="text-label text-foreground">{{ $t['reason'] }}</label>
                        <textarea id="{{ $uid }}-reason" data-slot="textarea" rows="3" x-model="reason" aria-describedby="{{ $uid }}-hint"
                            class="w-full min-w-0 rounded-control border border-input bg-card px-3 py-2 text-body text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus"></textarea>
                        <p id="{{ $uid }}-hint" data-slot="field-description" class="text-caption text-muted-foreground">{{ $t['reasonHint'] }}</p>
                    </div>
                    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <x-nq::button type="button" variant="ghost" x-on:click="rejecting = null">{{ $t['close'] }}</x-nq::button>
                        <x-nq::button type="submit" variant="danger" x-bind:disabled="busy !== null || reason.trim() === ''">{{ $t['confirmReject'] }}</x-nq::button>
                    </div>
                </form>
            </div>
        </div>
    </template>
    <span class="sr-only" aria-live="polite">{{ $pending }}</span>
</section>
