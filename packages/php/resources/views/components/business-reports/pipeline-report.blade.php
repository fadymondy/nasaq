{{-- <x-nq::business-reports.pipeline-report :format="['currency' => 'USD', 'compact' => true]" :stages="[['id' => 'lead', 'label' => 'Leads', 'count' => 240, 'value' => 960000], ['id' => 'won', 'label' => 'Won', 'count' => 24, 'value' => 210000, 'won' => true]]" />
     The sales pipeline stage by stage. The chart view is a funnel with the conversion between stages; the table view has the same figures with value and average deal. Both are one toggle apart and read from the same data.
     stages: id, label, count, value, won (the stage whose count is the deals won). format: the money format (currency (USD, or SAR in Arabic), compact, minFraction, maxFraction).
     view: "chart" (default) or "table", the view it opens in. stage-actions: the table rows' menu ([['id' => 'open', 'label' => 'Open', 'icon' => 'external-link']]), opened by the ⋯ button, right-click,
     long press or Shift+F10, dispatching the bubbling "nq-data-table-action" ({ action, row }). Switching view dispatches a bubbling "nq-view" ({ view }).
     loading, labels: array overriding the built-in words. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.business-reports._logic')
@props(['stages' => [], 'format' => [], 'view' => 'chart', 'stageActions' => [], 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_br_words($locale, $labels);
    $stages = array_values($stages);
    $view = $view === 'table' ? 'table' : 'chart';
    $moneyFormat = $format + ['style' => 'currency'];
    $money = fn ($v) => nq_br_number($v, $moneyFormat, $locale);
    $percent = fn ($v) => nq_br_number($v, ['style' => 'percent', 'maxFraction' => 0], $locale);
    $won = null;
    foreach ($stages as $s) {
        if (! empty($s['won'])) {
            $won = $s;
            break;
        }
    }
    $rows = nq_br_pipeline_rows($stages);
    $cols = [
        ['id' => 'stage', 'header' => $t['stage'], 'key' => 'stage', 'sortKey' => 'order', 'sortable' => true],
        ['id' => 'count', 'header' => $t['deals'], 'key' => 'countText', 'sortKey' => 'count', 'sortable' => true, 'align' => 'end'],
        ['id' => 'value', 'header' => $t['value'], 'key' => 'valueText', 'sortKey' => 'value', 'sortable' => true, 'align' => 'end'],
        ['id' => 'average', 'header' => $t['average'], 'key' => 'averageText', 'sortKey' => 'average', 'sortable' => true, 'align' => 'end'],
        ['id' => 'prev', 'header' => $t['fromPrevious'], 'key' => 'prevText', 'sortKey' => 'prev', 'sortable' => true, 'align' => 'end'],
        ['id' => 'first', 'header' => $t['fromFirst'], 'key' => 'firstText', 'sortKey' => 'first', 'sortable' => true, 'align' => 'end'],
    ];
    $tableRows = array_map(fn ($r, $i) => [
        'id' => (string) $r['stage']['id'], 'stage' => $r['stage']['label'], 'order' => $i,
        'count' => $r['stage']['count'], 'countText' => nq_br_number($r['stage']['count'], ['maxFraction' => 0], $locale),
        'value' => $r['stage']['value'], 'valueText' => $money($r['stage']['value']),
        'average' => $r['average'], 'averageText' => $money($r['average']),
        'prev' => $r['fromPrevious'], 'prevText' => $percent($r['fromPrevious']),
        'first' => $r['fromFirst'], 'firstText' => $percent($r['fromFirst']),
    ], $rows, array_keys($rows));
    $steps = array_map(fn ($s) => ['id' => $s['id'], 'label' => $s['label'], 'count' => $s['count']], $stages);
    $labelId = 'pipeline-view-'.\Illuminate\Support\Str::random(4);
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'pipeline-report') }}" x-data="nqPipelineReport(`{{ $view }}`)" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <x-nq::stat-card.grid>
        <x-nq::stat-card :label="$t['pipelineValue']" :value="$stages[0]['value'] ?? 0" :format="$moneyFormat" :loading="$loading" :locale="$locale" />
        <x-nq::stat-card :label="$t['winRate']" :value="nq_br_win_rate($stages)" :format="['style' => 'percent', 'maxFraction' => 1]" :loading="$loading" :locale="$locale" />
        <x-nq::stat-card :label="$t['won']" :value="$won['value'] ?? 0" :format="$moneyFormat" :loading="$loading" :locale="$locale" />
    </x-nq::stat-card.grid>
    <div class="flex items-center justify-end gap-2">
        <span id="{{ $labelId }}" class="text-caption text-muted-foreground">{{ $t['view'] }}</span>
        <x-nq::toggle-group :aria-labelledby="$labelId" :default-value="[$view]" x-model="view">
            <x-nq::toggle-group.toggle value="chart">{{ $t['chart'] }}</x-nq::toggle-group.toggle>
            <x-nq::toggle-group.toggle value="table">{{ $t['table'] }}</x-nq::toggle-group.toggle>
        </x-nq::toggle-group>
    </div>
    <div data-view="chart" x-show="current === `chart`" @if ($view !== 'chart') style="display: none" @endif>
        <x-nq::card class="w-full">
            <x-nq::card.content class="pt-4">
                <x-nq::chart-extras.funnel-steps :label="$t['deals']" :steps="$steps" :locale="$locale" />
            </x-nq::card.content>
        </x-nq::card>
    </div>
    <div data-view="table" x-show="current === `table`" @if ($view !== 'table') style="display: none" @endif>
        <x-nq::data-table :label="$t['deals']" name-key="stage" :columns="$cols" :rows="$tableRows" :search="false" :view-options="false"
            :row-actions="$stageActions" :loading="$loading" :labels="['empty' => $t['empty']]" :locale="$locale" />
    </div>
</section>
