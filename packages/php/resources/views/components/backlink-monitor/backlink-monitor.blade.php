{{-- <x-nq::backlink-monitor :links="$links" x-on:disavow="$event.detail.wait(Promise.resolve())" x-on:mark-safe="$event.detail.wait(Promise.resolve())" />
     Links pointing at your site: tiles for referring domains, live, new, lost and toxic links, a gained-versus-lost chart, and a table you can search and filter by status
     (new, live, lost, toxic). Toxic links get "Disavow" and "Mark as safe" in the row menu (and the row's context menu).
     links: [['id', 'sourceUrl' (the page that links to you), 'targetUrl' (your page), 'anchor', 'domainRating' (0..100), 'spamScore' (0..100, toxic from 60), 'firstSeen' (ISO date),
       'lostAt' (ISO date, once gone), 'followed' (false for nofollow), 'disavowed']].
     now: "now" for the new-this-week and chart windows (DateTime, ISO string or Unix time; default the current time). days: days on the chart (default 30). title, description: header text.
     page-size: rows per page (default 8; pagination shows only when there are more links). disavow, mark-safe (both true): which row actions exist. loading, error (a message), labels: array overriding the built-in words.
     It is presentational: row actions fire events on the root with detail { …, wait(promise) } and your handler talks to the server.
       disavow    detail.ids [id]    mark-safe    detail.id        resolve, or resolve { error } shown above the table. After success the card updates its own tiles and rows.
     A rejected promise, or nobody listening, shows a generic error.
     Differences from the React component: the gained/lost chart is drawn once and does not change with the row actions (they never move a link between days),
     and the rows are searched by domain and path, anchor and your page. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.backlink-monitor._logic')
@props(['links' => [], 'now' => null, 'days' => 30, 'title' => null, 'description' => null, 'pageSize' => 8, 'disavow' => true, 'markSafe' => true, 'loading' => false, 'error' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? [
        'title' => 'مراقب الروابط الخلفية', 'description' => 'الروابط التي تشير إلى موقعك: ما وصل وما اختفى وما يبدو ضارًا.', 'domains' => 'النطاقات المُحيلة', 'activeLinks' => 'روابط نشطة',
        'newLinks' => 'جديدة هذا الأسبوع', 'lostLinks' => 'روابط مفقودة', 'toxicLinks' => 'روابط سامة', 'chartTitle' => 'الروابط المكتسبة والمفقودة', 'gained' => 'مكتسبة', 'lost' => 'مفقودة',
        'source' => 'الصفحة المُحيلة', 'target' => 'صفحتك', 'anchor' => 'نص الرابط', 'rating' => 'تقييم النطاق', 'spam' => 'درجة السبام', 'seen' => 'أول ظهور', 'status' => 'الحالة',
        'statusNew' => 'جديد', 'statusLost' => 'مفقود', 'statusActive' => 'نشط', 'toxic' => 'سام', 'disavowed' => 'مُتبرَّأ منه', 'nofollow' => 'غير متابَع',
        'filter' => 'تصفية بالنطاق أو النص أو الصفحة…', 'empty' => 'لا روابط خلفية بعد', 'disavow' => 'التبرؤ من الرابط', 'markSafe' => 'تعيين كآمن',
        'failed' => 'تعذّر الحفظ. حاول مرة أخرى.', 'tableLabel' => 'الروابط الخلفية', 'noAnchor' => '(بلا نص)', 'group' => 'المؤشرات الرئيسية',
    ] : [
        'title' => 'Backlink monitor', 'description' => 'Links pointing at your site: what arrived, what disappeared and what looks harmful.', 'domains' => 'Referring domains', 'activeLinks' => 'Live links',
        'newLinks' => 'New this week', 'lostLinks' => 'Lost links', 'toxicLinks' => 'Toxic links', 'chartTitle' => 'Links gained and lost', 'gained' => 'Gained', 'lost' => 'Lost',
        'source' => 'Linking page', 'target' => 'Your page', 'anchor' => 'Anchor', 'rating' => 'Domain rating', 'spam' => 'Spam score', 'seen' => 'First seen', 'status' => 'Status',
        'statusNew' => 'New', 'statusLost' => 'Lost', 'statusActive' => 'Live', 'toxic' => 'Toxic', 'disavowed' => 'Disavowed', 'nofollow' => 'Nofollow',
        'filter' => 'Filter by domain, anchor or page…', 'empty' => 'No backlinks found yet', 'disavow' => 'Disavow', 'markSafe' => 'Mark as safe',
        'failed' => 'Could not save this. Try again.', 'tableLabel' => 'Backlinks', 'noAnchor' => '(no anchor)', 'group' => 'Key metrics',
    ], (array) $labels);
    $list = array_values(array_map(fn ($l) => array_filter((array) $l, fn ($v) => $v !== null), (array) $links));
    $clock = nq_bl_ms($now ?? \Illuminate\Support\Carbon::now());
    $summary = nq_bl_summary($list, $clock);
    $series = nq_bl_series($list, (int) $days, $clock);
    $config = [
        'links' => $list,
        'now' => $clock,
        'words' => ['locale' => $ar ? 'ar' : 'en'] + array_intersect_key($t, array_flip(['failed', 'noAnchor', 'toxic', 'disavowed', 'nofollow', 'statusNew', 'statusActive', 'statusLost'])),
    ];
    $tiles = [['domains', $t['domains']], ['active', $t['activeLinks']], ['new', $t['newLinks']], ['lost', $t['lostLinks']], ['toxic', $t['toxicLinks']]];
    $columns = [
        ['id' => 'source', 'header' => $t['source'], 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'anchor', 'header' => $t['anchor'], 'sortable' => true, 'searchable' => true],
        ['id' => 'target', 'header' => $t['target'], 'sortable' => true, 'searchable' => true],
        ['id' => 'rating', 'header' => $t['rating'], 'type' => 'number', 'sortable' => true, 'align' => 'end'],
        ['id' => 'spam', 'header' => $t['spam'], 'type' => 'number', 'sortable' => true, 'align' => 'end'],
        ['id' => 'seen', 'header' => $t['seen'], 'type' => 'date', 'sortable' => true],
        ['id' => 'status', 'header' => $t['status'], 'sortable' => true, 'filter' => true, 'options' => [
            ['value' => 'new', 'label' => $t['statusNew']], ['value' => 'active', 'label' => $t['statusActive']],
            ['value' => 'lost', 'label' => $t['statusLost']], ['value' => 'toxic', 'label' => $t['toxic']],
        ]],
    ];
    $actions = array_values(array_filter([
        $disavow ? ['id' => 'disavow', 'label' => $t['disavow'], 'icon' => 'shield-off', 'danger' => true] : null,
        $markSafe ? ['id' => 'safe', 'label' => $t['markSafe'], 'icon' => 'shield-check'] : null,
    ]));
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'backlink-monitor') }}" x-data="nqBacklinkMonitor({{ \Illuminate\Support\Js::from($config) }})" x-on:nq-data-table-action="onAction($event)"
    {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-6') }}>
    <x-nq::stat-card.grid data-slot="metric-tiles" role="group" aria-label="{{ $t['group'] }}" :aria-busy="$loading ? 'true' : null">
        @foreach ($tiles as [$field, $label])
            <x-nq::stat-card :label="$label" :locale="$locale" :loading="$loading" :data-metric="$field">
                <bdi data-slot="num" data-numeric class="tabular-nums" x-text="num(summary.{{ $field }})">{{ number_format($summary[$field], 0, '.', ',') }}</bdi>
            </x-nq::stat-card>
        @endforeach
    </x-nq::stat-card.grid>
    <x-nq::time-series-panel :title="$t['chartTitle']" :metrics="[['id' => 'gained', 'label' => $t['gained'], 'color' => 'var(--nq-success)'], ['id' => 'lost', 'label' => $t['lost'], 'color' => 'var(--nq-danger)']]"
        :data="$series" metric="gained" :compare="false" :loading="$loading" chart-class-name="h-48" :locale="$locale" />
    <x-nq::card>
        <x-nq::card.header>
            <x-nq::card.title as="h3">{{ $title ?? $t['title'] }}</x-nq::card.title>
            <x-nq::card.description>{{ $description ?? $t['description'] }}</x-nq::card.description>
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col gap-3">
            <x-nq::status tone="danger" role="alert" x-show="failed" style="display: none"><span x-text="failed"></span></x-nq::status>
            <x-nq::data-table x-model="tableRows" :label="$t['tableLabel']" name-key="domain" :columns="$columns" :rows="[]" :page-size="count($list) > $pageSize ? (int) $pageSize : 0"
                :search="$t['filter']" :view-options="false" :row-actions="$actions" actions-key="actions" :loading="$loading" :error="$error"
                :labels="['empty' => $t['empty']]">
                <x-slot name="cell_source">
                    <span class="flex min-w-0 flex-col">
                        <bdi dir="ltr" class="block max-w-[26ch] truncate text-label text-foreground" x-text="row.domain"></bdi>
                        <bdi dir="ltr" class="block max-w-[26ch] truncate text-caption text-muted-foreground" x-text="row.path"></bdi>
                    </span>
                </x-slot>
                <x-slot name="cell_anchor"><span dir="auto" class="block max-w-[18ch] truncate text-body-sm" x-text="row.anchor"></span></x-slot>
                <x-slot name="cell_target"><bdi dir="ltr" class="block max-w-[18ch] truncate text-caption text-muted-foreground" x-text="row.target"></bdi></x-slot>
                <x-slot name="cell_status">
                    <span class="flex flex-wrap items-center gap-1">
                        <x-nq::status tone="danger" x-show="row.tone === 'danger'" style="display: none"><span x-text="row.statusLabel"></span></x-nq::status>
                        <x-nq::status tone="success" x-show="row.tone === 'success'" style="display: none"><span x-text="row.statusLabel"></span></x-nq::status>
                        <x-nq::status tone="neutral" x-show="row.tone === 'neutral'" style="display: none"><span x-text="row.statusLabel"></span></x-nq::status>
                        <x-nq::badge variant="outline" x-show="row.badge === 'disavowed'" style="display: none"><span x-text="row.badgeLabel"></span></x-nq::badge>
                        <x-nq::badge variant="danger" x-show="row.badge === 'toxic'" style="display: none"><span x-text="row.badgeLabel"></span></x-nq::badge>
                        <x-nq::badge variant="outline" x-show="row.nofollow" style="display: none"><span x-text="row.nofollowLabel"></span></x-nq::badge>
                    </span>
                </x-slot>
            </x-nq::data-table>
        </x-nq::card.content>
    </x-nq::card>
</div>
