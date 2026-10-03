{{-- <x-nq::loyalty-promo.visit-history :visits="$visits" currency="USD" :row-actions="[['id' => 'again', 'label' => 'Book again', 'icon' => 'repeat']]" @nq-data-table-action="again($event.detail.row)" />
     A customer's visits with totals up top (count, total spend, average visit, last visit) and a sortable, searchable table.
     visits: [['id', 'date' (ISO), 'place', 'spend' (minor units), 'points', 'status' => completed|no-show|cancelled]]. currency: USD, or SAR in Arabic.
     row-actions: [['id', 'label', 'icon'?, 'danger'?]] opens the table's actions menu; choosing one fires "nq-data-table-action" { action, row } on the root.
     loading: skeleton, labels: override any built-in string by key, locale. The table shows the visit's day (not the time). Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.loyalty-promo._logic')
@props(['visits' => [], 'currency' => null, 'rowActions' => [], 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_loyalty_words($locale, (array) $labels);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency());
    $money = ['style' => 'currency', 'currency' => $code];
    $tone = ['completed' => 'success', 'no-show' => 'danger', 'cancelled' => 'neutral'];
    $list = array_values(array_map(fn ($v) => (array) $v, (array) $visits));
    $done = array_values(array_filter($list, fn ($v) => $v['status'] === 'completed'));
    $total = array_sum(array_map(fn ($v) => $v['spend'], $done));
    $average = count($done) ? (int) floor(($total * 2 + count($done)) / (count($done) * 2)) : 0;
    $last = null;
    foreach ($done as $v) {
        if ($last === null || strtotime((string) $v['date']) > strtotime((string) $last['date'])) {
            $last = $v;
        }
    }
    $rows = array_map(fn ($v) => [
        'id' => $v['id'], 'date' => substr((string) $v['date'], 0, 10), 'place' => $v['place'], 'spend' => nq_loyalty_major($v['spend'], $code),
        'points' => $v['points'], 'status' => $v['status'],
    ], $list);
    $columns = [
        ['id' => 'date', 'header' => $t['date'], 'type' => 'date', 'sortable' => true],
        ['id' => 'place', 'header' => $t['place'], 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'spend', 'header' => $t['spend'], 'type' => 'currency', 'currency' => $code, 'align' => 'end', 'sortable' => true],
        ['id' => 'points', 'header' => $t['earned'], 'type' => 'number', 'align' => 'end', 'sortable' => true],
        ['id' => 'status', 'header' => $t['statusCol'], 'type' => 'status', 'sortable' => true, 'filter' => true,
            'options' => array_map(fn ($s) => ['value' => $s, 'label' => $t['visitStatus'][$s], 'tone' => $tone[$s]], ['completed', 'no-show', 'cancelled'])],
    ];
    $id = 'nq-visits-'.substr(md5(json_encode($list)), 0, 8);
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'visit-history') }}" aria-labelledby="{{ $id }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
    <h2 id="{{ $id }}" class="text-h3 text-foreground">{{ $t['visits'] }}</h2>
    <x-nq::stat-card.grid>
        <x-nq::stat-card :label="$t['visitCount']" :value="count($done)" :loading="$loading" :locale="$locale" />
        <x-nq::stat-card :label="$t['totalSpend']" :value="nq_loyalty_major($total, $code)" :format="$money" :loading="$loading" :locale="$locale" />
        <x-nq::stat-card :label="$t['average']" :value="nq_loyalty_major($average, $code)" :format="$money" :loading="$loading" :locale="$locale" />
        <x-nq::stat-card :label="$t['lastVisit']" :loading="$loading" :locale="$locale">
            @if ($last)<x-nq::numeric.date-time :value="$last['date']" date-style="medium" :locale="$locale" />@else—@endif
        </x-nq::stat-card>
    </x-nq::stat-card.grid>
    <x-nq::data-table :label="$t['visitLabel']" :columns="$columns" :rows="$rows" name-key="place" :page-size="8" :search="true" :row-actions="$rowActions" :loading="$loading" :locale="$locale">
        <x-slot:empty><x-nq::states.empty icon="award" :title="$t['noVisits']" :description="$t['noVisitsHint']" class="border-0" /></x-slot:empty>
    </x-nq::data-table>
</section>
