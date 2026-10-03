{{-- <x-nq::social-composer.metrics-table :rows="[['id' => 'p1', 'platform' => 'x', 'account' => '@nasaq', 'text' => 'Launch day', 'status' => 'published', 'publishedAt' => '2026-09-20', 'impressions' => 12400, 'likes' => 310, 'reposts' => 51]]" />
     Totals and a sortable per-post table of impressions, engagements and rate, for the posts a composer sent. Needs the Alpine runtime (@nasaqScripts).
     rows: ['id', 'platform' => x | bluesky | threads | linkedin | facebook | instagram | tiktok, 'account', 'text', 'status' => draft | queued | published | failed, 'publishedAt' => ISO date,
       'impressions', 'likes', 'replies', 'reposts', 'clicks']. Totals and the table count published posts only. The table opens sorted by impressions, highest first.
     summary: the totals above the table (true). row-actions: [['id' => 'open', 'label' => 'Open']] opens the more menu and the row context menu (events: nq-data-table-action { action, row }).
     row-click: rows become activatable (nq-data-table-row-click { row }). loading, locale, labels: override any string of the English table below. The default slot replaces the empty text. --}}
@props(['rows' => [], 'summary' => true, 'rowActions' => [], 'rowClick' => false, 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $locale ??= $ar ? 'ar' : str_replace('_', '-', app()->getLocale());
    $ar = str_starts_with($locale, 'ar');
    $en = [
        'table' => 'Post metrics', 'platform' => 'Platform', 'post' => 'Post', 'status' => 'Status', 'published' => 'Published', 'impressions' => 'Impressions',
        'engagements' => 'Engagements', 'rate' => 'Engagement rate', 'posts' => 'Published posts', 'empty' => 'No posts yet.',
        'statuses' => ['draft' => 'Draft', 'queued' => 'Queued', 'published' => 'Published', 'failed' => 'Failed'],
    ];
    $arabic = [
        'table' => 'أداء المنشورات', 'platform' => 'المنصة', 'post' => 'المنشور', 'status' => 'الحالة', 'published' => 'تاريخ النشر', 'impressions' => 'مرات الظهور',
        'engagements' => 'التفاعلات', 'rate' => 'معدل التفاعل', 'posts' => 'منشورات منشورة', 'empty' => 'لا منشورات بعد.',
        'statuses' => ['draft' => 'مسودة', 'queued' => 'في الانتظار', 'published' => 'منشور', 'failed' => 'فشل'],
    ];
    $base = $ar ? $arabic : $en;
    $t = array_merge($base, (array) $labels);
    $t['statuses'] = array_merge($base['statuses'], (array) ($labels['statuses'] ?? []));
    $names = ['x' => 'X', 'bluesky' => 'Bluesky', 'threads' => 'Threads', 'linkedin' => 'LinkedIn', 'facebook' => 'Facebook', 'instagram' => 'Instagram', 'tiktok' => 'TikTok'];
    $number = function ($n, array $o = []) use ($locale) {
        $style = ($o['percent'] ?? false) ? \NumberFormatter::PERCENT : \NumberFormatter::DECIMAL;
        if (! class_exists(\NumberFormatter::class)) {
            return ($o['percent'] ?? false) ? round($n * 100, 1).'%' : (string) $n;
        }
        $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', $style);
        if ($o['percent'] ?? false) {
            $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, 1);
        }
        if ($o['compact'] ?? false) {
            $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::DECIMAL);
            $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, 1);
            if ($n >= 1000000) { return $f->format($n / 1000000).'M'; }
            if ($n >= 1000) { return $f->format($n / 1000).'K'; }
        }

        return $f->format($n);
    };
    $engagements = fn (array $r) => ($r['likes'] ?? 0) + ($r['replies'] ?? 0) + ($r['reposts'] ?? 0) + ($r['clicks'] ?? 0);
    $rateOf = fn (array $r) => ! empty($r['impressions']) ? $engagements($r) / $r['impressions'] : null;
    $rows = array_map(fn ($r) => (array) $r, (array) $rows);
    $published = array_values(array_filter($rows, fn ($r) => ($r['status'] ?? '') === 'published'));
    $totImpressions = array_sum(array_map(fn ($r) => $r['impressions'] ?? 0, $published));
    $totEngagements = array_sum(array_map($engagements, $published));
    $totRate = $totImpressions ? $totEngagements / $totImpressions : null;
    usort($rows, fn ($a, $b) => ($b['impressions'] ?? -1) <=> ($a['impressions'] ?? -1));
    $list = array_map(function ($r) use ($names, $number, $engagements, $rateOf, $t) {
        $isPub = ($r['status'] ?? '') === 'published';
        $rate = $rateOf($r);

        return [
            'id' => $r['id'], 'platformLabel' => $names[$r['platform']] ?? $r['platform'], 'account' => $r['account'] ?? '', 'text' => $r['text'] ?? '',
            'platformSearch' => ($names[$r['platform']] ?? $r['platform']).' '.($r['account'] ?? '').' '.($r['text'] ?? ''),
            'status' => $r['status'], 'publishedAt' => $r['publishedAt'] ?? null,
            'impressions' => $r['impressions'] ?? null, 'impressionsText' => isset($r['impressions']) ? $number($r['impressions']) : '—',
            'engagements' => $isPub ? $engagements($r) : null, 'engagementsText' => $isPub ? $number($engagements($r)) : '—',
            'rate' => $rate, 'rateText' => $rate === null ? '—' : $number($rate, ['percent' => true]),
            'label' => ($names[$r['platform']] ?? $r['platform']).' '.mb_substr($r['text'] ?? '', 0, 30),
        ];
    }, $rows);
    $tones = ['draft' => 'neutral', 'queued' => 'info', 'published' => 'success', 'failed' => 'danger'];
    $cols = [
        ['id' => 'platform', 'header' => $t['platform'], 'key' => 'platformLabel', 'sortable' => true, 'searchable' => true],
        ['id' => 'post', 'header' => $t['post'], 'key' => 'text', 'searchable' => true],
        ['id' => 'status', 'header' => $t['status'], 'type' => 'status', 'sortable' => true,
            'options' => array_map(fn ($k) => ['value' => $k, 'label' => $t['statuses'][$k], 'tone' => $tones[$k]], array_keys($tones))],
        ['id' => 'published', 'header' => $t['published'], 'key' => 'publishedAt', 'type' => 'date', 'sortable' => true],
        ['id' => 'impressions', 'header' => $t['impressions'], 'key' => 'impressionsText', 'sortKey' => 'impressions', 'sortable' => true, 'align' => 'end'],
        ['id' => 'engagements', 'header' => $t['engagements'], 'key' => 'engagementsText', 'sortKey' => 'engagements', 'sortable' => true, 'align' => 'end'],
        ['id' => 'rate', 'header' => $t['rate'], 'key' => 'rateText', 'sortKey' => 'rate', 'sortable' => true, 'align' => 'end'],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'social-metrics') }}" {{ $attributes->except('data-slot')->cn('flex w-full min-w-0 flex-col gap-3') }}>
    @if ($summary)
        <x-nq::stat-card.grid>
            <x-nq::stat-card :label="$t['posts']" :value="count($published)" :locale="$locale" />
            <x-nq::stat-card :label="$t['impressions']" :value="$totImpressions" :format="['compact' => true]" :locale="$locale" />
            <x-nq::stat-card :label="$t['engagements']" :value="$totEngagements" :format="['compact' => true]" :locale="$locale" />
            <x-nq::stat-card :label="$t['rate']" :locale="$locale">{{ $totRate === null ? '—' : $number($totRate, ['percent' => true]) }}</x-nq::stat-card>
        </x-nq::stat-card.grid>
    @endif
    <x-nq::data-table :label="$t['table']" :columns="$cols" :rows="$list" :search="false" :view-options="false" :row-actions="$rowActions" :row-click="$rowClick" :loading="$loading" :locale="$locale"
        :labels="['empty' => $t['empty']]">
        <x-slot name="cell_platform">
            <div class="flex min-w-0 flex-col">
                <span class="font-medium" x-text="row.platformLabel"></span>
                <bdi class="truncate text-caption text-muted-foreground" x-show="row.account" x-text="row.account"></bdi>
            </div>
        </x-slot>
        <x-slot name="empty">{{ $slot->isEmpty() ? $t['empty'] : $slot }}</x-slot>
    </x-nq::data-table>
</div>
