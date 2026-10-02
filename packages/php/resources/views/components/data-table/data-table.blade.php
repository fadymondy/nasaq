{{-- <x-nq::data-table label="Issues" :columns="[['id' => 'title', 'header' => 'Title', 'sortable' => true, 'searchable' => true]]" :rows="[['id' => 'MH-1', 'title' => 'Fix login']]" selectable :page-size="20" />
     A sortable, searchable, filterable, paginated table with selection, expandable rows, in-cell editing and row actions.
     label: the accessible name of the table (localise it). rows: arrays keyed by column; x-modelable. row-key: the row field that identifies a row (default "id"). name-key: the field that names a row for "Select …" (default row-key).
     columns: each ['id', 'header', 'key' (row field, default id), 'type' => text | mono | number | date | datetime | currency | status | tag | boolean | meter | avatar | link, 'sortable', 'sortKey' (a row field with the number to sort by, when the cell shows text), 'searchable', 'hideable' (default true), 'hidden', 'align' => start | center | end,
       'filter' => true (a facet filter on the column's options), 'range' => true | ['kind' => 'date'], 'options' => [['value', 'label', 'tone' => neutral | info | success | warning | danger, 'hue' => blue …]],
       'currency' => 'USD' (default USD, SAR in Arabic), 'edit' => text | number | date | switch | select].
     Cell types: mono (code font); datetime (date + time, 'format' => 'relative' shows "2 hours ago" with the absolute time as its title); meter (0..'max' 100 bar, turns warning at 'warnAt' 0.8 and danger at 'dangerAt' 0.95);
       avatar (initials, or the row field named by 'src' as the image; the value is the name, 'secondary' names the row field shown under it ('secondaryDir' => 'ltr' for emails),
       'badge' => 'self' + 'badgeLabel' => 'You' draws an outline badge after the name on rows where that field is truthy); link ('href' = a row field, or a template "/issues/{key}"; 'target');
       'template' => '{first} {last}' fills a text cell from the row.
     Custom cell (React's `cell: (row) => ReactNode`): a named slot per column, <x-slot name="cell_title"> <b x-text="row.title"></b> </x-slot>. It renders inside each row's Alpine scope, so `row` and the table's methods
       (shownText(row, col('id')), rid(row)) are in reach. Use column ids made of letters, digits and underscores for slot columns. The slot replaces the built-in cell.
     selectable: a checkbox column and a selection bar. multi-sort: Shift-click adds a sort key. page-size: rows per page (0 = all). page-size-options: [10, 25, 50] adds a rows-per-page choice.
     search: the search box (true; pass a string for the placeholder). view-options: the View menu (true). density-menu: add Density to it. density, frame, bordered, striped, hover: as the table.
     row-actions: [['id' => 'edit', 'label' => 'Edit', 'icon' => 'pencil', 'danger' => false, 'group' => null]] opens the ⋯ menu, and the same list opens as a context menu on right-click, long-press, Shift+F10 or the Menu key on a row
       (context-menu="false" keeps the browser's menu; inputs, links and Shift + right-click always do). Per row: 'visibleWhen' / 'disabledWhen' => ['field' => 'status', 'in' => ['open', 'blocked']] (also 'notIn', 'eq', 'ne', 'empty' => true; 'any' => [cond, …] / 'all' => [cond, …] combine conditions),
       and actions-key="actions" names a row field that lists the action ids the row allows (rows without it show every action). A row left with no action loses its ⋯ button. row-click: make rows activatable (click, or Enter on the focused row).
     expand: the row field whose text is shown under the row by its chevron. loading, error (a message), labels: ['view' => …, 'columns' => …, …] to override any string.
     Slots: toolbar (more controls after the filters), bulk (actions in the selection bar), empty (when there are no rows at all).
     Events (bubbling): nq-data-table-row-click { row }, nq-data-table-action { action, row }, nq-data-table-selection { ids }, nq-data-table-edit { row, column, value, promise }:
     set event.detail.promise to a Promise (or one resolving to { error }); until it settles the cell shows the value as pending and an error rolls it back.
     Not ported here: column pinning and resizing. Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'label', 'columns' => [], 'rows' => [], 'rowKey' => 'id', 'nameKey' => null, 'selectable' => false, 'multiSort' => false, 'pageSize' => 0, 'pageSizeOptions' => [],
    'search' => true, 'viewOptions' => true, 'densityMenu' => false, 'density' => 'default', 'frame' => false, 'bordered' => false, 'striped' => false, 'hover' => true,
    'rowActions' => [], 'actionsKey' => null, 'contextMenu' => true, 'rowClick' => false, 'expand' => null, 'loading' => false, 'error' => null, 'labels' => [], 'locale' => null,
])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $strings = [
        'en' => [
            'search' => 'Search…', 'clearSearch' => 'Clear search', 'view' => 'View', 'columns' => 'Columns', 'selectAll' => 'Select all rows on this page', 'selectRow' => 'Select {name}',
            'actions' => 'Actions', 'rowActions' => 'Actions for {name}', 'selected' => '{n} selected', 'clearSelection' => 'Clear selection', 'range' => '{from}–{to} of {total}',
            'previous' => 'Previous page', 'next' => 'Next page', 'pagination' => 'Pagination', 'empty' => 'Nothing here yet', 'noResults' => 'No matching results',
            'noResultsHint' => 'Try a different search or clear the filters.', 'clearFilters' => 'Clear filters', 'loading' => 'Loading…', 'reset' => 'Reset',
            'editCell' => '{column}, {row}', 'invalidNumber' => 'Enter a number', 'invalidDate' => 'Enter a date', 'saving' => 'Saving…', 'saved' => 'Saved',
            'saveFailed' => "Couldn't save the change", 'saveFailedFor' => "Couldn't save: {message}", 'expandRow' => 'Show details for {name}', 'details' => 'Details for {name}',
            'ascending' => 'ascending', 'descending' => 'descending', 'multiSortHint' => 'Shift-click to sort by more columns', 'density' => 'Density',
            'compact' => 'Compact', 'default' => 'Default', 'comfortable' => 'Comfortable', 'rowsPerPage' => 'Rows per page', 'rangeFrom' => 'From', 'rangeTo' => 'To',
            'rangeAtLeast' => '≥ {v}', 'rangeAtMost' => '≤ {v}', 'yes' => 'Yes', 'no' => 'No',
        ],
        'ar' => [
            'search' => 'ابحث…', 'clearSearch' => 'مسح البحث', 'view' => 'العرض', 'columns' => 'الأعمدة', 'selectAll' => 'تحديد كل صفوف هذه الصفحة', 'selectRow' => 'تحديد {name}',
            'actions' => 'الإجراءات', 'rowActions' => 'إجراءات {name}', 'selected' => '{n} محدد', 'clearSelection' => 'إلغاء التحديد', 'range' => '{from}–{to} من {total}',
            'previous' => 'الصفحة السابقة', 'next' => 'الصفحة التالية', 'pagination' => 'التنقل بين الصفحات', 'empty' => 'لا شيء هنا بعد', 'noResults' => 'لا نتائج مطابقة',
            'noResultsHint' => 'جرّب بحثًا آخر أو امسح عوامل التصفية.', 'clearFilters' => 'مسح التصفية', 'loading' => 'جارٍ التحميل…', 'reset' => 'إعادة الضبط',
            'editCell' => '{column}، {row}', 'invalidNumber' => 'أدخل رقمًا', 'invalidDate' => 'أدخل تاريخًا', 'saving' => 'جارٍ الحفظ…', 'saved' => 'تم الحفظ',
            'saveFailed' => 'تعذّر حفظ التغيير', 'saveFailedFor' => 'تعذّر الحفظ: {message}', 'expandRow' => 'إظهار تفاصيل {name}', 'details' => 'تفاصيل {name}',
            'ascending' => 'تصاعدي', 'descending' => 'تنازلي', 'multiSortHint' => 'اضغط مع Shift للترتيب حسب أعمدة أخرى', 'density' => 'الكثافة',
            'compact' => 'مضغوطة', 'default' => 'عادية', 'comfortable' => 'مريحة', 'rowsPerPage' => 'صفوف في الصفحة', 'rangeFrom' => 'من', 'rangeTo' => 'إلى',
            'rangeAtLeast' => '≥ {v}', 'rangeAtMost' => '≤ {v}', 'yes' => 'نعم', 'no' => 'لا',
        ],
    ];
    $t = array_merge($strings[$ar ? 'ar' : 'en'], (array) $labels);
    $cols = array_values(array_map(function ($c) {
        $c = (array) $c;
        $c['header'] ??= $c['id'];
        $c['type'] ??= 'text';
        return $c;
    }, (array) $columns));
    $list = array_values(array_map(fn ($r) => (array) $r, (array) $rows));
    $options = array_filter([
        'key' => $rowKey !== 'id' ? $rowKey : null,
        'nameKey' => $nameKey,
        'pageSize' => $pageSize ?: null,
        'selectable' => $selectable ? true : null,
        'multiSort' => $multiSort ? true : null,
        'density' => $density !== 'default' ? $density : null,
        'locale' => $locale ?? ($ar ? 'ar' : 'en'),
        'expand' => $expand,
        'actions' => array_map(fn ($a) => array_filter(array_intersect_key((array) $a, array_flip(['id', 'group', 'visibleWhen', 'disabledWhen'])), fn ($v) => $v !== null), array_values((array) $rowActions)),
        'actionsKey' => $actionsKey,
        'contextMenu' => $contextMenu ? null : false,
        'labels' => array_intersect_key($t, array_flip(['selectRow', 'rowActions', 'expandRow', 'details', 'selected', 'range', 'saving', 'saved', 'saveFailed', 'saveFailedFor', 'invalidNumber', 'invalidDate', 'rangeAtLeast', 'rangeAtMost', 'editCell'])),
    ], fn ($v) => $v !== null);
    $actions = array_values(array_map(fn ($a) => (array) $a, (array) $rowActions));
    $hide = 'style="display: none"';
    $q = fn ($s) => "'" . str_replace(['\\', "'"], ['\\\\', "\\'"], $s) . "'";
    $clickable = (bool) $rowClick;
    $expandable = (bool) $expand;
    $fixed = ($selectable ? 1 : 0) + ($expandable ? 1 : 0) + (count($actions) ? 1 : 0);
    $span = count($cols) + ($selectable ? 1 : 0) + ($expandable ? 1 : 0) + (count($actions) ? 1 : 0);
    $searchText = is_string($search) ? $search : $t['search'];
    $facets = array_values(array_filter($cols, fn ($c) => ! empty($c['filter'])));
    $ranged = array_values(array_filter($cols, fn ($c) => ! empty($c['range'])));
    $hideable = array_values(array_filter($cols, fn ($c) => ($c['hideable'] ?? true) !== false));
    $btn = 'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-border bg-card text-foreground font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-control-sm px-2.5';
    $box = 'relative inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-nq-line-strong bg-card text-primary-foreground outline-none transition-colors duration-150 ease-nq data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus after:absolute after:-inset-1 align-middle';
    $input = 'w-full min-w-0 rounded-control border border-input bg-card px-2 text-body-sm text-foreground outline-none transition-colors duration-150 ease-nq focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus h-control-sm';
    $toneText = ['neutral' => 'text-muted-foreground', 'info' => 'text-nq-info-text', 'success' => 'text-nq-success-text', 'warning' => 'text-nq-warning-text', 'danger' => 'text-nq-danger-text'];
    $toneIcon = ['neutral' => 'circle', 'info' => 'circle-dot', 'success' => 'circle-check', 'warning' => 'circle-alert', 'danger' => 'circle-x'];
    $msg = 'absolute start-0 top-full z-20 mt-1 max-w-64 rounded-control border border-nq-danger-text/30 bg-card px-2 py-1 text-caption whitespace-normal text-nq-danger-text shadow-md';
    $pageSizes = array_values(array_map('intval', (array) $pageSizeOptions));
@endphp
<div data-slot="data-table" x-data="nqDataTable({!! \Illuminate\Support\Js::from($list) !!}, {!! \Illuminate\Support\Js::from($cols) !!}, {!! \Illuminate\Support\Js::from((object) $options) !!})" x-modelable="rows"
    {{ $attributes->cn('flex min-w-0 flex-col gap-3') }}>
    @if ($search || $facets || $ranged || $viewOptions || isset($toolbar))
        <div data-slot="data-table-toolbar" class="flex flex-wrap items-center gap-2">
            @if ($search)
                <div data-slot="data-table-search" class="relative w-full sm:w-64">
                    <x-lucide-search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <x-nq::field.input type="search" x-model="query" x-on:keydown.escape="if (query) { $event.preventDefault(); query = '' }" placeholder="{{ $searchText }}" aria-label="{{ $searchText }}"
                        class="h-control-sm ps-8 pe-8 text-body-sm [&::-webkit-search-cancel-button]:hidden" />
                    <button type="button" x-show="query" aria-label="{{ $t['clearSearch'] }}" x-on:click="query = ''" {!! $hide !!}
                        class="absolute end-1.5 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                        <x-lucide-x aria-hidden="true" class="size-3.5" />
                    </button>
                </div>
            @endif

            @foreach ($facets as $c)
                <x-nq::dropdown-menu>
                    <x-nq::dropdown-menu.trigger size="sm" x-bind:class="facetCount('{{ $c['id'] }}') ? '' : 'border-dashed text-muted-foreground'" data-facet="{{ $c['id'] }}">
                        <x-lucide-list-filter aria-hidden="true" />
                        {{ $c['header'] }}
                        <span data-slot="badge" x-show="facetCount('{{ $c['id'] }}')" x-text="facetSummary('{{ $c['id'] }}')" {!! $hide !!}
                            class="-me-1 inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-border px-1.5 text-caption font-medium tabular-nums text-muted-foreground"></span>
                    </x-nq::dropdown-menu.trigger>
                    <x-nq::dropdown-menu.content class="min-w-48">
                        <x-nq::dropdown-menu.group>
                            @foreach ((array) ($c['options'] ?? []) as $o)
                                <x-nq::dropdown-menu.checkbox-item x-model="facet['{{ $c['id'] }}|{{ $o['value'] }}']">{{ $o['label'] }}</x-nq::dropdown-menu.checkbox-item>
                            @endforeach
                        </x-nq::dropdown-menu.group>
                        <div x-show="facetCount('{{ $c['id'] }}')" {!! $hide !!}>
                            <x-nq::dropdown-menu.separator />
                            <x-nq::dropdown-menu.item x-on:click="resetFacet('{{ $c['id'] }}')">{{ $t['reset'] }}</x-nq::dropdown-menu.item>
                        </div>
                    </x-nq::dropdown-menu.content>
                </x-nq::dropdown-menu>
            @endforeach

            @foreach ($ranged as $c)
                @php $kind = (is_array($c['range']) ? ($c['range']['kind'] ?? null) : null) ?? ($c['type'] === 'date' ? 'date' : 'number'); @endphp
                <x-nq::popover>
                    <x-nq::popover.trigger size="sm" x-bind:class="rangeActive('{{ $c['id'] }}') ? '' : 'border-dashed text-muted-foreground'" data-slot="data-table-range-filter">
                        <x-lucide-sliders-horizontal aria-hidden="true" />
                        {{ $c['header'] }}
                        <span data-slot="badge" x-show="rangeActive('{{ $c['id'] }}')" x-text="rangeSummary('{{ $c['id'] }}')" {!! $hide !!}
                            class="-me-1 inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-border px-1.5 text-caption font-medium tabular-nums text-muted-foreground"></span>
                    </x-nq::popover.trigger>
                    <x-nq::popover.content align="start" class="w-64">
                        <fieldset class="grid gap-3">
                            <legend class="mb-2 text-label text-foreground">{{ $c['header'] }}</legend>
                            <div class="grid grid-cols-2 gap-2">
                                @foreach (['min' => $t['rangeFrom'], 'max' => $t['rangeTo']] as $edge => $edgeLabel)
                                    <div class="grid gap-1">
                                        <label class="text-caption text-muted-foreground">{{ $edgeLabel }}
                                            <input type="{{ $kind }}" @if ($kind === 'number') inputmode="decimal" @endif data-range="{{ $c['id'] }}-{{ $edge }}"
                                                x-bind:value="rangeOf('{{ $c['id'] }}').{{ $edge }} ?? ''" x-on:input="setRangeEdge('{{ $c['id'] }}', '{{ $edge }}', $event.target.value)"
                                                class="{{ $input }} mt-1 tabular-nums">
                                        </label>
                                    </div>
                                @endforeach
                            </div>
                            <button type="button" x-show="rangeActive('{{ $c['id'] }}')" x-on:click="resetRange('{{ $c['id'] }}')" {!! $hide !!}
                                class="inline-flex h-control-sm items-center justify-self-start rounded-control px-2.5 text-label text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">{{ $t['reset'] }}</button>
                        </fieldset>
                    </x-nq::popover.content>
                </x-nq::popover>
            @endforeach

            @isset($toolbar){{ $toolbar }}@endisset

            @if ($viewOptions && (count($hideable) || $densityMenu))
                <x-nq::dropdown-menu>
                    <x-nq::dropdown-menu.trigger size="sm" class="ms-auto">
                        <x-lucide-settings-2 aria-hidden="true" />
                        {{ $t['view'] }}
                    </x-nq::dropdown-menu.trigger>
                    <x-nq::dropdown-menu.content align="end" class="min-w-48">
                        @if (count($hideable))
                            <x-nq::dropdown-menu.group>
                                <x-nq::dropdown-menu.label>{{ $t['columns'] }}</x-nq::dropdown-menu.label>
                                @foreach ($hideable as $c)
                                    <x-nq::dropdown-menu.checkbox-item x-model="shown['{{ $c['id'] }}']" x-bind:disabled="shown['{{ $c['id'] }}'] && shownCount() === 1 ? '' : null">{{ $c['header'] }}</x-nq::dropdown-menu.checkbox-item>
                                @endforeach
                            </x-nq::dropdown-menu.group>
                        @endif
                        @if ($densityMenu)
                            @if (count($hideable))<x-nq::dropdown-menu.separator />@endif
                            <x-nq::dropdown-menu.group>
                                <x-nq::dropdown-menu.label>{{ $t['density'] }}</x-nq::dropdown-menu.label>
                                <x-nq::dropdown-menu.radio-group :value="$density" x-model="density">
                                    @foreach (['compact', 'default', 'comfortable'] as $d)
                                        <x-nq::dropdown-menu.radio-item :value="$d">{{ $t[$d] }}</x-nq::dropdown-menu.radio-item>
                                    @endforeach
                                </x-nq::dropdown-menu.radio-group>
                            </x-nq::dropdown-menu.group>
                        @endif
                    </x-nq::dropdown-menu.content>
                </x-nq::dropdown-menu>
            @endif
        </div>
    @endif

    @if ($selectable)
        <div data-slot="data-table-bulk-actions" role="toolbar" x-bind:aria-label="selectedText()" x-bind:hidden="selectedCount() === 0" hidden
            class="flex flex-wrap items-center gap-2 rounded-control bg-nq-selected py-1 ps-3 pe-1">
            <span aria-live="polite" class="me-auto text-label tabular-nums text-foreground" x-text="selectedText()"></span>
            @isset($bulk){{ $bulk }}@endisset
            <button type="button" aria-label="{{ $t['clearSelection'] }}" x-on:click="clearSelection()"
                class="inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-x aria-hidden="true" /></button>
        </div>
    @endif

    <div data-slot="table-container" role="region" tabindex="0" aria-label="{{ $label }}" @if ($loading) aria-busy="true" @endif
        class="{{ \Nasaq\Cn::merge('relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus', $frame ? 'rounded-card border border-border bg-card' : '') }}">
        <div data-slot="table" role="table" aria-label="{{ $label }}" x-bind:style="'grid-template-columns: repeat(' + (shownCount() + {{ $fixed }}) + ', auto)'" x-bind:data-density="density" @if ($frame) data-frame @endif @if ($bordered) data-bordered @endif @if ($striped) data-striped @endif
            class="{{ \Nasaq\Cn::merge('grid w-full min-w-max text-body-sm', $frame ? '[&_[data-slot=table-header]]:bg-secondary/50' : '', $bordered ? '[&_[role=cell]:not(:last-child)]:border-e [&_[role=cell]]:border-border [&_[role=columnheader]:not(:last-child)]:border-e [&_[role=columnheader]]:border-border' : '') }}">
            <div data-slot="table-header" role="rowgroup" class="contents">
                <div role="row" data-slot="table-row" class="col-span-full grid grid-cols-subgrid border-b border-border">
                    @if ($selectable)
                        <div role="columnheader" data-slot="table-head" x-bind:class="pad" class="flex items-center h-row w-10 pe-0 text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground">
                            <button type="button" role="checkbox" data-slot="checkbox" aria-label="{{ $t['selectAll'] }}" x-on:click="togglePage()"
                                x-bind:aria-checked="pageSelection() === 'all' ? 'true' : (pageSelection() === 'some' ? 'mixed' : 'false')"
                                x-bind:data-checked="pageSelection() === 'all' ? '' : null" x-bind:data-indeterminate="pageSelection() === 'some' ? '' : null"
                                aria-checked="false" class="{{ $box }}">
                                <span data-slot="checkbox-indicator" class="flex items-center justify-center [&_svg]:size-3 [&_svg]:stroke-3" x-show="pageSelection() !== 'none'" {!! $hide !!}>
                                    <x-lucide-minus aria-hidden="true" x-show="pageSelection() === 'some'" {!! $hide !!} />
                                    <x-lucide-check aria-hidden="true" x-show="pageSelection() === 'all'" {!! $hide !!} />
                                </span>
                            </button>
                        </div>
                    @endif
                    @if ($expandable)
                        <div role="columnheader" data-slot="table-head" x-bind:class="pad" class="flex items-center h-row w-10 pe-0 text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground"><span class="sr-only">{{ str_replace('{name}', '', $t['details']) }}</span></div>
                    @endif
                    @foreach ($cols as $c)
                        @php $align = ($c['align'] ?? 'start') === 'end' ? 'text-end justify-end' : (($c['align'] ?? 'start') === 'center' ? 'text-center justify-center' : 'text-start'); @endphp
                        <div role="columnheader" data-slot="table-head" data-col="{{ $c['id'] }}" x-show="shown['{{ $c['id'] }}']" x-bind:class="pad" @if (! empty($c['sortable'])) x-bind:aria-sort="ariaSort('{{ $c['id'] }}')" @endif
                            class="flex items-center h-row {{ $align }} align-middle text-caption font-medium whitespace-nowrap text-muted-foreground">
                            @if (! empty($c['sortable']))
                                <button type="button" @if ($multiSort) title="{{ $t['multiSortHint'] }}" @endif x-on:click="toggleSort('{{ $c['id'] }}', $event.shiftKey)"
                                    x-bind:class="sortOf('{{ $c['id'] }}') ? 'text-foreground' : ''"
                                    class="-mx-1.5 inline-flex h-7 max-w-full items-center gap-1 rounded-control px-1.5 outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus {{ ($c['align'] ?? '') === 'end' ? 'flex-row-reverse' : '' }}">
                                    <span>{{ $c['header'] }}</span>
                                    <x-lucide-chevrons-up-down aria-hidden="true" class="size-3.5 shrink-0 opacity-40" x-show="! sortOf('{{ $c['id'] }}')" />
                                    <x-lucide-arrow-up aria-hidden="true" class="size-3.5 shrink-0" x-show="sortOf('{{ $c['id'] }}') === 'asc'" {!! $hide !!} />
                                    <x-lucide-arrow-down aria-hidden="true" class="size-3.5 shrink-0" x-show="sortOf('{{ $c['id'] }}') === 'desc'" {!! $hide !!} />
                                    @if ($multiSort)
                                        <span aria-hidden="true" data-slot="data-table-sort-index" x-show="sorting.length > 1 && sortIndex('{{ $c['id'] }}') >= 0" x-text="sortIndex('{{ $c['id'] }}') + 1" {!! $hide !!}
                                            class="text-[10px] leading-none tabular-nums text-muted-foreground"></span>
                                    @endif
                                </button>
                            @else
                                {{ $c['header'] }}
                            @endif
                        </div>
                    @endforeach
                    @if (count($actions))
                        <div role="columnheader" data-slot="table-head" x-bind:class="pad" class="flex items-center h-row w-12 text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground"><span class="sr-only">{{ $t['actions'] }}</span></div>
                    @endif
                </div>
            </div>

            @if ($error)
                <div role="rowgroup" class="contents" data-slot="table-body">
                    <div role="row" data-slot="table-row" class="col-span-full grid grid-cols-subgrid border-0"><div role="cell" data-slot="table-cell" class="col-span-full h-auto p-0 whitespace-normal"><x-nq::states.error :title="$error" class="border-0" /></div></div>
                </div>
            @elseif ($loading)
                <div role="rowgroup" class="contents" data-slot="table-body" aria-hidden="true">
                    @for ($i = 0; $i < min(max($pageSize, 5), 8); $i++)
                        <div role="row" data-slot="table-row" class="col-span-full grid grid-cols-subgrid border-b border-border">
                            @if ($selectable)<div role="cell" data-slot="table-cell" class="flex items-center h-row w-10 px-4 py-3 pe-0"><x-nq::states.skeleton class="size-4 rounded-[4px]" /></div>@endif
                            @if ($expandable)<div role="cell" data-slot="table-cell" class="flex items-center h-row w-10 px-4 py-3 pe-0"></div>@endif
                            @foreach ($cols as $j => $c)
                                <div role="cell" data-slot="table-cell" class="flex items-center h-row px-4 py-3"><x-nq::states.skeleton class="h-3" style="inline-size: {{ [70, 48, 60, 40, 54][($i + $j) % 5] }}%" /></div>
                            @endforeach
                            @if (count($actions))<div role="cell" data-slot="table-cell" class="flex items-center h-row w-12 px-4 py-3"></div>@endif
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
                                @isset($empty){{ $empty }}@else<x-nq::states.empty :title="$t['empty']" class="border-0" />@endisset
                            </div>
                        </div>
                    </div>
                </div>

                <template x-for="(row, index) in pageRows" x-bind:key="rid(row)">
                    <div role="rowgroup" class="contents" data-slot="table-body">
                        <div role="row" data-slot="table-row" data-row tabindex="-1" x-bind:tabindex="index === Math.min(active, pageRows.length - 1) ? 0 : -1"
                            x-bind:data-state="isSelected(row) ? 'selected' : null" x-bind:aria-selected="isSelected(row) ? 'true' : null"
                            x-bind:aria-expanded="canExpand(row) ? String(isOpen(row)) : null" x-on:focus="if ($event.target === $event.currentTarget) active = index"
                            x-on:keydown="rowKey($event, row, index, {{ $clickable ? 'true' : 'false' }})"
                            @if (count($actions) && $contextMenu) x-on:contextmenu="rowContext(row, $event)" x-on:touchstart.passive="rowTouch(row, $event)" x-on:touchmove.passive="rowTouchEnd()" x-on:touchend="rowTouchEnd()" x-on:touchcancel="rowTouchEnd()" @endif
                            @if ($clickable) x-on:click="rowClick(row, $event)" @endif
                            x-bind:class="{{ $striped ? "(index % 2 === 1 ? 'bg-secondary/40 ' : '') + " : '' }}(isOpen(row) ? 'border-b-0 ' : '') + (ctxOpen && ctxRow === row ? 'bg-nq-hover' : '')"
                            class="col-span-full grid grid-cols-subgrid group/row border-b border-border outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus data-[state=selected]:bg-nq-selected {{ $hover ? 'hover:bg-nq-hover' : '' }} {{ $clickable ? 'cursor-pointer' : '' }}">
                            @if ($selectable)
                                <div role="cell" data-slot="table-cell" x-bind:class="pad" class="flex items-center h-row w-10 pe-0 align-middle whitespace-nowrap">
                                    <button type="button" role="checkbox" data-slot="checkbox" x-bind:aria-label="say('selectRow', row)" x-on:click="toggleRow(row)"
                                        aria-checked="false" x-bind:aria-checked="isSelected(row) ? 'true' : 'false'" x-bind:data-checked="isSelected(row) ? '' : null" x-bind:data-unchecked="isSelected(row) ? null : ''"
                                        x-bind:tabindex="index === Math.min(active, pageRows.length - 1) ? 0 : -1" class="{{ $box }}">
                                        <span data-slot="checkbox-indicator" class="flex items-center justify-center [&_svg]:size-3 [&_svg]:stroke-3" x-show="isSelected(row)" {!! $hide !!}><x-lucide-check aria-hidden="true" /></span>
                                    </button>
                                </div>
                            @endif
                            @if ($expandable)
                                <div role="cell" data-slot="table-cell" x-bind:class="pad" class="flex items-center h-row w-10 pe-0 align-middle whitespace-nowrap">
                                    <button type="button" data-slot="data-table-expand" x-show="canExpand(row)" x-on:click="toggleExpanded(row)" x-bind:aria-expanded="String(isOpen(row))"
                                        x-bind:aria-label="say('expandRow', row)" x-bind:tabindex="index === Math.min(active, pageRows.length - 1) ? 0 : -1"
                                        class="inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-4">
                                        <x-lucide-chevron-right aria-hidden="true" x-bind:class="isOpen(row) ? 'rotate-90 rtl:-rotate-90' : ''" class="transition-transform duration-150 ease-nq rtl:-scale-x-100" />
                                    </button>
                                </div>
                            @endif

                            @foreach ($cols as $c)
                                @php
                                    $id = $c['id'];
                                    $cx = "col('{$id}')";
                                    $align = ($c['align'] ?? 'start') === 'end' ? 'text-end justify-end' : (($c['align'] ?? 'start') === 'center' ? 'text-center justify-center' : '');
                                    $edit = $c['edit'] ?? null;
                                    $number = in_array($c['type'], ['number', 'currency'], true) ? 'tabular-nums' : '';
                                @endphp
                                <div role="cell" data-slot="table-cell" data-cell-col="{{ $id }}" x-show="shown['{{ $id }}']" x-bind:class="pad"
                                    @if ($edit)
                                        x-bind:data-cell-row="rid(row)" tabindex="-1" x-bind:data-editable="editable(row, {{ $cx }}) ? '' : null" x-bind:data-editing="isEditing(row, {{ $cx }}) ? '' : null"
                                        x-bind:aria-busy="isPending(row, {{ $cx }}) ? 'true' : null" x-bind:aria-invalid="failure(row, {{ $cx }}) ? 'true' : null"
                                        x-on:dblclick="beginEdit(row, {{ $cx }}, $event)" x-on:keydown.enter.self.prevent="beginEdit(row, {{ $cx }}, $event)" x-on:keydown.f2.self.prevent="beginEdit(row, {{ $cx }}, $event)"
                                        x-bind:class="failure(row, {{ $cx }}) ? 'bg-nq-danger-soft' : ''"
                                    @endif
                                    class="flex items-center relative h-row align-middle whitespace-nowrap {{ $align }} {{ $edit ? 'outline-none focus:outline-2 focus:-outline-offset-2 focus:outline-nq-focus' : '' }}">
                                    @if ($edit === 'switch')
                                        <button type="button" role="switch" data-slot="switch" x-bind:aria-label="editName(row, {{ $cx }})" x-on:click="toggleSwitch(row, {{ $cx }})"
                                            x-bind:aria-checked="shownValue(row, {{ $cx }}) === true ? 'true' : 'false'" aria-checked="false"
                                            x-bind:data-checked="shownValue(row, {{ $cx }}) === true ? '' : null" x-bind:data-unchecked="shownValue(row, {{ $cx }}) === true ? null : ''"
                                            x-bind:disabled="editable(row, {{ $cx }}) ? null : ''" x-bind:data-disabled="editable(row, {{ $cx }}) ? null : ''"
                                            class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-nq-line-strong p-0.5 outline-none transition-colors duration-150 ease-nq data-checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-disabled:cursor-not-allowed data-disabled:opacity-50">
                                            <span data-slot="switch-thumb" x-bind:data-checked="shownValue(row, {{ $cx }}) === true ? '' : null" x-bind:data-unchecked="shownValue(row, {{ $cx }}) === true ? null : ''"
                                                class="block size-4 rounded-full bg-background shadow-xs data-checked:bg-primary-foreground transition-[translate] duration-150 ease-nq data-checked:translate-x-3.5 rtl:data-checked:-translate-x-3.5"></span>
                                        </button>
                                    @else
                                        @if ($edit)
                                            <template x-if="isEditing(row, {{ $cx }})">
                                                <div>
                                                    @if ($edit === 'select')
                                                        <select x-model="draft" x-effect="draft = draft" aria-label="" x-bind:aria-label="editName(row, {{ $cx }})"
                                                            x-on:change="commitEdit(row, {{ $cx }}, 'none', $event, $event.target.value)" x-on:keydown.escape.stop.prevent="cancelEdit($event)" x-on:blur="cancelEdit($event)"
                                                            class="{{ $input }}">
                                                            <option value=""></option>
                                                            @foreach ((array) ($c['options'] ?? []) as $o)
                                                                <option value="{{ $o['value'] }}">{{ $o['label'] }}</option>
                                                            @endforeach
                                                        </select>
                                                    @else
                                                        <input type="{{ $edit }}" x-model="draft" aria-label="" x-bind:aria-label="editName(row, {{ $cx }})" x-bind:aria-invalid="invalid ? 'true' : null"
                                                            x-on:keydown.enter.prevent="commitEdit(row, {{ $cx }}, 'down', $event)" x-on:keydown.tab="if (! commitEdit(row, {{ $cx }}, 'right', $event)) $event.preventDefault()"
                                                            x-on:keydown.escape.stop.prevent="cancelEdit($event)" x-on:blur="commitEdit(row, {{ $cx }}, 'none', $event)"
                                                            class="{{ $input }} {{ $number }}">
                                                        <span role="alert" x-show="invalid" x-text="invalid" {!! $hide !!} class="{{ $msg }}"></span>
                                                    @endif
                                                </div>
                                            </template>
                                        @endif
                                        <span @if ($edit) x-show="! isEditing(row, {{ $cx }})" @endif class="flex min-w-0 items-center gap-1.5 {{ str_contains($align, 'text-end') ? 'justify-end' : '' }}" @if ($edit) x-bind:class="isPending(row, {{ $cx }}) ? 'opacity-60' : ''" @endif>
                                            @if (isset(${'cell_'.$id}))
                                                {{ ${'cell_'.$id} }}
                                            @elseif ($c['type'] === 'status')
                                                @foreach ($toneIcon as $tone => $icon)
                                                    <span data-slot="status" data-tone="{{ $tone }}" x-show="shownText(row, {{ $cx }}) !== '' && tone(row, {{ $cx }}) === '{{ $tone }}'" {!! $hide !!} class="inline-flex min-w-0 items-center gap-1.5 text-body-sm text-foreground">
                                                        <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" class="size-3.5 shrink-0 {{ $toneText[$tone] }}" />
                                                        <span class="truncate" x-text="shownText(row, {{ $cx }})"></span>
                                                    </span>
                                                @endforeach
                                            @elseif ($c['type'] === 'tag')
                                                <span data-slot="badge" x-show="shownText(row, {{ $cx }}) !== ''" x-bind:style="hueStyle(row, {{ $cx }})" {!! $hide !!}
                                                    class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-transparent bg-[var(--tag-soft)] px-1.5 text-caption font-medium text-[var(--tag-solid)]" x-text="shownText(row, {{ $cx }})"></span>
                                            @elseif ($c['type'] === 'mono')
                                                <bdi dir="ltr" class="min-w-0 truncate font-mono text-code" x-text="shownText(row, {{ $cx }})"></bdi>
                                            @elseif ($c['type'] === 'datetime')
                                                <time class="min-w-0 flex-1 tabular-nums" x-bind:datetime="isoOf(row, {{ $cx }})" @if (($c['format'] ?? 'absolute') === 'relative') x-bind:title="absoluteOf(row, {{ $cx }})" @endif x-text="shownText(row, {{ $cx }})"></time>
                                            @elseif ($c['type'] === 'meter')
                                                <div data-slot="meter" role="meter" aria-valuemin="0" aria-valuemax="{{ $c['max'] ?? 100 }}" x-bind:aria-valuenow="shownValue(row, {{ $cx }})" x-bind:aria-valuetext="shownText(row, {{ $cx }})"
                                                    x-bind:data-tone="meterTone(row, {{ $cx }})" aria-label="{{ $c['header'] }}" class="flex w-full min-w-24 items-center gap-2">
                                                    <div data-slot="meter-track" class="relative block h-1 w-full overflow-hidden rounded-full bg-nq-surface-soft">
                                                        <div data-slot="meter-indicator" x-bind:style="meterWidth(row, {{ $cx }})"
                                                            x-bind:class="{ 'bg-primary': meterTone(row, {{ $cx }}) === 'default', 'bg-nq-warning': meterTone(row, {{ $cx }}) === 'warning', 'bg-nq-danger': meterTone(row, {{ $cx }}) === 'danger' }"
                                                            class="block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none"></div>
                                                    </div>
                                                    <span aria-hidden="true" class="shrink-0 text-caption tabular-nums text-muted-foreground" x-text="shownText(row, {{ $cx }})"></span>
                                                </div>
                                            @elseif ($c['type'] === 'avatar')
                                                <span data-slot="avatar" class="relative inline-flex size-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-secondary align-middle text-caption font-medium text-secondary-foreground">
                                                    <span data-slot="avatar-fallback" aria-hidden="true" class="flex size-full items-center justify-center" x-text="initials(shownText(row, {{ $cx }}))"></span>
                                                    <template x-if="avatarSrc(row, {{ $cx }})"><img data-slot="avatar-image" alt="" x-bind:src="avatarSrc(row, {{ $cx }})" x-on:error="$el.remove()" class="absolute inset-0 size-full object-cover"></template>
                                                </span>
                                                <span class="flex min-w-0 flex-col">
                                                    <span class="flex items-center gap-1.5 truncate text-label text-foreground">
                                                        <span class="truncate" x-text="shownText(row, {{ $cx }})"></span>
                                                        @if (! empty($c['badge']))
                                                            <span data-slot="badge" x-show="row['{{ $c['badge'] }}']" {!! $hide !!} class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-border px-1.5 text-caption font-medium text-muted-foreground">{{ $c['badgeLabel'] ?? $c['badge'] }}</span>
                                                        @endif
                                                    </span>
                                                    <bdi @if (! empty($c['secondaryDir'])) dir="{{ $c['secondaryDir'] }}" @endif class="truncate text-caption text-muted-foreground" x-show="secondary(row, {{ $cx }})" x-text="secondary(row, {{ $cx }})" {!! $hide !!}></bdi>
                                                </span>
                                            @elseif ($c['type'] === 'link')
                                                <a data-slot="link" x-bind:href="href(row, {{ $cx }})" @if (! empty($c['target'])) target="{{ $c['target'] }}" rel="noopener noreferrer" @endif
                                                    class="min-w-0 truncate text-primary underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus" x-text="shownText(row, {{ $cx }})"></a>
                                            @elseif ($c['type'] === 'boolean')
                                                <span x-text="shownValue(row, {{ $cx }}) === true ? {{ $q($t['yes']) }} : (shownValue(row, {{ $cx }}) === false ? {{ $q($t['no']) }} : '')"></span>
                                            @else
                                                <span class="min-w-0 flex-1 {{ $number }}" x-text="shownText(row, {{ $cx }})"></span>
                                            @endif
                                            @if ($edit)
                                                <x-lucide-loader-circle aria-hidden="true" x-show="isPending(row, {{ $cx }})" {!! $hide !!} class="size-3.5 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />
                                                <span x-show="failure(row, {{ $cx }})" x-bind:title="failure(row, {{ $cx }})" {!! $hide !!} class="inline-flex shrink-0 items-center text-nq-danger-text">
                                                    <x-lucide-triangle-alert aria-hidden="true" class="size-3.5" />
                                                    <span class="sr-only" x-text="failText(row, {{ $cx }})"></span>
                                                </span>
                                            @endif
                                        </span>
                                    @endif
                                </div>
                            @endforeach

                            @if (count($actions))
                                <div role="cell" data-slot="table-cell" x-bind:class="pad" class="flex items-center h-row w-12 pe-2 text-end align-middle whitespace-nowrap">
                                    <x-nq::dropdown-menu>
                                        <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="data-table-row-actions" x-bind:aria-label="say('rowActions', row)" x-show="hasActions(row)"
                                            x-bind:tabindex="index === Math.min(active, pageRows.length - 1) ? 0 : -1"
                                            class="text-muted-foreground opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 group-data-[state=selected]/row:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100">
                                            <x-lucide-ellipsis aria-hidden="true" />
                                        </x-nq::dropdown-menu.trigger>
                                        <x-nq::dropdown-menu.content align="end" class="min-w-44">
                                            <x-nq::dropdown-menu.group>
                                                @foreach ($actions as $k => $a)
                                                    <template x-if="actionOn(row, {{ $k }})">
                                                        <div role="none" class="contents">
                                                            @if ($k > 0)<template x-if="sepBefore(row, {{ $k }})"><x-nq::dropdown-menu.separator /></template>@endif
                                                            <x-nq::dropdown-menu.item :variant="! empty($a['danger']) ? 'danger' : 'default'" :disabled="! empty($a['disabled'])" x-on:click="act('{{ $a['id'] }}', row)"
                                                                x-bind:data-disabled="actionOff(row, {{ $k }}) ? '' : null" x-bind:aria-disabled="actionOff(row, {{ $k }}) ? 'true' : null">
                                                                @if (! empty($a['icon']))<x-dynamic-component :component="'lucide-'.$a['icon']" aria-hidden="true" />@endif
                                                                {{ $a['label'] }}
                                                            </x-nq::dropdown-menu.item>
                                                        </div>
                                                    </template>
                                                @endforeach
                                            </x-nq::dropdown-menu.group>
                                        </x-nq::dropdown-menu.content>
                                    </x-nq::dropdown-menu>
                                </div>
                            @endif
                        </div>
                        @if ($expandable)
                            <template x-if="isOpen(row)">
                                <div role="row" data-slot="data-table-expanded" class="col-span-full grid grid-cols-subgrid border-b border-border">
                                    <div role="cell" data-slot="table-cell" class="col-span-full h-auto p-0 whitespace-normal">
                                        <section x-bind:aria-label="say('details', row)" class="border-s-2 border-nq-action/50 bg-secondary/40 px-4 py-3 ps-14" x-text="row[expandKey]"></section>
                                    </div>
                                </div>
                            </template>
                        @endif
                    </div>
                </template>
            @endif
        </div>
    </div>

    @if ($pageSize)
        <nav data-slot="data-table-pagination" aria-label="{{ $t['pagination'] }}" x-show="paged" {!! $hide !!} class="flex flex-wrap items-center justify-end gap-2">
            @if (count($pageSizes))
                <span class="me-auto inline-flex items-center gap-2 sm:me-2">
                    <label class="text-caption text-muted-foreground">{{ $t['rowsPerPage'] }}
                        <x-nq::native-select size="sm" :value="(string) $pageSize" x-on:change="setPageSize($event.target.value)" class="w-auto"
                            :options="array_map(fn ($o) => ['value' => (string) $o, 'label' => (string) $o], $pageSizes)" />
                    </label>
                </span>
            @endif
            <span class="text-caption tabular-nums text-muted-foreground" aria-live="polite" x-text="rangeText()"></span>
            <button type="button" aria-label="{{ $t['previous'] }}" x-bind:disabled="page === 0 ? '' : null" x-on:click="setPage(page - 1)"
                class="inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4"><x-lucide-chevron-left aria-hidden="true" class="rtl:-scale-x-100" /></button>
            <button type="button" aria-label="{{ $t['next'] }}" x-bind:disabled="page >= pageCount - 1 ? '' : null" x-on:click="setPage(page + 1)"
                class="inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4"><x-lucide-chevron-right aria-hidden="true" class="rtl:-scale-x-100" /></button>
        </nav>
    @endif
    @if (count($actions) && $contextMenu)
        <div data-slot="data-table-context-menu" x-data="nqContextMenu()" x-effect="menuClosed(open)" class="contents">
            <x-nq::context-menu.content class="min-w-44">
                @foreach ($actions as $k => $a)
                    <template x-if="ctxRow && actionOn(ctxRow, {{ $k }})">
                        <div role="none" class="contents">
                            @if ($k > 0)<template x-if="sepBefore(ctxRow, {{ $k }})"><x-nq::context-menu.separator /></template>@endif
                            <x-nq::context-menu.item :variant="! empty($a['danger']) ? 'danger' : 'default'" :disabled="! empty($a['disabled'])" x-on:click="act('{{ $a['id'] }}', ctxRow)"
                                x-bind:data-disabled="actionOff(ctxRow, {{ $k }}) ? '' : null" x-bind:aria-disabled="actionOff(ctxRow, {{ $k }}) ? 'true' : null">
                                @if (! empty($a['icon']))<x-dynamic-component :component="'lucide-'.$a['icon']" aria-hidden="true" />@endif
                                {{ $a['label'] }}
                            </x-nq::context-menu.item>
                        </div>
                    </template>
                @endforeach
            </x-nq::context-menu.content>
        </div>
    @endif
    <span role="status" aria-live="polite" class="sr-only" x-text="announce"></span>
</div>
