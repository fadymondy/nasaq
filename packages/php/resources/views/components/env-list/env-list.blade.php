{{-- <x-nq::env-list :variables="[['key' => 'DATABASE_URL', 'value' => 'postgres://...', 'secret' => true]]"
         @nq-save="$event.detail.wait(api.save($event.detail.variable, $event.detail.previousKey))" @nq-delete="$event.detail.wait(api.remove($event.detail.key))" />
     A .env manager: key and value rows with masked values, reveal and copy, add and edit with duplicate and invalid-name checks, delete with a confirm,
     import by pasting a .env or choosing a file, export, and an optional environment switcher. Values are only in the DOM while revealed (they hide again
     after reveal-timeout ms, 30000 by default, 0 keeps them shown), and nothing is logged.
     variables: each key and value, and optionally secret (true by default) and description. environments: [id, label] tabs; environment: the selected id.
     title, description: override the heading. can-edit, can-delete, can-import (all true) hide the controls you do not handle; read-only hides all three.
     Actions fire events on the root with detail { ..., wait(promise) }: `nq-save` { variable, previousKey }, `nq-delete` { key }, `nq-import` { variables, overwrite }
     (imported values are secret unless the key is meant to be public: NEXT_PUBLIC_*, VITE_*), `nq-environment` { id } (resolve { variables } to load that list),
     and the cancelable `nq-export` { variables } (preventDefault() to handle the download yourself; the default saves export-filename, ".env").
     Pass a promise to wait() to show the pending state; resolve { error } (or reject) to keep the dialog open with a message, otherwise the list is updated.
     labels: override any string. Needs the Alpine runtime. --}}
@props([
    'variables' => [], 'title' => null, 'description' => null, 'environments' => [], 'environment' => null,
    'canEdit' => true, 'canDelete' => true, 'canImport' => true, 'readOnly' => false,
    'exportFilename' => '.env', 'revealTimeout' => 30000, 'labels' => [],
])
@php
    $t = \Nasaq\Nasaq::class;
    $s = array_merge([
        'title' => $t::t('Environment variables', 'متغيرات البيئة'),
        'description' => $t::t('Values are hidden until you reveal them.', 'القيم مخفية إلى أن تكشفها.'),
        'list' => $t::t('Variables', 'المتغيرات'),
        'search' => $t::t('Filter variables', 'تصفية المتغيرات'),
        'environment' => $t::t('Environment', 'البيئة'),
        'add' => $t::t('Add variable', 'إضافة متغير'),
        'import' => $t::t('Import .env', 'استيراد .env'),
        'exportAll' => $t::t('Download .env', 'تنزيل .env'),
        'copyAll' => $t::t('Copy as .env', 'نسخ بصيغة .env'),
        'reveal' => $t::t('Reveal {key}', 'كشف {key}'),
        'hide' => $t::t('Hide {key}', 'إخفاء {key}'),
        'copyValue' => $t::t('Copy value of {key}', 'نسخ قيمة {key}'),
        'edit' => $t::t('Edit {key}', 'تعديل {key}'),
        'remove' => $t::t('Delete {key}', 'حذف {key}'),
        'secret' => $t::t('Secret', 'سرّي'),
        'hidden' => $t::t('Value hidden', 'القيمة مخفية'),
        'emptyValue' => $t::t('(empty)', '(فارغ)'),
        'emptyTitle' => $t::t('No variables yet', 'لا توجد متغيرات بعد'),
        'emptyBody' => $t::t('Add one by hand or paste the contents of a .env file.', 'أضف متغيرًا يدويًا أو الصق محتوى ملف .env.'),
        'noMatch' => $t::t('No variables match your filter.', 'لا توجد متغيرات تطابق التصفية.'),
        'countOne' => $t::t('1 variable', 'متغير واحد'),
        'countMany' => $t::t('{n} variables', '{n} متغيرات'),
        'addTitle' => $t::t('Add variable', 'إضافة متغير'),
        'editTitle' => $t::t('Edit {key}', 'تعديل {key}'),
        'keyLabel' => $t::t('Name', 'الاسم'),
        'keyHint' => $t::t('Letters, digits and underscores. Cannot start with a digit.', 'أحرف لاتينية وأرقام وشرطات سفلية. لا يبدأ برقم.'),
        'keyEmpty' => $t::t('Enter a name.', 'أدخل اسمًا.'),
        'keyInvalid' => $t::t('Use only letters, digits and underscores, and do not start with a digit.', 'استخدم أحرفًا لاتينية وأرقامًا وشرطات سفلية فقط، ولا تبدأ برقم.'),
        'keyDuplicate' => $t::t('A variable with this name already exists.', 'يوجد متغير بهذا الاسم بالفعل.'),
        'valueLabel' => $t::t('Value', 'القيمة'),
        'showValue' => $t::t('Show value', 'إظهار القيمة'),
        'descriptionLabel' => $t::t('Note (optional)', 'ملاحظة (اختياري)'),
        'secretLabel' => $t::t('Secret', 'سرّي'),
        'secretHint' => $t::t('Mask the value in the list until someone reveals it.', 'أخفِ القيمة في القائمة إلى أن يكشفها أحد.'),
        'save' => $t::t('Save', 'حفظ'),
        'cancel' => $t::t('Cancel', 'إلغاء'),
        'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
        'importTitle' => $t::t('Import from .env', 'الاستيراد من ملف .env'),
        'importBody' => $t::t('Paste the contents of a .env file or choose one. Nothing is sent until you import.', 'الصق محتوى ملف .env أو اختر ملفًا. لا يُرسل شيء قبل أن تستورد.'),
        'importLabel' => $t::t('.env contents', 'محتوى ملف .env'),
        'importPlaceholder' => "API_URL=https://api.example.com\nDATABASE_URL=postgres://...",
        'chooseFile' => $t::t('Choose file', 'اختيار ملف'),
        'foundOne' => $t::t('1 variable found', 'تم العثور على متغير واحد'),
        'foundMany' => $t::t('{n} variables found', 'تم العثور على {n} متغيرات'),
        'conflictsOne' => $t::t('1 already exists', 'واحد موجود بالفعل'),
        'conflictsMany' => $t::t('{n} already exist', '{n} موجودة بالفعل'),
        'overwrite' => $t::t('Overwrite existing values', 'استبدال القيم الموجودة'),
        'skipNote' => $t::t('Existing variables are skipped unless you overwrite them.', 'تُتخطى المتغيرات الموجودة ما لم تستبدلها.'),
        'pasteDuplicates' => $t::t('Repeated in the paste, last value wins: {keys}', 'مكررة في النص الملصوق، تُعتمد القيمة الأخيرة: {keys}'),
        'issuesTitle' => $t::t('Lines that could not be read', 'أسطر تعذّرت قراءتها'),
        'issueInvalidKey' => $t::t('Line {line}: "{key}" is not a valid name', 'السطر {line}: "{key}" ليس اسمًا صالحًا'),
        'issueUnterminatedQuote' => $t::t('Line {line}: quote is never closed{key}', 'السطر {line}: علامة الاقتباس غير مغلقة{key}'),
        'issueNoEquals' => $t::t('Line {line}: expected NAME=value', 'السطر {line}: المتوقع NAME=value'),
        'importOne' => $t::t('Import 1 variable', 'استيراد متغير واحد'),
        'importMany' => $t::t('Import {n} variables', 'استيراد {n} متغيرات'),
        'deleteTitle' => $t::t('Delete {key}?', 'حذف {key}؟'),
        'deleteBody' => $t::t('This removes the variable from this environment. Running deployments keep their current value until they restart.', 'يُزال المتغير من هذه البيئة. تحتفظ عمليات النشر الجارية بقيمتها الحالية حتى تُعاد تشغيلها.'),
        'deleteConfirm' => $t::t('Delete', 'حذف'),
        'copied' => $t::t('Copied to clipboard', 'تم النسخ إلى الحافظة'),
    ], $labels);

    $rows = collect($variables)->map(fn ($v) => array_filter([
        'key' => (string) $v['key'], 'value' => (string) ($v['value'] ?? ''), 'secret' => ($v['secret'] ?? true) !== false,
        'description' => $v['description'] ?? null,
    ], fn ($x) => $x !== null))->values()->all();
    $envs = collect($environments)->values();
    $selected = $environment ?? ($envs->first()['id'] ?? null);
    $edit = ! $readOnly && $canEdit;
    $del = ! $readOnly && $canDelete;
    $imp = ! $readOnly && $canImport;
    $uid = 'nq-env-'.\Illuminate\Support\Str::random(6);
    $init = [
        'variables' => $rows, 'environment' => $selected, 'revealTimeout' => (int) $revealTimeout, 'exportFilename' => $exportFilename,
        'strings' => collect($s)->only([
            'reveal', 'hide', 'copyValue', 'edit', 'remove', 'emptyValue', 'countOne', 'countMany', 'editTitle', 'addTitle', 'keyEmpty', 'keyInvalid', 'keyDuplicate',
            'genericError', 'foundOne', 'foundMany', 'conflictsOne', 'conflictsMany', 'importOne', 'importMany', 'pasteDuplicates', 'issueInvalidKey',
            'issueUnterminatedQuote', 'issueNoEquals', 'deleteTitle', 'copied',
        ])->all(),
    ];
    $mask = str_repeat("\u{2022}", 12);
@endphp
<section data-slot="env-list" aria-label="{{ $title ?? $s['title'] }}" x-data="nqEnvList({!! \Illuminate\Support\Js::from($init) !!})" {{ $attributes->cn('flex min-w-0 flex-col gap-4') }}>
    <header class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
            <h3 class="text-h3 text-foreground">{{ $title ?? $s['title'] }}</h3>
            <p class="text-body-sm text-muted-foreground">{{ $description ?? $s['description'] }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            @if ($imp)
                <x-nq::button type="button" size="sm" x-on:click="openImport()">
                    <x-lucide-upload aria-hidden="true" />
                    {{ $s['import'] }}
                </x-nq::button>
            @endif
            <x-nq::button type="button" size="sm" variant="secondary" data-slot="copy-button" x-bind:disabled="variables.length === 0" x-bind:data-copied="copiedAll ? '' : null" x-on:click="copyAll()">
                <x-lucide-copy aria-hidden="true" x-show="! copiedAll" />
                <x-lucide-check aria-hidden="true" x-show="copiedAll" style="display: none" />
                {{ $s['copyAll'] }}
            </x-nq::button>
            <span data-slot="copy-button-status" role="status" aria-live="polite" class="sr-only" x-text="copied ? @js($s['copied']) : ''"></span>
            <x-nq::button type="button" size="sm" x-bind:disabled="variables.length === 0" x-on:click="download()">
                <x-lucide-download aria-hidden="true" />
                {{ $s['exportAll'] }}
            </x-nq::button>
            @if ($edit)
                <x-nq::button type="button" size="sm" variant="primary" x-on:click="openEdit(null)">
                    <x-lucide-plus aria-hidden="true" />
                    {{ $s['add'] }}
                </x-nq::button>
            @endif
        </div>
    </header>

    @if ($envs->isNotEmpty())
        <x-nq::tabs :default-value="$selected" x-model="environment">
            <x-nq::tabs.list :aria-label="$s['environment']">
                @foreach ($envs as $env)
                    <x-nq::tabs.tab :value="$env['id']">{{ $env['label'] }}</x-nq::tabs.tab>
                @endforeach
                <x-nq::tabs.indicator />
            </x-nq::tabs.list>
        </x-nq::tabs>
    @endif

    <x-nq::input-group class="max-w-sm" x-show="variables.length > 5" :style="count($rows) > 5 ? '' : 'display: none'">
        <x-nq::input-group.addon align="start"><x-lucide-search aria-hidden="true" class="size-4 text-muted-foreground" /></x-nq::input-group.addon>
        <x-nq::input-group.input x-model="filter" ltr type="search" placeholder="{{ $s['search'] }}" aria-label="{{ $s['search'] }}" />
    </x-nq::input-group>

    <div x-show="variables.length === 0" @if (count($rows) > 0) style="display: none" @endif>
        <x-nq::states :title="$s['emptyTitle']" :description="$s['emptyBody']">
            <x-slot:actions>
                @if ($edit)
                    <x-nq::button type="button" variant="primary" x-on:click="openEdit(null)">
                        <x-lucide-plus aria-hidden="true" />
                        {{ $s['add'] }}
                    </x-nq::button>
                @endif
                @if ($imp)
                    <x-nq::button type="button" x-on:click="openImport()">
                        <x-lucide-file-up aria-hidden="true" />
                        {{ $s['import'] }}
                    </x-nq::button>
                @endif
            </x-slot:actions>
        </x-nq::states>
    </div>

    <div class="contents" x-show="variables.length > 0" @if (count($rows) === 0) style="display: none" @endif>
        <ul aria-label="{{ $s['list'] }}" class="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-card p-0">
            <template x-for="v in shown" x-bind:key="v.key">
                <li data-slot="env-row" x-bind:data-secret="isSecret(v) ? '' : null" x-bind:data-revealed="revealed[v.key] ? '' : null"
                    class="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
                    <div class="flex min-w-0 flex-col gap-0.5 sm:w-2/5">
                        <div class="flex min-w-0 items-center gap-2">
                            <bdi dir="ltr" class="truncate font-mono text-code font-medium text-foreground" x-text="v.key"></bdi>
                            <x-nq::badge variant="neutral" class="shrink-0" x-show="isSecret(v)"><x-lucide-lock aria-hidden="true" />{{ $s['secret'] }}</x-nq::badge>
                        </div>
                        <span class="truncate text-caption text-muted-foreground" x-show="v.description" x-text="v.description"></span>
                    </div>
                    <div class="min-w-0 flex-1">
                        <bdi dir="ltr" data-slot="env-value" class="block truncate font-mono text-code text-foreground" x-show="isVisible(v)"
                            x-bind:title="isVisible(v) ? v.value : null" x-bind:class="v.value === '' ? 'text-muted-foreground' : ''" x-text="valueText(v)"></bdi>
                        <span data-slot="env-value" dir="ltr" role="text" aria-label="{{ $s['hidden'] }}" class="block font-mono text-code text-muted-foreground" x-show="! isVisible(v)">{{ $mask }}</span>
                    </div>
                    <div class="flex shrink-0 items-center gap-0.5">
                        <x-nq::button type="button" variant="ghost" size="icon-sm" x-show="isSecret(v)"
                            x-bind:aria-label="rowLabel(revealed[v.key] ? 'hide' : 'reveal', v)" x-bind:aria-pressed="revealed[v.key] ? 'true' : 'false'" x-on:click="toggle(v.key)">
                            <x-lucide-eye-off aria-hidden="true" x-show="revealed[v.key]" style="display: none" />
                            <x-lucide-eye aria-hidden="true" x-show="! revealed[v.key]" />
                        </x-nq::button>
                        <x-nq::button type="button" variant="ghost" size="icon-sm" data-slot="copy-button" x-bind:aria-label="rowLabel('copyValue', v)"
                            x-bind:data-copied="copied === v.key ? '' : null" class="data-copied:text-nq-success-text" x-on:click="copyValue(v)">
                            <x-lucide-copy aria-hidden="true" x-show="copied !== v.key" />
                            <x-lucide-check aria-hidden="true" x-show="copied === v.key" style="display: none" />
                        </x-nq::button>
                        @if ($edit)
                            <x-nq::button type="button" variant="ghost" size="icon-sm" x-bind:aria-label="rowLabel('edit', v)" x-on:click="openEdit(v.key)">
                                <x-lucide-pencil aria-hidden="true" />
                            </x-nq::button>
                        @endif
                        @if ($del)
                            <x-nq::button type="button" variant="ghost" size="icon-sm" class="text-nq-danger-text" x-bind:aria-label="rowLabel('remove', v)" x-on:click="askDelete(v.key)">
                                <x-lucide-trash-2 aria-hidden="true" />
                            </x-nq::button>
                        @endif
                    </div>
                </li>
            </template>
            <li class="px-4 py-6 text-center text-body-sm text-muted-foreground" x-show="shown.length === 0" style="display: none">{{ $s['noMatch'] }}</li>
        </ul>
        <p class="text-caption text-muted-foreground" data-slot="env-count" x-text="countLabel"></p>
    </div>

    @if ($edit)
        <x-nq::dialog x-model="editOpen">
            <x-nq::dialog.content>
                <form data-slot="env-variable-dialog" class="grid gap-4" novalidate x-on:submit.prevent="submitEdit()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title><span x-text="dialogTitle"></span></x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $s['keyHint'] }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <x-nq::field>
                        <x-nq::field.label>{{ $s['keyLabel'] }}</x-nq::field.label>
                        <x-nq::field.input x-model.trim="form.key" ltr autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="DATABASE_URL"
                            class="font-mono text-code" x-bind:data-invalid="showProblem ? '' : null" x-bind:aria-invalid="showProblem ? 'true' : null" x-on:blur="touched = true" />
                        <p role="alert" class="text-caption text-nq-danger-text" x-show="showProblem" style="display: none" x-text="keyMessage"></p>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $s['valueLabel'] }}</x-nq::field.label>
                        <x-nq::field.textarea x-model="form.value" dir="ltr" rows="3" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"
                            class="min-h-20 font-mono text-code text-start" x-bind:class="form.secret && ! showValue ? '[-webkit-text-security:disc]' : ''" />
                        <button type="button" x-show="form.secret" x-bind:aria-pressed="showValue ? 'true' : 'false'" data-slot="env-show-value"
                            class="inline-flex w-fit items-center gap-1 text-caption text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
                            x-on:click="showValue = ! showValue">
                            <x-lucide-eye-off aria-hidden="true" class="size-3.5" x-show="showValue" style="display: none" />
                            <x-lucide-eye aria-hidden="true" class="size-3.5" x-show="! showValue" />
                            {{ $s['showValue'] }}
                        </button>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $s['descriptionLabel'] }}</x-nq::field.label>
                        <x-nq::field.input x-model="form.note" autocomplete="off" />
                    </x-nq::field>
                    <div class="flex items-start justify-between gap-4 rounded-control border border-border p-3">
                        <div class="flex flex-col gap-0.5">
                            <label for="{{ $uid }}-secret" class="text-label text-foreground">{{ $s['secretLabel'] }}</label>
                            <span class="text-caption text-muted-foreground">{{ $s['secretHint'] }}</span>
                        </div>
                        <x-nq::switch id="{{ $uid }}-secret" x-model="form.secret" checked />
                    </div>
                    <x-nq::alert tone="danger" role="alert" x-show="formError" style="display: none"><span x-text="formError"></span></x-nq::alert>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-bind:disabled="formPending" x-on:click="closeEdit()">{{ $s['cancel'] }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:disabled="formPending || (keyProblem !== null && touched)" x-bind:aria-busy="formPending ? 'true' : null">
                            <x-nq::spinner x-show="formPending" style="display: none" />
                            {{ $s['save'] }}
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($imp)
        <x-nq::dialog x-model="importOpen">
            <x-nq::dialog.content class="max-w-xl">
                <form data-slot="env-import-dialog" class="grid gap-4" novalidate x-on:submit.prevent="submitImport()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title>{{ $s['importTitle'] }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $s['importBody'] }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <x-nq::field>
                        <x-nq::field.label>{{ $s['importLabel'] }}</x-nq::field.label>
                        <x-nq::field.textarea x-model="importText" dir="ltr" rows="8" placeholder="{{ $s['importPlaceholder'] }}" autocapitalize="off" autocomplete="off" autocorrect="off"
                            spellcheck="false" class="min-h-40 font-mono text-code text-start" />
                    </x-nq::field>
                    <div>
                        <input x-ref="file" type="file" accept=".env,text/plain" class="sr-only" tabindex="-1" aria-hidden="true" x-on:change="readFile($event)" />
                        <x-nq::button type="button" size="sm" x-on:click="$refs.file.click()">
                            <x-lucide-file-up aria-hidden="true" />
                            {{ $s['chooseFile'] }}
                        </x-nq::button>
                    </div>
                    <div class="grid gap-2 text-body-sm" aria-live="polite" x-show="importText.trim() !== ''" style="display: none">
                        <p class="text-foreground">
                            <span x-text="foundLabel"></span>
                            <span class="text-nq-warning-text" x-show="conflicts.length > 0" style="display: none"> · <span x-text="conflictsLabel"></span></span>
                        </p>
                        <div class="flex items-center gap-2" x-show="conflicts.length > 0" style="display: none">
                            <x-nq::checkbox id="{{ $uid }}-overwrite" x-model="overwrite" />
                            <label for="{{ $uid }}-overwrite" class="text-foreground">{{ $s['overwrite'] }}</label>
                        </div>
                        <p class="text-caption text-muted-foreground" x-show="conflicts.length > 0 && ! overwrite" style="display: none">{{ $s['skipNote'] }}</p>
                        <p class="text-caption text-nq-warning-text" x-show="parsed.duplicates.length > 0" style="display: none" x-text="duplicatesLabel"></p>
                        <x-nq::alert tone="warning" :title="$s['issuesTitle']" x-show="parsed.issues.length > 0" style="display: none">
                            <ul class="m-0 list-disc ps-4">
                                <template x-for="issue in issues" x-bind:key="issue.id"><li x-text="issue.text"></li></template>
                            </ul>
                        </x-nq::alert>
                    </div>
                    <x-nq::alert tone="danger" role="alert" x-show="importError" style="display: none"><span x-text="importError"></span></x-nq::alert>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-bind:disabled="importPending" x-on:click="closeImport()">{{ $s['cancel'] }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:disabled="importPending || importable.length === 0" x-bind:aria-busy="importPending ? 'true' : null">
                            <x-nq::spinner x-show="importPending" style="display: none" />
                            <span x-text="importLabel"></span>
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($del)
        <x-nq::alert-dialog x-model="deleteOpen">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><bdi dir="ltr" class="font-mono" x-text="deleteHeading"></bdi></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description>{{ $s['deleteBody'] }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert x-show="deleteError" tone="danger" role="alert" style="display: none"><span x-text="deleteError"></span></x-nq::alert>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel x-bind:disabled="deletePending">{{ $s['cancel'] }}</x-nq::alert-dialog.cancel>
                    <x-nq::button type="button" variant="danger" data-slot="env-delete-confirm" x-bind:disabled="deletePending" x-bind:aria-busy="deletePending ? 'true' : null" x-on:click="confirmDelete()">
                        <x-nq::spinner x-show="deletePending" style="display: none" />
                        {{ $s['deleteConfirm'] }}
                    </x-nq::button>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</section>
