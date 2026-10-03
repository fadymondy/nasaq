{{-- <x-nq::accounting-ledger.trial-balance :accounts="$accounts" :entries="$entries" currency="SAR" as-of="2026-09-30" can-select />
     Net debit and credit per account with the two totals, and a plain statement of whether they agree. Only posted entries count.
     accounts / entries: as in accounting-ledger.chart-of-accounts, amounts in integer minor units. currency: ISO 4217 (USD, or SAR in Arabic).
     as-of: ISO date, later entries are left out. include-zero keeps accounts with no movement. can-select makes the names buttons (event "nq-select-account").
     labels: override any built-in string by key. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['accounts' => [], 'entries' => [], 'currency' => null, 'asOf' => null, 'includeZero' => false, 'canSelect' => false, 'labels' => []])
@php
    $n = \Nasaq\Nasaq::class;
    $strings = [
        'trial' => $n::t('Trial balance', 'ميزان المراجعة'),
        'account' => $n::t('Account', 'الحساب'),
        'debit' => $n::t('Debit', 'مدين'),
        'credit' => $n::t('Credit', 'دائن'),
        'total' => $n::t('Total', 'الإجمالي'),
        'trialBalanced' => $n::t('Debits equal credits', 'المدين يساوي الدائن'),
        'trialOff' => $n::t('Debits and credits differ', 'المدين والدائن مختلفان'),
        'asOf' => $n::t('As of', 'حتى تاريخ'),
        'empty' => $n::t('No posted entries yet', 'لا توجد قيود مرحّلة بعد'),
        'emptyText' => $n::t('Post a journal entry and it shows here.', 'رحِّل قيد يومية وسيظهر هنا.'),
        'inCurrency' => $n::t('Amounts in', 'المبالغ بعملة'),
    ];
    $strings = array_merge($strings, $labels);
    $config = [
        'accounts' => array_values((array) $accounts), 'entries' => array_values((array) $entries), 'currency' => strtoupper($currency ?? $n::currency(app()->getLocale())),
        'locale' => $n::rtl() ? 'ar' : 'en', 'asOf' => $asOf, 'includeZero' => (bool) $includeZero, 't' => $strings,
    ];
    $th = 'px-3 py-2 text-start text-caption font-medium text-muted-foreground';
    $thNum = 'px-3 py-2 text-end text-caption font-medium text-muted-foreground';
    $td = 'px-3 py-2.5 text-body-sm text-foreground';
    $tdNum = 'px-3 py-2.5 text-end text-body-sm text-foreground tabular-nums';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'trial-balance') }}" x-data="nqAccountingTrial(@js($config))" {{ $attributes->except('data-slot')->cn('flex w-full min-w-0 flex-col gap-2') }}>
    <template x-if="tb.rows.length === 0">
        <x-nq::states.empty icon="scale" :title="$strings['empty']" :description="$strings['emptyText']" />
    </template>
    <div x-show="tb.rows.length > 0" class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
            <span>{{ $strings['inCurrency'] }} <bdi dir="ltr">{{ $config['currency'] }}</bdi></span>
            <span x-show="asOfText">{{ $strings['asOf'] }} <bdi x-text="asOfText"></bdi></span>
        </div>
        <div class="w-full overflow-x-auto rounded-card border border-border bg-card">
            <div role="table" class="table w-full min-w-[30rem] border-collapse">
                <div role="caption" class="sr-only">{{ $strings['trial'] }}</div>
                <div role="rowgroup" class="table-header-group border-b border-border">
                    <div role="row" class="table-row">
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $strings['account'] }}</div>
                        <div role="columnheader" dir="ltr" class="table-cell {{ $thNum }} w-36">{{ $strings['debit'] }}</div>
                        <div role="columnheader" dir="ltr" class="table-cell {{ $thNum }} w-36">{{ $strings['credit'] }}</div>
                    </div>
                </div>
                <div role="rowgroup" class="table-row-group divide-y divide-border">
                    <template x-for="row in tb.rows" :key="row.account.id">
                        <div role="row" data-slot="trial-row" class="table-row">
                            <div role="cell" class="table-cell {{ $td }}">
                                <div class="flex items-center gap-2">
                                    <bdi dir="ltr" class="text-caption tabular-nums text-muted-foreground" x-text="row.account.code"></bdi>
                                    @if ($canSelect)
                                        <button type="button" class="min-w-0 truncate text-start hover:underline" x-on:click="select(row.account)" x-text="row.account.name"></button>
                                    @else
                                        <span class="min-w-0 truncate" x-text="row.account.name"></span>
                                    @endif
                                </div>
                            </div>
                            <div role="cell" dir="ltr" class="table-cell {{ $tdNum }}" x-text="fig(row.debit, true)"></div>
                            <div role="cell" dir="ltr" class="table-cell {{ $tdNum }}" x-text="fig(row.credit, true)"></div>
                        </div>
                    </template>
                </div>
                <div role="rowgroup" class="table-footer-group border-t border-border">
                    <div role="row" class="table-row">
                        <div role="rowheader" class="table-cell {{ $td }} text-start font-medium">{{ $strings['total'] }}</div>
                        <div role="cell" dir="ltr" class="table-cell {{ $tdNum }} font-medium" x-text="fig(tb.debit)"></div>
                        <div role="cell" dir="ltr" class="table-cell {{ $tdNum }} font-medium" x-text="fig(tb.credit)"></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="flex items-center justify-end gap-2" aria-live="polite">
            <x-nq::badge variant="success" x-show="tb.balanced">{{ $strings['trialBalanced'] }}</x-nq::badge>
            <x-nq::badge variant="danger" x-show="!tb.balanced">{{ $strings['trialOff'] }}</x-nq::badge>
            <span x-show="!tb.balanced" class="text-label tabular-nums" x-text="fig(difference)"></span>
        </div>
    </div>
</div>
