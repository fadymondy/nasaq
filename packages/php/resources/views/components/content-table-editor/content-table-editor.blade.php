{{-- <x-nq::content-table-editor :value="['columns' => [['id' => 'name', 'label' => 'Name', 'type' => 'text']], 'rows' => [['id' => 'r1', 'cells' => ['name' => 'Coffee']]]]" has-save />
     A spreadsheet-like editor for structured content: typed columns (text, number, select, date, checkbox, url, tags), inline editing with keyboard navigation,
     sort and search, row and column management, undo and redo, validation, column summaries, CSV export and an optional async save.
     value: ['columns' => [{ id, label, type, options?: [{ value, label, hue }], required?, width? }], 'rows' => [{ id, cells: { columnId: value } }]]. x-modelable: x-model="table" reads and writes it.
     read-only: show cells but refuse edits. editable-columns (default true), searchable (default true), label (the grid's accessible name), max-height (a CSS length).
     has-save: adds a Save button and the unsaved-changes badge. labels: overrides of the built-in strings (keys as the React ContentTableText, plain strings only).
     Events from the root: nq-content-change { value }, nq-content-save { value, done } (call detail.done() or detail.done({ error })),
     nq-content-export { csv } (preventDefault to handle the CSV yourself). The toolbar slot adds your own controls.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => ['columns' => [], 'rows' => []], 'readOnly' => false, 'editableColumns' => true, 'searchable' => true, 'label' => null, 'maxHeight' => null, 'hasSave' => false, 'labels' => [], 'toolbar' => null])
@php
    $config = \Illuminate\Support\Js::from(array_filter([
        'value' => ['columns' => array_values($value['columns'] ?? []), 'rows' => array_values($value['rows'] ?? [])],
        'readOnly' => $readOnly ?: null,
        'editableColumns' => $editableColumns ? null : false,
        'searchable' => $searchable ? null : false,
        'label' => $label,
        'hasSave' => $hasSave ?: null,
        'labels' => $labels ?: null,
    ], fn ($v) => $v !== null))->toHtml();
    $cell = 'relative h-row border-s border-border px-3 align-middle outline-none first:border-s-0 focus:outline-2 focus:-outline-offset-2 focus:outline-nq-focus';
    $field = 'w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus';
    $badge = 'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'content-table-editor') }}" x-data="nqContentTable({!! $config !!})" x-modelable="value" x-id="['nq-ct']" x-on:keydown="onGridKey($event)"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <div role="toolbar" x-bind:aria-label="gridLabel()" class="flex flex-wrap items-center gap-2">
        <template x-if="searchable">
            <div class="relative min-w-40 flex-1 sm:max-w-xs">
                <x-lucide-search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <x-nq::field.input x-model="query" x-bind:aria-label="s(`search`)" x-bind:placeholder="s(`searchPlaceholder`)" class="ps-8 pe-8" />
                <button type="button" x-show="query" x-on:click="query = ``" x-bind:aria-label="s(`clearSearch`)" style="display: none"
                    class="absolute end-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"><x-lucide-x aria-hidden="true" class="size-4" /></button>
            </div>
        </template>
        <div class="ms-auto flex flex-wrap items-center gap-2">
            <template x-if="selectedCount > 0">
                <div class="flex items-center gap-2">
                    <span class="text-body-sm text-muted-foreground" x-text="s(`selected`, n(selected.length))"></span>
                    <x-nq::button size="sm" variant="danger" x-on:click="deleteSelected()"><x-lucide-trash-2 aria-hidden="true" /><span x-text="s(`deleteSelected`, n(selected.length))"></span></x-nq::button>
                </div>
            </template>
            @if ($toolbar){{ $toolbar }}@endif
            <template x-if="editable">
                <div class="flex items-center gap-2">
                    <x-nq::button size="icon-sm" variant="ghost" x-on:click="undo()" x-bind:aria-label="s(`undo`)" x-bind:title="s(`undo`)" x-bind:disabled="noUndo"><x-lucide-undo-2 aria-hidden="true" /></x-nq::button>
                    <x-nq::button size="icon-sm" variant="ghost" x-on:click="redo()" x-bind:aria-label="s(`redo`)" x-bind:title="s(`redo`)" x-bind:disabled="noRedo"><x-lucide-redo-2 aria-hidden="true" /></x-nq::button>
                </div>
            </template>
            <x-nq::button size="sm" x-on:click="exportCsv()"><x-lucide-download aria-hidden="true" /><span x-text="s(`exportCsv`)"></span></x-nq::button>
            <template x-if="canEditColumns">
                <x-nq::button size="sm" x-on:click="openNewColumn()"><x-lucide-columns-3 aria-hidden="true" /><span x-text="s(`addColumn`)"></span></x-nq::button>
            </template>
            <template x-if="editable && hasSave">
                <x-nq::button size="sm" x-on:click="addRow()" x-bind:disabled="noColumns"><x-lucide-plus aria-hidden="true" /><span x-text="s(`addRow`)"></span></x-nq::button>
            </template>
            <template x-if="editable && ! hasSave">
                <x-nq::button size="sm" variant="primary" x-on:click="addRow()" x-bind:disabled="noColumns"><x-lucide-plus aria-hidden="true" /><span x-text="s(`addRow`)"></span></x-nq::button>
            </template>
            <template x-if="hasSave">
                <span class="inline-flex">
                    <span data-slot="badge" x-show="saveBadge === `saving`" style="display: none" x-text="s(`saving`)" class="{{ $badge }} border-nq-info/40 bg-nq-info-soft text-nq-info-text"></span>
                    <span data-slot="badge" role="alert" x-show="saveBadge === `error`" style="display: none" x-text="saveMessage || s(`saveFailed`)" class="{{ $badge }} border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text"></span>
                    <span data-slot="badge" x-show="saveBadge === `unsaved`" style="display: none" x-text="s(`unsaved`)" class="{{ $badge }} border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text"></span>
                    <span data-slot="badge" x-show="saveBadge === `saved`" x-text="s(`saved`)" class="{{ $badge }} border-nq-success/40 bg-nq-success-soft text-nq-success-text"></span>
                </span>
            </template>
            <span data-slot="badge" x-show="issueCount > 0" style="display: none" x-text="s(`issues`, n(issueCount))" class="{{ $badge }} border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text"></span>
            <template x-if="hasSave && editable">
                <x-nq::button size="sm" variant="primary" x-on:click="save()" x-bind:disabled="saveOff"><span x-text="s(`save`)"></span></x-nq::button>
            </template>
        </div>
    </div>

    <div class="min-w-0 overflow-auto rounded-card border border-border bg-card" @if ($maxHeight) style="max-height: {{ $maxHeight }}" @endif>
        <template x-if="showEmpty">
            <div data-slot="empty-state" class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <span data-slot="state-icon" class="inline-flex size-10 items-center justify-center rounded-control border border-border bg-card text-muted-foreground [&_svg]:size-5"><x-lucide-rows-3 aria-hidden="true" /></span>
                <div class="flex max-w-sm flex-col gap-1">
                    <p class="text-label text-foreground" x-text="s(`empty`)"></p>
                    <p class="text-body-sm text-muted-foreground" x-text="s(`emptyHint`)"></p>
                </div>
                <template x-if="canAddFirst">
                    <x-nq::button variant="primary" x-on:click="addRow()"><x-lucide-plus aria-hidden="true" /><span x-text="s(`addRow`)"></span></x-nq::button>
                </template>
            </div>
        </template>
        <div x-show="! showEmpty" role="grid" data-slot="content-table-grid" x-bind:aria-label="gridLabel()" x-bind:aria-rowcount="view.length + 1" x-bind:aria-describedby="$id(`nq-ct`, `hint`)" class="table w-max min-w-full border-collapse text-body-sm">
            <div role="rowgroup" class="table-header-group sticky top-0 z-10 bg-secondary">
                <div role="row" class="table-row border-b border-border">
                    <div role="columnheader" class="table-cell w-10 px-3 text-start align-middle">
                        <template x-if="editable"><x-nq::content-table-editor.check x-bind="boxBind(`all`)" x-bind:aria-label="s(`selectAll`)" /></template>
                    </div>
                    <template x-for="(column, ci) in columns" :key="column.id">
                        <div role="columnheader" x-bind:aria-sort="sortState(column)" x-bind:style="widthStyle(column)" class="table-cell h-row border-s border-border px-1 text-start align-middle text-caption font-medium text-muted-foreground first:border-s-0">
                            <div class="flex items-center gap-1">
                                <button type="button" x-on:click="cycleSort(column)" class="flex min-w-0 flex-1 items-center gap-1.5 rounded-[4px] px-2 py-1 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                                    <span class="min-w-0 truncate" x-text="column.label"></span>
                                    <span x-show="column.required" aria-hidden="true" class="text-nq-danger-text" style="display: none">*</span>
                                    <span x-show="isSorted(column)" style="display: none" class="shrink-0 text-foreground [&_svg]:size-3.5">
                                        <x-lucide-arrow-up aria-hidden="true" x-show="sortAscending()" />
                                        <x-lucide-arrow-down aria-hidden="true" x-show="! sortAscending()" />
                                    </span>
                                </button>
                                <x-nq::dropdown-menu>
                                    <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" x-bind:aria-label="s(`columnMenu`, column.label)"><x-lucide-ellipsis aria-hidden="true" /></x-nq::dropdown-menu.trigger>
                                    <x-nq::dropdown-menu.content align="end" class="min-w-48">
                                        <x-nq::dropdown-menu.group>
                                            <x-nq::dropdown-menu.item x-on:click="sortBy(column, `asc`)"><x-lucide-arrow-up aria-hidden="true" /><span x-text="s(`sortAsc`)"></span></x-nq::dropdown-menu.item>
                                            <x-nq::dropdown-menu.item x-on:click="sortBy(column, `desc`)"><x-lucide-arrow-down aria-hidden="true" /><span x-text="s(`sortDesc`)"></span></x-nq::dropdown-menu.item>
                                            <x-nq::dropdown-menu.item x-show="isSorted(column)" x-on:click="sortBy(column, null)"><span x-text="s(`clearSort`)"></span></x-nq::dropdown-menu.item>
                                        </x-nq::dropdown-menu.group>
                                        <template x-if="canEditColumns">
                                            <div>
                                                <x-nq::dropdown-menu.separator />
                                                <x-nq::dropdown-menu.group>
                                                    <x-nq::dropdown-menu.item x-on:click="openColumn(column)"><x-lucide-pencil aria-hidden="true" /><span x-text="s(`editColumn`)"></span></x-nq::dropdown-menu.item>
                                                    <x-nq::dropdown-menu.item x-bind:data-disabled="colMoveOff(ci, -1)" x-on:click="moveColumn(ci, -1)"><x-lucide-arrow-left aria-hidden="true" /><span x-text="s(`moveLeft`)"></span></x-nq::dropdown-menu.item>
                                                    <x-nq::dropdown-menu.item x-bind:data-disabled="colMoveOff(ci, 1)" x-on:click="moveColumn(ci, 1)"><x-lucide-arrow-right aria-hidden="true" /><span x-text="s(`moveRight`)"></span></x-nq::dropdown-menu.item>
                                                </x-nq::dropdown-menu.group>
                                                <x-nq::dropdown-menu.separator />
                                                <x-nq::dropdown-menu.item variant="danger" x-on:click="deleteColumn(column)"><x-lucide-trash-2 aria-hidden="true" /><span x-text="s(`deleteColumn`)"></span></x-nq::dropdown-menu.item>
                                            </div>
                                        </template>
                                    </x-nq::dropdown-menu.content>
                                </x-nq::dropdown-menu>
                            </div>
                        </div>
                    </template>
                    <div role="columnheader" class="table-cell w-10 px-1"></div>
                </div>
            </div>
            <div role="rowgroup" class="table-row-group">
                <template x-for="(row, ri) in view" :key="row.id">
                    <div role="row" data-slot="content-table-row" x-bind:aria-rowindex="ri + 2" x-bind:aria-selected="isSelected(row)" x-bind:data-state="rowState(row)"
                        class="table-row group border-b border-border last:border-b-0 hover:bg-nq-hover data-[state=selected]:bg-nq-selected">
                        <div role="gridcell" class="table-cell w-10 px-3 align-middle">
                            <template x-if="editable"><x-nq::content-table-editor.check x-bind="boxBind(`row`, row.id)" x-bind:aria-label="s(`selectRow`, n(ri + 1))" /></template>
                            <template x-if="! editable"><span class="text-caption text-muted-foreground tabular-nums" x-text="n(ri + 1)"></span></template>
                        </div>
                        <template x-for="(column, ci) in columns" :key="column.id">
                            <div role="gridcell" x-bind:tabindex="tabindex(row, ri, ci)" x-bind:data-row="row.id" x-bind:data-col="ci"
                                x-bind:aria-invalid="cellInvalid(row, column)" x-bind:aria-label="cellAria(row, column, ri)" x-bind:title="cellTitle(row, column)"
                                x-bind:style="widthStyle(column, true)" x-bind:class="cellClass(row, column)"
                                x-on:focus="onCellFocus($event, row, ci)" x-on:keydown="onCellKey($event, row, ci)" x-on:click="onCellClick($event, row, ci, column)"
                                class="table-cell {{ $cell }}">
                                <template x-if="cellKind(row, column, ci) === `checkbox`">
                                    <x-nq::content-table-editor.check x-bind="boxBind(`cell`, row.id, column.id)" x-bind:aria-label="cellLabel(row, column, ri)" />
                                </template>
                                <template x-if="cellKind(row, column, ci) === `choice`">
                                    <div x-data="nqPopover(false)" x-id="['nq-popover']" class="contents">
                                        <div data-choice-trigger x-ref="trigger" role="button" aria-haspopup="dialog" x-bind:aria-expanded="open" x-bind:aria-label="column.label" x-on:click="editable ? toggle() : null"
                                            class="flex min-h-6 w-full min-w-0 items-center outline-none">
                                            <x-nq::content-table-editor.cell-value />
                                        </div>
                                        <template x-teleport="body">
                                            <div data-slot="popover-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open" x-anchor.bottom-start.offset.6="$refs.trigger"
                                                class="z-50 w-56 max-w-[var(--available-width)] rounded-floating border border-border bg-popover p-1 text-body-sm text-popover-foreground shadow-floating outline-none transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
                                                <p x-show="noOptions(column)" class="px-2 py-1.5 text-caption text-muted-foreground" x-text="s(`noOptions`)"></p>
                                                <ul role="listbox" x-bind:aria-label="column.label" x-bind:aria-multiselectable="isMulti(column)" class="flex max-h-60 flex-col overflow-y-auto">
                                                    <template x-for="o in optionList(column)" :key="o.value">
                                                        <li role="presentation">
                                                            <button type="button" role="option" x-bind:aria-selected="isChosen(row, column, o.value)" x-on:click="pick(row, column, o.value); isMulti(column) ? null : close()"
                                                                class="flex h-control-sm w-full items-center gap-2 rounded-[4px] px-2 text-start outline-none hover:bg-nq-hover focus-visible:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                                                                <span class="flex size-4 shrink-0 items-center justify-center"><x-lucide-check aria-hidden="true" class="size-4" x-show="isChosen(row, column, o.value)" style="display: none" /></span>
                                                                <span data-slot="badge" x-bind:style="tagStyle(column, o.value)" x-text="o.label"
                                                                    class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-transparent bg-[var(--tag-soft)] px-1.5 text-caption font-medium text-[var(--tag-solid)]"></span>
                                                            </button>
                                                        </li>
                                                    </template>
                                                </ul>
                                                <button type="button" x-show="hasValue(row, column)" style="display: none" x-on:click="clearChoice(row, column); close()" x-text="s(`clear`)"
                                                    class="mt-1 flex h-control-sm w-full items-center rounded-[4px] border-t border-border px-2 text-caption text-muted-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"></button>
                                            </div>
                                        </template>
                                    </div>
                                </template>
                                <template x-if="cellKind(row, column, ci) === `editing`">
                                    <div>
                                        <span class="invisible"><x-nq::content-table-editor.cell-value /></span>
                                        <input x-init="startEditor($el, row, column)" x-bind:type="editorType(column)" x-bind:inputmode="editorMode(column)" x-bind:dir="editorDir(column)" x-bind:aria-label="cellLabel(row, column, ri)"
                                            x-bind:class="editorClass(column)" x-on:keydown="onEditorKey($event, row, ci)" x-on:blur="finishEdit(row.id, ci, $el.value, `none`)"
                                            class="absolute inset-0 size-full min-w-0 bg-card px-3 text-body-sm text-foreground outline-2 -outline-offset-2 outline-nq-focus">
                                    </div>
                                </template>
                                <template x-if="cellKind(row, column, ci) === `view`"><x-nq::content-table-editor.cell-value /></template>
                            </div>
                        </template>
                        <div role="gridcell" class="table-cell w-10 px-1 align-middle">
                            <template x-if="editable">
                                <x-nq::dropdown-menu>
                                    <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" x-bind:aria-label="s(`rowActions`, n(ri + 1))" class="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"><x-lucide-ellipsis aria-hidden="true" /></x-nq::dropdown-menu.trigger>
                                    <x-nq::dropdown-menu.content align="end" class="min-w-48">
                                        <x-nq::dropdown-menu.group>
                                            <x-nq::dropdown-menu.item x-on:click="addRowAt(row, 0)"><x-lucide-plus aria-hidden="true" /><span x-text="s(`insertAbove`)"></span></x-nq::dropdown-menu.item>
                                            <x-nq::dropdown-menu.item x-on:click="addRowAt(row, 1)"><x-lucide-plus aria-hidden="true" /><span x-text="s(`insertBelow`)"></span></x-nq::dropdown-menu.item>
                                            <x-nq::dropdown-menu.item x-on:click="duplicateRow(row)"><x-lucide-copy aria-hidden="true" /><span x-text="s(`duplicate`)"></span></x-nq::dropdown-menu.item>
                                        </x-nq::dropdown-menu.group>
                                        <x-nq::dropdown-menu.separator />
                                        <x-nq::dropdown-menu.group>
                                            <x-nq::dropdown-menu.item x-bind:data-disabled="rowMoveOff(row, -1)" x-on:click="moveRow(row, -1)"><x-lucide-arrow-up aria-hidden="true" /><span x-text="s(`moveUp`)"></span></x-nq::dropdown-menu.item>
                                            <x-nq::dropdown-menu.item x-bind:data-disabled="rowMoveOff(row, 1)" x-on:click="moveRow(row, 1)"><x-lucide-arrow-down aria-hidden="true" /><span x-text="s(`moveDown`)"></span></x-nq::dropdown-menu.item>
                                        </x-nq::dropdown-menu.group>
                                        <x-nq::dropdown-menu.separator />
                                        <x-nq::dropdown-menu.item variant="danger" x-on:click="deleteRows([row.id])"><x-lucide-trash-2 aria-hidden="true" /><span x-text="s(`delete`)"></span></x-nq::dropdown-menu.item>
                                    </x-nq::dropdown-menu.content>
                                </x-nq::dropdown-menu>
                            </template>
                        </div>
                    </div>
                </template>
            </div>
            <div role="rowgroup" data-slot="content-table-footer" x-show="view.length > 0" class="table-footer-group border-t border-border bg-secondary/50 text-caption text-muted-foreground">
                <div role="row" class="table-row">
                    <div role="gridcell" class="table-cell px-3 py-1.5"></div>
                    <template x-for="column in columns" :key="column.id">
                        <div role="gridcell" class="table-cell border-s border-border px-3 py-1.5 first:border-s-0">
                            <span x-show="isSum(column)" style="display: none" class="flex justify-between gap-2"><span x-text="s(`sum`)"></span><span class="tabular-nums text-foreground" x-text="summaryText(column)"></span></span>
                            <span x-show="! isSum(column)" x-text="summaryText(column)"></span>
                        </div>
                    </template>
                    <div role="gridcell" class="table-cell"></div>
                </div>
            </div>
        </div>
        <div x-show="noMatches" style="display: none" data-slot="empty-state" class="flex flex-col items-center justify-center gap-3 border-t border-border px-6 py-12 text-center">
            <span data-slot="state-icon" class="inline-flex size-10 items-center justify-center rounded-control border border-border bg-card text-muted-foreground [&_svg]:size-5"><x-lucide-search aria-hidden="true" /></span>
            <p class="text-label text-foreground" x-text="s(`noMatches`)"></p>
            <x-nq::button x-on:click="query = ``"><span x-text="s(`clearSearch`)"></span></x-nq::button>
        </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
        <span x-bind:id="$id(`nq-ct`, `hint`)" x-text="hintText()"></span>
        <span x-text="rowCountText()"></span>
    </div>
    <div class="sr-only" role="status" aria-live="polite" x-text="announce"></div>

    <x-nq::dialog x-model="draftOpen">
        <x-nq::dialog.content class="max-w-md">
            <x-nq::dialog.header>
                <x-nq::dialog.title x-text="draftTitle" />
                <x-nq::dialog.description class="sr-only"><span x-text="s(`columnName`)"></span></x-nq::dialog.description>
            </x-nq::dialog.header>
            <form class="grid gap-4" x-on:submit.prevent="applyColumn()">
                <div class="grid gap-1.5">
                    <label class="text-label text-foreground" x-bind:for="$id(`nq-ct`, `name`)" x-text="s(`columnName`)"></label>
                    <input type="text" x-bind:id="$id(`nq-ct`, `name`)" x-model="draft.label" class="h-control {{ $field }}">
                </div>
                <div class="grid gap-1.5">
                    <label class="text-label text-foreground" x-bind:for="$id(`nq-ct`, `type`)" x-text="s(`columnType`)"></label>
                    <select x-bind:id="$id(`nq-ct`, `type`)" x-model="draft.type" class="h-control {{ $field }}">
                        <template x-for="type in columnTypes()" :key="type"><option x-bind:value="type" x-text="typeLabel(type)"></option></template>
                    </select>
                </div>
                <div class="grid gap-1.5" x-show="draftHasOptions" style="display: none">
                    <label class="text-label text-foreground" x-bind:for="$id(`nq-ct`, `options`)" x-text="s(`options`)"></label>
                    <textarea rows="4" x-bind:id="$id(`nq-ct`, `options`)" x-model="draft.options" class="min-h-20 py-2 {{ $field }}"></textarea>
                    <p class="text-caption text-muted-foreground" x-text="s(`optionsHint`)"></p>
                </div>
                <label class="flex items-center gap-2 text-body-sm text-foreground">
                    <x-nq::checkbox x-model="draft.required" />
                    <span x-text="s(`required`)"></span>
                </label>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" x-on:click="draftOpen = false"><span x-text="s(`cancel`)"></span></x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="draftInvalid"><span x-text="s(`saveColumn`)"></span></x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>
</div>
