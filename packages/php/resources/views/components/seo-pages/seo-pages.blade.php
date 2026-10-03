{{-- <x-nq::seo-pages :pages="$pages" openable x-on:open-page="show($event.detail.url)" x-on:recrawl="$event.detail.wait(fetch(...))" x-on:request-indexing="$event.detail.wait(fetch(...))" />
     The SEO pages table (React SeoPageList): each crawled page with its 0 to 100 score meter, open issues by severity, index status, Core Web Vitals (LCP, INP, CLS) and last crawl,
     sortable, searchable and filterable by index status. It opens sorted by score, worst first. The checklist of one page is <x-nq::seo-pages.checklist>.
     pages: [['id', 'url', 'title' (optional), 'indexStatus' (indexed | not-indexed | blocked | pending), 'issues' => [['id', 'code', 'severity' (error | warning | info), 'fixed', 'detail']],
       'vitals' => ['LCP' (ms), 'INP' (ms), 'CLS'], 'lastCrawled' (DateTime, ISO string or Unix time)]].
     title, description: header text. page-size: rows per page (default 8; pagination shows only when there are more pages). loading, error (a message), labels: array overriding the built-in words.
     openable: add "View issues" to the row menu and make rows activatable (default false: the "Open page" action, which opens the URL in a new tab, is always there).
     recrawl, request-indexing (both true): which row actions exist; "Request indexing" only shows for pages that are pending or not indexed.
     It is presentational: row actions fire events on the root and your handler talks to the server.
       open-page          detail { id, url }                    (no wait)
       recrawl            detail { id, url, wait(promise) }     request-indexing   detail { id, url, wait(promise) }
     Resolve the promise, or resolve { error } to show the message above the table. A rejected promise, or nobody listening, shows a generic error. While an action runs for a page the same action is ignored.
     Differences from the React component: the row menu cannot grey out an action while it runs (a second click is ignored instead), and `catalog` is not a prop here (the list only counts issues).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['pages' => [], 'title' => null, 'description' => null, 'pageSize' => 8, 'openable' => false, 'recrawl' => true, 'requestIndexing' => true, 'loading' => false, 'error' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? [
        'pagesTitle' => 'الصفحات', 'pagesDescription' => 'كل صفحة تم زحفها مع درجة SEO والمشكلات المفتوحة وحالة الفهرسة ومؤشرات الويب الأساسية.',
        'page' => 'الصفحة', 'score' => 'الدرجة', 'issues' => 'المشكلات', 'index' => 'حالة الفهرسة', 'vitals' => 'المؤشرات', 'crawled' => 'آخر زحف', 'filter' => 'تصفية الصفحات…',
        'empty' => 'لم يتم زحف أي صفحة بعد', 'noIssues' => 'لا مشكلات', 'indexed' => 'مفهرسة', 'not-indexed' => 'غير مفهرسة', 'blocked' => 'محجوبة', 'pending' => 'قيد الانتظار',
        'viewIssues' => 'عرض المشكلات', 'recrawl' => 'زحف مرة أخرى', 'requestIndexing' => 'طلب الفهرسة', 'openPage' => 'فتح الصفحة', 'actionsFailed' => 'تعذّر إكمال هذا. حاول مرة أخرى.',
        'errors1' => 'خطأ واحد', 'errorsN' => '{n} أخطاء', 'warnings1' => 'تحذير واحد', 'warningsN' => '{n} تحذيرات', 'notices1' => 'ملاحظة واحدة', 'noticesN' => '{n} ملاحظات',
        'good' => 'جيدة', 'fair' => 'مقبولة', 'poor' => 'ضعيفة', 'scoreOf' => 'درجة SEO {n} من 100', 'noVitals' => 'لا بيانات ميدانية',
        'ratingGood' => 'جيد', 'ratingNeeds' => 'يحتاج تحسينًا', 'ratingPoor' => 'ضعيف',
    ] : [
        'pagesTitle' => 'Pages', 'pagesDescription' => 'Every crawled page with its SEO score, open issues, index status and Core Web Vitals.',
        'page' => 'Page', 'score' => 'Score', 'issues' => 'Issues', 'index' => 'Index status', 'vitals' => 'Vitals', 'crawled' => 'Last crawled', 'filter' => 'Filter pages…',
        'empty' => 'No pages crawled yet', 'noIssues' => 'No issues', 'indexed' => 'Indexed', 'not-indexed' => 'Not indexed', 'blocked' => 'Blocked', 'pending' => 'Pending',
        'viewIssues' => 'View issues', 'recrawl' => 'Crawl again', 'requestIndexing' => 'Request indexing', 'openPage' => 'Open page', 'actionsFailed' => 'Could not complete this. Try again.',
        'errors1' => '1 error', 'errorsN' => '{n} errors', 'warnings1' => '1 warning', 'warningsN' => '{n} warnings', 'notices1' => '1 notice', 'noticesN' => '{n} notices',
        'good' => 'Good', 'fair' => 'Fair', 'poor' => 'Poor', 'scoreOf' => 'SEO score {n} of 100', 'noVitals' => 'No field data',
        'ratingGood' => 'good', 'ratingNeeds' => 'needs improvement', 'ratingPoor' => 'poor',
    ], (array) $labels);
    $list = array_values(array_map(function ($p) {
        $p = (array) $p;
        $p['issues'] = array_values(array_map(fn ($i) => array_filter((array) $i, fn ($v) => $v !== null), (array) ($p['issues'] ?? [])));
        $p['vitals'] = array_filter((array) ($p['vitals'] ?? []), fn ($v) => $v !== null) ?: null;
        $at = $p['lastCrawled'] ?? null;
        $p['lastCrawled'] = $at === null ? null : ($at instanceof \DateTimeInterface ? \Carbon\Carbon::instance($at) : (is_numeric($at) ? \Carbon\Carbon::createFromTimestamp($at) : \Carbon\Carbon::parse($at)))->toIso8601String();

        return array_filter($p, fn ($v) => $v !== null);
    }, (array) $pages));
    $config = [
        'pages' => $list,
        'can' => ['open' => (bool) $openable, 'recrawl' => (bool) $recrawl, 'index' => (bool) $requestIndexing],
        'locale' => $ar ? 'ar' : 'en',
        'words' => ['failed' => $t['actionsFailed'], 'LCP' => 'LCP', 'INP' => 'INP', 'CLS' => 'CLS'] + array_intersect_key($t, array_flip([
            'good', 'fair', 'poor', 'errors1', 'errorsN', 'warnings1', 'warningsN', 'notices1', 'noticesN', 'scoreOf', 'indexed', 'not-indexed', 'blocked', 'pending', 'ratingGood', 'ratingNeeds', 'ratingPoor',
        ])),
    ];
    $statuses = ['indexed', 'pending', 'not-indexed', 'blocked'];
    $columns = [
        ['id' => 'page', 'header' => $t['page'], 'key' => 'page', 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'score', 'header' => $t['score'], 'key' => 'score', 'type' => 'number', 'sortable' => true],
        ['id' => 'issues', 'header' => $t['issues'], 'key' => 'total', 'type' => 'number', 'sortable' => true],
        ['id' => 'index', 'header' => $t['index'], 'key' => 'index', 'sortable' => true, 'filter' => true, 'options' => array_map(fn ($s) => ['value' => $s, 'label' => $t[$s]], $statuses)],
        ['id' => 'vitals', 'header' => $t['vitals'], 'key' => 'vitals'],
        ['id' => 'crawled', 'header' => $t['crawled'], 'key' => 'crawled', 'type' => 'datetime', 'format' => 'relative', 'sortable' => true, 'align' => 'end'],
    ];
    $actions = array_values(array_filter([
        $openable ? ['id' => 'issues', 'label' => $t['viewIssues'], 'icon' => 'list-checks', 'group' => 'open'] : null,
        ['id' => 'open', 'label' => $t['openPage'], 'icon' => 'external-link', 'group' => 'open'],
        $recrawl ? ['id' => 'recrawl', 'label' => $t['recrawl'], 'icon' => 'refresh-cw', 'group' => 'crawl', 'disabledWhen' => ['field' => 'busyCrawl', 'eq' => true]] : null,
        $requestIndexing ? ['id' => 'index', 'label' => $t['requestIndexing'], 'icon' => 'send', 'group' => 'crawl', 'disabledWhen' => ['field' => 'busyIndex', 'eq' => true]] : null,
    ]));
@endphp
<x-nq::card data-slot="{{ $attributes->get('data-slot', 'seo-page-list') }}" x-data="nqSeoPages({{ \Illuminate\Support\Js::from($config) }})" x-on:nq-data-table-action="onAction($event)"
    x-on:nq-data-table-row-click="onRowClick($event)" {{ $attributes->except('data-slot') }}>
    <x-nq::card.header>
        <x-nq::card.title as="h3">{{ $title ?? $t['pagesTitle'] }}</x-nq::card.title>
        <x-nq::card.description>{{ $description ?? $t['pagesDescription'] }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <p role="alert" class="text-body-sm text-nq-danger-text" x-show="notice" x-text="notice" style="display: none"></p>
        <x-nq::data-table x-model="tableRows" :label="$t['pagesTitle']" name-key="page" :columns="$columns" :rows="[]" :page-size="count($list) > $pageSize ? (int) $pageSize : 0"
            :search="$t['filter']" :view-options="false" :row-actions="$actions" actions-key="actions" :row-click="(bool) $openable" :loading="$loading" :error="$error"
            :labels="['empty' => $t['empty']]">
            <x-slot name="cell_page">
                <div class="flex min-w-0 max-w-[32ch] flex-col sm:max-w-[44ch]">
                    <span dir="auto" class="truncate text-label text-foreground" x-show="row.hasTitle" style="display: none" x-text="row.title"></span>
                    <bdi dir="ltr" class="block truncate text-caption text-muted-foreground" x-text="row.url"></bdi>
                </div>
            </x-slot>
            <x-slot name="cell_score">
                <div class="flex w-24 flex-col gap-1" x-bind:data-band="row.band">
                    <span class="text-label font-semibold" x-bind:class="row.band === 'good' ? 'text-nq-success-text' : (row.band === 'fair' ? 'text-nq-warning-text' : 'text-nq-danger-text')">
                        <bdi data-slot="num" data-numeric class="tabular-nums" x-text="row.scoreText"></bdi> <span class="text-caption font-normal text-muted-foreground" x-text="row.bandLabel"></span>
                    </span>
                    <div data-slot="meter" role="meter" aria-valuemin="0" aria-valuemax="100" x-bind:aria-valuenow="row.score" x-bind:aria-valuetext="row.scoreText" x-bind:aria-label="row.scoreLabel"
                        x-bind:data-tone="row.band === 'good' ? 'success' : (row.band === 'fair' ? 'warning' : 'danger')" class="flex w-full flex-col gap-1.5">
                        <div data-slot="meter-track" class="relative block w-full overflow-hidden rounded-full bg-nq-surface-soft h-1">
                            <div data-slot="meter-indicator" x-bind:style="'inset-inline-start:0;width:' + row.score + '%'"
                                class="block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none"
                                x-bind:class="row.band === 'good' ? 'bg-nq-success' : (row.band === 'fair' ? 'bg-nq-warning' : 'bg-nq-danger')"></div>
                        </div>
                    </div>
                </div>
            </x-slot>
            <x-slot name="cell_issues">
                <x-nq::status tone="success" x-show="row.clean" style="display: none">{{ $t['noIssues'] }}</x-nq::status>
                <div class="flex flex-wrap gap-1" x-show="! row.clean" style="display: none">
                    <x-nq::badge variant="danger" x-show="row.hasErrors" style="display: none"><span x-text="row.errorsText"></span></x-nq::badge>
                    <x-nq::badge variant="warning" x-show="row.hasWarnings" style="display: none"><span x-text="row.warningsText"></span></x-nq::badge>
                    <x-nq::badge variant="info" x-show="row.hasInfo" style="display: none"><span x-text="row.infoText"></span></x-nq::badge>
                </div>
            </x-slot>
            <x-slot name="cell_index">
                <x-nq::status tone="success" x-show="row.index === 'indexed'" style="display: none"><span x-text="row.indexLabel"></span></x-nq::status>
                <x-nq::status tone="warning" x-show="row.index === 'not-indexed'" style="display: none"><span x-text="row.indexLabel"></span></x-nq::status>
                <x-nq::status tone="danger" x-show="row.index === 'blocked'" style="display: none"><span x-text="row.indexLabel"></span></x-nq::status>
                <x-nq::status tone="info" x-show="row.index === 'pending'" style="display: none"><span x-text="row.indexLabel"></span></x-nq::status>
            </x-slot>
            <x-slot name="cell_vitals">
                <span class="text-caption text-muted-foreground" x-show="row.noVitals" style="display: none">{{ $t['noVitals'] }}</span>
                <div class="flex flex-wrap gap-1" x-show="! row.noVitals" style="display: none">
                    <template x-for="v in row.vitals" x-bind:key="v.id">
                        <span>
                            <x-nq::badge variant="success" x-show="v.rating === 'good'" x-bind:title="v.title" style="display: none"><bdi x-text="v.text"></bdi></x-nq::badge>
                            <x-nq::badge variant="warning" x-show="v.rating === 'needs-improvement'" x-bind:title="v.title" style="display: none"><bdi x-text="v.text"></bdi></x-nq::badge>
                            <x-nq::badge variant="danger" x-show="v.rating === 'poor'" x-bind:title="v.title" style="display: none"><bdi x-text="v.text"></bdi></x-nq::badge>
                        </span>
                    </template>
                </div>
            </x-slot>
        </x-nq::data-table>
    </x-nq::card.content>
</x-nq::card>
