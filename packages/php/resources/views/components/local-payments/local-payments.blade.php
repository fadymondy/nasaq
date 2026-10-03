{{-- <x-nq::local-payments :amount="1250000" currency="USD" :methods="$methods" :submission="$submission" />
     Manual payment methods: pick one (InstaPay, a mobile wallet, a bank), see where to send the money with copy buttons and a QR, add the transfer
     reference and the receipt, and follow verification. Amounts are integer minor units (cents, halalas); each method's fee and limits are applied.
     amount: what is owed, minor units. currency: ISO 4217 (USD, or SAR in Arabic, when omitted).
     methods: [['id', 'name', 'kind' => instant-transfer | mobile-wallet | bank-transfer | cash-deposit, 'description'?, 'details' => [['label', 'value', 'copyable'? => true]],
       'steps'? => [string], 'qr'? => payload, 'fee'? => ['percentBps'?, 'fixed'?], 'min'?, 'max'? (minor units)]]. Names are text: no provider logo is drawn.
     submission: ['methodId', 'reference', 'status' => submitted | verifying | verified | rejected, 'submittedAt'?, 'rejectionReason'?]. Its status decides what the card shows:
     the form for unpaid and rejected, the verification status otherwise. default-method-id, receipt-required (true), max-receipt-size (5 MB in bytes), cancel (shows the Cancel button),
     labels: array overriding any built-in text (nested keys merge; {total}, {fee}, {min}, {max} are filled in).
     Events on the root (bubbling): nq-local-payment-submit { input: { methodId, reference, receipt: File, amount, fee, total }, resolve(), reject(message), waitUntil(promise) }:
     the button stays busy until it settles and a rejection shows its message; when nobody claims it the card switches to "Receipt sent" at once. nq-local-payment-cancel.
     Not ported here: the `mark` slot for official provider logos. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.local-payments._logic')
@props([
    'amount' => 0, 'currency' => null, 'methods' => [], 'submission' => null, 'defaultMethodId' => null, 'receiptRequired' => true,
    'maxReceiptSize' => 5242880, 'cancel' => false, 'labels' => [],
])
@php
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency());
    $t = nq_payments_words(app()->getLocale(), (array) $labels);
    $list = array_values(array_map(fn ($m) => (array) $m, (array) $methods));
    $sub = $submission ? (array) $submission : null;
    $status = $sub['status'] ?? 'unpaid';
    $form = in_array($status, ['unpaid', 'rejected'], true);
    $selected = (string) ($defaultMethodId ?? ($sub['methodId'] ?? ($list[0]['id'] ?? '')));
    $money = fn (int|float $minor) => \Nasaq\Nasaq::money(nq_payments_major($minor, $code), $code);
    $amount = (int) $amount;
    $info = [];
    foreach ($list as $m) {
        $fee = nq_payments_fee($amount, isset($m['fee']) ? (array) $m['fee'] : null);
        $total = $amount + $fee;
        $limit = nq_payments_limit($total, $m);
        $info[$m['id']] = [
            'fee' => $fee, 'total' => $total, 'limit' => $limit,
            'limitMessage' => $limit === 'min' ? nq_payments_say($t['problems']['min'], ['min' => $money($m['min'] ?? 0)]) : ($limit === 'max' ? nq_payments_say($t['problems']['max'], ['max' => $money($m['max'] ?? 0)]) : ''),
        ];
    }
    $feeText = function (array $m) use ($money, $info) {
        $fee = (array) ($m['fee'] ?? []);
        if (! $fee) {
            return null;
        }
        $parts = [];
        if (! empty($fee['percentBps'])) {
            $parts[] = rtrim(rtrim(number_format($fee['percentBps'] / 100, 2, '.', ''), '0'), '.').'%';
        }
        if (! empty($fee['fixed'])) {
            $parts[] = $money($fee['fixed']);
        }

        return implode(' + ', $parts) ?: $money($info[$m['id']]['fee']);
    };
    $config = [
        'amount' => $amount, 'currency' => $code, 'receiptRequired' => (bool) $receiptRequired, 'methodId' => $selected, 'reference' => (string) ($sub['reference'] ?? ''),
        'methods' => $info, 'failed' => $t['failed'], 'problems' => $t['problems'],
    ];
    $uid = 'nq-lp-'.substr(md5(json_encode([$amount, $code, array_column($list, 'id')])), 0, 6);
@endphp
@if (count($list) === 0)
    <x-nq::states.empty icon="receipt-text" :title="$t['empty']" :description="$t['emptyDescription']" />
@else
    <div data-slot="{{ $attributes->get('data-slot', 'local-payments') }}" data-status="{{ $status }}" aria-labelledby="{{ $uid }}-title" x-data="nqLocalPayments({!! \Illuminate\Support\Js::from($config) !!})"
        {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground') }}>
        <div class="grid auto-rows-min items-start gap-1 px-4">
            <h2 id="{{ $uid }}-title" class="text-label text-foreground">{{ $t['title'] }}</h2>
            @foreach ($list as $m)
                <p class="text-body-sm text-muted-foreground" data-slot="local-payments-description" @if ($form) x-show="methodId === {{ \Illuminate\Support\Js::from((string) $m['id']) }}" @endif
                    @if ($form && $m['id'] != $selected) style="display: none" @endif
                    @if (! $form && ($sub['methodId'] ?? null) != $m['id']) hidden @endif>{{ nq_payments_say($t['description'], ['total' => $money($info[$m['id']]['total'])]) }}</p>
            @endforeach
        </div>

        @if (! $form)
            <div class="px-4">
                <x-nq::local-payments.verification-status :status="$status" :method-name="collect($list)->firstWhere('id', $sub['methodId'] ?? null)['name'] ?? null"
                    :reference="$sub['reference'] ?? null" :submitted-at="$sub['submittedAt'] ?? null" :labels="$labels" />
            </div>
        @else
            <div x-show="done" x-cloak style="display: none" class="px-4">
                <x-nq::local-payments.verification-status status="submitted" :labels="$labels" />
            </div>
            <form novalidate x-show="!done" class="flex flex-col gap-4" x-on:submit.prevent="submit()">
                @if ($status === 'rejected')
                    <div class="px-4">
                        <x-nq::local-payments.verification-status status="rejected" :method-name="collect($list)->firstWhere('id', $sub['methodId'] ?? null)['name'] ?? null"
                            :reference="$sub['reference'] ?? null" :submitted-at="$sub['submittedAt'] ?? null" :rejection-reason="$sub['rejectionReason'] ?? null" :labels="$labels" />
                    </div>
                @endif
                <div class="flex flex-col gap-2 px-4">
                    <h3 id="{{ $uid }}-method" class="text-label text-foreground">{{ $t['method'] }}</h3>
                    <x-nq::radio-group :default-value="$selected" x-model="methodId" aria-labelledby="{{ $uid }}-method" class="grid gap-2 sm:grid-cols-2">
                        @foreach ($list as $m)
                            <x-nq::radio-group.card :value="$m['id']" :title="$m['name']" :description="$m['description'] ?? ($t['kinds'][$m['kind']] ?? null)"
                                :meta="($feeText($m) ? nq_payments_say($t['fee'], ['fee' => $feeText($m)]) : $t['noFee'])" />
                        @endforeach
                    </x-nq::radio-group>
                </div>

                @foreach ($list as $m)
                    @php
                        $mi = $info[$m['id']];
                        $details = array_values(array_map(fn ($d) => (array) $d, (array) ($m['details'] ?? [])));
                    @endphp
                    <div data-slot="local-payments-instructions" data-method="{{ $m['id'] }}" x-show="methodId === {{ \Illuminate\Support\Js::from((string) $m['id']) }}" @if ($m['id'] != $selected) style="display: none" @endif
                        class="grid gap-4 px-4 sm:grid-cols-[1fr_auto]">
                        <div class="flex min-w-0 flex-col gap-3">
                            <x-nq::badge variant="outline" class="self-start">{{ $t['kinds'][$m['kind']] ?? $m['kind'] }}</x-nq::badge>
                            @if (! empty($m['steps']))
                                <div class="flex flex-col gap-1.5">
                                    <h4 class="text-caption font-medium text-muted-foreground">{{ $t['steps'] }}</h4>
                                    <ol class="flex list-decimal flex-col gap-1 ps-5 text-body-sm text-foreground marker:text-muted-foreground">
                                        @foreach ((array) $m['steps'] as $step)<li>{{ $step }}</li>@endforeach
                                    </ol>
                                </div>
                            @endif
                            <div class="flex flex-col gap-1.5">
                                <h4 class="text-caption font-medium text-muted-foreground">{{ $t['details'] }}</h4>
                                <dl class="flex flex-col divide-y divide-border rounded-card bg-nq-surface">
                                    @foreach ($details as $d)
                                        <div class="flex items-center justify-between gap-3 px-3 py-2">
                                            <dt class="text-caption text-muted-foreground">{{ $d['label'] }}</dt>
                                            <dd class="flex min-w-0 items-center gap-1 text-body-sm text-foreground">
                                                <bdi dir="ltr" class="truncate font-mono">{{ $d['value'] }}</bdi>
                                                @if (($d['copyable'] ?? true) !== false)<x-nq::copy-button :value="$d['value']" :label="$t['copy'].': '.$d['label']" />@endif
                                            </dd>
                                        </div>
                                    @endforeach
                                </dl>
                            </div>
                            <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-body-sm">
                                <dt class="text-muted-foreground">{{ $t['amount'] }}</dt>
                                <dd class="text-end tabular-nums"><bdi dir="ltr">{{ $money($amount) }}</bdi></dd>
                                @if ($mi['fee'])
                                    <dt class="text-muted-foreground">{{ $t['feeRow'] }}</dt>
                                    <dd class="text-end tabular-nums"><bdi dir="ltr">{{ $money($mi['fee']) }}</bdi></dd>
                                @endif
                                <dt class="font-medium text-foreground">{{ $t['total'] }}</dt>
                                <dd class="text-end text-label font-semibold tabular-nums text-foreground"><bdi dir="ltr">{{ $money($mi['total']) }}</bdi></dd>
                            </dl>
                        </div>
                        @if (! empty($m['qr']))
                            <div class="flex flex-col items-center gap-1.5">
                                <x-nq::qr-code :value="$m['qr']" :size="132" :label="$t['scan'].': '.$m['name']" />
                                <span class="text-caption text-muted-foreground">{{ $t['scan'] }}</span>
                            </div>
                        @endif
                    </div>
                @endforeach

                <div class="grid gap-4 px-4">
                    <x-nq::field name="reference" x-model="refInvalid">
                        <x-nq::field.label>{{ $t['reference'] }}</x-nq::field.label>
                        <x-nq::field.input ltr autocomplete="off" x-model="reference" />
                        <x-nq::field.error><span x-text="refMessage"></span></x-nq::field.error>
                        <x-nq::field.description x-show="!refInvalid">{{ $t['referenceHint'] }}</x-nq::field.description>
                    </x-nq::field>
                    @if ($receiptRequired)
                        <x-nq::field x-model="receiptInvalid">
                            <x-nq::field.label>{{ $t['receipt'] }}</x-nq::field.label>
                            <x-nq::file-upload accept="image/*,application/pdf" :max-size="$maxReceiptSize" :max-files="1" :multiple="false" x-model="files" x-on:files="markDone($event)">{{ $t['receiptDrop'] }}</x-nq::file-upload>
                            <x-nq::field.error>{{ $t['problems']['receipt'] }}</x-nq::field.error>
                            <x-nq::field.description x-show="!receiptInvalid">{{ $t['receiptHint'] }}</x-nq::field.description>
                        </x-nq::field>
                    @endif
                    <p role="alert" x-show="error" x-text="error" x-cloak style="display: none" class="flex items-center gap-2 text-body-sm text-nq-danger-text"></p>
                </div>
                <div class="flex flex-wrap justify-end gap-2 px-4">
                    @if ($cancel)<x-nq::button type="button" variant="ghost" x-bind:disabled="busy" x-on:click="cancel()">{{ $t['cancel'] }}</x-nq::button>@endif
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="busy" x-bind:aria-busy="busy ? 'true' : null">{{ $t['submit'] }}</x-nq::button>
                </div>
            </form>
        @endif
    </div>
@endif
