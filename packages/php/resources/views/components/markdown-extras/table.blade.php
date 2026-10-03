{{-- <x-nq::markdown-extras.table :columns="['Order', ['header' => 'Total', 'align' => 'end']]" :rows="[['A-1', '$40'], ['A-2', '$9']]" downloadable download-name="orders.csv" />
     A data table for Markdown content: click a header to sort (numbers by value, text in the reader's language order, empty cells last), type to
     filter (Arabic-folded), see "3 of 12 rows", and download CSV. Sorting and filtering happen on the plain text of the cells; the cells keep their formatting.
     columns: a list of headers (text) or ['header' => text or HtmlString, 'text' => plain text, 'align' => start | center | end].
     rows: a list of cell lists (text or HtmlString), or ['cells' => [...], 'texts' => [...]]. Text is escaped, an HtmlString is trusted.
     sortable (true). filterable (true | false | 'auto'; auto shows the box from filter-min-rows rows). filter-min-rows (6). downloadable (false). download-name ("table.csv").
     label (accessible name, "Table"). default-sort: ['column' => 1, 'direction' => 'desc']. labels: string overrides (filter, clearFilter, sortBy, rowCount, noMatch, downloadCsv, sorted, ascending, descending, table).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['columns' => [], 'rows' => [], 'sortable' => true, 'filterable' => 'auto', 'filterMinRows' => 6, 'downloadable' => false, 'downloadName' => 'table.csv', 'label' => null, 'defaultSort' => null, 'labels' => []])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $L = array_merge([
        'filter' => $t('Filter rows', 'تصفية الصفوف'),
        'clearFilter' => $t('Clear filter', 'مسح التصفية'),
        'sortBy' => $t('Sort by {column}', 'ترتيب حسب {column}'),
        'rowCount' => $t('{shown} of {total} rows', '{shown} من {total} صفًا'),
        'noMatch' => $t('No rows match “{query}”.', 'لا صفوف تطابق «{query}».'),
        'downloadCsv' => $t('Download CSV', 'تنزيل CSV'),
        'sorted' => $t('Sorted by {column}, {direction}', 'مرتب حسب {column}، {direction}'),
        'ascending' => $t('ascending', 'تصاعديًا'),
        'descending' => $t('descending', 'تنازليًا'),
        'table' => $t('Table', 'جدول'),
    ], (array) $labels);
    $fill = fn (string $tpl, array $v) => preg_replace_callback('/\{(\w+)\}/', fn ($m) => (string) ($v[$m[1]] ?? ''), $tpl);
    $plain = fn ($v) => $v instanceof \Illuminate\Contracts\Support\Htmlable ? trim(html_entity_decode(strip_tags($v->toHtml()), ENT_QUOTES | ENT_HTML5, 'UTF-8')) : (string) $v;
    $truthy = fn ($v) => in_array($v, [true, 'true', 1, '1'], true);

    $cols = [];
    foreach ($columns as $c) {
        $c = is_array($c) ? $c : ['header' => $c];
        $c['text'] ??= $plain($c['header'] ?? '');
        $c['align'] = in_array($c['align'] ?? 'start', ['start', 'center', 'end'], true) ? ($c['align'] ?? 'start') : 'start';
        $cols[] = $c;
    }
    $body = [];
    foreach ($rows as $r) {
        $r = isset($r['cells']) ? $r : ['cells' => $r];
        $r['texts'] ??= array_map($plain, array_values($r['cells']));
        $body[] = $r;
    }
    $total = count($body);
    $sortable = $truthy($sortable);
    $showFilter = $truthy($filterable) || ($filterable === 'auto' && $total >= (int) $filterMinRows);
    $downloadable = $truthy($downloadable);
    $align = ['start' => 'text-start', 'center' => 'text-center', 'end' => 'text-end'];
    $config = [
        'headers' => array_column($cols, 'text'),
        'texts' => array_column($body, 'texts'),
        'sortable' => $sortable,
        'showFilter' => $showFilter,
        'defaultSort' => $defaultSort,
        'downloadName' => $downloadName,
        'labels' => array_intersect_key($L, array_flip(['rowCount', 'noMatch', 'sorted', 'ascending', 'descending'])),
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'markdown-table') }}" x-data="nqMarkdownTable({!! \Illuminate\Support\Js::from($config) !!})" x-effect="render()"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-2') }}>
    @if ($showFilter || $downloadable)
        <div class="flex flex-wrap items-center justify-between gap-2">
            @if ($showFilter)
                <x-nq::input-group class="h-control-sm max-w-64">
                    <x-nq::input-group.addon><x-lucide-search aria-hidden="true" /></x-nq::input-group.addon>
                    <x-nq::input-group.input type="search" x-model="query" placeholder="{{ $L['filter'] }}" aria-label="{{ $L['filter'] }}" />
                    <x-nq::input-group.addon align="end" x-show="hasQuery" style="display: none">
                        <button type="button" aria-label="{{ $L['clearFilter'] }}" x-on:click="clear()" class="rounded-[2px] outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                            <x-lucide-x aria-hidden="true" />
                        </button>
                    </x-nq::input-group.addon>
                </x-nq::input-group>
            @else
                <span></span>
            @endif
            <div class="flex items-center gap-2">
                @if ($showFilter)
                    <span class="text-caption text-muted-foreground tabular-nums" x-text="count">{{ $fill($L['rowCount'], ['shown' => $total, 'total' => $total]) }}</span>
                @endif
                @if ($downloadable)
                    <x-nq::button variant="ghost" size="sm" x-on:click="download()"><x-lucide-download aria-hidden="true" />{{ $L['downloadCsv'] }}</x-nq::button>
                @endif
            </div>
        </div>
    @endif
    <x-nq::table :label="$label ?? $L['table']" dir="auto">
        <x-nq::table.header>
            <x-nq::table.row>
                @foreach ($cols as $i => $col)
                    <x-nq::table.head x-bind:aria-sort="ariaSort({{ $i }})" class="{{ $align[$col['align']] }}">
                        @if ($sortable)
                            <button type="button" title="{{ $fill($L['sortBy'], ['column' => $col['text']]) }}" x-on:click="toggle({{ $i }})" x-bind:class="isSorted({{ $i }}) ? `text-foreground` : ``"
                                class="-mx-1.5 inline-flex items-center gap-1 rounded-control px-1.5 py-1 font-medium outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                                {{ $col['header'] }}
                                <x-lucide-chevrons-up-down aria-hidden="true" class="size-3 opacity-50" x-show="isIdle({{ $i }})" />
                                <x-lucide-arrow-up aria-hidden="true" class="size-3" x-show="isUp({{ $i }})" style="display: none" />
                                <x-lucide-arrow-down aria-hidden="true" class="size-3" x-show="isDown({{ $i }})" style="display: none" />
                            </button>
                        @else
                            {{ $col['header'] }}
                        @endif
                    </x-nq::table.head>
                @endforeach
            </x-nq::table.row>
        </x-nq::table.header>
        <x-nq::table.body>
            @foreach ($body as $r => $row)
                <x-nq::table.row data-row="{{ $r }}">
                    @foreach ($cols as $i => $col)
                        <x-nq::table.cell dir="auto" class="h-auto whitespace-normal py-2 {{ $align[$col['align']] }}">{{ $row['cells'][$i] ?? '' }}</x-nq::table.cell>
                    @endforeach
                </x-nq::table.row>
            @endforeach
            <x-nq::table.row data-empty style="display: none">
                <x-nq::table.cell colspan="{{ max(1, count($cols)) }}" class="h-auto py-6 text-center whitespace-normal text-muted-foreground"><span x-text="emptyText"></span></x-nq::table.cell>
            </x-nq::table.row>
        </x-nq::table.body>
    </x-nq::table>
    <p class="sr-only" role="status" x-text="status"></p>
</div>
