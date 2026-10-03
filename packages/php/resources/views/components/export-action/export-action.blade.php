{{-- <x-nq::export-action :columns="[['id' => 'name', 'label' => 'Name']]" :scopes="['all' => [['name' => 'Sara']]]" filename="contacts" />
     A button that opens the export options: the format (CSV, Excel, JSON, and PDF with `pdf`), the rows (selected, filtered, all, with counts)
     and the columns, then a progress state while the file is built and the result with "Download again". mode="menu" turns the button into a
     menu of formats that export at once with every column.
     columns: [{ id, label }]. A cell is row[id]. scopes: { selected?, filtered?, all? }, each a list of row arrays/objects, or ['count' => 120]
     for rows on the server (then answer the "load" event). formats (default csv, xlsx, json), default-format, default-scope, filename (no extension),
     sheet-name, variant, size (default secondary / sm). Slot: the button text (default Export).
     Bubbling events: "load" { scope, done(rows), fail(message) }, "pdf" { request, signal, progress(0..1), done(blob?), fail(message) }
     (pass `pdf` to offer PDF), "download" { file } (preventDefault() to replace the browser download), "complete" { file }.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'columns' => [],
    'scopes' => [],
    'formats' => ['csv', 'xlsx', 'json'],
    'defaultFormat' => null,
    'defaultScope' => null,
    'filename' => 'export',
    'sheetName' => null,
    'pdf' => false,
    'mode' => 'dialog',
    'variant' => 'secondary',
    'size' => 'sm',
    'disabled' => false,
])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $formats = array_values(array_filter((array) $formats, fn ($f) => $f !== 'pdf' || $pdf));
    $cols = array_values(array_map(fn ($c) => ['id' => (string) $c['id'], 'label' => (string) $c['label']], (array) $columns));
    $isCount = fn ($v) => is_array($v) && array_key_exists('count', $v) && ! array_is_list($v);
    $counts = [];
    foreach (['selected', 'filtered', 'all'] as $s) {
        if (array_key_exists($s, (array) $scopes)) {
            $counts[$s] = $isCount($scopes[$s]) ? (int) $scopes[$s]['count'] : count($scopes[$s]);
        }
    }
    $scopesJs = [];
    foreach ((array) $scopes as $s => $v) {
        $scopesJs[$s] = $isCount($v) ? ['count' => (int) $v['count']] : array_values($v);
    }
    $nothing = array_sum($counts) === 0;
    $first = $defaultScope && ($counts[$defaultScope] ?? 0) > 0 ? $defaultScope : (collect(['selected', 'filtered', 'all'])->first(fn ($s) => ($counts[$s] ?? 0) > 0) ?? 'all');
    $format = $defaultFormat && in_array($defaultFormat, $formats, true) ? $defaultFormat : ($formats[0] ?? 'csv');
    $options = array_filter([
        'formats' => $formats,
        'defaultFormat' => $format,
        'defaultScope' => $defaultScope,
        'filename' => $filename !== 'export' ? $filename : null,
        'sheetName' => $sheetName,
        'pdf' => $pdf ?: null,
    ], fn ($v) => $v !== null);
    $labels = ['csv' => $T('CSV', 'CSV'), 'xlsx' => $T('Excel', 'Excel'), 'json' => $T('JSON', 'JSON'), 'pdf' => $T('PDF', 'PDF')];
    $hints = [
        'csv' => $T('Plain text, opens anywhere', 'نص عادي يُفتح في أي مكان'),
        'xlsx' => $T('A .xlsx workbook', 'مصنّف بصيغة xlsx'),
        'json' => $T('Records for developers', 'سجلات للمطوّرين'),
        'pdf' => $T('A formatted document', 'مستند منسّق'),
    ];
    $icons = ['csv' => 'table-2', 'xlsx' => 'file-spreadsheet', 'json' => 'file-json', 'pdf' => 'file-text'];
    $scopeLabels = ['selected' => $T('Selected rows', 'الصفوف المحددة'), 'filtered' => $T('Current filter', 'نتيجة التصفية الحالية'), 'all' => $T('All rows', 'كل الصفوف')];
    $trigger = $T('Export', 'تصدير');
    $off = $disabled || $nothing;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'export-action') }}"
    x-data="nqExportAction({!! \Illuminate\Support\Js::from($cols)->toHtml() !!}, {!! \Illuminate\Support\Js::from((object) $scopesJs)->toHtml() !!}, {!! \Illuminate\Support\Js::from((object) $options)->toHtml() !!})"
    {{ $attributes->except('data-slot')->cn('contents') }}>
    @if ($mode === 'menu')
        <x-nq::dropdown-menu>
            <x-nq::dropdown-menu.trigger :variant="$variant" :size="$size" :disabled="$off" data-slot="export-button">
                <x-lucide-download aria-hidden="true" />
                {{ $slot->isNotEmpty() ? $slot : $trigger }}
            </x-nq::dropdown-menu.trigger>
            <x-nq::dropdown-menu.content align="end" class="min-w-48" aria-label="{{ $T('Export data', 'تصدير البيانات') }}">
                @foreach ($formats as $f)
                    <x-nq::dropdown-menu.item x-on:click="openDialog('{{ $f }}')">
                        <x-dynamic-component :component="'lucide-'.$icons[$f]" aria-hidden="true" />
                        {{ $labels[$f] }}
                    </x-nq::dropdown-menu.item>
                @endforeach
                <x-nq::dropdown-menu.separator />
                <x-nq::dropdown-menu.item x-on:click="openDialog()">{{ $T('Export options…', 'خيارات التصدير…') }}</x-nq::dropdown-menu.item>
            </x-nq::dropdown-menu.content>
        </x-nq::dropdown-menu>
    @else
        <x-nq::button :variant="$variant" :size="$size" :disabled="$off" data-slot="export-button" x-on:click="openDialog()">
            <x-lucide-download aria-hidden="true" />
            {{ $slot->isNotEmpty() ? $slot : $trigger }}
        </x-nq::button>
    @endif

    <x-nq::dialog x-model="dlg">
        <template x-teleport="body">
            <div data-slot="dialog-portal">
                <div data-slot="dialog-backdrop" x-nq-presence="open" x-on:click="close()" class="fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60 transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0"></div>
                <div data-slot="export-dialog" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open"
                    class="fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-xl grid-cols-[minmax(0,1fr)] gap-4 rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none max-h-[calc(100dvh-2rem)] overflow-y-auto transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
            <x-nq::dialog.header>
                <x-nq::dialog.title>{{ $T('Export data', 'تصدير البيانات') }}</x-nq::dialog.title>
                <x-nq::dialog.description>{{ $T('Choose a format, the rows and the columns to include.', 'اختر الصيغة والصفوف والأعمدة المراد تضمينها.') }}</x-nq::dialog.description>
            </x-nq::dialog.header>

            <div x-show="phase === 'idle' || phase === 'error'" class="flex flex-col gap-5">
                <x-nq::alert tone="danger" :title="$T('The export failed', 'تعذّر التصدير')" x-show="phase === 'error'" style="display: none"><span x-text="message"></span></x-nq::alert>

                <fieldset class="flex flex-col gap-2">
                    <legend class="mb-2 text-label text-foreground">{{ $T('Format', 'الصيغة') }}</legend>
                    <x-nq::radio-group x-model="format" :default-value="$format" class="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="{{ $T('Format', 'الصيغة') }}">
                        @foreach ($formats as $f)
                            <x-nq::radio-group.card :value="$f" :description="$hints[$f]" class="p-3">
                                <span class="inline-flex items-center gap-2">
                                    <x-dynamic-component :component="'lucide-'.$icons[$f]" aria-hidden="true" class="size-4 text-muted-foreground" />{{ $labels[$f] }}
                                </span>
                            </x-nq::radio-group.card>
                        @endforeach
                    </x-nq::radio-group>
                </fieldset>

                <fieldset class="flex flex-col gap-2">
                    <legend class="mb-2 text-label text-foreground">{{ $T('Rows', 'الصفوف') }}</legend>
                    <x-nq::radio-group x-model="scope" :default-value="$first" aria-label="{{ $T('Rows', 'الصفوف') }}">
                        @foreach (['selected', 'filtered', 'all'] as $s)
                            @if (array_key_exists($s, $counts))
                                <label class="flex items-center gap-2.5 text-body {{ $counts[$s] === 0 ? 'opacity-50' : '' }}">
                                    <x-nq::radio-group.radio :value="$s" :disabled="$counts[$s] === 0" />
                                    <span class="flex-1">{{ $scopeLabels[$s] }}</span>
                                    <span class="text-body-sm tabular-nums text-muted-foreground" x-text="countText('{{ $s }}')">{{ $counts[$s] }}</span>
                                </label>
                            @endif
                        @endforeach
                    </x-nq::radio-group>
                </fieldset>

                <fieldset class="flex flex-col gap-2">
                    <legend class="mb-2 flex w-full items-center justify-between text-label text-foreground">
                        {{ $T('Columns', 'الأعمدة') }}
                        <span class="text-caption font-normal tabular-nums text-muted-foreground" x-text="num(pickedCount()) + ' / ' + num(columns.length)">{{ count($cols) }} / {{ count($cols) }}</span>
                    </legend>
                    <label class="flex items-center gap-2.5 border-b border-border pb-2 text-body">
                        <button type="button" role="checkbox" data-slot="checkbox" x-on:click="toggleAll()"
                            x-bind:aria-checked="someSelected() ? 'mixed' : (allPicked() ? 'true' : 'false')"
                            x-bind:data-checked="allPicked() ? '' : null"
                            x-bind:data-indeterminate="someSelected() ? '' : null"
                            x-bind:data-unchecked="! allPicked() && ! someSelected() ? '' : null"
                            aria-checked="true" data-checked
                            class="relative inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-nq-line-strong bg-card text-primary-foreground outline-none transition-colors duration-150 ease-nq data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus after:absolute after:-inset-1">
                            <span data-slot="checkbox-indicator" class="flex items-center justify-center [&_svg]:size-3 [&_svg]:stroke-3" x-show="allPicked() || someSelected()">
                                <x-lucide-minus aria-hidden="true" x-show="someSelected()" style="display: none" />
                                <x-lucide-check aria-hidden="true" x-show="! someSelected()" />
                            </span>
                        </button>
                        {{ $T('All columns', 'كل الأعمدة') }}
                    </label>
                    <div class="grid max-h-40 grid-cols-1 gap-x-4 gap-y-2 overflow-y-auto py-1 sm:grid-cols-2">
                        @foreach ($cols as $i => $c)
                            <label class="flex min-w-0 items-center gap-2.5 text-body">
                                <x-nq::checkbox checked x-model="picked[{{ $i }}]" />
                                <span class="truncate">{{ $c['label'] }}</span>
                            </label>
                        @endforeach
                    </div>
                    <p x-show="pickedCount() === 0" style="display: none" class="text-body-sm text-nq-danger-text">{{ $T('Choose at least one column.', 'اختر عمودًا واحدًا على الأقل.') }}</p>
                </fieldset>

                <x-nq::dialog.footer>
                    <x-nq::button variant="ghost" x-on:click="dlg = false">{{ $T('Cancel', 'إلغاء') }}</x-nq::button>
                    <x-nq::button variant="primary" x-bind:disabled="canRun() ? null : true" x-on:click="run()">
                        <x-lucide-download aria-hidden="true" />
                        <span x-text="phase === 'error' ? '{{ $T('Try again', 'إعادة المحاولة') }}' : '{{ $T('Export', 'تصدير') }}'">{{ $T('Export', 'تصدير') }}</span>
                    </x-nq::button>
                </x-nq::dialog.footer>
                @if ($nothing)
                    <p class="text-body-sm text-muted-foreground">{{ $T('There are no rows to export.', 'لا توجد صفوف للتصدير.') }}</p>
                @endif
            </div>

            <div x-show="phase === 'running'" style="display: none" class="flex flex-col gap-4 py-2" data-slot="export-progress">
                <div data-slot="progress" data-tone="info" role="progressbar" aria-valuemin="0" aria-valuemax="100"
                    aria-label="{{ $T('Preparing the file…', 'جارٍ تجهيز الملف…') }}"
                    x-bind:aria-valuenow="progress == null ? null : pct()"
                    class="flex w-full flex-col gap-1.5">
                    <div data-slot="progress-head" class="flex items-baseline justify-between gap-3 text-body-sm">
                        <span class="text-label text-foreground" x-text="progressLabel()"></span><span></span>
                    </div>
                    <div data-slot="progress-track" class="relative block w-full h-2 overflow-hidden rounded-full bg-nq-surface-soft">
                        <div data-slot="progress-indicator" style="inset-inline-start:0"
                            x-bind:style="'inset-inline-start:0;' + (progress == null ? '' : 'width:' + pct() + '%')"
                            x-bind:class="progress == null ? 'w-full motion-safe:animate-pulse' : ''"
                            class="block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none bg-nq-info"></div>
                    </div>
                </div>
                <x-nq::dialog.footer>
                    <x-nq::button variant="ghost" x-on:click="cancel()">{{ $T('Cancel', 'إلغاء') }}</x-nq::button>
                </x-nq::dialog.footer>
            </div>

            <div x-show="phase === 'done'" style="display: none" class="flex flex-col gap-4 py-2" data-slot="export-done">
                <p role="status" class="flex items-center gap-2 text-body text-foreground">
                    <x-lucide-circle-check aria-hidden="true" class="size-5 shrink-0 text-nq-success-text" />
                    <span>
                        <span x-text="readyText()"></span>
                        <bdi dir="ltr" class="font-medium" x-text="file ? file.filename : ''"></bdi>
                    </span>
                </p>
                <x-nq::dialog.footer>
                    <x-nq::button variant="ghost" x-show="file && file.blob.size > 0" style="display: none" x-on:click="downloadAgain()">
                        <x-lucide-download aria-hidden="true" />
                        {{ $T('Download again', 'تنزيل مرة أخرى') }}
                    </x-nq::button>
                    <x-nq::button variant="primary" x-on:click="dlg = false">{{ $T('Done', 'تم') }}</x-nq::button>
                </x-nq::dialog.footer>
            </div>
                    <button type="button" data-slot="dialog-close" x-on:click="close()" aria-label="{{ $T('Close', 'إغلاق') }}"
                        class="absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-x /></button>
                </div>
            </div>
        </template>
    </x-nq::dialog>
</div>
