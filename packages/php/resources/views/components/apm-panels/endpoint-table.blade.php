{{-- <x-nq::apm-panels.endpoint-table :slow-ms="1000" :rows="[['id' => 'e1', 'method' => 'GET', 'route' => '/api/orders/:id', 'requests' => 48210, 'p50' => 84, 'p95' => 410, 'errorRate' => 0.004]]" />
     Endpoints with request count, p50, p95 and error rate, sortable and searchable, the slowest first; slow ones are flagged. rows: id, method, route
     (a pattern: "/api/orders/:id"), requests, p50 and p95 in milliseconds, errorRate as a fraction. slow-ms: endpoints with a p95 above this are flagged
     Slow (default 1000). page-size: rows per page (default 8). row-click: rows are buttons that dispatch a bubbling "nq-select" ({ id }). title,
     description, loading, error (string or true), retry (dispatches "nq-retry"). labels: array overriding the built-in words.
     Rendered on the server in the slowest-first order; the Alpine runtime (nqApmEndpoints) searches, sorts and pages them in the browser. --}}
@include('nasaq::components.apm-panels._logic')
@props(['rows' => [], 'slowMs' => 1000, 'pageSize' => 8, 'rowClick' => false, 'title' => null, 'description' => null, 'loading' => false, 'error' => null, 'retry' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_apm_words($locale, $labels);
    $ar = str_starts_with($locale, 'ar');
    $dt = (str_starts_with($locale, 'ar')
        ? ['search' => 'بحث…', 'clearSearch' => 'مسح البحث', 'previous' => 'الصفحة السابقة', 'next' => 'الصفحة التالية', 'pagination' => 'التنقل بين الصفحات', 'of' => 'من']
        : ['search' => 'Search…', 'clearSearch' => 'Clear search', 'previous' => 'Previous page', 'next' => 'Next page', 'pagination' => 'Pagination', 'of' => 'of']);
    // Slowest first by p95, ties in the order given (the same as the React default sort).
    $list = array_values($rows);
    $order = array_keys($list);
    usort($order, fn ($a, $b) => ($list[$b]['p95'] <=> $list[$a]['p95']) ?: ($a <=> $b));
    $list = array_map(fn ($i) => $list[$i], $order);
    $cols = [
        ['id' => 'route', 'header' => $t['endpoint'], 'align' => 'start'],
        ['id' => 'requests', 'header' => $t['requests'], 'align' => 'end'],
        ['id' => 'p50', 'header' => $t['p50'], 'align' => 'end'],
        ['id' => 'p95', 'header' => $t['p95'], 'align' => 'end'],
        ['id' => 'errorRate', 'header' => $t['errorRate'], 'align' => 'end'],
    ];
    $state = [
        'pageSize' => (int) $pageSize,
        'sort' => ['id' => 'p95', 'dir' => 'desc'],
        'rows' => array_map(fn ($r) => [
            'id' => (string) $r['id'],
            'search' => $r['method'].' '.$r['route'],
            'values' => ['route' => $r['route'], 'requests' => $r['requests'], 'p50' => $r['p50'], 'p95' => $r['p95'], 'errorRate' => $r['errorRate']],
        ], $list),
        'of' => $dt['of'],
    ];
    $searchText = $t['filterEndpoints'];
    $tableHidden = $error || $loading;
@endphp
<x-nq::card data-slot="endpoint-table" x-data="nqApmEndpoints({!! \Illuminate\Support\Js::from($state) !!})" {{ $attributes->except('data-slot') }}>
    <x-nq::card.header>
        <x-nq::card.title as="h3">{{ $title ?? $t['endpoints'] }}</x-nq::card.title>
        <x-nq::card.description>{{ $description ?? $t['endpointsDescription'] }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <div data-slot="data-table-toolbar" class="flex flex-wrap items-center gap-2">
            <div data-slot="data-table-search" class="relative w-full sm:w-64">
                <x-lucide-search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <x-nq::field.input type="search" x-model="query" x-on:keydown.escape="if (query) { $event.preventDefault(); query = '' }" placeholder="{{ $searchText }}" aria-label="{{ $searchText }}"
                    class="h-control-sm ps-8 pe-8 text-body-sm [&::-webkit-search-cancel-button]:hidden" />
                <button type="button" x-show="query" aria-label="{{ $dt['clearSearch'] }}" x-on:click="query = ''" style="display: none"
                    class="absolute end-1.5 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                    <x-lucide-x aria-hidden="true" class="size-3.5" />
                </button>
            </div>
        </div>
        @if ($tableHidden)
            <x-nq::apm-panels.body :error="$error" :loading="$loading" :retry="$retry" :t="$t" height="h-40" />
        @else
            <div data-slot="table-container" role="region" tabindex="0" aria-label="{{ $t['endpoints'] }}"
                class="relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                <div data-slot="table" role="table" aria-label="{{ $t['endpoints'] }}" class="grid w-full min-w-max grid-cols-[repeat(5,auto)] text-body-sm">
                    <div data-slot="table-header" role="rowgroup" class="contents">
                        <div role="row" data-slot="table-row" class="col-span-full grid grid-cols-subgrid border-b border-border">
                            @foreach ($cols as $c)
                                <div role="columnheader" data-slot="table-head" data-col="{{ $c['id'] }}" x-bind:aria-sort="ariaSort('{{ $c['id'] }}')"
                                    class="flex h-row items-center px-4 py-3 {{ $c['align'] === 'end' ? 'justify-end text-end' : 'text-start' }} align-middle text-caption font-medium whitespace-nowrap text-muted-foreground">
                                    <button type="button" x-on:click="sortBy('{{ $c['id'] }}')" x-bind:class="sort.id === '{{ $c['id'] }}' ? 'text-foreground' : ''"
                                        class="-mx-1.5 inline-flex h-7 max-w-full items-center gap-1 rounded-control px-1.5 outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus {{ $c['align'] === 'end' ? 'flex-row-reverse' : '' }}">
                                        <span>{{ $c['header'] }}</span>
                                        <x-lucide-chevrons-up-down aria-hidden="true" class="size-3.5 shrink-0 opacity-40" x-show="sort.id !== '{{ $c['id'] }}'" />
                                        <x-lucide-arrow-up aria-hidden="true" class="size-3.5 shrink-0" x-show="sort.id === '{{ $c['id'] }}' ? sort.dir === 'asc' : false" style="display: none" />
                                        <x-lucide-arrow-down aria-hidden="true" class="size-3.5 shrink-0" x-show="sort.id === '{{ $c['id'] }}' ? sort.dir === 'desc' : false" style="display: none" />
                                    </button>
                                </div>
                            @endforeach
                        </div>
                    </div>
                    <div role="rowgroup" class="contents" data-slot="table-body">
                        @foreach ($list as $i => $r)
                            <div role="row" data-slot="table-row" data-row data-row-id="{{ $r['id'] }}" x-bind:style="rowStyle(@js((string) $r['id']))" @if ($i >= $pageSize && $pageSize > 0) style="display: none" @endif
                                @if ($rowClick) tabindex="0" x-on:click="pick(@js((string) $r['id']))" x-on:keydown.enter.self.prevent="pick(@js((string) $r['id']))" @endif
                                class="col-span-full grid grid-cols-subgrid group/row border-b border-border outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus {{ $rowClick ? 'cursor-pointer' : '' }}">
                                <div role="cell" data-slot="table-cell" class="flex h-row items-center px-4 py-3 align-middle whitespace-nowrap">
                                    <bdi dir="ltr" class="flex max-w-[30ch] items-center gap-2 sm:max-w-[44ch]">
                                        <x-nq::badge variant="outline" class="font-mono">{{ $r['method'] }}</x-nq::badge>
                                        <span class="truncate font-mono text-code">{{ $r['route'] }}</span>
                                    </bdi>
                                </div>
                                <div role="cell" data-slot="table-cell" class="flex h-row items-center justify-end px-4 py-3 text-end align-middle whitespace-nowrap">
                                    <x-nq::numeric :value="$r['requests']" compact :max-fraction="1" />
                                </div>
                                <div role="cell" data-slot="table-cell" class="flex h-row items-center justify-end px-4 py-3 text-end align-middle whitespace-nowrap">
                                    <bdi dir="ltr">{{ nq_apm_millis($r['p50'], $ar) }}</bdi>
                                </div>
                                <div role="cell" data-slot="table-cell" class="flex h-row items-center justify-end px-4 py-3 text-end align-middle whitespace-nowrap">
                                    <span class="inline-flex items-center justify-end gap-2">
                                        @if ($r['p95'] > $slowMs)<x-nq::status tone="warning" tinted class="text-caption">{{ $t['slow'] }}</x-nq::status>@endif
                                        <bdi dir="ltr">{{ nq_apm_millis($r['p95'], $ar) }}</bdi>
                                    </span>
                                </div>
                                <div role="cell" data-slot="table-cell" class="flex h-row items-center justify-end px-4 py-3 text-end align-middle whitespace-nowrap">
                                    <x-nq::numeric :value="$r['errorRate']" style="percent" :max-fraction="2" :class="$r['errorRate'] >= 0.05 ? 'text-nq-danger-text' : null" />
                                </div>
                            </div>
                        @endforeach
                        <div role="row" data-slot="table-row" x-show="shownCount === 0" @if (count($list) > 0) style="display: none" @endif class="col-span-full grid grid-cols-subgrid border-0">
                            <div role="cell" data-slot="table-cell" class="col-span-full h-auto p-0 whitespace-normal">
                                <x-nq::states.empty :title="$t['empty']" class="border-0" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            @if ($pageSize > 0)
                <nav data-slot="data-table-pagination" aria-label="{{ $dt['pagination'] }}" x-show="pageCount > 1" @if (count($list) <= $pageSize) style="display: none" @endif class="flex flex-wrap items-center justify-end gap-2">
                    <span class="text-caption tabular-nums text-muted-foreground" aria-live="polite" x-text="rangeText()"></span>
                    <button type="button" aria-label="{{ $dt['previous'] }}" x-bind:disabled="page === 0 ? '' : null" x-on:click="setPage(page - 1)"
                        class="inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4"><x-lucide-chevron-left aria-hidden="true" class="rtl:-scale-x-100" /></button>
                    <button type="button" aria-label="{{ $dt['next'] }}" x-bind:disabled="page >= pageCount - 1 ? '' : null" x-on:click="setPage(page + 1)"
                        class="inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4"><x-lucide-chevron-right aria-hidden="true" class="rtl:-scale-x-100" /></button>
                </nav>
            @endif
        @endif
    </x-nq::card.content>
</x-nq::card>
