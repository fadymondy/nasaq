{{-- <x-nq::database-explorer :schemas="[['name' => 'public', 'tables' => [['name' => 'users', 'rowCount' => 1280, 'columns' => [['name' => 'id', 'type' => 'uuid', 'primaryKey' => true]]]]]]" @nq-database-query="$event.detail.waitUntil(fetchRows($event.detail.sql))" />
     A database browser: a tree of schemas and tables with a filter, a SQL editor, the results in a sortable grid with CSV export, each table's structure
     and a history of what you ran. It has no connection: you run the statement and answer the event.
     schemas: [name, tables: [name, kind (table | view), rowCount, columns: [name, type, nullable, primaryKey, references ("orders.id")]]].
     row-limit: selecting a table loads SELECT * ... LIMIT n and runs it (100). default-query: text in the editor at first. default-table: ['schema' => 'public', 'table' => 'users']
     is selected at first (its structure shows; nothing runs). confirm-writes (true): ask before a statement that does not start with SELECT, WITH, EXPLAIN or SHOW.
     title replaces the section's accessible name. labels: array overriding the words. locale: defaults to the app locale.
     Running a statement fires a bubbling, cancelable "nq-database-query" with detail { sql, resolve(outcome), reject(message), waitUntil(promise) }.
     An outcome is { columns: [..], rows: [[..]], durationMs, affectedRows, truncated } or { error: "message" }; a rejection shows a generic error. Nobody listening: an empty result.
     The CSV button fires "nq-database-export" { result }; call preventDefault() to save it yourself, otherwise query.csv is downloaded.
     Only the first 25 rows are drawn. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.database-explorer._database-explorer')
@props(['schemas' => [], 'rowLimit' => 100, 'defaultQuery' => '', 'defaultTable' => null, 'confirmWrites' => true, 'title' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_dbx_strings($locale, $labels);
    $schemas = array_values(array_map(fn ($s) => [
        'name' => $s['name'],
        'tables' => array_values(array_map(fn ($x) => [
            'name' => $x['name'],
            'kind' => $x['kind'] ?? 'table',
            'rowCount' => $x['rowCount'] ?? null,
            'columns' => array_values(array_map(fn ($c) => [
                'name' => $c['name'], 'type' => $c['type'], 'nullable' => ! empty($c['nullable']), 'primaryKey' => ! empty($c['primaryKey']), 'references' => $c['references'] ?? null,
            ], $x['columns'] ?? [])),
        ], $s['tables'] ?? [])),
    ], (array) $schemas));
    $config = [
        'schemas' => $schemas,
        'rowLimit' => (int) $rowLimit,
        'defaultQuery' => (string) $defaultQuery,
        'defaultTable' => $defaultTable ? ['schema' => $defaultTable['schema'], 'table' => $defaultTable['table']] : null,
        'confirmWrites' => (bool) $confirmWrites,
        'locale' => substr($locale, 0, 2),
        'strings' => $t,
    ];
    $sqlId = 'nq-dbx-sql-'.\Illuminate\Support\Str::random(6);
    $hide = 'style="display: none"';
    $item = 'flex min-h-8 cursor-default items-center gap-1.5 rounded-control pe-2 outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus data-[selected]:bg-nq-selected';
    $stateIcon = 'inline-flex size-10 items-center justify-center rounded-control border border-border bg-card text-muted-foreground [&_svg]:size-5';
    $stateBox = 'flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border px-6 py-12 text-center';
    $head = 'h-row px-4 py-3 align-middle text-caption font-medium whitespace-nowrap text-muted-foreground';
    $sortBtn = '-mx-1.5 inline-flex h-7 max-w-full items-center gap-1 rounded-control px-1.5 outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus';
    $th = 'px-3 py-2 text-start font-medium';
    $td = 'px-3 py-2';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'database-explorer') }}" aria-label="{{ $title ?? $t['title'] }}" x-data="nqDatabaseExplorer(@js($config))"
    {{ $attributes->except('data-slot')->cn('grid min-w-0 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]') }}>
    <aside aria-label="{{ $t['tables'] }}" class="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-card p-2 lg:max-h-[42rem]">
        <x-nq::input-group>
            <x-nq::input-group.addon align="start"><x-lucide-search aria-hidden="true" class="size-4 text-muted-foreground" /></x-nq::input-group.addon>
            <x-nq::input-group.input ltr type="search" placeholder="{{ $t['filterTables'] }}" aria-label="{{ $t['filterTables'] }}" x-model="filter" />
        </x-nq::input-group>
        <div class="max-h-56 min-h-0 overflow-y-auto lg:max-h-none lg:flex-1">
            <div x-show="noSchemas" data-slot="empty-state" class="{{ $stateBox }} border-0 px-2 py-6" {!! count($schemas) ? $hide : "" !!}>
                <span class="{{ $stateIcon }}"><x-lucide-inbox aria-hidden="true" /></span>
                <div class="flex max-w-sm flex-col gap-1">
                    <p class="text-label text-foreground">{{ $t['noSchema'] }}</p>
                    <p class="text-body-sm text-muted-foreground">{{ $t['noSchemaBody'] }}</p>
                </div>
            </div>
            <p x-show="noMatches" {!! $hide !!} class="px-2 py-4 text-center text-body-sm text-muted-foreground">{{ $t['noTables'] }}</p>
            <div data-slot="tree-view" role="tree" aria-label="{{ $t['tables'] }}" x-show="nodes.length > 0" x-on:keydown="treeKey($event)" class="flex flex-col gap-0.5 text-body text-foreground">
                <template x-for="node in nodes" x-bind:key="node.id">
                    <div data-slot="tree-view-item" role="treeitem" x-bind:data-node-id="node.id"
                        x-bind:aria-level="node.level" x-bind:aria-setsize="node.size" x-bind:aria-posinset="node.pos"
                        x-bind:aria-expanded="node.expandable ? String(node.open) : null" x-bind:aria-selected="String(node.selected)"
                        x-bind:data-selected="node.selected ? '' : null" x-bind:data-expanded="node.open ? '' : null"
                        x-bind:tabindex="node.id === tabId ? 0 : -1" x-bind:style="'padding-inline-start:' + ((node.level - 1) * 1.25 + 0.375) + 'rem'"
                        x-on:click="onNode(node)" x-on:focus="if ($event.target === $event.currentTarget) focusId = node.id"
                        class="{{ $item }}">
                        <span data-slot="tree-view-toggle" class="flex size-5 shrink-0 items-center justify-center text-muted-foreground" x-on:click.stop="toggle(node.id)">
                            <template x-if="node.expandable">
                                <span class="contents">
                                    <x-lucide-chevron-down aria-hidden="true" class="size-4" x-show="node.open" />
                                    <x-nq::icon name="chevron-right" directional class="size-4" x-show="! node.open" />
                                </span>
                            </template>
                        </span>
                        <span data-slot="tree-view-icon" aria-hidden="true" class="flex shrink-0 items-center text-muted-foreground [&_svg]:size-4">
                            <x-lucide-database x-show="node.kind === 'schema'" />
                            <x-lucide-eye x-show="node.kind === 'table' ? node.view : false" {!! $hide !!} />
                            <x-lucide-table-2 x-show="node.kind === 'table' ? ! node.view : false" {!! $hide !!} />
                        </span>
                        <span class="min-w-0 flex-1 truncate">
                            <template x-if="node.kind === 'schema'"><bdi dir="ltr" x-text="node.name"></bdi></template>
                            <template x-if="node.kind === 'table'">
                                <span class="flex min-w-0 items-center justify-between gap-2">
                                    <bdi dir="ltr" class="truncate font-mono text-code" x-text="node.name"></bdi>
                                    <span x-show="node.rowCount !== null" class="shrink-0 text-caption text-muted-foreground" x-text="node.rowCount === null ? '' : count(node.rowCount)"></span>
                                </span>
                            </template>
                        </span>
                    </div>
                </template>
            </div>
        </div>
    </aside>

    <div class="flex min-w-0 flex-col gap-3">
        <div class="flex flex-col gap-2 rounded-card border border-border bg-card p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <label for="{{ $sqlId }}" class="text-label text-foreground">{{ $t['editor'] }}</label>
                <span class="text-caption text-muted-foreground">{{ $t['editorHint'] }}</span>
            </div>
            <x-nq::field.textarea id="{{ $sqlId }}" dir="ltr" rows="5" placeholder="{{ $t['placeholder'] }}" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"
                class="min-h-28 resize-y font-mono text-code text-start" x-model="sql" x-on:keydown="onKeyDown($event)" />
            <div class="flex flex-wrap items-center gap-2">
                <x-nq::button type="button" variant="primary" size="sm" x-on:click="request()" x-bind:disabled="! canRun" x-bind:aria-busy="running ? 'true' : null">
                    <x-nq::spinner x-show="running" style="display: none" />
                    <x-lucide-play x-show="! running" aria-hidden="true" />
                    <span x-text="running ? config.strings.running : config.strings.run">{{ $t['run'] }}</span>
                </x-nq::button>
                <x-nq::button type="button" variant="ghost" size="sm" x-on:click="clearEditor()" x-bind:disabled="! sql">{{ $t['clear'] }}</x-nq::button>
                <x-nq::badge variant="warning" x-show="modifies" style="display: none">{{ $t['modifies'] }}</x-nq::badge>
            </div>
        </div>

        <x-nq::tabs default-value="results" x-model="tab">
            <x-nq::tabs.list aria-label="{{ $title ?? $t['title'] }}" variant="underline">
                <x-nq::tabs.tab value="results">{{ $t['results'] }}</x-nq::tabs.tab>
                <x-nq::tabs.tab value="structure">{{ $t['structure'] }}</x-nq::tabs.tab>
                <x-nq::tabs.tab value="history">
                    {{ $t['history'] }}
                    <span x-show="history.length > 0" {!! $hide !!} class="ms-1.5 text-caption text-muted-foreground tabular-nums" x-text="history.length"></span>
                </x-nq::tabs.tab>
                <x-nq::tabs.indicator />
            </x-nq::tabs.list>

            <x-nq::tabs.panel value="results">
                <div x-show="isError" {!! $hide !!}>
                    <x-nq::alert tone="danger" role="alert" title="{{ $t['queryFailed'] }}">
                        <bdi dir="ltr" class="whitespace-pre-wrap font-mono text-code" x-text="errorText"></bdi>
                    </x-nq::alert>
                </div>
                <div x-show="! hasResult && ! isError" data-slot="empty-state" class="{{ $stateBox }}">
                    <span data-slot="state-icon" class="{{ $stateIcon }}"><x-lucide-play aria-hidden="true" /></span>
                    <div class="flex max-w-sm flex-col gap-1">
                        <p class="text-label text-foreground">{{ $t['noRun'] }}</p>
                        <p class="text-body-sm text-muted-foreground">{{ $t['noRunBody'] }}</p>
                    </div>
                </div>
                <div x-show="hasResult" {!! $hide !!} class="flex min-w-0 flex-col gap-3">
                    <div data-slot="data-table-toolbar" class="flex flex-wrap items-center gap-2">
                        <p data-slot="database-explorer-summary" role="status" class="text-body-sm text-muted-foreground" x-text="summary"></p>
                        <div class="ms-auto flex items-center gap-2">
                            <x-nq::button type="button" variant="secondary" size="sm" x-on:click="copyCsv()" x-bind:disabled="! hasRows" x-bind:data-copied="copied ? '' : null" class="data-copied:text-nq-success-text">
                                <x-lucide-copy aria-hidden="true" x-show="! copied" />
                                <x-lucide-check aria-hidden="true" x-show="copied" {!! $hide !!} />
                                {{ $t['copyCsv'] }}
                            </x-nq::button>
                            <span data-slot="copy-button-status" role="status" aria-live="polite" class="sr-only" x-text="copied ? config.strings.copied : ''"></span>
                            <x-nq::button type="button" size="sm" x-on:click="exportCsv()" x-bind:disabled="! hasRows">
                                <x-lucide-download aria-hidden="true" />
                                {{ $t['exportCsv'] }}
                            </x-nq::button>
                        </div>
                    </div>
                    <div x-show="truncated" {!! $hide !!}>
                        <x-nq::alert tone="warning"><span x-text="truncatedText"></span></x-nq::alert>
                    </div>
                    <div x-show="noColumns" data-slot="empty-state" {!! $hide !!} class="{{ $stateBox }}">
                        <div class="flex max-w-sm flex-col gap-1"><p class="text-label text-foreground" x-text="emptyTitle"></p></div>
                    </div>
                    <div x-show="! noColumns" data-slot="table-container" role="region" tabindex="0" aria-label="{{ $t['resultsTable'] }}"
                        class="relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                        <div data-slot="table" role="table" aria-label="{{ $t['resultsTable'] }}" x-bind:style="'grid-template-columns: repeat(' + columnsView.length + ', auto)'" class="grid w-full min-w-max text-body-sm">
                            <div data-slot="table-header" role="rowgroup" class="contents">
                                <div role="row" data-slot="table-row" class="col-span-full grid grid-cols-subgrid border-b border-border">
                                    <template x-for="col in columnsView" x-bind:key="col.index">
                                        <div role="columnheader" data-slot="table-head" x-bind:aria-sort="col.aria" x-bind:class="col.align === 'end' ? 'justify-end text-end' : 'text-start'" class="flex items-center {{ $head }}">
                                            <button type="button" x-on:click="sortBy(col.index)" x-bind:class="col.sort ? 'text-foreground' : ''" class="{{ $sortBtn }}">
                                                <bdi dir="ltr" class="font-mono" x-text="col.name"></bdi>
                                                <x-lucide-chevrons-up-down aria-hidden="true" class="size-3.5 shrink-0 opacity-40" x-show="! col.sort" />
                                                <x-lucide-arrow-up aria-hidden="true" class="size-3.5 shrink-0" x-show="col.sort === 'asc'" {!! $hide !!} />
                                                <x-lucide-arrow-down aria-hidden="true" class="size-3.5 shrink-0" x-show="col.sort === 'desc'" {!! $hide !!} />
                                            </button>
                                        </div>
                                    </template>
                                </div>
                            </div>
                            <div role="rowgroup" class="contents" data-slot="table-body">
                                <template x-for="row in pageRows" x-bind:key="row.i">
                                    <div role="row" data-slot="table-row" class="col-span-full grid grid-cols-subgrid group/row border-b border-border transition-colors duration-150 ease-nq hover:bg-nq-hover">
                                        <template x-for="(cell, ci) in row.cells" x-bind:key="ci">
                                            <div role="cell" data-slot="table-cell" x-bind:class="cell.align === 'end' ? 'justify-end text-end' : 'text-start'" class="flex items-center h-row px-4 py-3 align-middle whitespace-nowrap">
                                                <template x-if="cell.kind === 'null'">
                                                    <span dir="ltr" class="rounded-[3px] bg-secondary px-1 font-mono text-caption text-muted-foreground">{{ $t['null'] }}</span>
                                                </template>
                                                <template x-if="cell.kind !== 'null'">
                                                    <bdi dir="ltr" x-bind:title="cell.text" x-bind:class="cell.cls" class="block max-w-72 truncate font-mono text-code" x-text="cell.text"></bdi>
                                                </template>
                                            </div>
                                        </template>
                                    </div>
                                </template>
                            </div>
                        </div>
                        <div x-show="noRows" data-slot="empty-state" {!! $hide !!} class="{{ $stateBox }} border-0">
                            <div class="flex max-w-sm flex-col gap-1"><p class="text-label text-foreground">{{ $t['noRows'] }}</p></div>
                        </div>
                    </div>
                </div>
            </x-nq::tabs.panel>

            <x-nq::tabs.panel value="structure">
                <div x-show="! hasStructure" data-slot="empty-state" class="{{ $stateBox }}">
                    <span data-slot="state-icon" class="{{ $stateIcon }}"><x-lucide-table-2 aria-hidden="true" /></span>
                    <div class="flex max-w-sm flex-col gap-1"><p class="text-label text-foreground">{{ $t['pickTable'] }}</p></div>
                </div>
                <div x-show="hasStructure" {!! $hide !!} class="overflow-x-auto rounded-card border border-border bg-card">
                    <div role="table" x-bind:aria-label="structureName" style="grid-template-columns: repeat(4, auto)" class="grid w-full min-w-md text-body-sm">
                        <div role="rowgroup" class="contents">
                            <div role="row" class="col-span-full grid grid-cols-subgrid border-b border-border text-start text-caption text-muted-foreground">
                                <div role="columnheader" class="{{ $th }}">{{ $t['column'] }}</div>
                                <div role="columnheader" class="{{ $th }}">{{ $t['type'] }}</div>
                                <div role="columnheader" class="{{ $th }}">{{ $t['nullable'] }}</div>
                                <div role="columnheader" class="px-3 py-2"></div>
                            </div>
                        </div>
                        <div role="rowgroup" class="contents">
                            <template x-for="c in structure" x-bind:key="c.name">
                                <div role="row" class="col-span-full grid grid-cols-subgrid border-b border-border last:border-b-0">
                                    <div role="rowheader" class="{{ $td }} text-start font-normal"><bdi dir="ltr" class="font-mono text-code text-foreground" x-text="c.name"></bdi></div>
                                    <div role="cell" class="{{ $td }}"><bdi dir="ltr" class="font-mono text-code text-muted-foreground" x-text="c.type"></bdi></div>
                                    <div role="cell" class="{{ $td }} text-muted-foreground" x-text="c.nullable ? config.strings.yes : config.strings.no"></div>
                                    <div role="cell" class="{{ $td }}">
                                        <span class="flex flex-wrap items-center justify-end gap-1.5">
                                            <x-nq::badge variant="accent" x-show="c.primaryKey" style="display: none">
                                                <x-lucide-key aria-hidden="true" />
                                                {{ $t['primaryKey'] }}
                                            </x-nq::badge>
                                            <x-nq::badge variant="info" x-show="c.references" x-bind:title="c.references ? refTitle(c.references) : null" style="display: none">
                                                <x-lucide-link-2 aria-hidden="true" />
                                                <bdi dir="ltr" class="font-mono" x-text="c.references"></bdi>
                                            </x-nq::badge>
                                        </span>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </x-nq::tabs.panel>

            <x-nq::tabs.panel value="history">
                <div x-show="history.length === 0" data-slot="empty-state" class="{{ $stateBox }}">
                    <div class="flex max-w-sm flex-col gap-1"><p class="text-label text-foreground">{{ $t['historyEmpty'] }}</p></div>
                </div>
                <div x-show="history.length > 0" {!! $hide !!} class="flex flex-col gap-2">
                    <ul class="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-card p-0">
                        <template x-for="entry in history" x-bind:key="entry">
                            <li class="border-b border-border last:border-b-0">
                                <button type="button" title="{{ $t['useQuery'] }}" x-on:click="useQuery(entry)"
                                    class="block w-full px-3 py-2 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                                    <bdi dir="ltr" class="block truncate font-mono text-code text-foreground" x-text="oneLine(entry)"></bdi>
                                </button>
                            </li>
                        </template>
                    </ul>
                    <div>
                        <x-nq::button type="button" variant="ghost" size="sm" x-on:click="clearHistory()">
                            <x-lucide-trash-2 aria-hidden="true" />
                            {{ $t['historyClear'] }}
                        </x-nq::button>
                    </div>
                </div>
            </x-nq::tabs.panel>
        </x-nq::tabs>
    </div>

    <x-nq::alert-dialog x-model="confirmOpen">
        <x-nq::alert-dialog.content>
            <x-nq::alert-dialog.header>
                <x-nq::alert-dialog.title>{{ $t['writeTitle'] }}</x-nq::alert-dialog.title>
                <x-nq::alert-dialog.description>{{ $t['writeBody'] }}</x-nq::alert-dialog.description>
            </x-nq::alert-dialog.header>
            <bdi dir="ltr" class="block max-h-32 overflow-auto rounded-control border border-border bg-secondary p-2 font-mono text-code" x-text="confirmSql"></bdi>
            <x-nq::alert-dialog.footer>
                <x-nq::alert-dialog.cancel>{{ $t['cancel'] }}</x-nq::alert-dialog.cancel>
                <x-nq::button type="button" variant="danger" x-on:click="confirmRun()">{{ $t['writeConfirm'] }}</x-nq::button>
            </x-nq::alert-dialog.footer>
        </x-nq::alert-dialog.content>
    </x-nq::alert-dialog>
</section>
