{{-- <x-nq::report-editor :report="['title' => 'May summary', 'blocks' => []]" can-save />
     Builds a report from blocks: headings, text, key figures, charts, tables, callouts and dividers. Each block edits in a collapsible, reorderable row
     (the repeater); Preview shows the finished report as a reader sees it, live. The report lives in the page (Alpine); read it from the events.
     report: ['title', 'subtitle', 'author', 'date', 'blocks' => [...]] (see <x-nq::report-editor.viewer> for the block shapes).
     can-save: adds the Save button and the unsaved-changes state. Listen with x-on:nq-save="$event.detail.promise = fetch(...)"; a promise resolving to { error: '...' } shows the error.
     Events (bubble): nq-change { report }, nq-save { report, promise }, nq-print (cancelable; otherwise window.print()).
     default-view: edit | preview. read-only: shows the viewer only. labels: array overriding the built-in words. locale overrides the app's.
     Text blocks are edited as HTML source in a textarea (the Tiptap editor is not bundled). Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.report-editor._logic')
@props(['report' => ['title' => '', 'blocks' => []], 'canSave' => false, 'defaultView' => 'edit', 'readOnly' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_re_words($locale, $labels);
    $report['blocks'] = array_values($report['blocks'] ?? []);
    $options = ['locale' => $locale, 'defaultView' => $defaultView, 'readOnly' => (bool) $readOnly, 'canSave' => (bool) $canSave];
    $types = ['heading' => 'heading', 'text' => 'align-left', 'metrics' => 'trending-up', 'chart' => 'bar-chart-3', 'table' => 'table-2', 'callout' => 'info', 'divider' => 'minus'];
    $field = 'flex flex-col gap-1.5';
    $label = 'text-label text-foreground';
    $selectClass = 'h-control w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground outline-none focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus';
@endphp
<div data-slot="report-editor" role="group" aria-label="{{ $t['editor'] }}"
    x-data="nqReportEditor(@js($report), @js($t), @js($options))"
    {{ $attributes->cn('flex min-w-0 flex-col gap-4') }}>
    <div class="flex flex-wrap items-center gap-2">
        @unless ($readOnly)
            <x-nq::toggle-group x-model="viewSel" aria-label="{{ $t['view'] }}">
                <x-nq::toggle-group.toggle value="edit">{{ $t['edit'] }}</x-nq::toggle-group.toggle>
                <x-nq::toggle-group.toggle value="preview">{{ $t['preview'] }}</x-nq::toggle-group.toggle>
            </x-nq::toggle-group>
        @endunless
        <span class="text-caption text-muted-foreground" x-text="say(t.words, num(words)) + ' · ' + say(t.minutes, num(minutes))">{{ nq_re_fill($t['words'], 0) }}</span>
        @unless ($readOnly)
            <span x-show="issues > 0" x-cloak style="display: none"><x-nq::badge variant="warning"><span x-text="say(t.issues, num(issues))"></span></x-nq::badge></span>
        @endunless
        <div class="ms-auto flex flex-wrap items-center gap-2">
            @if ($canSave && ! $readOnly)
                <span x-show="status === 'saving'" x-cloak style="display: none"><x-nq::badge variant="info">{{ $t['saving'] }}</x-nq::badge></span>
                <span x-show="status === 'error'" x-cloak style="display: none" role="alert"><x-nq::badge variant="danger"><span x-text="message || t.saveFailed"></span></x-nq::badge></span>
                <span x-show="status === 'idle' && dirty" x-cloak style="display: none"><x-nq::badge variant="warning">{{ $t['unsaved'] }}</x-nq::badge></span>
                <span x-show="status === 'idle' && !dirty"><x-nq::badge variant="success">{{ $t['saved'] }}</x-nq::badge></span>
                <x-nq::button size="sm" x-on:click="save()" x-bind:disabled="!dirty || status === 'saving'">{{ $t['save'] }}</x-nq::button>
            @endif
            <span x-show="view === 'preview'" x-cloak style="display: none">
                <x-nq::button size="sm" variant="secondary" class="print:hidden" x-on:click="print()"><x-lucide-printer aria-hidden="true" />{{ $t['print'] }}</x-nq::button>
            </span>
        </div>
    </div>

    <div x-show="view === 'preview'" x-cloak style="display: none" class="rounded-card border border-border bg-card p-4 sm:p-8">
        <div x-show="report.blocks.length === 0 && !report.title" class="flex flex-col items-center gap-1 py-8 text-center">
            <p class="text-label text-foreground">{{ $t['emptyReport'] }}</p>
            <p class="text-body-sm text-muted-foreground">{{ $t['previewEmpty'] }}</p>
        </div>
        <div x-show="report.blocks.length > 0 || report.title" x-html="view === 'preview' ? preview : ''"></div>
    </div>

    @unless ($readOnly)
        <div x-show="view === 'edit'" class="flex flex-col gap-4">
            <div class="grid gap-3 rounded-card border border-border bg-card p-3 sm:grid-cols-2 sm:p-4">
                <label class="{{ $field }} sm:col-span-2"><span class="{{ $label }}">{{ $t['reportTitle'] }}</span><x-nq::field.input dir="auto" x-model="report.title" placeholder="{{ $t['titlePlaceholder'] }}" class="text-label" /></label>
                <label class="{{ $field }} sm:col-span-2"><span class="{{ $label }}">{{ $t['subtitle'] }}</span><x-nq::field.input dir="auto" x-model="report.subtitle" /></label>
                <label class="{{ $field }}"><span class="{{ $label }}">{{ $t['author'] }}</span><x-nq::field.input dir="auto" x-model="report.author" /></label>
                <label class="{{ $field }}"><span class="{{ $label }}">{{ $t['date'] }}</span><x-nq::field.input ltr type="date" x-model="report.date" /></label>
            </div>

            <x-nq::repeater x-model="report.blocks" label="{{ $t['blocks'] }}" add-label="{{ $t['addText'] }}"
                create-item="newBlockExpr('text')" clone-item="cloneBlockExpr(item)"
                row-title="typeName(item.type)" row-label="typeName(item.type)" row-summary="summary(item) || t.untitledBlock">
                <x-slot:empty>{{ $t['previewEmpty'] }}</x-slot:empty>
                <div class="flex flex-col gap-4">
                    <span x-show="hasIssue(item)" x-cloak style="display: none"><x-nq::badge variant="warning">{{ $t['untitledBlock'] }}</x-nq::badge></span>
                    <label class="{{ $field }} sm:max-w-56">
                        <span class="{{ $label }}">{{ $t['blockType'] }}</span>
                        <select class="{{ $selectClass }}" x-on:change="convert(index, $event.target.value)">
                            @foreach ($types as $type => $icon)
                                <option value="{{ $type }}" x-bind:selected="item.type === '{{ $type }}'">{{ $t['type'.ucfirst($type)] }}</option>
                            @endforeach
                        </select>
                    </label>

                    <template x-if="item.type === 'heading'">
                        <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                            <label class="{{ $field }}"><span class="{{ $label }}">{{ $t['headingText'] }}</span><x-nq::field.input dir="auto" x-model="item.text" /></label>
                            <label class="{{ $field }}">
                                <span class="{{ $label }}">{{ $t['headingLevel'] }}</span>
                                <select class="{{ $selectClass }}" x-model.number="item.level">
                                    <option value="1">{{ $t['level1'] }}</option>
                                    <option value="2">{{ $t['level2'] }}</option>
                                    <option value="3">{{ $t['level3'] }}</option>
                                </select>
                            </label>
                        </div>
                    </template>

                    <template x-if="item.type === 'text'">
                        <label class="{{ $field }}"><span class="{{ $label }}">{{ $t['textLabel'] }}</span><x-nq::field.textarea dir="auto" rows="5" x-model="item.html" placeholder="{{ $t['textPlaceholder'] }}" class="py-2" /></label>
                    </template>

                    <template x-if="item.type === 'metrics'">
                        <div class="flex flex-col gap-3">
                            <ul class="flex flex-col gap-3">
                                <template x-for="(m, i) in item.items" :key="m.id">
                                    <li class="grid gap-2 rounded-control border border-border p-2.5 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
                                        <label class="{{ $field }}"><span class="{{ $label }}">{{ $t['metricLabel'] }}</span><x-nq::field.input dir="auto" x-model="m.label" /></label>
                                        <label class="{{ $field }}"><span class="{{ $label }}">{{ $t['metricValue'] }}</span><x-nq::field.input ltr inputmode="decimal" x-bind:value="m.value" x-on:change="setNumber(m, 'value', $event.target.value)" /></label>
                                        <label class="{{ $field }}"><span class="{{ $label }}">{{ $t['metricDelta'] }}</span><x-nq::field.input ltr inputmode="decimal" placeholder="—" x-bind:value="deltaText(m)" x-on:change="setDelta(m, $event.target.value)" /></label>
                                        <label class="{{ $field }}"><span class="{{ $label }}">{{ $t['metricCurrency'] }}</span><x-nq::field.input ltr maxlength="3" x-bind:placeholder="locale.startsWith('ar') ? 'SAR' : 'USD'" x-bind:value="m.currency || ''" x-on:change="m.currency = $event.target.value.toUpperCase() || undefined" /></label>
                                        <div class="flex items-end">
                                            <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:aria-label="say(t.removeMetric, num(i + 1))" x-bind:disabled="item.items.length <= 1" x-on:click="removeFigure(item, i)"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                                        </div>
                                    </li>
                                </template>
                            </ul>
                            <div><x-nq::button type="button" size="sm" variant="secondary" x-on:click="addFigure(item)"><x-lucide-plus aria-hidden="true" />{{ $t['addMetric'] }}</x-nq::button></div>
                        </div>
                    </template>

                    <template x-if="item.type === 'chart'">
                        <div class="flex flex-col gap-3">
                            <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                                <label class="{{ $field }}"><span class="{{ $label }}">{{ $t['chartTitle'] }}</span><x-nq::field.input dir="auto" x-model="item.title" /></label>
                                <label class="{{ $field }}">
                                    <span class="{{ $label }}">{{ $t['chartKind'] }}</span>
                                    <select class="{{ $selectClass }}" x-model="item.kind">
                                        <option value="bar">{{ $t['kindBar'] }}</option>
                                        <option value="line">{{ $t['kindLine'] }}</option>
                                        <option value="area">{{ $t['kindArea'] }}</option>
                                    </select>
                                </label>
                            </div>
                            <div class="flex flex-col gap-2">
                                <template x-for="(s, si) in item.series" :key="si">
                                    <div class="flex items-end gap-2">
                                        <label class="{{ $field }} min-w-0 flex-1"><span class="{{ $label }}" x-text="say(t.seriesName, num(si + 1))"></span><x-nq::field.input dir="auto" x-model="item.series[si]" /></label>
                                        <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:aria-label="say(t.removeSeries, num(si + 1))" x-bind:disabled="item.series.length <= 1" x-on:click="removeSeries(item, si)"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                                    </div>
                                </template>
                                <div><x-nq::button type="button" size="sm" variant="secondary" x-on:click="addSeries(item)"><x-lucide-plus aria-hidden="true" />{{ $t['addSeries'] }}</x-nq::button></div>
                            </div>
                            <div class="flex flex-col gap-2">
                                <template x-for="(row, ri) in item.rows" :key="ri">
                                    <div class="flex items-end gap-2">
                                        <label class="{{ $field }} min-w-0 flex-1"><span class="{{ $label }}">{{ $t['rowLabel'] }}</span><x-nq::field.input dir="auto" x-model="row.label" /></label>
                                        <template x-for="(s, si) in item.series" :key="si">
                                            <label class="{{ $field }} w-24 shrink-0"><span class="{{ $label }} truncate" x-text="say(t.rowValue, s || num(si + 1))"></span><x-nq::field.input ltr inputmode="decimal" x-bind:value="row.values[si]" x-on:change="setValue(row, si, $event.target.value)" /></label>
                                        </template>
                                        <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:aria-label="say(t.removeRow, num(ri + 1))" x-bind:disabled="item.rows.length <= 1" x-on:click="removeRow(item, ri)"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                                    </div>
                                </template>
                                <div><x-nq::button type="button" size="sm" variant="secondary" x-on:click="addRow(item)"><x-lucide-plus aria-hidden="true" />{{ $t['addRow'] }}</x-nq::button></div>
                            </div>
                            <label class="{{ $field }}"><span class="{{ $label }}">{{ $t['caption'] }}</span><x-nq::field.input dir="auto" x-model="item.caption" /></label>
                        </div>
                    </template>

                    <template x-if="item.type === 'table'">
                        <div class="flex flex-col gap-3">
                            <label class="{{ $field }}"><span class="{{ $label }}">{{ $t['tableTitle'] }}</span><x-nq::field.input dir="auto" x-model="item.title" /></label>
                            <div class="flex flex-col gap-2 overflow-x-auto">
                                <div class="flex items-end gap-2">
                                    <template x-for="(c, ci) in item.columns" :key="ci">
                                        <div class="flex w-40 shrink-0 items-end gap-1">
                                            <label class="{{ $field }} min-w-0 flex-1"><span class="{{ $label }}" x-text="say(t.column, num(ci + 1))"></span><x-nq::field.input dir="auto" x-model="item.columns[ci]" /></label>
                                            <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:aria-label="say(t.removeColumn, num(ci + 1))" x-bind:disabled="item.columns.length <= 1" x-on:click="removeColumn(item, ci)"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                                        </div>
                                    </template>
                                </div>
                                <template x-for="(row, ri) in item.rows" :key="ri">
                                    <div class="flex items-center gap-2">
                                        <template x-for="(c, ci) in item.columns" :key="ci">
                                            <div class="w-40 shrink-0"><x-nq::field.input dir="auto" x-model="row[ci]" x-bind:aria-label="say(t.cell, num(ri + 1), num(ci + 1))" /></div>
                                        </template>
                                        <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:aria-label="say(t.removeRow, num(ri + 1))" x-bind:disabled="item.rows.length <= 1" x-on:click="removeRow(item, ri)"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                                    </div>
                                </template>
                            </div>
                            <div class="flex gap-2">
                                <x-nq::button type="button" size="sm" variant="secondary" x-on:click="addRow(item)"><x-lucide-plus aria-hidden="true" />{{ $t['addRow'] }}</x-nq::button>
                                <x-nq::button type="button" size="sm" variant="secondary" x-on:click="addColumn(item)"><x-lucide-plus aria-hidden="true" />{{ $t['addColumn'] }}</x-nq::button>
                            </div>
                        </div>
                    </template>

                    <template x-if="item.type === 'callout'">
                        <div class="grid gap-3 sm:grid-cols-2">
                            <label class="{{ $field }}">
                                <span class="{{ $label }}">{{ $t['calloutTone'] }}</span>
                                <select class="{{ $selectClass }}" x-model="item.tone">
                                    <option value="info">{{ $t['toneInfo'] }}</option>
                                    <option value="success">{{ $t['toneSuccess'] }}</option>
                                    <option value="warning">{{ $t['toneWarning'] }}</option>
                                    <option value="danger">{{ $t['toneDanger'] }}</option>
                                </select>
                            </label>
                            <label class="{{ $field }}"><span class="{{ $label }}">{{ $t['calloutTitle'] }}</span><x-nq::field.input dir="auto" x-model="item.title" /></label>
                            <label class="{{ $field }} sm:col-span-2"><span class="{{ $label }}">{{ $t['calloutText'] }}</span><x-nq::field.textarea dir="auto" rows="3" x-model="item.text" class="py-2" /></label>
                        </div>
                    </template>
                </div>
            </x-nq::repeater>

            <div>
                <x-nq::dropdown-menu>
                    <x-nq::dropdown-menu.trigger variant="secondary"><x-lucide-plus aria-hidden="true" />{{ $t['insert'] }}</x-nq::dropdown-menu.trigger>
                    <x-nq::dropdown-menu.content align="start" class="min-w-44">
                        @foreach ($types as $type => $icon)
                            <x-nq::dropdown-menu.item x-on:click="add('{{ $type }}')"><x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />{{ $t['type'.ucfirst($type)] }}</x-nq::dropdown-menu.item>
                        @endforeach
                    </x-nq::dropdown-menu.content>
                </x-nq::dropdown-menu>
            </div>
        </div>
    @endunless
</div>
