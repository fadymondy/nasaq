{{-- <x-nq::business-reports.profitability-report :format="['currency' => 'USD', 'maxFraction' => 0]" :rows="[['id' => 'p1', 'name' => 'Website rebuild', 'revenue' => 120000, 'cost' => 78000, 'hours' => 410]]" />
     Revenue, cost, profit and margin for a period, split by project, client or service. Margin is a number, a word (Loss, Thin, Healthy) and a small trend, so a loss never depends on colour.
     rows: id, name, revenue, cost, optional hours (adds a column) and marginTrend (a list of margins, oldest first, adds a trend column). format: the money format
     (currency (USD, or SAR in Arabic), compact, minFraction, maxFraction). subject-label: heading of the name column. thin-below: margins under this are Thin (0.15).
     row-actions: the data-table's list ([['id' => 'open', 'label' => 'Open', 'icon' => 'external-link']]); it opens as a ⋯ menu and a context menu on every row and dispatches the
     bubbling "nq-data-table-action" ({ action, row }). loading, error (string or true), labels: array overriding the built-in words.
     The table is the data-table: sortable by every column, 8 rows a page. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.business-reports._logic')
@props(['rows' => [], 'format' => [], 'subjectLabel' => null, 'thinBelow' => 0.15, 'rowActions' => [], 'loading' => false, 'error' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_br_words($locale, $labels);
    $list = array_values($rows);
    $revenue = array_sum(array_column($list, 'revenue'));
    $cost = array_sum(array_column($list, 'cost'));
    $profit = $revenue - $cost;
    $margin = nq_br_margin($revenue, $cost);
    $hasHours = (bool) array_filter($list, fn ($r) => isset($r['hours']));
    $hasTrend = (bool) array_filter($list, fn ($r) => ! empty($r['marginTrend']));
    $moneyFormat = $format + ['style' => 'currency'];
    $money = fn ($v, $sign = false) => nq_br_number($v, $moneyFormat, $locale, $sign);
    $percent = fn ($v) => nq_br_number($v, ['style' => 'percent', 'maxFraction' => 1], $locale);
    $cols = [
        ['id' => 'name', 'header' => $subjectLabel ?? $t['subject'], 'key' => 'name', 'sortable' => true, 'searchable' => true],
        ['id' => 'revenue', 'header' => $t['revenue'], 'key' => 'revenueText', 'sortKey' => 'revenue', 'sortable' => true, 'align' => 'end'],
        ['id' => 'cost', 'header' => $t['cost'], 'key' => 'costText', 'sortKey' => 'cost', 'sortable' => true, 'align' => 'end'],
        ['id' => 'profit', 'header' => $t['profit'], 'key' => 'profitText', 'sortKey' => 'profit', 'sortable' => true, 'align' => 'end'],
    ];
    if ($hasHours) {
        $cols[] = ['id' => 'hours', 'header' => $t['hours'], 'key' => 'hoursText', 'sortKey' => 'hours', 'sortable' => true, 'align' => 'end'];
    }
    $cols[] = ['id' => 'margin', 'header' => $t['margin'], 'key' => 'marginText', 'sortKey' => 'marginSort', 'sortable' => true, 'align' => 'end'];
    if ($hasTrend) {
        $cols[] = ['id' => 'trend', 'header' => $t['trend'], 'key' => 'id'];
    }
    $tableRows = array_map(function ($r) use ($money, $percent, $t, $thinBelow, $locale) {
        $m = nq_br_margin($r['revenue'], $r['cost']);

        return [
            'id' => (string) $r['id'], 'name' => $r['name'], 'revenue' => $r['revenue'], 'cost' => $r['cost'], 'profit' => $r['revenue'] - $r['cost'],
            'revenueText' => $money($r['revenue']), 'costText' => $money($r['cost']), 'profitText' => $money($r['revenue'] - $r['cost'], true),
            'hours' => $r['hours'] ?? 0, 'hoursText' => isset($r['hours']) ? nq_br_number($r['hours'], ['maxFraction' => 1], $locale) : '',
            'marginText' => $m === null ? $t['noRevenue'] : $percent($m), 'marginSort' => $m ?? -1000000, 'band' => $m === null ? '' : nq_br_band($m, (float) $thinBelow),
        ];
    }, $list);
    $segments = [
        ['id' => 'cost', 'label' => $t['cost'], 'value' => max(0, $cost), 'color' => 'var(--nq-warning)'],
        ['id' => 'profit', 'label' => $t['profit'], 'value' => max(0, $profit), 'color' => 'var(--nq-success)'],
    ];
    $bandIcon = ['loss' => 'arrow-down-right', 'thin' => 'triangle-alert', 'healthy' => 'circle-check'];
    $bandVariant = ['loss' => 'danger', 'thin' => 'warning', 'healthy' => 'success'];
    $errorText = is_string($error) ? $error : ($error ? \Nasaq\Nasaq::t('This could not be loaded.', 'تعذّر التحميل.') : null);
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'profitability-report') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <x-nq::stat-card.grid>
        <x-nq::stat-card :label="$t['revenue']" :value="$revenue" :format="$moneyFormat" :loading="$loading" :locale="$locale" />
        <x-nq::stat-card :label="$t['cost']" :value="$cost" :format="$moneyFormat" :loading="$loading" :locale="$locale" />
        <x-nq::stat-card :label="$t['profit']" :value="$profit" :format="$moneyFormat" :loading="$loading" :locale="$locale" />
        <x-nq::stat-card :label="$t['margin']" :value="$margin ?? 0" :format="['style' => 'percent', 'maxFraction' => 1]" :loading="$loading" :locale="$locale" />
    </x-nq::stat-card.grid>
    @if (! $loading && $revenue > 0)
        <div data-slot="profitability-breakdown" class="flex min-w-0 flex-col gap-3">
            <x-nq::chart-extras.segment-bar :label="$t['breakdown']" :segments="$segments" :total="$revenue" :legend="false" patterned :locale="$locale" />
            <ul data-slot="segment-bar-legend" class="grid gap-x-6 gap-y-1.5 text-body-sm [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
                @foreach ($segments as $s)
                    <li class="flex min-w-0 items-center gap-2">
                        <span aria-hidden="true" class="size-2.5 shrink-0 rounded-[2px]" style="background-color: {{ $s['color'] }}"></span>
                        <span class="min-w-0 flex-1 truncate text-muted-foreground">{{ $s['label'] }}</span>
                        <span class="tabular-nums text-foreground"><bdi dir="ltr">{{ $money($s['value']) }}</bdi></span>
                        <span class="w-12 text-end tabular-nums text-muted-foreground"><bdi dir="ltr">{{ nq_br_number($s['value'] / $revenue, ['style' => 'percent', 'maxFraction' => 0], $locale) }}</bdi></span>
                    </li>
                @endforeach
            </ul>
        </div>
    @endif
    <x-nq::data-table :label="$t['subject']" name-key="name" :columns="$cols" :rows="$tableRows" :page-size="8" :search="false" :view-options="false"
        :row-actions="$rowActions" :loading="$loading" :error="$errorText" :labels="['empty' => $t['empty']]" :locale="$locale">
        <x-slot name="cell_margin">
            <span class="inline-flex items-center justify-end gap-2">
                <bdi data-slot="num" data-numeric class="tabular-nums" x-text="row.marginText"></bdi>
                @foreach ($bandIcon as $band => $icon)
                    <x-nq::badge :variant="$bandVariant[$band]" x-show="row.band === `{{ $band }}`" style="display: none">
                        <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />
                        {{ $t['band'][$band] }}
                    </x-nq::badge>
                @endforeach
            </span>
        </x-slot>
        @if ($hasTrend)
            <x-slot name="cell_trend">
                @foreach ($list as $r)
                    @if (! empty($r['marginTrend']))
                        <span x-show="row.id === `{{ $r['id'] }}`" style="display: none">
                            <x-nq::chart-extras.trend-cell :data="$r['marginTrend']" :chart-label="$t['margin'].': '.$r['name']" :locale="$locale" />
                        </span>
                    @endif
                @endforeach
            </x-slot>
        @endif
    </x-nq::data-table>
</section>
