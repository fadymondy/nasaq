{{-- <x-nq::entity-list label="Contacts" :columns="[['id' => 'name', 'header' => 'Name', 'sortable' => true, 'searchable' => true]]" :rows="[['id' => 'a', 'name' => 'Mona']]" :facets="[…]" :row-actions="[…]">
         <x-slot:card><span x-text="row.name"></span></x-slot:card>
     </x-nq::entity-list>
     A list of records that is a table or a grid of cards, with search, multi-value filters, sorting, selection, a row menu and a context menu.
     label: the accessible name (localise it). rows: arrays keyed by column; row-key: the field that identifies a row (default "id"); name-key: the field that names a row for "Select …" (default row-key).
     columns: ['id', 'header', 'key' (row field, default id), 'type' => text | mono | number | date | datetime | currency | status | tag | boolean | meter | avatar | link | html (the row field holds server-rendered HTML) (as the data-table's cell types, with 'options' => [['value', 'label', 'tone', 'hue']], 'template', 'format', 'secondary', 'src', 'href', 'max' …), 'hideable' (the View menu can hide it), 'hidden' (hidden to start with), 'sortKey' (a row field to sort by), 'searchKey' (a row field to search), 'sortable', 'searchable', 'align' => start | center | end].
     Custom cell: a named slot per column, <x-slot name="cell_title"> <b x-text="row.title"></b> </x-slot> (column ids of letters, digits and underscores); it renders in each row's Alpine scope, so `row` and col('id'), shownText(row, col('id')) are in reach. The card slot does the same for the card layout.
     facets: [['id' => 'tags', 'title' => 'Tags', 'key' => 'tags' (a row field holding a value or a list), 'options' => [['value' => 'vip', 'label' => 'VIP']]]]. A row matches when it has ANY chosen value.
     view: table | cards (the start layout). views: ['table', 'cards'] (one entry hides the toggle). selectable (default true). page-size: rows per page (0 = all).
     row-actions: [['id' => 'edit', 'label' => 'Edit', 'icon' => 'pencil', 'danger' => false, 'group' => null]]: the ⋯ menu of a row or card, also opened by context-click, long-press, Shift+F10 or the Menu key. Per row: 'visibleWhen' / 'disabledWhen' => ['field' => 'status', 'in' => [...]] (also notIn, eq, ne, empty, any, all) and actions-key="actions" (a row field listing the allowed action ids); a row left with no action loses its ⋯ button.
     loading, error (a message, or true), labels: ['search' => …] to override any string. card-min-width: minimum card width in px (default 272).
     Slots: card (the card body; `row` is in scope), toolbar (more controls), bulk (actions in the selection bar), empty (when there are no rows at all).
     Events (bubbling): nq-entity-list-row-click { row }, nq-entity-list-action { action, row }, nq-entity-list-selection { ids }, nq-entity-list-view { view }.
     Not ported here: in-cell editing, the column picker and the per-column filters of the data table. Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'label', 'columns' => [], 'rows' => [], 'rowKey' => 'id', 'nameKey' => null, 'facets' => [], 'view' => 'table', 'views' => ['table', 'cards'], 'selectable' => true,
    'pageSize' => 0, 'rowActions' => [], 'actionsKey' => null, 'loading' => false, 'error' => null, 'cardMinWidth' => 272, 'labels' => [], 'search' => true, 'locale' => null,
])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $strings = [
        'en' => [
            'view' => 'View', 'columns' => 'Columns', 'search' => 'Search…', 'clearSearch' => 'Clear search', 'selectAll' => 'Select all on this page', 'selectRow' => 'Select {name}', 'rowActions' => 'Actions for {name}',
            'selected' => '{n} selected', 'clearSelection' => 'Clear selection', 'empty' => 'Nothing here yet', 'noResults' => 'No matching results',
            'noResultsHint' => 'Try a different search or clear the filters.', 'clearFilters' => 'Clear filters', 'clearAll' => 'Clear filters', 'reset' => 'Reset',
            'results' => '{n} results', 'resultsOne' => '1 result', 'loadingList' => 'Loading…', 'error' => "Couldn't load this list", 'retry' => 'Try again',
            'viewSwitch' => 'Layout', 'viewTable' => 'Table view', 'viewCards' => 'Card view', 'sort' => 'Sort', 'sortBy' => 'Sort by', 'previous' => 'Previous page', 'next' => 'Next page',
            'pagination' => 'Pagination', 'page' => 'Page {n} of {total}',
        ],
        'ar' => [
            'view' => 'العرض', 'columns' => 'الأعمدة', 'search' => 'ابحث…', 'clearSearch' => 'مسح البحث', 'selectAll' => 'تحديد كل عناصر هذه الصفحة', 'selectRow' => 'تحديد {name}', 'rowActions' => 'إجراءات {name}',
            'selected' => '{n} محدد', 'clearSelection' => 'إلغاء التحديد', 'empty' => 'لا شيء هنا بعد', 'noResults' => 'لا نتائج مطابقة',
            'noResultsHint' => 'جرّب بحثًا آخر أو امسح عوامل التصفية.', 'clearFilters' => 'مسح التصفية', 'clearAll' => 'مسح التصفية', 'reset' => 'إعادة الضبط',
            'results' => '{n} نتيجة', 'resultsOne' => 'نتيجة واحدة', 'loadingList' => 'جارٍ التحميل…', 'error' => 'تعذّر تحميل هذه القائمة', 'retry' => 'حاول مرة أخرى',
            'viewSwitch' => 'التخطيط', 'viewTable' => 'عرض جدول', 'viewCards' => 'عرض بطاقات', 'sort' => 'الترتيب', 'sortBy' => 'رتّب حسب', 'previous' => 'الصفحة السابقة', 'next' => 'الصفحة التالية',
            'pagination' => 'التنقل بين الصفحات', 'page' => 'صفحة {n} من {total}',
        ],
    ];
    $t = array_merge($strings[$ar ? 'ar' : 'en'], (array) $labels);
    $cols = array_values(array_map(function ($c) { $c = (array) $c; $c['header'] ??= $c['id']; $c['type'] ??= 'text'; return $c; }, (array) $columns));
    $toneText = ['neutral' => 'text-muted-foreground', 'info' => 'text-nq-info-text', 'success' => 'text-nq-success-text', 'warning' => 'text-nq-warning-text', 'danger' => 'text-nq-danger-text'];
    $toneIcon = ['neutral' => 'circle', 'info' => 'circle-dot', 'success' => 'circle-check', 'warning' => 'circle-alert', 'danger' => 'circle-x'];
    $q = fn ($s) => "'" . str_replace(['\\', "'"], ['\\\\', "\\'"], $s) . "'";
    $list = array_values(array_map(fn ($r) => (array) $r, (array) $rows));
    $facetList = array_values(array_map(fn ($f) => (array) $f, (array) $facets));
    $actions = array_values(array_map(fn ($a) => (array) $a, (array) $rowActions));
    $layouts = array_values(array_intersect(['table', 'cards'], (array) $views)) ?: ['table'];
    $start = in_array($view, $layouts, true) ? $view : $layouts[0];
    $options = array_filter([
        'key' => $rowKey !== 'id' ? $rowKey : null,
        'nameKey' => $nameKey,
        'view' => $start,
        'views' => $layouts,
        'pageSize' => $pageSize ?: null,
        'selectable' => $selectable ? null : false,
        'facets' => $facetList ?: null,
        'actions' => $actions ? array_map(fn ($a) => array_filter(array_intersect_key($a, array_flip(['id', 'group', 'visibleWhen', 'disabledWhen'])), fn ($v) => $v !== null), $actions) : null,
        'actionsKey' => $actionsKey,
        'locale' => $locale ?? ($ar ? 'ar' : 'en'),
        'labels' => array_intersect_key($t, array_flip(['selectRow', 'rowActions', 'selected', 'results', 'resultsOne'])),
    ], fn ($v) => $v !== null);
    $hide = 'style="display: none"';
    $searchText = is_string($search) ? $search : $t['search'];
    $hasActions = count($actions) > 0;
    $hasSort = count(array_filter($cols, fn ($c) => ! empty($c['sortable']))) > 0;
    $fixed = ($selectable ? 1 : 0) + ($hasActions ? 1 : 0);
    $template = 'repeat('.(count($cols) + $fixed).', auto)';
    $togglable = array_values(array_filter($cols, fn ($c) => ! empty($c['hideable'])));
    $dynamicCols = count($togglable) > 0 || count(array_filter($cols, fn ($c) => ! empty($c['hidden']))) > 0;
    $errorText = is_string($error) ? $error : $t['error'];
    $box = 'relative inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-nq-line-strong bg-card text-primary-foreground outline-none transition-colors duration-150 ease-nq data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus after:absolute after:-inset-1 align-middle';
    $iconBtn = 'inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4';
    $cardCls = 'group/card relative flex min-w-0 flex-col rounded-card border border-border bg-card p-4 text-card-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus data-[state=selected]:border-primary data-[state=selected]:bg-nq-selected';
    $controls = ($selectable ? 1 : 0) + ($hasActions ? 1 : 0);
@endphp
@php ob_start(); @endphp
@foreach ($actions as $k => $a)
    <template x-if="actionOn(row, {{ $k }})">
        <div role="none" class="contents">
            @if ($k > 0)<template x-if="sepBefore(row, {{ $k }})"><x-nq::context-menu.separator /></template>@endif
            <x-nq::context-menu.item :variant="! empty($a['danger']) ? 'danger' : 'default'" :disabled="! empty($a['disabled'])" x-on:click="act('{{ $a['id'] }}', row)"
                x-bind:data-disabled="actionOff(row, {{ $k }}) ? '' : null" x-bind:aria-disabled="actionOff(row, {{ $k }}) ? 'true' : null">
                @if (! empty($a['icon']))<x-dynamic-component :component="'lucide-'.$a['icon']" aria-hidden="true" />@endif
                {{ $a['label'] }}
            </x-nq::context-menu.item>
        </div>
    </template>
@endforeach
@php $ctxItems = ob_get_clean(); ob_start(); @endphp
<x-nq::dropdown-menu>
    <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="entity-list-row-actions" x-bind:aria-label="say('rowActions', row)"
        x-show="hasActions(row)" x-bind:tabindex="index === Math.min(active, pageRows.length - 1) ? 0 : -1"
        class="text-muted-foreground data-popup-open:opacity-100">
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
@php $ddMenu = ob_get_clean(); ob_start(); @endphp
@if ($selectable)
    <div role="cell" data-slot="table-cell" class="flex h-row w-10 items-center pe-0">
        <button type="button" role="checkbox" data-slot="checkbox" x-bind:aria-label="say('selectRow', row)" x-on:click="toggleRow(row)" aria-checked="false"
            x-bind:aria-checked="isSelected(row) ? 'true' : 'false'" x-bind:data-checked="isSelected(row) ? '' : null" x-bind:data-unchecked="isSelected(row) ? null : ''" class="{{ $box }}">
            <span data-slot="checkbox-indicator" class="flex items-center justify-center [&_svg]:size-3 [&_svg]:stroke-3" x-show="isSelected(row)" {!! $hide !!}><x-lucide-check aria-hidden="true" /></span>
        </button>
    </div>
@endif
@foreach ($cols as $c)
    @php
        $id = $c['id'];
        $cx = "col('{$id}')";
        $number = in_array($c['type'], ['number', 'currency'], true) ? 'tabular-nums' : '';
        $end = ($c['align'] ?? 'start') === 'end';
    @endphp
    <div role="cell" data-slot="table-cell" data-cell-col="{{ $id }}" @if ($dynamicCols) x-show="shown['{{ $id }}']" @if (! empty($c['hidden'])) style="display: none" @endif @endif class="flex h-row items-center px-4 py-3 {{ $end ? 'justify-end text-end' : (($c['align'] ?? 'start') === 'center' ? 'justify-center' : '') }}">
        <span class="flex min-w-0 items-center gap-1.5 {{ $end ? 'justify-end' : '' }}">
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
                    <span class="truncate text-label text-foreground" x-text="shownText(row, {{ $cx }})"></span>
                    <bdi @if (! empty($c['secondaryDir'])) dir="{{ $c['secondaryDir'] }}" @endif class="truncate text-caption text-muted-foreground" x-show="secondary(row, {{ $cx }})" x-text="secondary(row, {{ $cx }})" {!! $hide !!}></bdi>
                </span>
            @elseif ($c['type'] === 'link')
                <a data-slot="link" x-bind:href="href(row, {{ $cx }})" @if (! empty($c['target'])) target="{{ $c['target'] }}" rel="noopener noreferrer" @endif
                    class="min-w-0 truncate text-primary underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus" x-text="shownText(row, {{ $cx }})"></a>
            @elseif ($c['type'] === 'boolean')
                <span x-text="shownValue(row, {{ $cx }}) === true ? {{ $q($ar ? 'نعم' : 'Yes') }} : (shownValue(row, {{ $cx }}) === false ? {{ $q($ar ? 'لا' : 'No') }} : '')"></span>
            @elseif ($c['type'] === 'html')
                <span class="min-w-0" x-html="row['{{ $c['key'] ?? $c['id'] }}'] ?? ''"></span>
            @elseif ($c['type'] === 'text' && empty($c['template']))
                <span class="truncate" x-text="row['{{ $c['key'] ?? $c['id'] }}'] ?? '—'"></span>
            @else
                <span class="min-w-0 flex-1 truncate {{ $number }}" x-text="shownText(row, {{ $cx }})"></span>
            @endif
        </span>
    </div>
@endforeach
@if ($hasActions)<div role="cell" data-slot="table-cell" class="flex h-row w-12 items-center pe-2">{!! $ddMenu !!}</div>@endif
@php $rowCells = ob_get_clean(); ob_start(); @endphp
<div class="min-w-0 flex-1">{{ $card ?? '' }}</div>
@if ($controls)
    <div class="absolute end-2 top-2 flex items-center gap-1">
        @if ($selectable)
            <button type="button" role="checkbox" data-slot="checkbox" x-bind:aria-label="say('selectRow', row)" x-on:click="toggleRow(row)" aria-checked="false"
                x-bind:aria-checked="isSelected(row) ? 'true' : 'false'" x-bind:data-checked="isSelected(row) ? '' : null" x-bind:data-unchecked="isSelected(row) ? null : ''"
                x-bind:tabindex="index === Math.min(active, pageRows.length - 1) ? 0 : -1" class="{{ $box }}">
                <span data-slot="checkbox-indicator" class="flex items-center justify-center [&_svg]:size-3 [&_svg]:stroke-3" x-show="isSelected(row)" {!! $hide !!}><x-lucide-check aria-hidden="true" /></span>
            </button>
        @endif
        @if ($hasActions){!! $ddMenu !!}@endif
    </div>
@endif
@php $cardBody = ob_get_clean(); @endphp
<div data-slot="entity-list" x-data="nqEntityList({!! \Illuminate\Support\Js::from($list) !!}, {!! \Illuminate\Support\Js::from($cols) !!}, {!! \Illuminate\Support\Js::from((object) $options) !!})" x-modelable="rows"
    x-bind:data-view="view" {{ $attributes->cn('flex min-w-0 flex-col gap-3') }}>
    <div data-slot="data-table-toolbar" class="flex flex-wrap items-center gap-2">
        @if ($selectable)
            <button type="button" role="checkbox" data-slot="checkbox" aria-label="{{ $t['selectAll'] }}" x-on:click="togglePage()" x-show="view === 'cards'" {!! $hide !!}
                x-bind:aria-checked="pageSelection() === 'all' ? 'true' : (pageSelection() === 'some' ? 'mixed' : 'false')"
                x-bind:data-checked="pageSelection() === 'all' ? '' : null" x-bind:data-indeterminate="pageSelection() === 'some' ? '' : null" aria-checked="false" class="{{ $box }} me-1">
                <span data-slot="checkbox-indicator" class="flex items-center justify-center [&_svg]:size-3 [&_svg]:stroke-3" x-show="pageSelection() !== 'none'" {!! $hide !!}>
                    <x-lucide-minus aria-hidden="true" x-show="pageSelection() === 'some'" {!! $hide !!} />
                    <x-lucide-check aria-hidden="true" x-show="pageSelection() === 'all'" {!! $hide !!} />
                </span>
            </button>
        @endif
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

        @foreach ($facetList as $f)
            <x-nq::dropdown-menu>
                <x-nq::dropdown-menu.trigger size="sm" x-bind:class="facetCount('{{ $f['id'] }}') ? '' : 'border-dashed text-muted-foreground'" data-facet="{{ $f['id'] }}">
                    <x-lucide-list-filter aria-hidden="true" />
                    {{ $f['title'] }}
                    <span data-slot="badge" x-show="facetCount('{{ $f['id'] }}')" x-text="facetSummary('{{ $f['id'] }}')" {!! $hide !!}
                        class="-me-1 inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-border px-1.5 text-caption font-medium tabular-nums text-muted-foreground"></span>
                </x-nq::dropdown-menu.trigger>
                <x-nq::dropdown-menu.content class="max-h-80 min-w-48 overflow-y-auto">
                    <x-nq::dropdown-menu.group>
                        @foreach ((array) ($f['options'] ?? []) as $o)
                            <x-nq::dropdown-menu.checkbox-item x-model="facet['{{ $f['id'] }}|{{ $o['value'] }}']">{{ $o['label'] }}</x-nq::dropdown-menu.checkbox-item>
                        @endforeach
                    </x-nq::dropdown-menu.group>
                    <div x-show="facetCount('{{ $f['id'] }}')" {!! $hide !!}>
                        <x-nq::dropdown-menu.separator />
                        <x-nq::dropdown-menu.item x-on:click="resetFacet('{{ $f['id'] }}')">{{ $t['reset'] }}</x-nq::dropdown-menu.item>
                    </div>
                </x-nq::dropdown-menu.content>
            </x-nq::dropdown-menu>
        @endforeach

        <x-nq::button size="sm" variant="ghost" x-show="isFiltered()" x-on:click="clearAll()" data-slot="entity-list-clear" style="display: none">
            <x-lucide-x aria-hidden="true" />
            {{ $t['clearAll'] }}
        </x-nq::button>

        <div class="ms-auto flex flex-wrap items-center gap-2">
            @isset($toolbar){{ $toolbar }}@endisset
            @if (count($togglable))
                <div x-show="view === 'table'" {!! $hide !!}>
                    <x-nq::dropdown-menu>
                        <x-nq::dropdown-menu.trigger size="sm" data-slot="entity-list-columns">
                            <x-lucide-settings-2 aria-hidden="true" />
                            {{ $t['view'] }}
                        </x-nq::dropdown-menu.trigger>
                        <x-nq::dropdown-menu.content align="end" class="min-w-48">
                            <x-nq::dropdown-menu.group>
                                <x-nq::dropdown-menu.label>{{ $t['columns'] }}</x-nq::dropdown-menu.label>
                                @foreach ($togglable as $c)
                                    <x-nq::dropdown-menu.checkbox-item x-model="shown['{{ $c['id'] }}']" x-bind:disabled="shown['{{ $c['id'] }}'] && shownCount() === 1 ? '' : null">{{ $c['header'] }}</x-nq::dropdown-menu.checkbox-item>
                                @endforeach
                            </x-nq::dropdown-menu.group>
                        </x-nq::dropdown-menu.content>
                    </x-nq::dropdown-menu>
                </div>
            @endif
            @if ($hasSort)
                <div x-show="view === 'cards'" {!! $hide !!}>
                    <x-nq::dropdown-menu>
                        <x-nq::dropdown-menu.trigger size="sm" data-slot="entity-list-sort">
                            <x-lucide-arrow-down-up aria-hidden="true" />
                            {{ $t['sort'] }}
                        </x-nq::dropdown-menu.trigger>
                        <x-nq::dropdown-menu.content align="end" class="min-w-44">
                            <x-nq::dropdown-menu.group>
                                <x-nq::dropdown-menu.label>{{ $t['sortBy'] }}</x-nq::dropdown-menu.label>
                                @foreach ($cols as $c)
                                    @if (! empty($c['sortable']))
                                        <x-nq::dropdown-menu.item x-on:click="toggleSort('{{ $c['id'] }}')">
                                            <span class="flex-1">{{ $c['header'] }}</span>
                                            <span aria-hidden="true" class="text-muted-foreground" x-text="sort?.id === '{{ $c['id'] }}' ? (sort.dir === 'asc' ? '↑' : '↓') : ''"></span>
                                        </x-nq::dropdown-menu.item>
                                    @endif
                                @endforeach
                            </x-nq::dropdown-menu.group>
                        </x-nq::dropdown-menu.content>
                    </x-nq::dropdown-menu>
                </div>
            @endif
            @if (count($layouts) > 1)
                <div role="group" data-slot="toggle-group" aria-label="{{ $t['viewSwitch'] }}" class="flex w-fit max-w-full gap-0.5 rounded-control bg-secondary p-0.5">
                    @foreach (['table' => ['viewTable', 'list'], 'cards' => ['viewCards', 'layout-grid']] as $v => [$labelKey, $icon])
                        <button type="button" data-slot="toggle" aria-label="{{ $t[$labelKey] }}" x-on:click="setView('{{ $v }}')" x-bind:aria-pressed="view === '{{ $v }}' ? 'true' : 'false'"
                            x-bind:data-pressed="view === '{{ $v }}' ? '' : null"
                            class="inline-flex h-control-sm min-w-control-sm items-center justify-center rounded-[calc(var(--radius-control)-2px)] px-2 text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-sm [&_svg]:size-4">
                            <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />
                        </button>
                    @endforeach
                </div>
            @endif
        </div>
    </div>

    @if ($selectable)
        <div data-slot="data-table-bulk-actions" role="toolbar" x-bind:aria-label="say('selected').replace('{n}', selectedCount())" x-bind:hidden="selectedCount() === 0" hidden
            class="flex flex-wrap items-center gap-2 rounded-control bg-nq-selected py-1 ps-3 pe-1">
            <span aria-live="polite" class="me-auto text-label tabular-nums text-foreground" x-text="say('selected').replace('{n}', selectedCount())"></span>
            @isset($bulk){{ $bulk }}@endisset
            <button type="button" aria-label="{{ $t['clearSelection'] }}" x-on:click="clearSelection()" class="{{ $iconBtn }}"><x-lucide-x aria-hidden="true" /></button>
        </div>
    @endif

    <span role="status" aria-live="polite" class="sr-only" x-text="status()"></span>

    @if ($loading)
        <div role="list" aria-busy="true" aria-label="{{ $label }}" class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(min(100%, {{ (int) $cardMinWidth }}px), 1fr))">
            @foreach (range(1, 6) as $i)
                <div aria-hidden="true" class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
                    <div class="flex items-center gap-3"><x-nq::states.skeleton class="size-10 rounded-full" /><div class="flex flex-1 flex-col gap-2"><x-nq::states.skeleton class="h-3 w-2/3" /><x-nq::states.skeleton class="h-3 w-1/3" /></div></div>
                    <x-nq::states.skeleton class="h-3 w-4/5" />
                </div>
            @endforeach
        </div>
    @elseif ($error)
        <x-nq::states.error :title="$errorText" />
    @else
        {{-- Table layout --}}
        <div x-show="view === 'table'" {!! $hide !!} data-slot="table-container" role="region" tabindex="0" aria-label="{{ $label }}"
            class="relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
            <div data-slot="table" role="table" aria-label="{{ $label }}" @if ($dynamicCols) x-bind:style="'grid-template-columns: repeat(' + (shownCount() + {{ $fixed }}) + ', auto)'" @endif style="grid-template-columns: {{ $template }}" class="grid w-full min-w-max text-body-sm">
                <div data-slot="table-header" role="rowgroup" class="contents">
                    <div role="row" class="col-span-full grid grid-cols-subgrid border-b border-border">
                        @if ($selectable)<div role="columnheader" class="flex h-row w-10 items-center"><span class="sr-only">{{ $t['selectAll'] }}</span></div>@endif
                        @foreach ($cols as $c)
                            <div role="columnheader" data-slot="table-head" @if ($dynamicCols) x-show="shown['{{ $c['id'] }}']" @if (! empty($c['hidden'])) style="display: none" @endif @endif @if (! empty($c['sortable'])) x-bind:aria-sort="sortState('{{ $c['id'] }}')" @endif
                                class="flex h-row items-center px-4 text-caption font-medium whitespace-nowrap text-muted-foreground {{ ($c['align'] ?? 'start') === 'end' ? 'justify-end text-end' : (($c['align'] ?? 'start') === 'center' ? 'justify-center' : 'text-start') }}">
                                @if (! empty($c['sortable']))
                                    <button type="button" x-on:click="toggleSort('{{ $c['id'] }}')" class="inline-flex items-center gap-1.5 rounded-control outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                                        {{ $c['header'] }}
                                        <span aria-hidden="true" x-text="sort?.id === '{{ $c['id'] }}' ? (sort.dir === 'asc' ? '↑' : '↓') : ''"></span>
                                    </button>
                                @else
                                    {{ $c['header'] }}
                                @endif
                            </div>
                        @endforeach
                        @if ($hasActions)<div role="columnheader" class="flex h-row w-12 items-center"><span class="sr-only">{{ $t['rowActions'] }}</span></div>@endif
                    </div>
                </div>
                <div data-slot="table-body" role="rowgroup" class="contents">
                    <template x-for="(row, index) in pageRows" :key="idOf(row)">
                        @if ($hasActions)
                            <x-nq::context-menu>
                                <x-nq::context-menu.trigger role="row" data-row x-bind:data-state="isSelected(row) ? `selected` : null" x-on:click="openRow(row, $event)"
                                    class="group/row col-span-full grid grid-cols-subgrid border-b border-border transition-colors hover:bg-nq-hover data-[state=selected]:bg-nq-selected">
                                    {!! $rowCells !!}
                                </x-nq::context-menu.trigger>
                                <x-nq::context-menu.content class="min-w-44">
                                    {!! $ctxItems !!}
                                </x-nq::context-menu.content>
                            </x-nq::context-menu>
                        @else
                            <div role="row" data-row x-bind:data-state="isSelected(row) ? 'selected' : null" x-on:click="openRow(row, $event)"
                                class="group/row col-span-full grid grid-cols-subgrid border-b border-border transition-colors hover:bg-nq-hover data-[state=selected]:bg-nq-selected">
                                {!! $rowCells !!}
                            </div>
                        @endif
                    </template>
                </div>
            </div>
        </div>

        {{-- Card layout --}}
        <div x-show="view === 'cards'" {!! $hide !!} role="list" aria-label="{{ $label }}" class="grid gap-3"
            style="grid-template-columns: repeat(auto-fill, minmax(min(100%, {{ (int) $cardMinWidth }}px), 1fr)); --entity-card-controls: {{ $controls === 2 ? '3.25rem' : ($controls === 1 ? '1.75rem' : '0px') }}">
            <template x-for="(row, index) in pageRows" :key="idOf(row)">
                @if ($hasActions)
                    <x-nq::context-menu>
                        <x-nq::context-menu.trigger role="listitem" data-card x-bind:tabindex="index === Math.min(active, pageRows.length - 1) ? 0 : -1"
                            x-bind:data-state="isSelected(row) ? `selected` : null" x-on:keydown="cardKey($event, row, index)" x-on:click="openRow(row, $event)"
                            x-on:focus="$event.target === $event.currentTarget ? (active = index) : null" class="{{ $cardCls }}">
                            {!! $cardBody !!}
                        </x-nq::context-menu.trigger>
                        <x-nq::context-menu.content class="min-w-44">
                            {!! $ctxItems !!}
                        </x-nq::context-menu.content>
                    </x-nq::context-menu>
                @else
                    <div role="listitem" data-card x-bind:tabindex="index === Math.min(active, pageRows.length - 1) ? 0 : -1" x-bind:data-state="isSelected(row) ? 'selected' : null"
                        x-on:keydown="cardKey($event, row, index)" x-on:click="openRow(row, $event)" x-on:focus="$event.target === $event.currentTarget ? (active = index) : null" class="{{ $cardCls }}">
                        {!! $cardBody !!}
                    </div>
                @endif
            </template>
        </div>

        {{-- Empty states, for both layouts --}}
        <div x-show="! hasRows() && noMatches()" {!! $hide !!}>
            <x-nq::states.empty icon="search" :title="$t['noResults']" :description="$t['noResultsHint']" class="border-0">
                <x-slot:actions><x-nq::button size="sm" x-on:click="clearAll()">{{ $t['clearFilters'] }}</x-nq::button></x-slot:actions>
            </x-nq::states.empty>
        </div>
        <div x-show="rows.length === 0" {!! $hide !!}>
            @isset($empty){{ $empty }}@else<x-nq::states.empty :title="$t['empty']" class="border-0" />@endisset
        </div>
    @endif

    @if ($pageSize)
        <nav data-slot="data-table-pagination" aria-label="{{ $t['pagination'] }}" x-show="pageCount() > 1" {!! $hide !!} class="flex flex-wrap items-center justify-end gap-2">
            <span class="text-caption tabular-nums text-muted-foreground" aria-live="polite" x-text="say('page').replace('{n}', page + 1).replace('{total}', pageCount())"></span>
            <button type="button" aria-label="{{ $t['previous'] }}" x-bind:disabled="page === 0 ? '' : null" x-on:click="goto(page - 1)" class="{{ $iconBtn }}"><x-lucide-chevron-left aria-hidden="true" class="rtl:rotate-180" /></button>
            <button type="button" aria-label="{{ $t['next'] }}" x-bind:disabled="page >= pageCount() - 1 ? '' : null" x-on:click="goto(page + 1)" class="{{ $iconBtn }}"><x-lucide-chevron-right aria-hidden="true" class="rtl:rotate-180" /></button>
        </nav>
    @endif
</div>
