{{-- <x-nq::keyword-tracker :keywords="$keywords" :position-history="$history" :locations="[['value' => 'sa', 'label' => 'Saudi Arabia']]" x-on:add-keywords="$event.detail.wait(Promise.resolve())" />
     Rank tracking: tiles for tracked keywords, average position, top 10 and visibility; the ranking distribution and the position history; the biggest movers; a keyword
     table with change arrows, best, trend, ranking URL (editable), volume, difficulty and SERP features; and a competitor comparison. Position is lower-is-better everywhere.
     keywords: [['id', 'keyword', 'position' (null = not in the top 100), 'previousPosition' (null = was not ranking, leave out when unknown), 'history' => [9, 8, null, 4], 'best', 'url', 'volume', 'difficulty' (0..100),
       'features' => ['snippet' | 'paa' | 'images' | 'video' | 'local' | 'sitelinks' | 'reviews' | 'ads']]].
     position-history: [['date' => '2026-09-27', 'position' => 7.4, 'top10' => 3], …] for the history chart (without it the chart is left out). competitors: [['id', 'domain', 'you' => true, 'ranks' => ['k1' => 4, 'k2' => null]]]
       adds a Competitors tab. locations: [['value', 'label']] offered in the add dialog (without any the add button is hidden). default-location: the one chosen first.
     add, remove, refresh, update (all true): which actions exist; add also needs locations. openable (false): rows open on click and the row menu gets "Open the results".
     page-size: rows per page (default 8; pagination shows only when there are more keywords). loading, error (a message), labels: array overriding the built-in words.
     It is presentational: actions fire events on the root with detail { …, wait(promise) } and your handler talks to the server. Resolve, or resolve { error } (shown above the table, or in the dialog).
       add-keywords       detail { keywords: [text], location, device ('desktop' | 'mobile') }; resolve { keywords: [rows] } to add the new rows to the table
       remove-keywords    detail { ids }            refresh-keywords   detail { ids } (empty = every keyword)
       update-keyword     detail { id, patch: { url } }, from editing the ranking URL cell        open-keyword   detail { keyword } (no wait)
     A rejected promise, or nobody listening, shows a generic error.
     Differences from the React component: the position history chart is drawn once and does not change with the table, the table opens sorted by position, and an empty ranking URL shows an empty cell.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['keywords' => [], 'positionHistory' => null, 'competitors' => null, 'locations' => [], 'defaultLocation' => null, 'add' => true, 'remove' => true, 'refresh' => true, 'update' => true, 'openable' => false,
    'pageSize' => 8, 'loading' => false, 'error' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? [
        'tracked' => 'الكلمات المتابَعة', 'avgPosition' => 'متوسط الترتيب', 'inTop10' => 'ضمن أول 10', 'visibility' => 'الظهور', 'comparison' => 'مقابل الفحص السابق',
        'distributionTitle' => 'توزيع الترتيب', 'distributionDescription' => 'عدد الكلمات في كل شريحة من نتائج البحث.',
        'bucketTop3' => 'أول 3', 'bucketTop10' => 'من 4 إلى 10', 'bucketTop100' => 'من 11 إلى 100', 'bucketUnranked' => 'خارج الترتيب', 'bucketCount' => '{label}: {n} كلمة، {share}',
        'historyTitle' => 'سجل الترتيب', 'historyDescription' => 'متوسط ترتيب الكلمات المصنّفة عبر الزمن.', 'avgPositionShort' => 'متوسط الترتيب', 'inTop10Short' => 'ضمن أول 10',
        'moversTitle' => 'أكبر التغيّرات', 'gainers' => 'صعدت', 'losers' => 'هبطت', 'noMovers' => 'لا تغيّر بعد',
        'keywordsTitle' => 'الكلمات المفتاحية', 'keywordsDescription' => 'ترتيب كل كلمة في النتائج وكيف تحرّك وما يمكن أن تجلبه.', 'keyword' => 'الكلمة', 'position' => 'الترتيب', 'best' => 'الأفضل',
        'trend' => 'الاتجاه', 'url' => 'الرابط في النتائج', 'volume' => 'حجم البحث', 'volumePerMonth' => 'عمليات البحث شهريًا', 'difficulty' => 'الصعوبة', 'features' => 'ميزات النتائج',
        'filter' => 'تصفية الكلمات…', 'empty' => 'لا كلمات متابَعة', 'notRanking' => 'خارج أول 100', 'up' => 'صعود {n}', 'down' => 'هبوط {n}', 'same' => 'بلا تغيير', 'newRank' => 'جديد', 'lostRank' => 'فُقد',
        'easy' => 'سهلة', 'medium' => 'متوسطة', 'hard' => 'صعبة',
        'snippet' => 'مقتطف', 'paa' => 'أسئلة ذات صلة', 'images' => 'صور', 'video' => 'فيديو', 'local' => 'الخريطة المحلية', 'sitelinks' => 'روابط فرعية', 'reviews' => 'تقييمات', 'ads' => 'إعلانات',
        'add' => 'إضافة كلمات', 'refresh' => 'فحص الآن', 'refreshRow' => 'فحص مرة أخرى', 'openSerp' => 'فتح النتائج', 'remove' => 'إيقاف المتابعة',
        'removeOne' => 'إيقاف متابعة هذه الكلمة؟', 'removeMany' => 'إيقاف متابعة {n} كلمات؟', 'removeBody' => 'يُحفظ سجلها 30 يومًا إن أعدت إضافتها.', 'cancel' => 'إلغاء',
        'actionFailed' => 'تعذّر إكمال هذا. حاول مرة أخرى.',
        'addTitle' => 'إضافة كلمات', 'addBody' => 'كلمة في كل سطر أو مفصولة بفواصل. يتم فحصها للموقع والجهاز اللذين تختارهما.', 'keywordsLabel' => 'الكلمات', 'keywordsPlaceholder' => "مكونات ريأكت عربية\nنظام تصميم نسق",
        'locationLabel' => 'الموقع', 'deviceLabel' => 'الجهاز', 'desktop' => 'سطح المكتب', 'mobile' => 'الجوال', 'countNone' => 'لا كلمات بعد', 'countOne' => 'كلمة واحدة', 'countMany' => '{n} كلمات',
        'keywordsRequired' => 'أضف كلمة واحدة على الأقل.', 'addSubmitOne' => 'إضافة الكلمة', 'addSubmitMany' => 'إضافة {n} كلمات',
        'competitorsTitle' => 'المنافسون', 'competitorsDescription' => 'أين تصنَّف أنت ومنافسوك للكلمات نفسها.', 'domain' => 'النطاق', 'you' => 'أنت', 'avgPos' => 'متوسط الترتيب', 'top10Count' => 'أول 10', 'share' => 'الظهور',
        'matrixTitle' => 'كلمة بكلمة', 'aheadOne' => 'كلمة واحدة متقدمة عليك', 'aheadMany' => '{n} كلمات متقدمة عليك', 'tabKeywords' => 'الكلمات', 'tabCompetitors' => 'المنافسون', 'noCompetitors' => 'لم تُضَف منافسات',
        'lowerIsBetter' => 'الأقل أفضل', 'was' => 'كانت', 'urlInvalid' => '/path أو https://…', 'group' => 'المؤشرات الرئيسية',
    ] : [
        'tracked' => 'Tracked keywords', 'avgPosition' => 'Average position', 'inTop10' => 'In the top 10', 'visibility' => 'Visibility', 'comparison' => 'vs previous check',
        'distributionTitle' => 'Ranking distribution', 'distributionDescription' => 'How many keywords sit in each band of the results.',
        'bucketTop3' => 'Top 3', 'bucketTop10' => '4 to 10', 'bucketTop100' => '11 to 100', 'bucketUnranked' => 'Not ranking', 'bucketCount' => '{label}: {n} keywords, {share}',
        'historyTitle' => 'Position history', 'historyDescription' => 'Average position of ranked keywords over time.', 'avgPositionShort' => 'Avg. position', 'inTop10Short' => 'In top 10',
        'moversTitle' => 'Biggest movers', 'gainers' => 'Gained', 'losers' => 'Lost', 'noMovers' => 'No movement yet',
        'keywordsTitle' => 'Keywords', 'keywordsDescription' => "Each keyword's position in the results, how it moved and what it could bring.", 'keyword' => 'Keyword', 'position' => 'Position', 'best' => 'Best',
        'trend' => 'Trend', 'url' => 'Ranking URL', 'volume' => 'Volume', 'volumePerMonth' => 'Searches a month', 'difficulty' => 'Difficulty', 'features' => 'SERP features',
        'filter' => 'Filter keywords…', 'empty' => 'No keywords tracked', 'notRanking' => 'Not in top 100', 'up' => 'Up {n}', 'down' => 'Down {n}', 'same' => 'No change', 'newRank' => 'New', 'lostRank' => 'Lost',
        'easy' => 'Easy', 'medium' => 'Medium', 'hard' => 'Hard',
        'snippet' => 'Snippet', 'paa' => 'People also ask', 'images' => 'Images', 'video' => 'Video', 'local' => 'Local pack', 'sitelinks' => 'Sitelinks', 'reviews' => 'Reviews', 'ads' => 'Ads',
        'add' => 'Add keywords', 'refresh' => 'Check now', 'refreshRow' => 'Check again', 'openSerp' => 'Open the results', 'remove' => 'Stop tracking',
        'removeOne' => 'Stop tracking this keyword?', 'removeMany' => 'Stop tracking {n} keywords?', 'removeBody' => 'Its history is kept for 30 days in case you add it back.', 'cancel' => 'Cancel',
        'actionFailed' => 'Could not complete this. Try again.',
        'addTitle' => 'Add keywords', 'addBody' => 'One keyword per line, or separated by commas. They are checked for the location and device you pick.', 'keywordsLabel' => 'Keywords', 'keywordsPlaceholder' => "rtl react components\nnasaq design system",
        'locationLabel' => 'Location', 'deviceLabel' => 'Device', 'desktop' => 'Desktop', 'mobile' => 'Mobile', 'countNone' => 'No keywords yet', 'countOne' => '1 keyword', 'countMany' => '{n} keywords',
        'keywordsRequired' => 'Add at least one keyword.', 'addSubmitOne' => 'Add keyword', 'addSubmitMany' => 'Add {n} keywords',
        'competitorsTitle' => 'Competitors', 'competitorsDescription' => 'Where you and your competitors rank for the same keywords.', 'domain' => 'Domain', 'you' => 'You', 'avgPos' => 'Avg. position', 'top10Count' => 'Top 10', 'share' => 'Visibility',
        'matrixTitle' => 'Keyword by keyword', 'aheadOne' => '1 keyword ahead of you', 'aheadMany' => '{n} keywords ahead of you', 'tabKeywords' => 'Keywords', 'tabCompetitors' => 'Competitors', 'noCompetitors' => 'No competitors added',
        'lowerIsBetter' => 'Lower is better', 'was' => 'was', 'urlInvalid' => '/path or https://…', 'group' => 'Key metrics',
    ], (array) $labels);
    // A null position or previousPosition is meaningful (not ranking), so rebuild those keys explicitly.
    $list = array_values(array_map(function ($k) {
        $k = (array) $k;
        $out = array_filter($k, fn ($v) => $v !== null);
        $out['position'] = $k['position'] ?? null;
        if (array_key_exists('previousPosition', $k)) {
            $out['previousPosition'] = $k['previousPosition'];
        }
        if (isset($k['history'])) {
            $out['history'] = array_values((array) $k['history']);
        }

        return $out;
    }, (array) $keywords));
    $comps = $competitors === null ? null : array_values(array_map(fn ($c) => (array) $c, (array) $competitors));
    $locs = array_values(array_map(fn ($l) => (array) $l, (array) $locations));
    $canAdd = $add && count($locs) > 0;
    $config = [
        'keywords' => $list,
        'competitors' => $comps ?? [],
        'locations' => $locs,
        'defaultLocation' => $defaultLocation,
        'can' => ['add' => $canAdd, 'remove' => (bool) $remove, 'refresh' => (bool) $refresh, 'update' => (bool) $update, 'open' => (bool) $openable],
        'words' => [
            'locale' => $ar ? 'ar' : 'en',
            'failed' => $t['actionFailed'], 'notRanking' => $t['notRanking'], 'keywordsRequired' => $t['keywordsRequired'], 'urlInvalid' => $t['urlInvalid'], 'trend' => $t['trend'],
            'up' => $t['up'], 'down' => $t['down'], 'same' => $t['same'], 'newRank' => $t['newRank'], 'lostRank' => $t['lostRank'],
            'keywordCount' => [$t['countNone'], $t['countOne'], $t['countMany']], 'addSubmit' => [$t['addSubmitOne'], $t['addSubmitMany']], 'removeTitle' => [$t['removeOne'], $t['removeMany']],
            'bucketCount' => $t['bucketCount'], 'was' => $t['was'], 'urlEmpty' => '', 'volumePerMonth' => $t['volumePerMonth'], 'ahead' => [$t['aheadOne'], $t['aheadMany']],
            'band' => ['easy' => $t['easy'], 'medium' => $t['medium'], 'hard' => $t['hard']],
            'feature' => array_intersect_key($t, array_flip(['snippet', 'paa', 'images', 'video', 'local', 'sitelinks', 'reviews', 'ads'])),
            'bucket' => ['top3' => $t['bucketTop3'], 'top10' => $t['bucketTop10'], 'top100' => $t['bucketTop100'], 'unranked' => $t['bucketUnranked']],
        ],
    ];
    $tiles = [['tracked', $t['tracked']], ['avg', $t['avgPosition']], ['top10', $t['inTop10']], ['visibility', $t['visibility']]];
    $columns = [
        ['id' => 'keyword', 'header' => $t['keyword'], 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'position', 'header' => $t['position'], 'type' => 'number', 'sortable' => true, 'align' => 'end'],
        ['id' => 'best', 'header' => $t['best'], 'type' => 'number', 'sortable' => true, 'align' => 'end'],
        ['id' => 'trend', 'header' => $t['trend']],
        array_filter(['id' => 'url', 'header' => $t['url'], 'sortable' => true, 'searchable' => true, 'edit' => $update ? 'text' : null]),
        ['id' => 'volume', 'header' => $t['volume'], 'type' => 'number', 'sortable' => true, 'align' => 'end'],
        ['id' => 'difficulty', 'header' => $t['difficulty'], 'type' => 'number', 'sortable' => true],
        ['id' => 'features', 'header' => $t['features']],
    ];
    $actions = array_values(array_filter([
        $openable ? ['id' => 'open', 'label' => $t['openSerp'], 'icon' => 'external-link', 'group' => 'a'] : null,
        $refresh ? ['id' => 'refresh', 'label' => $t['refreshRow'], 'icon' => 'refresh-cw', 'group' => 'a'] : null,
        $remove ? ['id' => 'remove', 'label' => $t['remove'], 'icon' => 'trash-2', 'danger' => true, 'group' => 'z'] : null,
    ]));
    $summaryColumns = [
        ['id' => 'domain', 'header' => $t['domain'], 'sortable' => true, 'hideable' => false],
        ['id' => 'visibility', 'header' => $t['share'], 'type' => 'number', 'sortable' => true, 'align' => 'end'],
        ['id' => 'avg', 'header' => $t['avgPos'], 'type' => 'number', 'sortable' => true, 'align' => 'end'],
        ['id' => 'top10', 'header' => $t['top10Count'], 'type' => 'number', 'sortable' => true, 'align' => 'end'],
    ];
    $matrixColumns = [['id' => 'keyword', 'header' => $t['keyword'], 'sortable' => true, 'hideable' => false]];
    foreach (($comps ?? []) as $i => $c) {
        $matrixColumns[] = ['id' => 'c'.$i, 'header' => (string) ($c['domain'] ?? ''), 'type' => 'number', 'sortable' => true, 'align' => 'end'];
    }
    $hide = 'style="display: none"';
    $compactPanel = $positionHistory === null;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'keyword-tracker') }}" x-data="nqKeywordTracker({{ \Illuminate\Support\Js::from($config) }})"
    x-on:nq-data-table-action="onAction($event)" x-on:nq-data-table-edit="onEdit($event)" x-on:nq-data-table-row-click="onRowClick($event)"
    {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-6') }}>
    <x-nq::stat-card.grid data-slot="metric-tiles" role="group" aria-label="{{ $t['group'] }}" :aria-busy="$loading ? 'true' : null">
        @foreach ($tiles as [$field, $label])
            <x-nq::stat-card :label="$label" :locale="$locale" :loading="$loading" :data-metric="$field">
                <span class="flex flex-col gap-1">
                    <bdi data-slot="num" data-numeric class="tabular-nums" x-text="tiles.find((m) => m.id === '{{ $field }}').value"></bdi>
                    <span class="flex items-center gap-1 text-caption" x-show="tiles.find((m) => m.id === '{{ $field }}').delta !== ''" style="display: none"
                        x-bind:class="tiles.find((m) => m.id === '{{ $field }}').tone === 'positive' ? 'text-nq-success-text' : 'text-nq-danger-text'">
                        <bdi class="tabular-nums" x-text="tiles.find((m) => m.id === '{{ $field }}').delta"></bdi>
                        <span class="text-muted-foreground" x-text="tiles.find((m) => m.id === '{{ $field }}').was"></span>
                    </span>
                </span>
            </x-nq::stat-card>
        @endforeach
    </x-nq::stat-card.grid>

    <div class="grid gap-4 lg:grid-cols-3">
        @if ($positionHistory !== null)
            <x-nq::time-series-panel class="lg:col-span-2" :title="$t['historyTitle']" :description="$t['historyDescription']"
                :metrics="[
                    ['id' => 'position', 'label' => $t['avgPositionShort'], 'aggregate' => 'avg', 'lowerIsBetter' => true, 'format' => ['minFraction' => 1, 'maxFraction' => 1], 'color' => 'var(--nq-info)'],
                    ['id' => 'top10', 'label' => $t['inTop10Short'], 'aggregate' => 'avg', 'format' => ['maxFraction' => 0], 'color' => 'var(--nq-success)'],
                ]"
                :data="$positionHistory" metric="position" :compare="false" :loading="$loading" :locale="$locale" />
        @endif
        <div class="{{ $compactPanel ? 'flex flex-col gap-4 lg:col-span-3 lg:grid lg:grid-cols-2' : 'flex flex-col gap-4' }}">
            <x-nq::card data-slot="rank-distribution">
                <x-nq::card.header>
                    <x-nq::card.title as="h3">{{ $t['distributionTitle'] }}</x-nq::card.title>
                    <x-nq::card.description>{{ $t['distributionDescription'] }}</x-nq::card.description>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-4">
                    <div role="img" x-bind:aria-label="distributionSummary" class="flex h-3 w-full overflow-hidden rounded-full bg-nq-surface-soft">
                        <template x-for="b in buckets" x-bind:key="b.id">
                            <span x-show="b.shown" style="display: none" x-bind:data-bucket="b.id" x-bind:class="'h-full ' + b.bar" x-bind:style="{ width: b.width }"></span>
                        </template>
                    </div>
                    <ul class="grid grid-cols-2 gap-x-4 gap-y-3">
                        <template x-for="b in buckets" x-bind:key="b.id">
                            <li x-bind:data-bucket="b.id" class="flex items-start gap-2">
                                <span aria-hidden="true" x-bind:class="'mt-1.5 size-2.5 shrink-0 rounded-full ' + b.bar"></span>
                                <div class="flex min-w-0 flex-col leading-tight">
                                    <span class="text-caption text-muted-foreground" x-text="b.label"></span>
                                    <span class="text-label text-foreground">
                                        <bdi data-slot="num" data-numeric class="tabular-nums" x-text="b.count"></bdi>
                                        <span class="text-caption font-normal text-muted-foreground"> <bdi data-slot="num" data-numeric class="tabular-nums" x-text="b.share"></bdi></span>
                                    </span>
                                </div>
                            </li>
                        </template>
                    </ul>
                </x-nq::card.content>
            </x-nq::card>
            <x-nq::card data-slot="keyword-movers">
                <x-nq::card.header>
                    <x-nq::card.title as="h3">{{ $t['moversTitle'] }}</x-nq::card.title>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-4">
                    @foreach ([['gainers', $t['gainers']], ['losers', $t['losers']]] as [$group, $heading])
                        <div class="flex flex-col gap-1.5">
                            <span class="text-caption font-medium text-muted-foreground">{{ $heading }}</span>
                            <span class="text-caption text-muted-foreground" x-show="movers.{{ $group }}.length === 0" {!! $hide !!}>{{ $t['noMovers'] }}</span>
                            <ul class="flex flex-col gap-1" x-show="movers.{{ $group }}.length > 0" {!! $hide !!}>
                                <template x-for="k in movers.{{ $group }}" x-bind:key="k.id">
                                    <li class="flex items-center justify-between gap-2 text-body-sm">
                                        <span dir="auto" class="min-w-0 truncate text-foreground" x-text="k.keyword"></span>
                                        <span x-bind:data-direction="k.dir" x-bind:class="'inline-flex shrink-0 items-center gap-0.5 text-caption font-medium ' + (k.dir === 'up' ? 'text-nq-success-text' : 'text-nq-danger-text')" x-bind:title="k.changeText">
                                            <x-lucide-arrow-up aria-hidden="true" class="size-3" x-show="k.dir === 'up'" style="display: none" />
                                            <x-lucide-arrow-down aria-hidden="true" class="size-3" x-show="k.dir === 'down'" style="display: none" />
                                            <bdi data-slot="num" data-numeric class="tabular-nums" x-text="k.deltaText"></bdi>
                                            <span class="sr-only" x-text="k.changeText"></span>
                                        </span>
                                    </li>
                                </template>
                            </ul>
                        </div>
                    @endforeach
                </x-nq::card.content>
            </x-nq::card>
        </div>
    </div>

    <x-nq::tabs default-value="keywords">
        <x-nq::tabs.list variant="underline">
            <x-nq::tabs.tab value="keywords">{{ $t['tabKeywords'] }}</x-nq::tabs.tab>
            @if ($comps !== null)
                <x-nq::tabs.tab value="competitors">{{ $t['tabCompetitors'] }}</x-nq::tabs.tab>
            @endif
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>
        <x-nq::tabs.panel value="keywords" class="pt-4">
            <x-nq::card>
                <x-nq::card.header>
                    <x-nq::card.title as="h3">{{ $t['keywordsTitle'] }}</x-nq::card.title>
                    <x-nq::card.description>{{ $t['keywordsDescription'] }}</x-nq::card.description>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-3">
                    <x-nq::status tone="danger" role="alert" x-show="notice" style="display: none"><span x-text="notice"></span></x-nq::status>
                    <x-nq::data-table x-model="tableRows" :label="$t['keywordsTitle']" name-key="keyword" :columns="$columns" :rows="[]" :selectable="(bool) $remove"
                        :page-size="count($list) > $pageSize ? (int) $pageSize : 0" :search="$t['filter']" :view-options="false" :row-actions="$actions" actions-key="actions"
                        :row-click="(bool) $openable" :loading="$loading" :error="$error" :labels="['empty' => $t['empty']]">
                        <x-slot name="cell_position">
                            <span class="inline-flex items-center justify-end gap-2">
                                <bdi data-slot="num" data-numeric class="tabular-nums text-label font-semibold text-foreground" x-show="row.ranked" x-text="row.positionText" style="display: none"></bdi>
                                <span class="text-caption text-muted-foreground" x-show="! row.ranked" x-text="row.positionText" style="display: none"></span>
                                <x-nq::badge variant="info" x-show="row.dir === 'new'" style="display: none"><span x-text="row.changeText"></span></x-nq::badge>
                                <x-nq::badge variant="danger" x-show="row.dir === 'lost'" style="display: none"><span x-text="row.changeText"></span></x-nq::badge>
                                <span class="inline-flex items-center gap-0.5 text-caption text-muted-foreground" x-show="row.dir === 'same'" x-bind:title="row.changeText" style="display: none">
                                    <x-lucide-minus aria-hidden="true" class="size-3" />
                                    <span class="sr-only" x-text="row.changeText"></span>
                                </span>
                                <span x-show="row.dir === 'up' || row.dir === 'down'" style="display: none" x-bind:data-direction="row.dir" x-bind:title="row.changeText"
                                    x-bind:class="'inline-flex items-center gap-0.5 text-caption font-medium ' + (row.dir === 'up' ? 'text-nq-success-text' : 'text-nq-danger-text')">
                                    <x-lucide-arrow-up aria-hidden="true" class="size-3" x-show="row.dir === 'up'" style="display: none" />
                                    <x-lucide-arrow-down aria-hidden="true" class="size-3" x-show="row.dir === 'down'" style="display: none" />
                                    <bdi data-slot="num" data-numeric class="tabular-nums" x-text="row.deltaText"></bdi>
                                    <span class="sr-only" x-text="row.changeText"></span>
                                </span>
                            </span>
                        </x-slot>
                        <x-slot name="cell_best"><bdi data-slot="num" data-numeric class="tabular-nums" x-text="row.bestText"></bdi></x-slot>
                        <x-slot name="cell_trend">
                            <svg x-show="row.trendPath !== ''" style="display: none" viewBox="0 0 96 28" role="img" x-bind:aria-label="row.trendLabel" class="h-7 w-24 overflow-visible rtl:-scale-x-100">
                                <path x-bind:d="row.trendPath" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x-bind:stroke="row.trendColor" />
                            </svg>
                        </x-slot>
                        <x-slot name="cell_volume"><bdi data-slot="num" data-numeric class="tabular-nums" x-bind:title="{{ \Illuminate\Support\Js::from($t['volumePerMonth']) }}" x-text="row.volumeText"></bdi></x-slot>
                        <x-slot name="cell_difficulty">
                            <x-nq::badge variant="success" x-show="row.band === 'easy'" x-bind:title="row.difficultyText" style="display: none"><span x-text="row.difficultyText"></span></x-nq::badge>
                            <x-nq::badge variant="warning" x-show="row.band === 'medium'" x-bind:title="row.difficultyText" style="display: none"><span x-text="row.difficultyText"></span></x-nq::badge>
                            <x-nq::badge variant="danger" x-show="row.band === 'hard'" x-bind:title="row.difficultyText" style="display: none"><span x-text="row.difficultyText"></span></x-nq::badge>
                        </x-slot>
                        <x-slot name="cell_features">
                            <span class="flex flex-wrap gap-1">
                                <template x-for="f in row.features" x-bind:key="f.id">
                                    <x-nq::badge variant="outline"><span x-text="f.label"></span></x-nq::badge>
                                </template>
                            </span>
                        </x-slot>
                        @if ($remove)
                            <x-slot:bulk>
                                <x-nq::button type="button" size="sm" variant="secondary" x-on:click="askRemove(selectedIds()); clearSelection()"><x-lucide-trash-2 aria-hidden="true" />{{ $t['remove'] }}</x-nq::button>
                            </x-slot:bulk>
                        @endif
                        @if ($canAdd || $refresh)
                            <x-slot:toolbar>
                                @if ($canAdd)
                                    <x-nq::button type="button" variant="primary" size="sm" class="ms-auto" data-action="add" x-on:click="openAdd()"><x-lucide-plus aria-hidden="true" />{{ $t['add'] }}</x-nq::button>
                                @endif
                                @if ($refresh)
                                    <x-nq::button type="button" variant="secondary" size="icon-sm" data-action="refresh" aria-label="{{ $t['refresh'] }}" title="{{ $t['refresh'] }}" class="{{ $canAdd ? '' : 'ms-auto' }}"
                                        x-on:click="checkAll()" x-bind:aria-busy="busy ? 'true' : null"><x-lucide-refresh-cw aria-hidden="true" /></x-nq::button>
                                @endif
                            </x-slot:toolbar>
                        @endif
                    </x-nq::data-table>
                </x-nq::card.content>
            </x-nq::card>
        </x-nq::tabs.panel>
        @if ($comps !== null)
            <x-nq::tabs.panel value="competitors" class="pt-4">
                <div data-slot="competitor-comparison" class="flex flex-col gap-4">
                    <x-nq::card>
                        <x-nq::card.header>
                            <x-nq::card.title as="h3">{{ $t['competitorsTitle'] }}</x-nq::card.title>
                            <x-nq::card.description>{{ $t['competitorsDescription'] }}</x-nq::card.description>
                        </x-nq::card.header>
                        <x-nq::card.content class="flex flex-col gap-3">
                            <x-nq::data-table x-model="summaryRows" :label="$t['competitorsTitle']" name-key="domain" :columns="$summaryColumns" :rows="[]" :search="false" :view-options="false" :labels="['empty' => $t['noCompetitors']]">
                                <x-slot name="cell_domain">
                                    <span class="flex items-center gap-2">
                                        <bdi dir="ltr" class="text-label text-foreground" x-text="row.domain"></bdi>
                                        <x-nq::badge variant="brand" x-show="row.you" style="display: none">{{ $t['you'] }}</x-nq::badge>
                                    </span>
                                </x-slot>
                                <x-slot name="cell_visibility"><bdi data-slot="num" data-numeric class="tabular-nums" x-text="row.visibilityText"></bdi></x-slot>
                                <x-slot name="cell_avg"><bdi data-slot="num" data-numeric class="tabular-nums" x-text="row.avgText"></bdi></x-slot>
                                <x-slot name="cell_top10"><bdi data-slot="num" data-numeric class="tabular-nums" x-text="row.top10Text"></bdi></x-slot>
                            </x-nq::data-table>
                            <ul class="flex flex-wrap gap-2 text-caption text-muted-foreground">
                                <template x-for="r in summaryRows.filter((x) => x.other)" x-bind:key="r.id">
                                    <li><bdi dir="ltr" x-text="r.domain"></bdi>: <span x-text="r.aheadText"></span></li>
                                </template>
                            </ul>
                        </x-nq::card.content>
                    </x-nq::card>
                    <x-nq::card>
                        <x-nq::card.header>
                            <x-nq::card.title as="h3">{{ $t['matrixTitle'] }}</x-nq::card.title>
                            <x-nq::card.description>{{ $t['lowerIsBetter'] }}</x-nq::card.description>
                        </x-nq::card.header>
                        <x-nq::card.content>
                            <x-nq::data-table x-model="matrixRows" :label="$t['matrixTitle']" name-key="keyword" :columns="$matrixColumns" :rows="[]" :search="false" :view-options="false" :labels="['empty' => $t['empty']]">
                                <x-slot name="cell_keyword"><span dir="auto" class="block max-w-[24ch] truncate text-label text-foreground" x-text="row.keyword"></span></x-slot>
                                @foreach ($matrixColumns as $i => $col)
                                    @continue($i === 0)
                                    <x-slot :name="'cell_'.$col['id']"><bdi data-slot="num" data-numeric class="tabular-nums" x-bind:class="row.{{ $col['id'] }}Best ? 'font-semibold text-nq-success-text' : ''" x-text="row.{{ $col['id'] }}Text"></bdi></x-slot>
                                @endforeach
                            </x-nq::data-table>
                        </x-nq::card.content>
                    </x-nq::card>
                </div>
            </x-nq::tabs.panel>
        @endif
    </x-nq::tabs>

    @if ($canAdd)
        <x-nq::dialog x-model="addOpen">
            <x-nq::dialog.content data-slot="add-keywords-dialog" class="max-w-lg">
                <form x-on:submit.prevent="submitAdd()" class="flex flex-col gap-4" novalidate>
                    <x-nq::dialog.header>
                        <x-nq::dialog.title>{{ $t['addTitle'] }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $t['addBody'] }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <template x-if="addError !== null">
                        <x-nq::alert tone="danger" role="alert"><span x-text="addError"></span></x-nq::alert>
                    </template>
                    <x-nq::field x-model="addBad">
                        <x-nq::field.label>{{ $t['keywordsLabel'] }}</x-nq::field.label>
                        <x-nq::field.textarea x-model="addText" dir="auto" rows="5" placeholder="{{ $t['keywordsPlaceholder'] }}" />
                        <x-nq::field.error><span x-text="addMsg"></span></x-nq::field.error>
                        <span class="text-caption text-muted-foreground" aria-live="polite" x-text="addCountText"></span>
                    </x-nq::field>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <x-nq::field>
                            <x-nq::field.label>{{ $t['locationLabel'] }}</x-nq::field.label>
                            <x-nq::select :value="$defaultLocation ?? ($locs[0]['value'] ?? '')" x-model="addLocation">
                                <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    @foreach ($locs as $l)
                                        <x-nq::select.item :value="$l['value']">{{ $l['label'] }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                        </x-nq::field>
                        <div class="flex flex-col gap-1.5">
                            <span class="text-label text-foreground">{{ $t['deviceLabel'] }}</span>
                            <x-nq::toggle-group :default-value="['desktop']" aria-label="{{ $t['deviceLabel'] }}" x-model="deviceSel">
                                <x-nq::toggle-group.toggle value="desktop">{{ $t['desktop'] }}</x-nq::toggle-group.toggle>
                                <x-nq::toggle-group.toggle value="mobile">{{ $t['mobile'] }}</x-nq::toggle-group.toggle>
                            </x-nq::toggle-group>
                        </div>
                    </div>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="addOpen = false" x-bind:disabled="busy ? '' : null">{{ $t['cancel'] }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                            <x-nq::spinner x-show="busy" style="display: none" />
                            <span x-text="addLabel"></span>
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($remove)
        <x-nq::alert-dialog x-model="removeOpen">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><span x-text="removeTitle"></span></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description>{{ $t['removeBody'] }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="removeOpen = false">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="button" variant="primary" data-action="confirm-remove" x-on:click="confirmRemove()">{{ $t['remove'] }}</x-nq::button>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</div>
