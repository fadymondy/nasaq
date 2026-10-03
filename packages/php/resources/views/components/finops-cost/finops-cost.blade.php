{{-- <x-nq::finops-cost :servers="$servers" :items="$items" currency="USD" :previous-total="70" :budget="80" @add-item="$event.detail.wait(…)" @remove-item="$event.detail.wait(…)" @change-plan="$event.detail.wait(…)" />
     A cost page for the infrastructure: KPI tiles (monthly total against last month, servers, extra items, possible savings), a budget meter, a per-server table with price, CPU, memory and disk use and a rightsizing hint,
     a cost-by-category table, an optional history chart and a list of manual line items you can add and remove. Money uses the page locale with Latin digits; provider and plan names stay as text.
     servers: [['id', 'name', 'plan' => 'CPX31', 'region', 'monthlyPrice' => 15.4, 'usage' => ['cpu' => 12, 'memory' => 18, 'disk' => 40] (0 to 100), 'smallerPlan' => ['name', 'monthlyPrice'], 'largerPlan' => [...]]].
       Under 25% CPU and memory suggests the smaller plan, 85% CPU or memory (or 90% disk) the larger one.
     items: [['id', 'name', 'category', 'amount', 'period' => monthly | yearly | once]]. A yearly item counts a twelfth, a one-off item is listed but not counted.
     currency: ISO code (USD, or SAR in Arabic). previous-total: last month's total, adds the change on the total tile. budget: adds a meter and a warning from 90% (near) and over it.
     history: [['date' => '2026-09-27', 'cost' => 2.4]] adds a cost-over-time chart. add, remove, change-plan (all true): which controls to show. loading, error (a message), retry (adds Try again, fires "retry"), labels: array overriding the built-in words.
     It is presentational: it fires events on the root with detail { …, wait(promise) } and your handler talks to the server.
       add-item      detail { name, category, amount, period }; resolve, or resolve { id } for the new row's id, or resolve { error } shown in the dialog
       remove-item   detail { id } (after the confirm); resolve, or resolve { error } shown above the tables
       change-plan   detail { id, plan: { name, monthlyPrice } }; resolve, or resolve { error }. The server row then shows the new plan and no hint.
     A rejected promise, or nobody listening, shows a generic error. Both tables update their rows at once.
     Differences from the React component: the history chart is rendered on the server (it is a prop in React too, edits do not change it); the hint is two columns (a status and its text). The tiles, budget meter and category table recompute from the rows after every add, remove or plan change. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.metric-tiles._logic')
@props(['servers' => [], 'items' => [], 'currency' => null, 'previousTotal' => null, 'budget' => null, 'history' => [], 'add' => true, 'remove' => true, 'changePlan' => true, 'loading' => false, 'error' => null, 'retry' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $T = \Nasaq\Nasaq::class;
    $ar = str_starts_with($locale, 'ar');
    $L = fn (string $k, string $en, string $ar) => $labels[$k] ?? $T::t($en, $ar);
    $cur = strtoupper($currency ?? $T::currency($locale));
    $money = fn ($v) => $T::money($v, $cur, $locale);
    $round = fn ($v) => round($v * 100) / 100;
    $monthly = fn ($i) => ($i['period'] ?? 'monthly') === 'monthly' ? $i['amount'] : (($i['period'] ?? '') === 'yearly' ? $i['amount'] / 12 : 0);
    $servers = array_values((array) $servers);
    $items = array_values((array) $items);
    $serverTotal = $round(array_sum(array_column($servers, 'monthlyPrice')));
    $itemTotal = $round(array_sum(array_map($monthly, $items)));
    $total = $round($serverTotal + $itemTotal);
    $moneyFmt = ['style' => 'currency', 'currency' => $cur, 'maxFraction' => 2];

    $hintOf = function ($s) {
        $u = $s['usage'];
        $price = $s['monthlyPrice'];
        if ($u['cpu'] >= 85 || $u['memory'] >= 85 || $u['disk'] >= 90) {
            $plan = $s['largerPlan'] ?? null;
            return ['kind' => 'upsize', 'plan' => $plan, 'amount' => $plan ? max(0, $plan['monthlyPrice'] - $price) : 0];
        }
        if ($u['cpu'] < 25 && $u['memory'] < 25) {
            $plan = $s['smallerPlan'] ?? null;
            return ['kind' => 'downsize', 'plan' => $plan, 'amount' => $plan ? max(0, $price - $plan['monthlyPrice']) : 0];
        }
        return ['kind' => 'ok', 'plan' => null, 'amount' => 0];
    };
    $savings = 0;
    $serverRows = array_map(function ($s) use ($hintOf, $money, $L, &$savings) {
        $h = $hintOf($s);
        if ($h['kind'] === 'downsize') $savings += $h['amount'];
        $detail = match (true) {
            $h['kind'] === 'downsize' && $h['plan'] && $h['amount'] > 0 => str_replace(['{plan}', '{save}'], [$h['plan']['name'], $money($h['amount'])], $L('hintDownDetail', 'Move to {plan} and save {save} a month.', 'انتقل إلى {plan} ووفّر {save} شهريًا.')),
            $h['kind'] === 'downsize' => $L('hintDownGeneric', 'Use is low. A smaller plan would cost less.', 'الاستخدام منخفض. خطة أصغر ستكلف أقل.'),
            $h['kind'] === 'upsize' && $h['plan'] && $h['amount'] > 0 => str_replace(['{plan}', '{extra}'], [$h['plan']['name'], $money($h['amount'])], $L('hintUpDetail', 'Move to {plan} for {extra} more a month.', 'انتقل إلى {plan} مقابل {extra} إضافية شهريًا.')),
            $h['kind'] === 'upsize' => $L('hintUpGeneric', 'Use is high. Consider a bigger plan.', 'الاستخدام مرتفع. فكّر في خطة أكبر.'),
            default => '',
        };
        return [
            'id' => (string) $s['id'], 'name' => $s['name'], 'plan' => $s['plan'], 'region' => $s['region'] ?? '', 'planText' => $s['plan'].(! empty($s['region']) ? ' · '.$s['region'] : ''),
            'price' => $s['monthlyPrice'], 'cpu' => $s['usage']['cpu'], 'memory' => $s['usage']['memory'], 'disk' => $s['usage']['disk'],
            'hint' => $h['kind'], 'hintAmount' => $h['kind'] === 'downsize' ? $h['amount'] : 0, 'hintDetail' => $detail, 'changeTo' => $h['plan']['name'] ?? null, 'changeToPrice' => $h['plan']['monthlyPrice'] ?? null,
        ];
    }, $servers);
    $savings = $round($savings);
    $hasBudget = $budget !== null && $budget > 0;
    $budgetState = ! $hasBudget ? 'none' : ($total > $budget ? 'over' : ($total >= $budget * 0.9 ? 'near' : 'under'));

    $periodLabels = ['monthly' => $L('periodMonthly', 'Monthly', 'شهريًا'), 'yearly' => $L('periodYearly', 'Yearly', 'سنويًا'), 'once' => $L('periodOnce', 'One time', 'مرة واحدة')];
    $itemRows = array_map(fn ($i) => [
        'id' => (string) $i['id'], 'name' => $i['name'], 'category' => $i['category'] ?? '', 'period' => $i['period'] ?? 'monthly', 'amount' => $i['amount'],
        'monthly' => ($i['period'] ?? 'monthly') === 'once' ? null : $round($monthly($i)),
    ], $items);

    $categories = [];
    if ($serverTotal > 0) $categories[$L('serversCategory', 'Servers', 'الخوادم')] = $serverTotal;
    foreach ($items as $i) {
        $m = $monthly($i);
        if ($m <= 0) continue;
        $key = trim($i['category'] ?? '') ?: $L('uncategorised', 'Other', 'أخرى');
        $categories[$key] = $round(($categories[$key] ?? 0) + $m);
    }
    $categoryRows = [];
    foreach ($categories as $label => $value) $categoryRows[] = ['id' => (string) $label, 'label' => (string) $label, 'value' => $value];

    $ratio = $previousTotal === null ? null : nq_mt_change_ratio($total, $previousTotal);
    $trend = $ratio === null || (float) $ratio === 0.0 ? 'flat' : ($ratio > 0 ? 'up' : 'down');
    $tone = $trend === 'flat' ? 'neutral' : ($trend === 'up' ? 'negative' : 'positive');
    $toneText = ['positive' => 'text-nq-success-text', 'negative' => 'text-nq-danger-text', 'neutral' => 'text-muted-foreground'][$tone];
    $deltaText = $ratio === null ? '' : nq_mt_number($ratio, ['style' => 'percent', 'maxFraction' => 1], $locale);
    if ($ratio !== null && $ratio > 0 && ! str_starts_with($deltaText, '+')) $deltaText = '+'.$deltaText;
    $vs = $L('vsPrevious', 'vs last month', 'مقارنة بالشهر الماضي');
    $wasText = $previousTotal === null ? '' : $vs.' · '.($ar ? 'كانت' : 'was').' '.$money($previousTotal);
    $budgetFraction = $hasBudget ? $total / $budget : 0;
    $budgetTone = $budgetFraction >= 1 ? 'danger' : ($budgetFraction >= 0.9 ? 'warning' : 'default');
    $tileDefs = [['total', $L('total', 'Monthly total', 'الإجمالي الشهري'), $total], ['servers', $L('servers', 'Servers', 'الخوادم'), $serverTotal], ['items', $L('items', 'Extra items', 'بنود إضافية'), $itemTotal], ['savings', $L('savings', 'Possible savings', 'توفير ممكن'), $savings]];
    $catSorted = collect($categoryRows)->sortByDesc('value')->values()->all();
    $catTotal = array_sum(array_column($catSorted, 'value'));
    $catMax = $catSorted[0]['value'] ?? 0;
    $pctFmt = fn ($v) => nq_mt_number($v, ['style' => 'percent', 'maxFraction' => 1], $locale);

    $serverColumns = [
        ['id' => 'name', 'header' => $L('server', 'Server', 'الخادم'), 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'planText', 'header' => $L('plan', 'Plan', 'الخطة'), 'type' => 'mono', 'sortable' => true, 'searchable' => true],
        ['id' => 'price', 'header' => $L('price', 'Price', 'السعر').' / '.$L('perMonthShort', 'month', 'شهر'), 'type' => 'currency', 'currency' => $cur, 'sortable' => true, 'align' => 'end'],
        ['id' => 'cpu', 'header' => $L('cpu', 'CPU', 'المعالج'), 'type' => 'meter', 'sortable' => true, 'warnAt' => 0.85, 'dangerAt' => 0.95],
        ['id' => 'memory', 'header' => $L('memory', 'Memory', 'الذاكرة'), 'type' => 'meter', 'sortable' => true, 'warnAt' => 0.85, 'dangerAt' => 0.95],
        ['id' => 'disk', 'header' => $L('disk', 'Disk', 'القرص'), 'type' => 'meter', 'sortable' => true, 'warnAt' => 0.85, 'dangerAt' => 0.95],
        ['id' => 'hint', 'header' => $L('hint', 'Hint', 'اقتراح'), 'type' => 'status', 'sortable' => true, 'filter' => true, 'options' => [
            ['value' => 'ok', 'label' => $L('hintOk', 'Right size', 'حجم مناسب'), 'tone' => 'neutral'],
            ['value' => 'downsize', 'label' => $L('hintDown', 'Could be smaller', 'يمكن أن يكون أصغر'), 'tone' => 'success'],
            ['value' => 'upsize', 'label' => $L('hintUp', 'Needs more room', 'يحتاج مساحة أكبر'), 'tone' => 'warning'],
        ]],
        ['id' => 'hintDetail', 'header' => $L('hintDetail', 'Details', 'التفاصيل')],
    ];
    $serverActions = [];
    if ($changePlan) {
        $seen = [];
        foreach ($serverRows as $r) {
            if (! $r['changeTo'] || isset($seen[$r['hint'].'|'.$r['changeTo']])) continue;
            $seen[$r['hint'].'|'.$r['changeTo']] = true;
            $serverActions[] = [
                'id' => 'change-plan-'.count($serverActions),
                'label' => str_replace('{plan}', $r['changeTo'], $L('changePlan', 'Switch to {plan}', 'التحويل إلى {plan}')),
                'icon' => $r['hint'] === 'downsize' ? 'trending-down' : 'arrow-up-right',
                'visibleWhen' => ['all' => [['field' => 'changeTo', 'eq' => $r['changeTo']], ['field' => 'hint', 'eq' => $r['hint']]]],
            ];
        }
    }
    $itemColumns = [
        ['id' => 'name', 'header' => $L('itemName', 'Item', 'البند'), 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'category', 'header' => $L('itemCategory', 'Category', 'الفئة'), 'sortable' => true, 'searchable' => true],
        ['id' => 'period', 'header' => $L('itemPeriod', 'Billed', 'الفوترة'), 'type' => 'status', 'sortable' => true, 'options' => array_map(fn ($k) => ['value' => $k, 'label' => $periodLabels[$k], 'tone' => 'neutral'], array_keys($periodLabels))],
        ['id' => 'amount', 'header' => $L('itemAmount', 'Amount', 'المبلغ'), 'type' => 'currency', 'currency' => $cur, 'sortable' => true, 'align' => 'end'],
        ['id' => 'monthly', 'header' => $L('perMonthEquivalent', 'Per month', 'في الشهر'), 'type' => 'currency', 'currency' => $cur, 'sortable' => true, 'align' => 'end'],
    ];
    $itemActions = $remove ? [['id' => 'remove', 'label' => $L('remove', 'Remove', 'إزالة'), 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger']] : [];

    $config = [
        'servers' => $serverRows, 'items' => $itemRows, 'currency' => $cur, 'budget' => $hasBudget ? $budget : null, 'previousTotal' => $previousTotal,
        'labels' => [
            'genericError' => $L('genericError', 'That did not work. Try again.', 'لم تنجح العملية. حاول مرة أخرى.'),
            'nameRequired' => $L('nameRequired', 'Enter a name.', 'أدخل اسمًا.'),
            'amountInvalid' => $L('amountInvalid', 'Enter an amount greater than zero.', 'أدخل مبلغًا أكبر من صفر.'),
            'removeTitle' => $L('removeTitle', 'Remove {name}?', 'إزالة {name}؟'),
            'vsPrevious' => $L('vsPrevious', 'vs last month', 'مقارنة بالشهر الماضي'),
            'was' => $ar ? 'كانت' : 'was',
            'budgetOf' => $L('budgetOf', '{used} of {budget}', '{used} من {budget}'),
            'serversCategory' => $L('serversCategory', 'Servers', 'الخوادم'),
            'uncategorised' => $L('uncategorised', 'Other', 'أخرى'),
        ],
    ];
    $historyMetrics = [['id' => 'cost', 'label' => $L('cost', 'Cost', 'التكلفة'), 'aggregate' => 'sum', 'format' => $moneyFmt]];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'finops-cost') }}" x-data="nqFinopsCost(@js($config))" @if ($loading) aria-busy="true" @endif
    x-on:nq-data-table-action="onAction($event)"
    {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-6') }}>
    <header class="flex flex-col gap-1">
        <h2 class="text-h3 text-foreground">{{ $L('title', 'Costs', 'التكاليف') }}</h2>
        <p class="text-body-sm text-muted-foreground">{{ $L('description', 'What the servers and extra items cost each month.', 'ما تكلفه الخوادم والبنود الإضافية كل شهر.') }}</p>
    </header>

    <template x-if="notice">
        <x-nq::alert tone="danger" dismissible x-on:nq:dismiss="notice = null"><span x-text="notice"></span></x-nq::alert>
    </template>
    @if ($error)
        <x-nq::alert tone="danger">
            {{ is_string($error) ? $error : $L('genericError', 'That did not work. Try again.', 'لم تنجح العملية. حاول مرة أخرى.') }}
            @if ($retry)
                <x-slot:action>
                    <x-nq::button size="sm" variant="secondary" x-on:click="$el.dispatchEvent(new CustomEvent('retry', { bubbles: true }))">{{ $L('retry', 'Try again', 'حاول مرة أخرى') }}</x-nq::button>
                </x-slot:action>
            @endif
        </x-nq::alert>
    @endif

    @if ($loading)
        <x-nq::metric-tiles :metrics="[]" loading :locale="$locale" />
    @else
        <div data-slot="metric-tiles" role="group" aria-label="{{ $ar ? 'المؤشرات الرئيسية' : 'Key metrics' }}" class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3">
            @foreach ($tileDefs as [$tid, $tlabel, $tvalue])
                <div data-slot="stat-card" data-metric="{{ $tid }}" @if ($tid === 'total' && $previousTotal !== null) x-bind:data-trend="trend" x-bind:data-tone="tone" @endif class="flex flex-col gap-3 rounded-card border border-border bg-card px-4 py-4 text-card-foreground">
                    <div class="flex items-center gap-2">
                        <div data-slot="stat-card-label" class="min-w-0 truncate text-body-sm text-muted-foreground">{{ $tlabel }}</div>
                    </div>
                    <div class="flex items-end justify-between gap-3">
                        <div class="flex min-w-0 flex-col gap-1">
                            <div data-slot="stat-card-value" class="text-h2 leading-tight text-foreground tabular-nums">
                                <bdi data-slot="num" data-numeric="" class="tabular-nums" x-text="fmt({{ ['total' => 'total', 'servers' => 'serverTotal', 'items' => 'itemTotal', 'savings' => 'savings'][$tid] }})">{{ $money($tvalue) }}</bdi>
                            </div>
                            @if ($tid === 'total' && $previousTotal !== null)
                                <div data-slot="stat-card-delta" class="flex flex-wrap items-center gap-x-1.5 text-caption" x-show="delta !== null" @if ($ratio === null) style="display: none" @endif>
                                    <span class="inline-flex items-center gap-1 text-label" x-bind:class="toneText">
                                        <x-lucide-trending-up aria-hidden="true" class="size-3.5 shrink-0 rtl:-scale-x-100" x-show="trend === 'up'" :style="$trend === 'up' ? '' : 'display: none'" />
                                        <x-lucide-trending-down aria-hidden="true" class="size-3.5 shrink-0 rtl:-scale-x-100" x-show="trend === 'down'" :style="$trend === 'down' ? '' : 'display: none'" />
                                        <x-lucide-minus aria-hidden="true" class="size-3.5 shrink-0 rtl:-scale-x-100" x-show="trend === 'flat'" :style="$trend === 'flat' ? '' : 'display: none'" />
                                        <bdi data-slot="num" data-numeric="" class="tabular-nums" x-text="deltaText">{{ $deltaText }}</bdi>
                                    </span>
                                    <span class="text-muted-foreground" x-text="wasText">{{ $wasText }}</span>
                                </div>
                            @endif
                        </div>
                    </div>
                </div>
            @endforeach
        </div>
    @endif

    @if ($hasBudget)
        @php($meterId = 'nq-meter-'.substr(md5((string) $L('budget', 'Budget', 'الميزانية')), 0, 8))
        <x-nq::card data-slot="finops-budget" class="w-full">
            <x-nq::card.content class="flex flex-col gap-3">
                <div data-slot="meter" role="meter" aria-labelledby="{{ $meterId }}-label" aria-valuemin="0" aria-valuemax="{{ $budget }}"
                    x-bind:aria-valuenow="total" x-bind:aria-valuetext="pct(total / 100)" x-bind:data-tone="budgetTone" class="flex w-full flex-col gap-1.5">
                    <div data-slot="progress-head" class="flex items-baseline justify-between gap-3 text-body-sm">
                        <span id="{{ $meterId }}-label" class="text-label text-foreground">{{ $L('budget', 'Budget', 'الميزانية') }}</span>
                        <span aria-hidden="true" class="text-muted-foreground tabular-nums" x-text="budgetText">{{ str_replace(['{used}', '{budget}'], [$money($total), $money($budget)], $L('budgetOf', '{used} of {budget}', '{used} من {budget}')) }}</span>
                    </div>
                    <div data-slot="meter-track" class="relative block h-2 w-full overflow-hidden rounded-full bg-nq-surface-soft">
                        <div data-slot="meter-indicator" style="inset-inline-start:0;width:{{ round(max(0, min(1, $budgetFraction)) * 100, 4) }}%" x-bind:style="'inset-inline-start:0;width:' + budgetWidth + '%'"
                            x-bind:class="budgetTone === 'danger' ? 'bg-nq-danger' : (budgetTone === 'warning' ? 'bg-nq-warning' : 'bg-primary')"
                            class="block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none"></div>
                    </div>
                </div>
                <x-nq::alert tone="warning" x-show="budgetState === 'near'" :style="$budgetState === 'near' ? '' : 'display: none'">{{ $L('budgetNear', 'Close to the budget.', 'اقتربت من الميزانية.') }}</x-nq::alert>
                <x-nq::alert tone="danger" x-show="budgetState === 'over'" :style="$budgetState === 'over' ? '' : 'display: none'">{{ $L('budgetOver', 'Over the budget.', 'تجاوزت الميزانية.') }}</x-nq::alert>
            </x-nq::card.content>
        </x-nq::card>
    @endif

    @if (count($history) > 0)
        <x-nq::time-series-panel :title="$L('historyTitle', 'Cost over time', 'التكلفة عبر الزمن')" :description="$L('historyDescription', 'Daily cost.', 'التكلفة اليومية.')" :metrics="$historyMetrics" :data="$history" :locale="$locale" />
    @endif

    <x-nq::card data-slot="finops-servers" class="w-full">
        <x-nq::card.header>
            <x-nq::card.title as="h3">{{ $L('serversTitle', 'Servers', 'الخوادم') }}</x-nq::card.title>
            <x-nq::card.description>{{ $L('serversDescription', 'Price and average use per server. Hints come from CPU and memory use.', 'السعر ومتوسط الاستخدام لكل خادم. الاقتراحات مبنية على استخدام المعالج والذاكرة.') }}</x-nq::card.description>
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col gap-3">
            <x-nq::data-table x-model="serverRows" :label="$L('serversTable', 'Servers and their cost', 'الخوادم وتكلفتها')" :view-options="false" :columns="$serverColumns" :rows="$serverRows" :row-actions="$serverActions"
                :page-size="8" :loading="$loading" :labels="['search' => $L('searchServers', 'Search servers', 'بحث في الخوادم'), 'empty' => $L('serversEmpty', 'No servers yet', 'لا توجد خوادم بعد')]" />
        </x-nq::card.content>
    </x-nq::card>

    <div class="grid w-full gap-6 lg:grid-cols-2">
        <div data-slot="breakdown-table" @if ($loading) aria-busy="true" @endif class="flex w-full flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground">
            <x-nq::card.header>
                <x-nq::card.title as="h3">{{ $L('categoryTitle', 'Cost by category', 'التكلفة حسب الفئة') }}</x-nq::card.title>
                <x-nq::card.description>{{ $L('categoryDescription', 'Monthly cost grouped by kind.', 'التكلفة الشهرية مجمعة حسب النوع.') }}</x-nq::card.description>
            </x-nq::card.header>
            <x-nq::card.content class="px-0">
                @if ($loading)
                    <div class="flex flex-col gap-3 px-4">
                        @for ($i = 0; $i < 5; $i++)<x-nq::states.skeleton class="h-8 w-full" />@endfor
                    </div>
                @else
                    <p class="px-4 py-8 text-center text-body-sm text-muted-foreground" x-show="categories.length === 0" @if (count($catSorted) > 0) style="display: none" @endif>{{ $ar ? 'لا بيانات لهذه الفترة' : 'No data for this period' }}</p>
                    <div x-show="categories.length > 0" @if (count($catSorted) === 0) style="display: none" @endif>
                        {{-- An ARIA table of divs: a real <table> cannot hold an Alpine x-for template in every parser. --}}
                        <div data-slot="table-container" role="region" tabindex="0" aria-label="{{ $L('categoryTitle', 'Cost by category', 'التكلفة حسب الفئة') }}" class="relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                            <div role="table" data-slot="table" class="table w-full caption-bottom border-collapse text-body-sm">
                                <div role="rowgroup" data-slot="table-header" class="table-header-group">
                                    <div role="row" data-slot="table-row" class="table-row border-b border-border transition-colors duration-150 ease-nq hover:bg-nq-hover">
                                        <div role="columnheader" data-slot="table-head" class="table-cell h-row text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground px-4 py-3">{{ $L('category', 'Category', 'الفئة') }}</div>
                                        <div role="columnheader" data-slot="table-head" class="table-cell h-row text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground px-4 py-3 text-end">{{ $L('monthlyCost', 'Monthly cost', 'التكلفة الشهرية') }}</div>
                                        <div role="columnheader" data-slot="table-head" class="hidden h-row text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground px-4 py-3 text-end sm:table-cell">{{ $ar ? 'النسبة' : 'Share' }}</div>
                                    </div>
                                </div>
                                <div role="rowgroup" data-slot="table-body" class="table-row-group">
                                    @foreach ($catSorted as $ci => $row)
                                        <div role="row" data-slot="table-row" data-nq-ssr="" data-row="{{ $row['id'] }}" @if ($ci >= 8) style="display: none" @endif class="table-row border-b border-border transition-colors duration-150 ease-nq hover:bg-nq-hover">
                                            <div role="cell" data-slot="table-cell" class="table-cell h-row align-middle whitespace-nowrap px-4 py-3 min-w-40 max-w-0 sm:min-w-56">
                                                <span class="block truncate" dir="auto">{{ $row['label'] }}</span>
                                                <span aria-hidden="true" data-slot="breakdown-bar" class="mt-1.5 block h-1.5 rounded-full bg-nq-surface-soft">
                                                    <span class="block h-full rounded-full bg-[var(--bar)]" style="--bar: var(--primary); width: {{ round($catMax > 0 ? max(2, ($row['value'] / $catMax) * 100) : 0, 4) }}%"></span>
                                                </span>
                                            </div>
                                            <div role="cell" data-slot="table-cell" class="table-cell h-row align-middle whitespace-nowrap px-4 py-3 text-end tabular-nums"><bdi data-slot="num" data-numeric="" class="tabular-nums">{{ $money($row['value']) }}</bdi></div>
                                            <div role="cell" data-slot="table-cell" class="hidden h-row align-middle whitespace-nowrap px-4 py-3 text-end tabular-nums text-muted-foreground sm:table-cell"><bdi data-slot="num" data-numeric="" class="tabular-nums">{{ $pctFmt($catTotal > 0 ? $row['value'] / $catTotal : 0) }}</bdi></div>
                                        </div>
                                    @endforeach
                                    <template x-for="(row, i) in categories" :key="row.id">
                                        <div role="row" data-slot="table-row" x-bind:data-row="row.id" x-show="catAll || i < 8" class="table-row border-b border-border transition-colors duration-150 ease-nq hover:bg-nq-hover">
                                            <div role="cell" data-slot="table-cell" class="table-cell h-row align-middle whitespace-nowrap px-4 py-3 min-w-40 max-w-0 sm:min-w-56">
                                                <span class="block truncate" dir="auto" x-text="row.label"></span>
                                                <span aria-hidden="true" data-slot="breakdown-bar" class="mt-1.5 block h-1.5 rounded-full bg-nq-surface-soft">
                                                    <span class="block h-full rounded-full bg-[var(--bar)]" x-bind:style="'--bar: var(--primary); width: ' + row.width + '%'"></span>
                                                </span>
                                            </div>
                                            <div role="cell" data-slot="table-cell" class="table-cell h-row align-middle whitespace-nowrap px-4 py-3 text-end tabular-nums"><bdi data-slot="num" data-numeric="" class="tabular-nums" x-text="row.text"></bdi></div>
                                            <div role="cell" data-slot="table-cell" class="hidden h-row align-middle whitespace-nowrap px-4 py-3 text-end tabular-nums text-muted-foreground sm:table-cell"><bdi data-slot="num" data-numeric="" class="tabular-nums" x-text="row.share"></bdi></div>
                                        </div>
                                    </template>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-center px-4 pt-3" x-show="categories.length > 8" @if (count($catSorted) <= 8) style="display: none" @endif>
                        <x-nq::button size="sm" variant="ghost" x-on:click="catAll = ! catAll" x-bind:aria-expanded="String(catAll)"><span x-text="catAll ? @js($ar ? 'عرض أقل' : 'Show fewer') : @js($ar ? 'عرض الكل' : 'Show all') + ' ' + categories.length">{{ ($ar ? 'عرض الكل' : 'Show all').' '.count($catSorted) }}</span></x-nq::button>
                    </div>
                @endif
            </x-nq::card.content>
        </div>
        <x-nq::card data-slot="finops-items" class="w-full">
            <x-nq::card.header>
                <x-nq::card.title as="h3">{{ $L('itemsTitle', 'Extra items', 'بنود إضافية') }}</x-nq::card.title>
                <x-nq::card.description>{{ $L('itemsDescription', 'Costs that are not servers: domains, licences, backups, support.', 'تكاليف ليست خوادم: نطاقات وتراخيص ونسخ احتياطي ودعم.') }}</x-nq::card.description>
                @if ($add)
                    <x-nq::card.action>
                        <x-nq::button size="sm" variant="secondary" x-on:click="openAdd()">
                            <x-lucide-plus aria-hidden="true" />
                            {{ $L('addItem', 'Add item', 'إضافة بند') }}
                        </x-nq::button>
                    </x-nq::card.action>
                @endif
            </x-nq::card.header>
            <x-nq::card.content class="flex flex-col gap-3">
                <x-nq::data-table x-model="itemRows" :label="$L('itemsTable', 'Extra cost items', 'بنود التكلفة الإضافية')" :view-options="false" :columns="$itemColumns" :rows="$itemRows" :row-actions="$itemActions"
                    :page-size="8" :loading="$loading" :labels="['search' => $L('searchItems', 'Search items', 'بحث في البنود'), 'empty' => $L('itemsEmpty', 'No extra items', 'لا توجد بنود إضافية')]" />
            </x-nq::card.content>
        </x-nq::card>
    </div>

    @if ($add)
        <x-nq::dialog x-model="addOpen">
            <x-nq::dialog.content data-slot="finops-add-item" class="max-w-md">
                <form novalidate class="flex flex-col gap-4" x-on:submit.prevent="submitAdd()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title>{{ $L('addItemTitle', 'Add a cost item', 'إضافة بند تكلفة') }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $L('addItemBody', 'It counts towards the monthly total. A yearly item is divided by twelve; a one time item is listed but not counted.', 'يُحتسب ضمن الإجمالي الشهري. البند السنوي يُقسم على اثني عشر، والبند لمرة واحدة يُعرض دون احتسابه.') }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <template x-if="addError">
                        <x-nq::alert tone="danger"><span x-text="addError"></span></x-nq::alert>
                    </template>
                    <x-nq::field x-model="nameInvalid">
                        <x-nq::field.label>{{ $L('nameLabel', 'Name', 'الاسم') }}</x-nq::field.label>
                        <x-nq::field.input x-model="name" x-on:input="nameInvalid = false" placeholder="{{ $L('namePlaceholder', 'Domain renewal', 'تجديد النطاق') }}" autocomplete="off" />
                        <x-nq::field.error><span x-text="config.labels.nameRequired"></span></x-nq::field.error>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $L('categoryLabel', 'Category', 'الفئة') }}</x-nq::field.label>
                        <x-nq::field.input x-model="category" placeholder="{{ $L('categoryPlaceholder', 'Domains', 'النطاقات') }}" autocomplete="off" />
                    </x-nq::field>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <x-nq::field x-model="amountInvalid">
                            <x-nq::field.label>{{ $L('amountLabel', 'Amount', 'المبلغ') }}</x-nq::field.label>
                            <x-nq::field.input x-model="amount" x-on:input="amountInvalid = false" ltr inputmode="decimal" placeholder="12.00" autocomplete="off" />
                            <x-nq::field.error><span x-text="config.labels.amountInvalid"></span></x-nq::field.error>
                        </x-nq::field>
                        <x-nq::field>
                            <x-nq::field.label>{{ $L('periodLabel', 'Billed', 'الفوترة') }}</x-nq::field.label>
                            <x-nq::select value="monthly" x-model="period">
                                <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    @foreach ($periodLabels as $value => $text)
                                        <x-nq::select.item :value="$value">{{ $text }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                        </x-nq::field>
                    </div>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="addOpen = false" x-bind:disabled="adding ? '' : null">{{ $L('cancel', 'Cancel', 'إلغاء') }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:aria-busy="adding ? 'true' : null" x-bind:data-disabled="adding ? '' : null">
                            <x-nq::spinner x-show="adding" style="display: none" />
                            {{ $L('add', 'Add', 'إضافة') }}
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($remove)
        <x-nq::alert-dialog x-model="removeOpen">
            <x-nq::alert-dialog.content data-slot="finops-remove">
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><span x-text="removeTitle"></span></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description>{{ $L('removeBody', 'It stops counting towards the monthly total.', 'سيتوقف احتسابه ضمن الإجمالي الشهري.') }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel>{{ $L('cancel', 'Cancel', 'إلغاء') }}</x-nq::alert-dialog.cancel>
                    <x-nq::alert-dialog.action x-on:click="confirmRemove()">{{ $L('remove', 'Remove', 'إزالة') }}</x-nq::alert-dialog.action>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</div>
