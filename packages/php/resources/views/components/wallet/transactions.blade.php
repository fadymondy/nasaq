{{-- <x-nq::wallet.transactions :transactions="[['id' => 't1', 'type' => 'topup', 'amount' => 200, 'status' => 'completed', 'date' => '2026-03-05T10:30:00', 'description' => 'Top-up']]" currency="USD" />
     Transactions grouped by day with a money in / out filter. Signed amounts, a type icon and a status on every row.
     transactions: id, type (topup | payout | payment | refund | fee), signed amount, status (completed | pending | failed), date, description, reference.
     currency: ISO 4217 code (USD, or SAR in Arabic, when omitted). loading: skeletons. labels: array overriding the words.
     Needs the Alpine runtime (@nasaqScripts) for the filter. --}}
@include('nasaq::components.wallet._wallet')
@props(['transactions' => [], 'currency' => null, 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $currency ??= \Nasaq\Nasaq::currency($locale);
    $t = nq_wallet_strings($locale, $labels);
    $groups = nq_wallet_group_by_day(array_values($transactions));
    $dirOf = fn ($amount): string => $amount > 0 ? 'in' : ($amount < 0 ? 'out' : 'zero');
    $dirs = [];
    foreach ($groups as $g) {
        $dirs[$g['key']] = array_values(array_unique(array_map(fn ($tx) => $dirOf($tx['amount']), $g['items'])));
    }
    $icons = ['topup' => 'arrow-down-left', 'payout' => 'arrow-up-right', 'payment' => 'receipt', 'refund' => 'undo-2', 'fee' => 'rotate-ccw'];
    $typeLabel = ['topup' => $t['topup'], 'payout' => $t['payoutType'], 'payment' => $t['payment'], 'refund' => $t['refund'], 'fee' => $t['fee']];
    $statusLabel = ['completed' => $t['completed'], 'pending' => $t['pendingStatus'], 'failed' => $t['failed']];
    $tone = ['completed' => 'success', 'pending' => 'warning', 'failed' => 'danger'];
    $titleId = 'nq-wallet-'.substr(md5(json_encode($transactions).$locale), 0, 8);
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'wallet-transactions') }}" aria-labelledby="{{ $titleId }}" x-data="nqWalletTransactions(@js($dirs))"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="{{ $titleId }}" class="text-h3 text-foreground">{{ $t['transactions'] }}</h2>
        <x-nq::toggle-group :default-value="['all']" :aria-label="$t['filter']" x-model="dir">
            <x-nq::toggle-group.toggle value="all">{{ $t['all'] }}</x-nq::toggle-group.toggle>
            <x-nq::toggle-group.toggle value="in">{{ $t['incoming'] }}</x-nq::toggle-group.toggle>
            <x-nq::toggle-group.toggle value="out">{{ $t['outgoing'] }}</x-nq::toggle-group.toggle>
        </x-nq::toggle-group>
    </div>
    @if ($loading)
        <div class="flex flex-col gap-2" aria-busy="true">
            @for ($i = 0; $i < 3; $i++)
                <x-nq::states.skeleton class="h-14 w-full" />
            @endfor
        </div>
    @else
        <div x-show="empty" @if ($groups) style="display: none" @endif>
            <x-nq::states.empty icon="wallet-cards" :title="$t['emptyTitle']" :description="$t['emptyDescription']" />
        </div>
        @foreach ($groups as $group)
            <div class="flex flex-col gap-1" x-show="shown(@js($group['key']))">
                <h3 class="text-caption font-medium text-muted-foreground">{{ nq_wallet_day_label($group['date'], $t, $locale) }}</h3>
                <ul class="flex flex-col divide-y divide-border rounded-card bg-nq-surface">
                    @foreach ($group['items'] as $tx)
                        @php
                            $status = $tx['status'] ?? 'completed';
                            $amountClass = $status === 'failed' ? 'text-muted-foreground line-through' : ($tx['amount'] > 0 ? 'text-nq-success-text' : 'text-foreground');
                        @endphp
                        <li data-status="{{ $status }}" data-dir="{{ $dirOf($tx['amount']) }}" x-show="rowShown(@js($dirOf($tx['amount'])))" class="flex items-center gap-3 px-4 py-3">
                            <span aria-hidden="true" class="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground [&_svg]:size-4">
                                <x-dynamic-component :component="'lucide-'.($icons[$tx['type']] ?? 'receipt')" />
                            </span>
                            <div class="flex min-w-0 flex-1 flex-col">
                                <p class="truncate text-body-sm text-foreground">{{ $tx['description'] }}</p>
                                <p class="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
                                    <span>{{ $typeLabel[$tx['type']] ?? $tx['type'] }}</span>
                                    <x-nq::numeric.date-time :value="$tx['date']" date-style="none" time-style="short" :locale="$locale" />
                                    @if (! empty($tx['reference']))<bdi dir="ltr" class="font-mono">{{ $tx['reference'] }}</bdi>@endif
                                </p>
                            </div>
                            <div class="flex shrink-0 flex-col items-end gap-0.5">
                                <bdi data-slot="num" data-numeric="" class="tabular-nums {{ \Nasaq\Cn::merge('text-label', $amountClass) }}">{{ nq_wallet_money($tx['amount'], $currency, $locale, signed: true) }}</bdi>
                                @if ($status !== 'completed')
                                    <x-nq::status :tone="$tone[$status] ?? 'neutral'" class="text-caption">{{ $statusLabel[$status] ?? $status }}</x-nq::status>
                                @endif
                            </div>
                        </li>
                    @endforeach
                </ul>
            </div>
        @endforeach
    @endif
</section>
