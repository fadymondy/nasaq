{{-- <x-nq::accounting-ledger.account-statement :account="$account" :entries="$entries" currency="SAR" :opening="0" />
     The movements of one account with a running balance on its normal side (debit for assets and expenses, credit for the rest).
     account: ['id', 'code', 'name', 'type']; entries: posted entries as in accounting-ledger.chart-of-accounts; amounts in integer minor units.
     opening: balance before the first row. currency: ISO 4217 (USD, or SAR in Arabic). labels: override any built-in string by key.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['account', 'entries' => [], 'currency' => null, 'opening' => 0, 'labels' => []])
@php
    $n = \Nasaq\Nasaq::class;
    $strings = [
        'statement' => $n::t('Account statement', 'كشف حساب'),
        'date' => $n::t('Date', 'التاريخ'),
        'number' => $n::t('Number', 'الرقم'),
        'memo' => $n::t('Memo', 'البيان'),
        'debit' => $n::t('Debit', 'مدين'),
        'credit' => $n::t('Credit', 'دائن'),
        'running' => $n::t('Running balance', 'الرصيد الجاري'),
        'balance' => $n::t('Balance', 'الرصيد'),
        'noMovements' => $n::t('No movements on this account', 'لا توجد حركات على هذا الحساب'),
        'inCurrency' => $n::t('Amounts in', 'المبالغ بعملة'),
        'asset' => $n::t('Asset', 'أصول'),
        'liability' => $n::t('Liability', 'التزامات'),
        'equity' => $n::t('Equity', 'حقوق ملكية'),
        'revenue' => $n::t('Revenue', 'إيرادات'),
        'expense' => $n::t('Expense', 'مصروفات'),
    ];
    $strings = array_merge($strings, $labels);
    $config = [
        'account' => $account, 'entries' => array_values((array) $entries), 'currency' => strtoupper($currency ?? $n::currency(app()->getLocale())),
        'locale' => $n::rtl() ? 'ar' : 'en', 'opening' => (int) $opening, 't' => $strings,
    ];
    $th = 'px-3 py-2 text-start text-caption font-medium text-muted-foreground';
    $thNum = 'px-3 py-2 text-end text-caption font-medium text-muted-foreground';
    $td = 'px-3 py-2.5 text-body-sm text-foreground';
    $tdNum = 'px-3 py-2.5 text-end text-body-sm text-foreground tabular-nums';
    $types = ['asset' => 'info', 'liability' => 'warning', 'equity' => 'neutral', 'revenue' => 'success', 'expense' => 'danger'];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'account-statement') }}" x-data="nqAccountingStatement(@js($config))" {{ $attributes->except('data-slot')->cn('flex w-full min-w-0 flex-col gap-2') }}>
    <div class="flex flex-wrap items-center gap-2">
        <bdi dir="ltr" class="text-caption tabular-nums text-muted-foreground">{{ $account['code'] }}</bdi>
        <h3 class="text-h3 text-foreground">{{ $account['name'] }}</h3>
        <x-nq::badge variant="{{ $types[$account['type']] ?? 'neutral' }}">{{ $strings[$account['type']] ?? $account['type'] }}</x-nq::badge>
        <span class="ms-auto text-caption text-muted-foreground">{{ $strings['inCurrency'] }} <bdi dir="ltr">{{ $config['currency'] }}</bdi></span>
    </div>
    <template x-if="rows.length === 0">
        <x-nq::states.empty :title="$strings['noMovements']" />
    </template>
    <div x-show="rows.length > 0" class="w-full overflow-x-auto rounded-card border border-border bg-card">
        <div role="table" class="table w-full min-w-[36rem] border-collapse">
            <div role="caption" class="sr-only">{{ $strings['statement'] }}: {{ $account['name'] }}</div>
            <div role="rowgroup" class="table-header-group border-b border-border">
                <div role="row" class="table-row">
                    <div role="columnheader" class="table-cell {{ $th }} w-32">{{ $strings['date'] }}</div>
                    <div role="columnheader" class="table-cell {{ $th }} w-28">{{ $strings['number'] }}</div>
                    <div role="columnheader" class="table-cell {{ $th }}">{{ $strings['memo'] }}</div>
                    <div role="columnheader" dir="ltr" class="table-cell {{ $thNum }} w-32">{{ $strings['debit'] }}</div>
                    <div role="columnheader" dir="ltr" class="table-cell {{ $thNum }} w-32">{{ $strings['credit'] }}</div>
                    <div role="columnheader" dir="ltr" class="table-cell {{ $thNum }} w-36">{{ $strings['running'] }}</div>
                </div>
            </div>
            <div role="rowgroup" class="table-row-group divide-y divide-border">
                <div role="row" x-show="opening !== 0" class="table-row text-muted-foreground">
                    <div role="cell" class="table-cell {{ $td }}">{{ $strings['balance'] }}</div>
                    <div role="cell" class="table-cell {{ $td }}"></div>
                    <div role="cell" class="table-cell {{ $td }}"></div>
                    <div role="cell" class="table-cell {{ $td }}"></div>
                    <div role="cell" class="table-cell {{ $td }}"></div>
                    <div role="cell" dir="ltr" class="table-cell {{ $tdNum }}" x-text="fig(opening)"></div>
                </div>
                <template x-for="(r, i) in rows" :key="r.entryId + '-' + i">
                    <div role="row" data-slot="statement-row" class="table-row">
                        <div role="cell" class="table-cell {{ $td }}"><bdi x-text="date(r.date)"></bdi></div>
                        <div role="cell" class="table-cell {{ $td }}"><bdi dir="ltr" class="tabular-nums" x-text="r.number"></bdi></div>
                        <div role="cell" class="table-cell {{ $td }} max-w-64 truncate" x-text="r.memo"></div>
                        <div role="cell" dir="ltr" class="table-cell {{ $tdNum }}" x-text="fig(r.debit, true)"></div>
                        <div role="cell" dir="ltr" class="table-cell {{ $tdNum }}" x-text="fig(r.credit, true)"></div>
                        <div role="cell" dir="ltr" class="table-cell {{ $tdNum }} font-medium"><span x-text="fig(r.balance)"></span><span class="sr-only"> {{ $strings[in_array($account['type'], ['asset', 'expense'], true) ? 'debit' : 'credit'] }}</span></div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</div>
