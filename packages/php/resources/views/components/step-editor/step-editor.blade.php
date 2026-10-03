{{-- <x-nq::step-editor :types="$types" :steps="$steps" :params="$params" :nestable="['loop']" :known="['trigger.body']" testable />
     Edits a workflow as a plain list: steps you can reorder, duplicate and nest, each with a form generated from its step type, a continue-on-failure switch,
     parameters you reference as {{name}} (secrets masked), problems listed before you can run, and a test run that shows each step's result.
     types: [['id' => 'http', 'label' => 'HTTP request', 'category' => 'data', 'fields' => [['name' => 'url', 'label' => 'URL', 'kind' => 'url', 'required' => true]], 'defaults' => []]]
       (kind: text | textarea | number | boolean | select | url | code). categories: [['id' => 'data', 'label' => 'Data']]. steps: [['id' => 's1', 'type' => 'http', 'config' => [...], 'children' => [...]]].
     params: [['id' => 'p1', 'name' => 'host', 'value' => 'api.example.com', 'secret' => false]]. nestable: step type ids that can hold steps (up to 3 levels). known: placeholder names always available.
     testable shows the Test run tab: listen with x-on:nq-step-test="$event.detail.waitUntil(fetch(...).then((r) => r.json()))" (resolve [{ stepId, status, durationMs, output, error }] or { error }).
     A "change" event ({ steps, params }) bubbles after every edit. There is no backend. Reorder by dragging the handle or with its arrow keys / Home / End.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['types' => [], 'categories' => [], 'steps' => [], 'params' => [], 'nestable' => [], 'known' => [], 'testable' => false, 'disabled' => false])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $paramsIntro = $T('Use a parameter in any text field as '.'{'.'{name}'.'}'.'. Secret values are masked and hidden from test output.', 'استخدم المعامل في أي حقل نصي بالصيغة '.'{'.'{الاسم}'.'}'.'. القيم السرية مخفية وتُحجب من ناتج التجربة.');
    $options = [
        'types' => array_values((array) $types),
        'categories' => array_values((array) $categories),
        'steps' => array_values((array) $steps),
        'params' => array_values((array) $params),
        'nestable' => array_values((array) $nestable),
        'known' => array_values((array) $known),
        'testable' => (bool) $testable,
        'disabled' => (bool) $disabled,
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'step-editor') }}" x-data="nqStepEditor({!! \Illuminate\Support\Js::from($options)->toHtml() !!})" x-on:input="changed()" @if ($disabled) data-disabled="true" @endif
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <div x-show="issues().length !== 0" x-cloak style="display: none" data-slot="alert" role="alert" class="rounded-card border border-nq-warning/30 bg-nq-warning-soft px-4 py-3 text-body-sm text-foreground">
        <p class="text-label" x-text="problemsTitle()"></p>
        <ul class="mt-1 list-disc ps-5 text-body-sm">
            <template x-for="(line, n) in problemLines()" :key="n"><li x-text="line"></li></template>
            <li x-show="issues().length - 6 > 0">…</li>
        </ul>
    </div>
    <x-nq::tabs default-value="steps">
        <x-nq::tabs.list variant="underline">
            <x-nq::tabs.tab value="steps">{{ $T('Steps', 'الخطوات') }} <span class="ms-1 text-caption text-muted-foreground tabular-nums" x-text="total()">0</span></x-nq::tabs.tab>
            <x-nq::tabs.tab value="params">{{ $T('Parameters', 'المعاملات') }} <span class="ms-1 text-caption text-muted-foreground tabular-nums" x-text="params.length">0</span></x-nq::tabs.tab>
            @if ($testable)
                <x-nq::tabs.tab value="test">{{ $T('Test run', 'تشغيل تجريبي') }}</x-nq::tabs.tab>
            @endif
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>
        <x-nq::tabs.panel value="steps">
            <x-nq::step-editor.list :depth="0" />
        </x-nq::tabs.panel>
        <x-nq::tabs.panel value="params">
            <div class="flex flex-col gap-3">
                <p class="text-body-sm text-muted-foreground">{{ $paramsIntro }}</p>
                <p x-show="params.length === 0" x-cloak style="display: none" class="rounded-card border border-dashed border-border px-4 py-6 text-center text-body-sm text-muted-foreground">{{ $T('No parameters yet.', 'لا معاملات بعد.') }}</p>
                <ol x-show="params.length !== 0" x-cloak style="display: none" aria-label="{{ $T('Parameters', 'المعاملات') }}" class="flex flex-col gap-2">
                    <template x-for="(p, pi) in params" :key="p.id">
                        <li data-slot="step-editor-param" :data-param-id="p.id" :data-dragging="isDragging('params', pi) ? 'true' : null" :style="dragStyle('params', pi)" class="relative rounded-card border border-border bg-card data-dragging:z-10 data-dragging:border-nq-focus data-dragging:shadow-floating">
                            <div class="flex min-h-control items-center gap-1 p-1.5">
                                <button type="button" x-show="params.length !== 1" :data-param-handle="pi"
                                    :aria-label="$nq.t('Reorder ' + paramName(p, pi), 'إعادة ترتيب ' + paramName(p, pi))" :title="$nq.t('Reorder ' + paramName(p, pi), 'إعادة ترتيب ' + paramName(p, pi))"
                                    aria-keyshortcuts="ArrowUp ArrowDown Home End" :disabled="disabled" x-on:keydown="onParamKey($event, pi)" x-on:pointerdown="startDrag($event, 'params', pi)"
                                    class="inline-flex size-control-sm shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4">
                                    <x-lucide-grip-vertical aria-hidden="true" />
                                </button>
                                <span class="min-w-0 flex-1 truncate px-1.5 text-label text-foreground" x-text="paramName(p, pi)"></span>
                                <x-nq::button type="button" variant="ghost" size="icon-sm" class="text-muted-foreground hover:text-nq-danger-text" ::aria-label="$nq.t('Remove ' + paramName(p, pi), 'حذف ' + paramName(p, pi))" ::disabled="disabled" x-on:click="removeParam(pi)">
                                    <x-lucide-trash-2 aria-hidden="true" />
                                </x-nq::button>
                            </div>
                            <div class="grid gap-3 border-t border-border p-3 sm:grid-cols-2 sm:p-4">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-label text-foreground">{{ $T('Name', 'الاسم') }}
                                        <x-nq::field.input class="mt-1.5 font-normal" dir="ltr" placeholder="api_base" spellcheck="false" ::aria-invalid="paramIssue(p) !== '' ? 'true' : undefined" x-model="p.name" />
                                    </label>
                                    <p x-show="paramIssue(p) !== ''" role="alert" class="text-caption text-nq-danger-text" x-text="paramIssue(p)"></p>
                                    <p x-show="paramIssue(p) === ''" class="text-caption text-muted-foreground"><bdi dir="ltr" class="font-mono" x-text="token(p)"></bdi> · <span x-text="usageText(p)"></span></p>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-label text-foreground" x-bind:for="'nq-param-value-' + p.id">{{ $T('Value', 'القيمة') }}</label>
                                    <div class="flex items-center gap-1">
                                        <x-nq::field.input ::id="'nq-param-value-' + p.id" ::type="inputType(p)" dir="ltr" autocomplete="off" spellcheck="false" class="flex-1" x-model="p.value" />
                                        <button type="button" x-show="p.secret === true" x-cloak style="display: none" :aria-pressed="isShown(p) ? 'true' : 'false'" :aria-label="isShown(p) ? $nq.t('Hide value', 'إخفاء القيمة') : $nq.t('Show value', 'إظهار القيمة')"
                                            x-on:click="toggleShown(p)"
                                            class="inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4">
                                            <span x-show="isShown(p)" x-cloak style="display: none" aria-hidden="true" class="flex"><x-lucide-eye-off /></span>
                                            <span x-show="!isShown(p)" aria-hidden="true" class="flex"><x-lucide-eye /></span>
                                        </button>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3 sm:col-span-2">
                                    <div x-on:click="$nextTick(() => changed())"><x-nq::switch aria-label="{{ $T('Secret', 'سري') }}" x-model="p.secret" /></div>
                                    <span class="text-label text-foreground">{{ $T('Secret', 'سري') }}</span>
                                </div>
                            </div>
                        </li>
                    </template>
                </ol>
                <div>
                    <x-nq::button type="button" variant="secondary" ::disabled="disabled" x-on:click="addParam()">
                        <x-lucide-plus aria-hidden="true" />
                        {{ $T('Add parameter', 'إضافة معامل') }}
                    </x-nq::button>
                </div>
            </div>
        </x-nq::tabs.panel>
        @if ($testable)
            <x-nq::tabs.panel value="test">
                <div class="flex flex-col gap-3">
                    <p class="text-body-sm text-muted-foreground">{{ $T('Run the steps in order with these parameters. Nothing here is saved.', 'شغّل الخطوات بالترتيب بهذه المعاملات. لا يُحفظ شيء هنا.') }}</p>
                    <div class="flex items-center gap-3">
                        <x-nq::button type="button" data-run-test ::disabled="!canTest()" x-on:click="runTest()">
                            <x-lucide-flask-conical aria-hidden="true" />
                            <span x-text="running ? $nq.t('Running', 'جارٍ التشغيل') : $nq.t('Run test', 'شغّل التجربة')"></span>
                        </x-nq::button>
                        <span x-show="issues().length !== 0" x-cloak style="display: none" class="text-body-sm text-muted-foreground">{{ $T('Fix the problems first', 'أصلح المشكلات أولًا') }}</span>
                    </div>
                    <p x-show="testError !== ''" x-cloak style="display: none" role="alert" class="rounded-control bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text"><span>{{ $T('The test could not run', 'تعذّر تشغيل التجربة') }}</span>: <span x-text="testError"></span></p>
                    <ol x-show="results !== null" x-cloak style="display: none" aria-label="{{ $T('Test run results', 'نتائج التشغيل التجريبي') }}" class="divide-y divide-border rounded-control border border-border">
                        <template x-for="r in (results || [])" :key="r.stepId">
                            <li :data-result="r.stepId" class="flex flex-col gap-2 p-3">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="text-label text-foreground" x-text="resultLabel(r)"></span>
                                    <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-caption" :class="r.status === 'error' ? 'border-nq-danger/30 bg-nq-danger-soft text-nq-danger-text' : r.status === 'success' ? 'border-nq-success/30 bg-nq-success-soft text-nq-success-text' : 'border-border bg-secondary text-foreground'" x-text="statusText(r)"></span>
                                    <span x-show="r.durationMs !== undefined" dir="ltr" class="ms-auto text-caption text-muted-foreground tabular-nums"><span x-text="r.durationMs"></span> ms</span>
                                </div>
                                <p x-show="r.error" role="alert" dir="auto" class="text-body-sm text-nq-danger-text" x-text="errorText(r)"></p>
                                <pre x-show="r.output !== undefined" dir="ltr" class="max-h-48 overflow-auto rounded-control border border-border bg-secondary p-3 text-body-sm"><code x-text="outputText(r)"></code></pre>
                            </li>
                        </template>
                    </ol>
                    <p x-show="results === null ? (!running ? testError === '' : false) : false" x-cloak style="display: none" class="rounded-card border border-dashed border-border px-4 py-6 text-center text-body-sm text-muted-foreground">{{ $T('No test yet.', 'لا تجربة بعد.') }}</p>
                </div>
            </x-nq::tabs.panel>
        @endif
    </x-nq::tabs>
</div>
