{{-- One ordered list of steps; a nestable step holds another one (this partial again, up to 3 levels deep). Used by <x-nq::step-editor>.
     depth: 0 for the top list. Inside, `step{depth}` and `index{depth}` are the step and its position. --}}
@props(['depth' => 0, 'types' => []])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $d = (int) $depth;
    $s = 'step'.$d;
    $i = 'index'.$d;
    $path = '['.implode(', ', array_map(fn ($k) => 'index'.$k, $d > 0 ? range(0, $d - 1) : [])).']';
    $childPath = '['.implode(', ', array_map(fn ($k) => 'index'.$k, range(0, $d))).']';
    $inner = $d > 0;
@endphp
<div class="flex flex-col gap-3">
    <p x-show="countAt({{ $path }}) === 0" x-cloak style="display: none" data-slot="step-editor-empty"
        class="rounded-card border border-dashed border-border px-4 py-6 text-center text-body-sm text-muted-foreground">@if ($inner){{ $T('Nothing inside yet.', 'لا شيء بالداخل بعد.') }}@else{{ $T('No steps yet.', 'لا خطوات بعد.') }}@endif</p>
    <ol x-show="countAt({{ $path }}) !== 0" x-cloak style="display: none" aria-label="{{ $inner ? $T('Steps inside', 'الخطوات بالداخل') : $T('Steps', 'الخطوات') }}" class="flex flex-col gap-2">
        <template x-for="({{ $s }}, {{ $i }}) in listAt({{ $path }})" :key="{{ $s }}.id">
            <li data-slot="step-editor-row" :data-step-id="{{ $s }}.id" :data-collapsed="isOpen({{ $s }}) ? undefined : 'true'" class="relative rounded-card border border-border bg-card">
                <div data-slot="step-editor-row-header" class="flex min-h-control items-center gap-1 p-1.5">
                    <button type="button" x-show="countAt({{ $path }}) !== 1" :data-handle="{{ $path }}.join('-') + ':' + {{ $i }}"
                        :aria-label="$nq.t('Reorder ' + nameOf({{ $s }}), 'إعادة ترتيب ' + nameOf({{ $s }}))" :title="$nq.t('Reorder ' + nameOf({{ $s }}), 'إعادة ترتيب ' + nameOf({{ $s }}))"
                        aria-keyshortcuts="ArrowUp ArrowDown Home End" :disabled="disabled" x-on:keydown="onHandleKey($event, {{ $path }}, {{ $i }})"
                        class="inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4">
                        <x-lucide-grip-vertical aria-hidden="true" />
                    </button>
                    <button type="button" :aria-expanded="isOpen({{ $s }}) ? 'true' : 'false'" :aria-label="isOpen({{ $s }}) ? $nq.t('Collapse ' + nameOf({{ $s }}), 'طيّ ' + nameOf({{ $s }})) : $nq.t('Expand ' + nameOf({{ $s }}), 'توسيع ' + nameOf({{ $s }}))"
                        x-on:click="toggle({{ $s }})"
                        class="flex min-h-control-sm min-w-0 flex-1 items-center gap-2 rounded-control px-1.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                        <span aria-hidden="true" :class="isOpen({{ $s }}) ? 'rotate-90 rtl:-rotate-90' : ''" class="flex size-4 shrink-0 text-muted-foreground transition-[rotate] duration-200 ease-nq rtl:-scale-x-100 [&_svg]:size-4"><x-lucide-chevron-right /></span>
                        <span class="min-w-0 truncate text-label text-foreground" x-text="nameOf({{ $s }})"></span>
                        <span x-show="isOpen({{ $s }}) ? false : summaryOf({{ $s }}) !== ''" class="min-w-0 flex-1 truncate text-body-sm text-muted-foreground" x-text="summaryOf({{ $s }})"></span>
                    </button>
                    <x-nq::badge variant="outline" x-show="{{ $s }}.continueOnFailure === true" x-cloak style="display: none">{{ $T('Continue if this step fails', 'المتابعة إذا فشلت هذه الخطوة') }}</x-nq::badge>
                    <x-nq::badge variant="danger" x-show="stepIssueCount({{ $s }}) !== 0" x-cloak style="display: none" x-text="stepIssueCount({{ $s }})"></x-nq::badge>
                    <x-nq::button type="button" variant="ghost" size="icon-sm" class="text-muted-foreground" ::aria-label="$nq.t('Move up ' + nameOf({{ $s }}), 'نقل لأعلى ' + nameOf({{ $s }}))" ::disabled="disabled || {{ $i }} === 0" x-on:click="move({{ $path }}, {{ $i }}, -1)">
                        <x-lucide-chevron-up aria-hidden="true" />
                    </x-nq::button>
                    <x-nq::button type="button" variant="ghost" size="icon-sm" class="text-muted-foreground" ::aria-label="$nq.t('Move down ' + nameOf({{ $s }}), 'نقل لأسفل ' + nameOf({{ $s }}))" ::disabled="disabled || {{ $i }} === countAt({{ $path }}) - 1" x-on:click="move({{ $path }}, {{ $i }}, 1)">
                        <x-lucide-chevron-down aria-hidden="true" />
                    </x-nq::button>
                    <x-nq::button type="button" variant="ghost" size="icon-sm" ::aria-label="$nq.t('Duplicate ' + nameOf({{ $s }}), 'تكرار ' + nameOf({{ $s }}))" ::disabled="disabled" x-on:click="duplicate({{ $path }}, {{ $i }})">
                        <x-lucide-copy aria-hidden="true" />
                    </x-nq::button>
                    <x-nq::button type="button" variant="ghost" size="icon-sm" class="text-muted-foreground hover:text-nq-danger-text" ::aria-label="$nq.t('Remove ' + nameOf({{ $s }}), 'حذف ' + nameOf({{ $s }}))" ::disabled="disabled" x-on:click="remove({{ $path }}, {{ $i }})">
                        <x-lucide-trash-2 aria-hidden="true" />
                    </x-nq::button>
                </div>
                <div x-show="isOpen({{ $s }})" data-slot="step-editor-body" class="border-t border-border p-3 sm:p-4">
                    <template x-if="!{{ $s }}.type">
                        <div data-slot="workflow-node-picker" class="max-h-96 overflow-auto rounded-control border border-border">
                            <div class="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                                <span class="text-label text-foreground">{{ $T('Choose a step type', 'اختر نوع الخطوة') }}</span>
                                <button type="button" x-on:click="cancelPick({{ $path }}, {{ $i }})" class="rounded-control px-2 py-1 text-body-sm text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">{{ $T('Cancel', 'إلغاء') }}</button>
                            </div>
                            <template x-for="g in groups()" :key="g.id">
                                <div class="flex flex-col p-1">
                                    <p x-show="g.label" class="px-2 py-1 text-caption text-muted-foreground" x-text="g.label"></p>
                                    <template x-for="t in g.items" :key="t.id">
                                        <button type="button" :data-pick-type="t.id" x-on:click="pick({{ $path }}, {{ $i }}, t.id)"
                                            class="flex flex-col items-start gap-0.5 rounded-control px-2 py-1.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                                            <span class="text-label text-foreground" x-text="t.label"></span>
                                            <span x-show="t.description" class="text-body-sm text-muted-foreground" x-text="t.description"></span>
                                        </button>
                                    </template>
                                </div>
                            </template>
                        </div>
                    </template>
                    <template x-if="{{ $s }}.type">
                        <div class="flex flex-col gap-4" :data-step-id="{{ $s }}.id">
                            <template x-if="typeOf({{ $s }}.type)">
                                <div class="flex flex-col gap-4">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-label text-foreground">{{ $T('Name', 'الاسم') }}
                                            <x-nq::field.input class="mt-1.5 font-normal" x-model="{{ $s }}.label" ::placeholder="typeOf({{ $s }}.type).label" />
                                        </label>
                                        <p class="text-caption text-muted-foreground">{{ $T("Shown in the list. Leave empty to use the step's own name.", 'يظهر في القائمة. اتركه فارغًا لاستخدام اسم الخطوة نفسها.') }}</p>
                                    </div>
                                    <p x-show="fieldsOf({{ $s }}).length === 0" class="text-body-sm text-muted-foreground">{{ $T('This step has no settings.', 'ليس لهذه الخطوة إعدادات.') }}</p>
                                    <template x-for="f in fieldsOf({{ $s }})" :key="f.name">
                                        <div class="flex flex-col gap-1.5" :data-field="f.name">
                                            <span class="text-label text-foreground">
                                                <span x-text="f.label"></span>
                                                <span x-show="f.required" class="text-caption text-muted-foreground">({{ $T('Required', 'مطلوب') }})</span>
                                            </span>
                                            <template x-if="f.kind === 'textarea' || f.kind === 'code'">
                                                <x-nq::field.textarea rows="3" ::aria-label="f.label" ::placeholder="f.placeholder" ::dir="f.kind === 'code' ? 'ltr' : undefined" ::aria-invalid="isMissing({{ $s }}, f.name) ? 'true' : undefined" x-model="{{ $s }}.config[f.name]" class="py-2" />
                                            </template>
                                            <template x-if="f.kind === 'select'">
                                                <select :aria-label="f.label" x-model="{{ $s }}.config[f.name]" class="h-control w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground outline-none focus-visible:border-nq-focus">
                                                    <template x-for="o in (f.options || [])" :key="o.value"><option :value="o.value" x-text="o.label"></option></template>
                                                </select>
                                            </template>
                                            <template x-if="f.kind === 'boolean'">
                                                <div><x-nq::switch ::aria-label="f.label" x-model="{{ $s }}.config[f.name]" /></div>
                                            </template>
                                            <template x-if="f.kind === 'number'">
                                                <x-nq::field.input type="number" ::aria-label="f.label" ::placeholder="f.placeholder" ::aria-invalid="isMissing({{ $s }}, f.name) ? 'true' : undefined" x-model.number="{{ $s }}.config[f.name]" />
                                            </template>
                                            <template x-if="f.kind === 'text' || f.kind === 'url'">
                                                <x-nq::field.input ::type="f.kind === 'url' ? 'url' : 'text'" ::dir="f.kind === 'url' ? 'ltr' : undefined" ::aria-label="f.label" ::placeholder="f.placeholder" ::aria-invalid="isMissing({{ $s }}, f.name) ? 'true' : undefined" x-model="{{ $s }}.config[f.name]" />
                                            </template>
                                        </div>
                                    </template>
                                </div>
                            </template>
                            <p x-show="!typeOf({{ $s }}.type)" class="text-body-sm text-nq-danger-text">{{ $T('Unknown step', 'خطوة غير معروفة') }}</p>
                            <div class="flex items-center justify-between gap-3">
                                <div class="min-w-0">
                                    <p class="text-label text-foreground">{{ $T('Continue if this step fails', 'المتابعة إذا فشلت هذه الخطوة') }}</p>
                                    <p class="text-caption text-muted-foreground">{{ $T('The next step still runs. The failure is recorded.', 'تعمل الخطوة التالية رغم ذلك، ويُسجَّل الفشل.') }}</p>
                                </div>
                                <div x-on:click="$nextTick(() => changed())"><x-nq::switch aria-label="{{ $T('Continue if this step fails', 'المتابعة إذا فشلت هذه الخطوة') }}" x-model="{{ $s }}.continueOnFailure" /></div>
                            </div>
                            @if ($d < 2)
                                <template x-if="isNestable({{ $s }})">
                                    <div class="rounded-control border border-dashed border-border p-3">
                                        <x-nq::step-editor.list :depth="$d + 1" />
                                    </div>
                                </template>
                            @endif
                        </div>
                    </template>
                </div>
            </li>
        </template>
    </ol>
    <div>
        <x-nq::button type="button" variant="secondary" ::disabled="disabled" x-on:click="add({{ $path }})">
            <x-lucide-plus aria-hidden="true" />
            @if ($inner){{ $T('Add a step inside', 'أضف خطوة بالداخل') }}@else{{ $T('Add step', 'إضافة خطوة') }}@endif
        </x-nq::button>
    </div>
</div>
