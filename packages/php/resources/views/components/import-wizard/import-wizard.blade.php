{{-- <x-nq::import-wizard :fields="[['key' => 'name', 'label' => 'Name', 'required' => true], ['key' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true]]" unique-key="email"
         x-on:import="$event.detail.done({ imported: $event.detail.rows.length })" />
     A four step import: choose a CSV (or paste rows), match its columns to your fields, review the rows with problems marked, then import.
     Parsing and validation run in the browser; Excel users save as CSV first. There is no backend.
     fields: [{ key, label, type?: text|email|phone|number|date|url, required?, aliases? }]. unique-key: a field whose repeats are flagged as duplicates and skipped.
     max-rows (5000), max-size in bytes (5 MB).
     Bubbling events: "import" { rows, done(result?), fail(message) } (rows are the valid ones keyed by field key; answer with done({ imported, failed?: [{ line, message }] }) or fail("why"));
     "done" from the last step's Done button. The column pickers are native selects. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['fields' => [], 'uniqueKey' => null, 'maxRows' => 5000, 'maxSize' => 5 * 1024 * 1024])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $options = array_filter(['uniqueKey' => $uniqueKey, 'maxRows' => (int) $maxRows, 'maxSize' => (int) $maxSize], fn ($v) => $v !== null);
    $card = 'flex flex-col gap-4 rounded-card border border-border bg-card p-4 text-card-foreground sm:p-6';
@endphp
<div data-slot="import-wizard" x-bind:data-step="step"
    x-data="nqImportWizard({!! \Illuminate\Support\Js::from(array_values((array) $fields))->toHtml() !!}, {!! \Illuminate\Support\Js::from((object) $options)->toHtml() !!})"
    {{ $attributes->cn('flex flex-col gap-6') }}>
    <ol data-slot="stepper" data-orientation="horizontal" x-bind:aria-label="t().steps.join(', ')" class="m-0 flex list-none flex-row items-start p-0 max-sm:[&_li:not([data-status=current])_[data-slot=stepper-text]]:sr-only">
        <template x-for="(label, i) in t().steps" :key="i">
            <li data-slot="stepper-item" x-bind:data-status="stepStatus(i)" class="group/step flex flex-1 items-start last:flex-none">
                <div data-slot="stepper-step" x-bind:aria-current="step === i ? 'step' : null" class="flex shrink-0 items-start gap-3 rounded-control text-start outline-none">
                    <span data-slot="stepper-marker" x-bind:class="markerClass(i)" class="relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-medium transition-colors duration-150 ease-nq [&_svg]:size-3.5">
                        <x-lucide-check aria-hidden="true" x-show="stepStatus(i) === 'complete'" x-cloak style="display: none" />
                        <bdi data-slot="num" class="tabular-nums" x-show="stepStatus(i) !== 'complete'" x-text="n(i + 1)">1</bdi>
                    </span>
                    <span data-slot="stepper-text" class="flex min-w-0 flex-col text-start">
                        <span class="text-label" x-bind:class="stepStatus(i) === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'">
                            <span x-text="label"></span>
                            <span class="sr-only"> (<span x-text="stepLabel(i)"></span>)</span>
                        </span>
                    </span>
                </div>
                <span aria-hidden="true" data-slot="stepper-connector" x-bind:data-complete="stepStatus(i) === 'complete' ? '' : null"
                    x-bind:class="stepStatus(i) === 'complete' ? 'bg-primary' : 'bg-border'" class="mx-3 mt-3.5 h-px min-w-6 flex-1 rounded-full transition-colors duration-150 ease-nq group-last/step:hidden"></span>
            </li>
        </template>
    </ol>

    {{-- Step 1: upload --}}
    <div data-slot="card" x-show="step === 0" class="{{ $card }}">
        <div class="flex flex-col gap-1">
            <h2 class="text-h3 text-foreground">{{ $T('Choose a file', 'اختر ملفًا') }}</h2>
            <p class="text-body-sm text-muted-foreground">{{ $T('CSV or TSV. Working in Excel? Use Save as, then CSV.', 'ملف CSV أو TSV. تعمل في إكسل؟ احفظ باسم ثم اختر CSV.') }}</p>
        </div>
        <div data-slot="dropzone" role="button" tabindex="0" x-bind:data-dragging="dragging ? '' : null" x-bind:data-invalid="uploadError ? '' : null"
            x-on:click="$refs.file.click()" x-on:keydown="zoneKey($event)" x-on:dragenter="dragEnter($event)" x-on:dragover.prevent x-on:dragleave="dragLeave()" x-on:drop="drop($event)"
            class="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-floating border border-dashed border-input bg-card p-6 text-center transition-colors duration-150 ease-nq outline-none hover:bg-nq-hover focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-dragging:border-nq-focus data-dragging:bg-nq-selected data-invalid:border-nq-danger">
            <span aria-hidden="true" class="flex [&_svg]:size-6 text-muted-foreground"><x-lucide-upload /></span>
            <span class="text-label text-foreground"><span class="inline-flex items-center gap-2"><x-lucide-file-spreadsheet aria-hidden="true" class="size-4" />{{ $T('Drop a CSV file here, or click to choose one', 'أفلت ملف CSV هنا، أو اضغط لاختياره') }}</span></span>
            <input type="file" class="sr-only" tabindex="-1" x-ref="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" aria-label="{{ $T('Choose a file', 'اختر ملفًا') }}" x-on:click.stop x-on:change="onPick($event)">
        </div>
        <div x-show="uploadError" x-cloak style="display: none" data-slot="alert" data-tone="danger" role="alert" class="relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-card border border-nq-danger/30 bg-nq-danger-soft p-3 text-start">
            <x-lucide-circle-x aria-hidden="true" data-slot="alert-icon" class="mt-0.5 size-4 text-nq-danger-text" />
            <div data-slot="alert-body" class="flex min-w-0 flex-col gap-0.5"><div data-slot="alert-description" class="text-body-sm text-foreground" x-text="uploadError"></div></div>
        </div>
        <div data-slot="field" class="flex flex-col gap-1.5">
            <label for="nq-import-paste" data-slot="field-label" class="text-label text-foreground">{{ $T('Or paste the rows', 'أو الصق الصفوف') }}</label>
            <textarea id="nq-import-paste" data-slot="textarea" dir="ltr" rows="4" x-model="paste" placeholder="{{ $T('name,email,phone', 'الاسم,البريد,الهاتف') }}"
                class="w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:text-[16px] min-h-20 py-2 text-start font-mono text-caption"></textarea>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2">
            <x-nq::button variant="ghost" size="sm" x-on:click="downloadTemplate()"><x-lucide-download aria-hidden="true" />{{ $T('Download a template', 'تنزيل قالب') }}</x-nq::button>
            <x-nq::button variant="primary" x-bind:disabled="paste.trim() === '' ? true : null" x-on:click="usePasted()">{{ $T('Use pasted rows', 'استخدم الصفوف الملصقة') }}</x-nq::button>
        </div>
    </div>

    {{-- Step 2: map columns --}}
    <div data-slot="card" x-show="step === 1" x-cloak style="display: none" class="{{ $card }}">
        <div class="flex flex-col gap-1">
            <h2 class="text-h3 text-foreground" x-text="t().mapTitle"></h2>
            <p class="text-body-sm text-muted-foreground" x-text="t().mapBody"></p>
            <p dir="auto" class="text-caption text-muted-foreground" x-text="loadedText()"></p>
        </div>
        <div class="flex flex-col divide-y divide-border rounded-control border border-border">
            <template x-for="f in fields" :key="f.key">
                <div class="grid items-center gap-2 p-3 sm:grid-cols-[1fr_1fr_1fr]">
                    <div class="flex items-center gap-2 text-label text-foreground">
                        <span x-text="f.label"></span>
                        <span x-show="f.required" x-cloak style="display: none" data-slot="badge" x-bind:class="unmapped(f.key) ? 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text' : 'border-border text-muted-foreground'"
                            class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3" x-text="t().required"></span>
                    </div>
                    <div data-slot="native-select" class="relative w-full min-w-0">
                        <select x-bind:aria-label="f.label + ': ' + t().sourceCol" x-on:change="setMap(f.key, $event.target.value)"
                            class="h-control w-full min-w-0 appearance-none rounded-control border border-input bg-card ps-3 pe-9 text-body text-foreground min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:text-[16px]">
                            <template x-for="o in options()" :key="o.value">
                                <option x-bind:value="o.value" x-bind:selected="isSelected(f.key, o.value)" x-text="o.label"></option>
                            </template>
                        </select>
                        <x-lucide-chevron-down aria-hidden="true" class="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    <div class="min-w-0 truncate text-caption text-muted-foreground" dir="auto">
                        <template x-if="sample(f.key)"><span><span x-text="t().example + ': '"></span><bdi class="text-foreground" x-text="sample(f.key)"></bdi></span></template>
                    </div>
                </div>
            </template>
        </div>
        <div x-show="missing().length > 0" x-cloak style="display: none" data-slot="alert" data-tone="warning" role="alert" class="relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-card border border-nq-warning/30 bg-nq-warning-soft p-3 text-start">
            <x-lucide-circle-alert aria-hidden="true" data-slot="alert-icon" class="mt-0.5 size-4 text-nq-warning-text" />
            <div data-slot="alert-body" class="flex min-w-0 flex-col gap-0.5"><div data-slot="alert-description" class="text-body-sm text-foreground" x-text="missingText()"></div></div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2">
            <x-nq::button variant="ghost" x-on:click="step = 0"><x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" /><span x-text="t().back"></span></x-nq::button>
            <x-nq::button variant="primary" x-bind:disabled="missing().length > 0 ? true : null" x-on:click="step = 2"><span x-text="t().next"></span><x-lucide-arrow-right aria-hidden="true" class="rtl:-scale-x-100" /></x-nq::button>
        </div>
    </div>

    {{-- Step 3: review --}}
    <div data-slot="card" x-show="step === 2" x-cloak style="display: none" class="{{ $card }}">
        <h2 class="text-h3 text-foreground" x-text="t().reviewTitle"></h2>
        <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <template x-for="c in cards()" :key="c.label">
                <div class="flex flex-col gap-0.5 rounded-control border border-border p-3">
                    <dt class="text-caption text-muted-foreground" x-text="c.label"></dt>
                    <dd class="text-h3" x-bind:class="c.tone"><bdi data-slot="num" class="tabular-nums" x-text="c.n"></bdi></dd>
                </div>
            </template>
        </dl>
        <div class="flex flex-col gap-2">
            <div data-slot="table-container" role="region" tabindex="0" x-bind:aria-label="t().filePreview" class="relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                <table data-slot="table" data-density="default" class="w-full caption-bottom border-collapse text-body-sm">
                    <thead data-slot="table-header" class="[&_tr]:border-b [&_tr]:hover:bg-transparent [&_tr]:even:bg-transparent">
                        <tr data-slot="table-row" class="border-b border-border transition-colors duration-150 ease-nq hover:bg-nq-hover data-[state=selected]:bg-nq-selected">
                            <th data-slot="table-head" scope="col" class="h-row text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground px-4 py-3 w-16" x-text="t().line"></th>
                            @foreach ($fields as $f)
                                <th data-slot="table-head" scope="col" class="h-row text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground px-4 py-3">{{ $f['label'] }}</th>
                            @endforeach
                        </tr>
                    </thead>
                    <tbody data-slot="table-body" class="[&_tr:last-child]:border-0">
                        {{-- Fixed rows and cells (not nested x-for templates): table markup inside <template> is mangled by some parsers. --}}
                        @for ($i = 0; $i < 25; $i++)
                            <tr data-slot="table-row" x-show="previewRows()[{{ $i }}]" x-cloak style="display: none" x-bind:data-invalid="rowBad({{ $i }}) ? '' : null" x-bind:class="rowBad({{ $i }}) && 'bg-nq-danger-soft/40'"
                                class="border-b border-border transition-colors duration-150 ease-nq hover:bg-nq-hover data-[state=selected]:bg-nq-selected">
                                <td data-slot="table-cell" class="h-row align-middle whitespace-nowrap px-4 py-3 text-muted-foreground"><bdi data-slot="num" class="tabular-nums" x-text="rowLine({{ $i }})"></bdi></td>
                                @foreach ($fields as $f)
                                    <td data-slot="table-cell" x-bind:class="cellIssue(previewRows()[{{ $i }}], '{{ $f['key'] }}') && 'text-nq-danger-text'" class="h-row align-middle whitespace-nowrap px-4 py-3">
                                        <bdi x-text="cellText(previewRows()[{{ $i }}], '{{ $f['key'] }}')"></bdi>
                                        <span x-show="cellIssue(previewRows()[{{ $i }}], '{{ $f['key'] }}')" x-cloak style="display: none" class="ms-1 text-caption" x-text="'(' + cellIssue(previewRows()[{{ $i }}], '{{ $f['key'] }}') + ')'"></span>
                                    </td>
                                @endforeach
                            </tr>
                        @endfor
                    </tbody>
                </table>
            </div>
            <p x-show="hasMore()" x-cloak style="display: none" class="text-caption text-muted-foreground" x-text="showingText()"></p>
        </div>
        <div x-show="hasProblems()" x-cloak style="display: none" class="flex flex-col gap-2">
            <h3 class="flex items-center gap-2 text-label text-foreground"><x-lucide-triangle-alert aria-hidden="true" class="size-4 text-nq-warning-text" /><span x-text="t().unresolved"></span></h3>
            <ul class="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-control border border-border p-2 text-body-sm">
                <template x-for="r in problemRows()" :key="r.line">
                    <li class="flex flex-wrap items-center gap-x-2">
                        <span class="text-muted-foreground"><span x-text="t().line"></span> <bdi data-slot="num" class="tabular-nums" x-text="n(r.line)"></bdi></span>
                        <template x-for="i in r.issues" :key="i.field + '-' + i.code"><span class="text-nq-danger-text" x-text="issueText(i)"></span></template>
                    </li>
                </template>
            </ul>
            <label class="flex items-start gap-2 text-body-sm text-foreground">
                <x-nq::checkbox class="mt-0.5" :checked="true" x-model="skipInvalid" />
                <span class="flex flex-col"><span x-text="t().skipInvalid"></span><span class="text-caption text-muted-foreground" x-text="t().skipInvalidHint"></span></span>
            </label>
        </div>
        <div x-show="toImport().length === 0" x-cloak style="display: none" data-slot="alert" data-tone="danger" role="alert" class="relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-card border border-nq-danger/30 bg-nq-danger-soft p-3 text-start">
            <x-lucide-circle-x aria-hidden="true" data-slot="alert-icon" class="mt-0.5 size-4 text-nq-danger-text" />
            <div data-slot="alert-body" class="flex min-w-0 flex-col gap-0.5"><div data-slot="alert-title" class="text-label text-foreground" x-text="t().nothing"></div><div data-slot="alert-description" class="text-body-sm text-muted-foreground" x-text="t().nothingBody"></div></div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2">
            <x-nq::button variant="ghost" x-on:click="step = 1"><x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" /><span x-text="t().back"></span></x-nq::button>
            <x-nq::button variant="primary" x-bind:disabled="toImport().length === 0 ? true : null" x-on:click="runImport()"><span x-text="importLabel()"></span></x-nq::button>
        </div>
    </div>

    {{-- Step 4: import --}}
    <div data-slot="card" x-show="step === 3" x-cloak style="display: none" aria-live="polite" class="{{ $card }}">
        <div x-show="busy" x-cloak style="display: none" class="flex flex-col gap-3">
            <h2 class="text-h3 text-foreground" x-text="t().importing"></h2>
            <div data-slot="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuetext="indeterminate progress" data-indeterminate class="flex w-full flex-col gap-1.5">
                <div data-slot="progress-track" class="relative block h-2 w-full overflow-hidden rounded-full bg-nq-surface-soft"><div data-slot="progress-indicator" class="block h-full w-full rounded-full bg-primary motion-safe:animate-pulse" style="inset-inline-start:0"></div></div>
            </div>
        </div>
        <div x-show="! busy && runError" x-cloak style="display: none" class="flex flex-col gap-3">
            <div data-slot="alert" data-tone="danger" role="alert" class="relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-card border border-nq-danger/30 bg-nq-danger-soft p-3 text-start">
                <x-lucide-circle-x aria-hidden="true" data-slot="alert-icon" class="mt-0.5 size-4 text-nq-danger-text" />
                <div data-slot="alert-body" class="flex min-w-0 flex-col gap-0.5"><div data-slot="alert-title" class="text-label text-foreground" x-text="t().failed"></div><div data-slot="alert-description" class="text-body-sm text-muted-foreground" x-text="runError"></div></div>
            </div>
            <div class="flex gap-2">
                <x-nq::button variant="ghost" x-on:click="step = 2"><x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" /><span x-text="t().back"></span></x-nq::button>
                <x-nq::button variant="primary" x-on:click="runImport()"><span x-text="t().retry"></span></x-nq::button>
            </div>
        </div>
        <div x-show="! busy && ! runError && result" x-cloak style="display: none" class="flex flex-col gap-4">
            <div class="flex items-center gap-3">
                <span class="inline-flex size-10 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text"><x-lucide-circle-check aria-hidden="true" class="size-5" /></span>
                <div class="flex flex-col">
                    <h2 class="text-h3 text-foreground" x-text="t().done"></h2>
                    <p class="text-body-sm text-muted-foreground" x-text="importedText()"></p>
                </div>
            </div>
            <div x-show="result && result.failed && result.failed.length > 0" x-cloak style="display: none" class="flex flex-col gap-1">
                <h3 class="text-label text-foreground" x-text="t().failedRows"></h3>
                <ul class="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-control border border-border p-2 text-body-sm">
                    <template x-for="f in (result && result.failed) || []" :key="f.line">
                        <li class="flex gap-2"><span class="text-muted-foreground"><span x-text="t().line"></span> <bdi data-slot="num" class="tabular-nums" x-text="n(f.line)"></bdi></span><span class="text-nq-danger-text" x-text="f.message"></span></li>
                    </template>
                </ul>
            </div>
            <div class="flex flex-wrap gap-2">
                <x-nq::button variant="primary" x-on:click="finish()"><span x-text="t().finish"></span></x-nq::button>
                <x-nq::button variant="ghost" x-on:click="reset()"><span x-text="t().another"></span></x-nq::button>
            </div>
        </div>
    </div>
</div>
