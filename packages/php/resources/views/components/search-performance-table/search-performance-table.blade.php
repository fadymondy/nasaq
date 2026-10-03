{{-- <x-nq::search-performance-table :rows="[['id' => 'q1', 'label' => 'rtl react components', 'clicks' => 420, 'impressions' => 9800, 'position' => 4.2, 'previousClicks' => 380, 'previousPosition' => 5.1]]" />
     The Search Console performance table: a query or page with clicks, impressions, CTR and average position, sortable (clicks, descending, first) and searchable,
     each with its change against the previous period. Position is "lower is better" and toned that way.
     rows: ['id', 'label', 'clicks', 'impressions', 'position', 'ctr' (fraction, default clicks / impressions), 'previousClicks', 'previousPosition'].
     kind: query (default) | page (URLs, shown left-to-right, "Page" heading). title, description: header text. page-size: rows per page (default 10).
     row-click: rows become activatable. loading, error (a message). labels: array overriding the built-in words.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.metric-tiles._logic')
@props(['rows' => [], 'kind' => 'query', 'title' => null, 'description' => null, 'pageSize' => 10, 'rowClick' => false, 'loading' => false, 'error' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar
        ? ['query' => 'عبارة البحث', 'page' => 'الصفحة', 'clicks' => 'النقرات', 'impressions' => 'مرات الظهور', 'ctr' => 'نسبة النقر', 'position' => 'الترتيب', 'searchQueries' => 'عبارات البحث', 'searchPages' => 'صفحات البحث', 'filterQueries' => 'تصفية العبارات…', 'filterPages' => 'تصفية الصفحات…', 'empty' => 'لا بيانات بحث لهذه الفترة', 'lowerIsBetter' => 'الأقل أفضل', 'clearSearch' => 'مسح البحث', 'noResults' => 'لا نتائج مطابقة', 'noResultsHint' => 'جرّب بحثًا آخر أو امسح عوامل التصفية.', 'clearFilters' => 'مسح التصفية', 'previous' => 'الصفحة السابقة', 'next' => 'الصفحة التالية', 'pagination' => 'التنقل بين الصفحات', 'range' => '{from}–{to} من {total}']
        : ['query' => 'Query', 'page' => 'Page', 'clicks' => 'Clicks', 'impressions' => 'Impressions', 'ctr' => 'CTR', 'position' => 'Position', 'searchQueries' => 'Search queries', 'searchPages' => 'Search pages', 'filterQueries' => 'Filter queries…', 'filterPages' => 'Filter pages…', 'empty' => 'No search data for this period', 'lowerIsBetter' => 'Lower is better', 'clearSearch' => 'Clear search', 'noResults' => 'No matching results', 'noResultsHint' => 'Try a different search or clear the filters.', 'clearFilters' => 'Clear filters', 'previous' => 'Previous page', 'next' => 'Next page', 'pagination' => 'Pagination', 'range' => '{from}–{to} of {total}'], (array) $labels);
    $isQuery = $kind === 'query';
    $noun = $isQuery ? $t['searchQueries'] : $t['searchPages'];
    $good = 'text-nq-success-text';
    $bad = 'text-nq-danger-text';
    $quiet = 'text-muted-foreground';
    $signed = fn (string $s, float $v) => ($v > 0 ? '+' : '').$s;
    $list = array_values(array_map(function ($r) use ($locale, $good, $bad, $quiet, $signed) {
        $r = (array) $r;
        $ctr = $r['ctr'] ?? (($r['impressions'] ?? 0) > 0 ? $r['clicks'] / $r['impressions'] : 0);
        $d = nq_mt_change_ratio($r['clicks'], $r['previousClicks'] ?? null);
        $diff = isset($r['previousPosition']) ? $r['position'] - $r['previousPosition'] : null;
        $showDiff = $diff !== null && abs($diff) >= 0.05;

        return [
            'id' => $r['id'],
            'label' => $r['label'],
            'clicks' => $r['clicks'],
            'impressions' => $r['impressions'],
            'ctr' => $ctr,
            'position' => $r['position'],
            'clicksText' => nq_mt_number($r['clicks'], [], $locale),
            'clicksDelta' => $d === null ? '' : $signed(nq_mt_number($d, ['style' => 'percent', 'maxFraction' => 0], $locale), $d),
            'clicksTone' => $d === null || $d == 0 ? $quiet : ($d > 0 ? $good : $bad),
            'impressionsText' => nq_mt_number($r['impressions'], [], $locale),
            'ctrText' => nq_mt_number($ctr, ['style' => 'percent', 'maxFraction' => 1], $locale),
            'positionText' => nq_mt_number($r['position'], ['minFraction' => 1, 'maxFraction' => 1], $locale),
            'positionDiff' => $showDiff ? $signed(nq_mt_number($diff, ['maxFraction' => 1], $locale), $diff) : '',
            'positionTone' => $showDiff ? ($diff < 0 ? $good : $bad) : $quiet,
        ];
    }, (array) $rows));
    $cols = [
        ['id' => 'label', 'header' => $isQuery ? $t['query'] : $t['page'], 'sortable' => true, 'searchable' => true],
        ['id' => 'clicks', 'header' => $t['clicks'], 'type' => 'number', 'sortable' => true, 'align' => 'end'],
        ['id' => 'impressions', 'header' => $t['impressions'], 'type' => 'number', 'sortable' => true, 'align' => 'end'],
        ['id' => 'ctr', 'header' => $t['ctr'], 'type' => 'number', 'sortable' => true, 'align' => 'end'],
        ['id' => 'position', 'header' => $t['position'], 'type' => 'number', 'sortable' => true, 'align' => 'end'],
    ];
    $options = array_filter(['pageSize' => $pageSize ?: null, 'locale' => $locale, 'labels' => ['range' => $t['range']]], fn ($v) => $v !== null);
    $hide = 'style="display: none"';
    $clickable = (bool) $rowClick;
    $btn = 'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-border bg-card text-foreground font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus h-control-sm px-3';
    $searchText = $isQuery ? $t['filterQueries'] : $t['filterPages'];
    $cell = 'flex items-center relative h-row align-middle whitespace-nowrap';
@endphp
<x-nq::card data-slot="search-performance-table" :attributes="$attributes">
    <x-nq::card.header>
        <x-nq::card.title as="h3">{{ $title ?? $noun }}</x-nq::card.title>
        @if ($description)<x-nq::card.description>{{ $description }}</x-nq::card.description>@endif
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <div x-data="nqDataTable({{ \Illuminate\Support\Js::from($list) }}, {{ \Illuminate\Support\Js::from($cols) }}, {{ \Illuminate\Support\Js::from((object) $options) }})" x-init="sorting = [{ id: 'clicks', direction: 'desc' }]" class="flex min-w-0 flex-col gap-3">
            <div data-slot="data-table-toolbar" class="flex flex-wrap items-center gap-2">
                <div data-slot="data-table-search" class="relative w-full sm:w-64">
                    <x-lucide-search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <x-nq::field.input type="search" x-model="query" x-on:keydown.escape="if (query) { $event.preventDefault(); query = '' }" placeholder="{{ $searchText }}" aria-label="{{ $searchText }}"
                        class="h-control-sm ps-8 pe-8 text-body-sm [&::-webkit-search-cancel-button]:hidden" />
                    <button type="button" x-show="query" aria-label="{{ $t['clearSearch'] }}" x-on:click="query = ''" {!! $hide !!}
                        class="absolute end-1.5 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                        <x-lucide-x aria-hidden="true" class="size-3.5" />
                    </button>
                </div>
            </div>

            <div data-slot="table-container" role="region" tabindex="0" aria-label="{{ $noun }}" @if ($loading) aria-busy="true" @endif
                class="relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                <div data-slot="table" role="table" aria-label="{{ $noun }}" x-bind:style="'grid-template-columns: repeat(' + shownCount() + ', auto)'" class="grid w-full min-w-max text-body-sm">
                    <div data-slot="table-header" role="rowgroup" class="contents">
                        <div role="row" data-slot="table-row" class="col-span-full grid grid-cols-subgrid border-b border-border">
                            @foreach ($cols as $c)
                                @php $end = ($c['align'] ?? 'start') === 'end'; @endphp
                                <div role="columnheader" data-slot="table-head" data-col="{{ $c['id'] }}" x-show="shown['{{ $c['id'] }}']" x-bind:class="pad" x-bind:aria-sort="ariaSort('{{ $c['id'] }}')"
                                    class="flex items-center h-row {{ $end ? 'text-end justify-end' : 'text-start' }} align-middle text-caption font-medium whitespace-nowrap text-muted-foreground">
                                    <button type="button" x-on:click="toggleSort('{{ $c['id'] }}', $event.shiftKey)" x-bind:class="sortOf('{{ $c['id'] }}') ? 'text-foreground' : ''"
                                        class="-mx-1.5 inline-flex h-7 max-w-full items-center gap-1 rounded-control px-1.5 outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus {{ $end ? 'flex-row-reverse' : '' }}">
                                        <span>{{ $c['header'] }}</span>
                                        <x-lucide-chevrons-up-down aria-hidden="true" class="size-3.5 shrink-0 opacity-40" x-show="! sortOf('{{ $c['id'] }}')" />
                                        <x-lucide-arrow-up aria-hidden="true" class="size-3.5 shrink-0" x-show="sortOf('{{ $c['id'] }}') === 'asc'" {!! $hide !!} />
                                        <x-lucide-arrow-down aria-hidden="true" class="size-3.5 shrink-0" x-show="sortOf('{{ $c['id'] }}') === 'desc'" {!! $hide !!} />
                                    </button>
                                </div>
                            @endforeach
                        </div>
                    </div>

                    @if ($error)
                        <div role="rowgroup" class="contents" data-slot="table-body">
                            <div role="row" data-slot="table-row" class="col-span-full grid grid-cols-subgrid border-0"><div role="cell" data-slot="table-cell" class="col-span-full h-auto p-0 whitespace-normal"><x-nq::states.error :title="is_string($error) ? $error : null" class="border-0" /></div></div>
                        </div>
                    @elseif ($loading)
                        <div role="rowgroup" class="contents" data-slot="table-body" aria-hidden="true">
                            @for ($i = 0; $i < min(max((int) $pageSize, 5), 8); $i++)
                                <div role="row" data-slot="table-row" class="col-span-full grid grid-cols-subgrid border-b border-border">
                                    @foreach ($cols as $j => $c)
                                        <div role="cell" data-slot="table-cell" class="flex items-center h-row px-4 py-3"><x-nq::states.skeleton class="h-3" style="inline-size: {{ [70, 48, 60, 40, 54][($i + $j) % 5] }}%" /></div>
                                    @endforeach
                                </div>
                            @endfor
                        </div>
                    @else
                        <div role="rowgroup" class="contents" data-slot="table-body" x-show="rowCount === 0" {!! $hide !!}>
                            <div role="row" data-slot="table-row" class="col-span-full grid grid-cols-subgrid border-0">
                                <div role="cell" data-slot="table-cell" class="col-span-full h-auto p-0 whitespace-normal">
                                    <div x-show="isFiltered" {!! $hide !!}>
                                        <x-nq::states.empty icon="search" :title="$t['noResults']" :description="$t['noResultsHint']" class="border-0">
                                            <button type="button" x-on:click="resetFilters()" class="{{ $btn }}">{{ $t['clearFilters'] }}</button>
                                        </x-nq::states.empty>
                                    </div>
                                    <div x-show="! isFiltered" {!! $hide !!}>
                                        <x-nq::states.empty :title="$t['empty']" class="border-0" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <template x-for="(row, index) in pageRows" x-bind:key="rid(row)">
                            <div role="rowgroup" class="contents" data-slot="table-body">
                                <div role="row" data-slot="table-row" data-row x-bind:tabindex="index === 0 ? 0 : -1"
                                    x-on:keydown="rowKey($event, row, index, {{ $clickable ? 'true' : 'false' }})" @if ($clickable) x-on:click="rowClick(row, $event)" @endif
                                    class="col-span-full grid grid-cols-subgrid group/row border-b border-border outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus hover:bg-nq-hover {{ $clickable ? 'cursor-pointer' : '' }}">
                                    <div role="cell" data-slot="table-cell" data-cell-col="label" x-show="shown['label']" x-bind:class="pad" class="{{ $cell }}">
                                        @if ($isQuery)
                                            <span class="block max-w-[28ch] truncate sm:max-w-[40ch]" dir="auto" x-text="row.label"></span>
                                        @else
                                            <bdi dir="ltr" class="block max-w-[28ch] truncate sm:max-w-[48ch]" x-text="row.label"></bdi>
                                        @endif
                                    </div>
                                    <div role="cell" data-slot="table-cell" data-cell-col="clicks" x-show="shown['clicks']" x-bind:class="pad" class="{{ $cell }} text-end justify-end">
                                        <div class="flex flex-col items-end">
                                            <bdi data-slot="num" data-numeric class="tabular-nums" x-text="row.clicksText"></bdi>
                                            <bdi data-slot="num" data-numeric x-show="row.clicksDelta" x-bind:class="row.clicksTone" x-text="row.clicksDelta" {!! $hide !!} class="tabular-nums text-caption"></bdi>
                                        </div>
                                    </div>
                                    <div role="cell" data-slot="table-cell" data-cell-col="impressions" x-show="shown['impressions']" x-bind:class="pad" class="{{ $cell }} text-end justify-end">
                                        <bdi data-slot="num" data-numeric class="tabular-nums" x-text="row.impressionsText"></bdi>
                                    </div>
                                    <div role="cell" data-slot="table-cell" data-cell-col="ctr" x-show="shown['ctr']" x-bind:class="pad" class="{{ $cell }} text-end justify-end">
                                        <bdi data-slot="num" data-numeric class="tabular-nums" x-text="row.ctrText"></bdi>
                                    </div>
                                    <div role="cell" data-slot="table-cell" data-cell-col="position" x-show="shown['position']" x-bind:class="pad" class="{{ $cell }} text-end justify-end">
                                        <div class="flex flex-col items-end" title="{{ $t['lowerIsBetter'] }}">
                                            <bdi data-slot="num" data-numeric class="tabular-nums" x-text="row.positionText"></bdi>
                                            <bdi data-slot="num" data-numeric x-show="row.positionDiff" x-bind:class="row.positionTone" x-text="row.positionDiff" {!! $hide !!} class="tabular-nums text-caption"></bdi>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    @endif
                </div>
            </div>

            @if ($pageSize && count($list) > $pageSize)
                <nav data-slot="data-table-pagination" aria-label="{{ $t['pagination'] }}" x-show="paged" {!! $hide !!} class="flex flex-wrap items-center justify-end gap-2">
                    <span class="text-caption tabular-nums text-muted-foreground" aria-live="polite" x-text="rangeText()"></span>
                    <button type="button" aria-label="{{ $t['previous'] }}" x-bind:disabled="page === 0 ? '' : null" x-on:click="setPage(page - 1)"
                        class="inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4"><x-lucide-chevron-left aria-hidden="true" class="rtl:-scale-x-100" /></button>
                    <button type="button" aria-label="{{ $t['next'] }}" x-bind:disabled="page >= pageCount - 1 ? '' : null" x-on:click="setPage(page + 1)"
                        class="inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4"><x-lucide-chevron-right aria-hidden="true" class="rtl:-scale-x-100" /></button>
                </nav>
            @endif
        </div>
    </x-nq::card.content>
</x-nq::card>
