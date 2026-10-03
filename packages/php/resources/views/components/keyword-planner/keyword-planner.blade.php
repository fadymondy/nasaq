{{-- <x-nq::keyword-planner :keywords="[['id' => 'k1', 'keyword' => 'arabic design system', 'volume' => 2400, 'difficulty' => 38, 'ownerUrl' => '/design-system']]" editable />
     Plan which page owns which keyword: a table of keywords (intent, cluster, volume, difficulty, owning page, status), a clusters view that groups related keywords
     under the biggest one, and a cannibalization view that lists keywords where two of your pages compete, with a one-click way to keep one.
     keywords: ['id', 'keyword', 'volume', 'difficulty', 'intent' (informational | commercial | transactional | navigational, default guessed from the wording),
       'ownerUrl', 'rankingUrls' => [['url' => '/a', 'position' => 6], …]].
     editable: the owning page can be edited in the cell, cleared from the row menu, or chosen with "Keep this page". Each change dispatches a bubbling
     "nq-keyword-planner-assign" ({ id, url, promise }; "" removes the owner): set event.detail.promise to a Promise (or one resolving to { error }) to save it; an error rolls it back.
     title, description: header text. page-size: rows per page (default 8). labels: array overriding the built-in words.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['keywords' => [], 'editable' => false, 'title' => null, 'description' => null, 'pageSize' => 8, 'loading' => false, 'error' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar
        ? ['title' => 'مخطط الكلمات المفتاحية', 'description' => 'خطّط أي صفحة تملك أي كلمة، وجمّع الكلمات المتقاربة، واكتشف الصفحات التي تتنافس فيما بينها.', 'tabKeywords' => 'الكلمات', 'tabClusters' => 'المجموعات', 'tabCannibalization' => 'التنافس الداخلي', 'keyword' => 'الكلمة', 'intent' => 'القصد', 'cluster' => 'المجموعة', 'volume' => 'حجم البحث', 'difficulty' => 'الصعوبة', 'owner' => 'الصفحة المالكة', 'status' => 'الحالة', 'filter' => 'تصفية الكلمات…', 'empty' => 'لا كلمات مخططة بعد', 'informational' => 'معلوماتي', 'commercial' => 'تجاري', 'transactional' => 'شرائي', 'navigational' => 'تنقّلي', 'unassigned' => 'بلا مالك', 'owned' => 'لها مالك', 'conflict' => 'صفحات متنافسة', 'ownerInvalid' => 'استخدم /مسار أو https://…', 'clearOwner' => 'إزالة المالك', 'clusterKeywordsOne' => 'كلمة واحدة', 'clusterKeywordsMany' => '{n} كلمات', 'clusterVolume' => 'إجمالي الحجم', 'clusterHead' => 'الكلمة الرئيسية', 'noClusters' => 'لا مجموعات بعد', 'conflictZero' => 'لا صفحات متنافسة', 'conflictOne' => 'كلمة واحدة لها صفحات متنافسة', 'conflictTitle' => '{n} كلمات لها صفحات متنافسة', 'conflictBody' => 'عندما تُصنَّف صفحتان من موقعك للكلمة نفسها تتقاسمان النقرات والروابط. احتفظ بواحدة وادمج الأخرى أو غيّر وجهتها.', 'conflictNone' => 'لا صفحتين من موقعك تُصنَّفان للكلمة نفسها.', 'keep' => 'الإبقاء', 'positionShort' => 'الترتيب {n}', 'keepThis' => 'أبقِ هذه الصفحة', 'failed' => 'تعذّر الحفظ. حاول مرة أخرى.']
        : ['title' => 'Keyword planner', 'description' => 'Plan which page owns which keyword, group related keywords and catch pages that compete with each other.', 'tabKeywords' => 'Keywords', 'tabClusters' => 'Clusters', 'tabCannibalization' => 'Cannibalization', 'keyword' => 'Keyword', 'intent' => 'Intent', 'cluster' => 'Cluster', 'volume' => 'Volume', 'difficulty' => 'Difficulty', 'owner' => 'Owning page', 'status' => 'Status', 'filter' => 'Filter keywords…', 'empty' => 'No keywords planned yet', 'informational' => 'Informational', 'commercial' => 'Commercial', 'transactional' => 'Transactional', 'navigational' => 'Navigational', 'unassigned' => 'No owner', 'owned' => 'Owned', 'conflict' => 'Competing pages', 'ownerInvalid' => 'Use /path or https://…', 'clearOwner' => 'Remove owner', 'clusterKeywordsOne' => '1 keyword', 'clusterKeywordsMany' => '{n} keywords', 'clusterVolume' => 'Total volume', 'clusterHead' => 'Main keyword', 'noClusters' => 'No clusters yet', 'conflictZero' => 'No pages compete', 'conflictOne' => '1 keyword has competing pages', 'conflictTitle' => '{n} keywords have competing pages', 'conflictBody' => 'When two of your pages rank for the same keyword they split clicks and links. Keep one and merge or re-aim the others.', 'conflictNone' => 'No two of your pages rank for the same keyword.', 'keep' => 'Keep', 'positionShort' => 'Position {n}', 'keepThis' => 'Keep this page', 'failed' => 'Could not save this. Try again.'], (array) $labels);
    $words = array_intersect_key($t, array_flip(['failed', 'ownerInvalid', 'conflictTitle', 'conflictZero', 'conflictOne', 'clusterKeywordsOne', 'clusterKeywordsMany', 'positionShort']));
    $list = array_values(array_map(fn ($k) => (array) $k, (array) $keywords));
    $columns = [
        ['id' => 'keyword', 'header' => $t['keyword'], 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'intent', 'header' => $t['intent'], 'type' => 'tag', 'sortable' => true, 'filter' => true, 'options' => [
            ['value' => 'informational', 'label' => $t['informational'], 'hue' => 'blue'],
            ['value' => 'commercial', 'label' => $t['commercial'], 'hue' => 'amber'],
            ['value' => 'transactional', 'label' => $t['transactional'], 'hue' => 'green'],
            ['value' => 'navigational', 'label' => $t['navigational'], 'hue' => 'gray'],
        ]],
        ['id' => 'cluster', 'header' => $t['cluster'], 'sortable' => true],
        ['id' => 'volume', 'header' => $t['volume'], 'type' => 'number', 'sortable' => true, 'align' => 'end'],
        ['id' => 'difficulty', 'header' => $t['difficulty'], 'type' => 'number', 'sortable' => true, 'align' => 'end'],
        array_filter(['id' => 'owner', 'header' => $t['owner'], 'sortable' => true, 'searchable' => true, 'edit' => $editable ? 'text' : null]),
        ['id' => 'status', 'header' => $t['status'], 'type' => 'status', 'sortable' => true, 'filter' => true, 'options' => [
            ['value' => 'unassigned', 'label' => $t['unassigned'], 'tone' => 'warning'],
            ['value' => 'owned', 'label' => $t['owned'], 'tone' => 'success'],
            ['value' => 'conflict', 'label' => $t['conflict'], 'tone' => 'danger'],
        ]],
    ];
    $hide = 'style="display: none"';
@endphp
<x-nq::card data-slot="keyword-planner" :attributes="$attributes">
    <x-nq::card.header>
        <x-nq::card.title as="h3">{{ $title ?? $t['title'] }}</x-nq::card.title>
        <x-nq::card.description>{{ $description ?? $t['description'] }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content>
        <div x-data="nqKeywordPlanner({{ \Illuminate\Support\Js::from($list) }}, {{ \Illuminate\Support\Js::from($words) }})"
            x-on:nq-data-table-edit="onEdit($event)" x-on:nq-data-table-action="onAction($event)">
            <x-nq::tabs default-value="keywords">
                <x-nq::tabs.list variant="underline">
                    <x-nq::tabs.tab value="keywords">{{ $t['tabKeywords'] }}</x-nq::tabs.tab>
                    <x-nq::tabs.tab value="clusters"><x-lucide-layers aria-hidden="true" />{{ $t['tabClusters'] }}</x-nq::tabs.tab>
                    <x-nq::tabs.tab value="cannibalization">
                        <x-lucide-triangle-alert aria-hidden="true" />{{ $t['tabCannibalization'] }}
                        <x-nq::badge variant="danger" x-show="conflicts.length" x-text="conflicts.length" style="display: none"></x-nq::badge>
                    </x-nq::tabs.tab>
                    <x-nq::tabs.indicator />
                </x-nq::tabs.list>

                <x-nq::tabs.panel value="keywords" class="flex flex-col gap-3 pt-4">
                    <x-nq::status tone="danger" role="alert" x-show="saveError" style="display: none"><span x-text="saveError"></span></x-nq::status>
                    <x-nq::data-table x-model="tableRows" :label="$t['title']" :columns="$columns" :rows="[]" :page-size="$pageSize" :search="$t['filter']" :view-options="false" :row-actions="$editable ? [['id' => 'clear', 'label' => $t['clearOwner'], 'icon' => 'x']] : []" :loading="$loading" :error="$error">
                        <x-slot:empty><x-nq::states.empty :title="$t['empty']" class="border-0" /></x-slot:empty>
                    </x-nq::data-table>
                </x-nq::tabs.panel>

                <x-nq::tabs.panel value="clusters" class="pt-4">
                    <div x-show="clusters.length === 0" {!! $hide !!}><x-nq::states.empty icon="layers" :title="$t['noClusters']" /></div>
                    <ul x-show="clusters.length > 0" class="grid gap-3 md:grid-cols-2">
                        <template x-for="c in clusters" x-bind:key="c.id">
                            <li data-slot="keyword-cluster" class="flex flex-col gap-2 rounded-card border border-border p-3">
                                <div class="flex items-start justify-between gap-3">
                                    <div class="flex min-w-0 flex-col">
                                        <span class="text-caption text-muted-foreground">{{ $t['clusterHead'] }}</span>
                                        <span dir="auto" class="truncate text-label text-foreground" x-text="c.head"></span>
                                    </div>
                                    <div class="flex shrink-0 flex-col items-end text-caption text-muted-foreground">
                                        <span x-text="clusterCount(c.keywords.length)"></span>
                                        <span>{{ $t['clusterVolume'] }} <bdi data-slot="num" data-numeric class="tabular-nums" x-text="new Intl.NumberFormat('{{ $ar ? 'ar-u-nu-latn' : 'en' }}', { notation: 'compact', maximumFractionDigits: 1 }).format(c.volume)"></bdi></span>
                                    </div>
                                </div>
                                <ul class="flex flex-wrap gap-1">
                                    <template x-for="k in c.keywords" x-bind:key="k.id">
                                        <li><x-nq::badge variant="outline" dir="auto" x-text="k.keyword"></x-nq::badge></li>
                                    </template>
                                </ul>
                            </li>
                        </template>
                    </ul>
                </x-nq::tabs.panel>

                <x-nq::tabs.panel value="cannibalization" class="flex flex-col gap-3 pt-4">
                    <p class="text-body-sm text-muted-foreground">{{ $t['conflictBody'] }}</p>
                    <p role="status" class="text-label text-foreground" x-text="conflictLine"></p>
                    <div x-show="conflicts.length === 0" {!! $hide !!}><x-nq::states.empty :title="$t['conflictNone']" /></div>
                    <ul x-show="conflicts.length > 0" class="flex flex-col gap-3">
                        <template x-for="c in conflicts" x-bind:key="c.keyword">
                            <li data-slot="keyword-conflict" class="flex flex-col gap-2 rounded-card border border-border p-3">
                                <span dir="auto" class="text-label text-foreground" x-text="c.keyword"></span>
                                <ul class="flex flex-col divide-y divide-border">
                                    <template x-for="u in c.urls" x-bind:key="u.url">
                                        <li class="flex flex-wrap items-center justify-between gap-2 py-2">
                                            <span class="flex min-w-0 items-center gap-2">
                                                <x-nq::badge variant="success" x-show="isKeep(u.url, c.keep)" style="display: none"><x-lucide-crown aria-hidden="true" />{{ $t['keep'] }}</x-nq::badge>
                                                <bdi dir="ltr" class="truncate text-body-sm text-foreground" x-text="u.url"></bdi>
                                            </span>
                                            <span class="flex items-center gap-3">
                                                <span class="text-caption text-muted-foreground"><bdi x-text="positionText(u.position)"></bdi></span>
                                                @if ($editable)
                                                    <x-nq::button size="sm" variant="secondary" x-show="! isKeep(u.url, c.keep)" x-on:click="keepThis(c.keyword, u.url)" style="display: none">{{ $t['keepThis'] }}</x-nq::button>
                                                @endif
                                            </span>
                                        </li>
                                    </template>
                                </ul>
                            </li>
                        </template>
                    </ul>
                </x-nq::tabs.panel>
            </x-nq::tabs>
        </div>
    </x-nq::card.content>
</x-nq::card>
