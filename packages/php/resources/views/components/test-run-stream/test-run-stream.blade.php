{{-- <x-nq::test-run-stream x-on:test-run-start="startRun($event.detail)" />
     A test run that streams. Run and Stop, each step appearing and updating in place as it is reported, a live elapsed time and summary, and what the run saved,
     with its raw data behind a toggle. Before the first run it shows an empty state.
     Run fires test-run-start (bubbles) with detail { step, result, done, fail, signal, waitUntil }: report through those, close your stream when signal aborts,
     or pass a promise to waitUntil (resolving finishes the run, rejecting fails it). A step is { id?, name, status: running | ok | error | skipped, detail?, durationMs?, count?, error? };
     steps with the same id (or name) update one row. A result is { id, title?, url?, meta?: [], body?, raw? }. test-run-state fires with detail { state } on every change.
     <x-slot:controls> holds run options before the button. blocked: blocks starting a run. title / description: text that replaces the heading, or false to hide it.
     heading-as: default h3. labels: an array that replaces strings (status and summary merge with the built-in ones).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['blocked' => false, 'title' => null, 'description' => null, 'headingAs' => 'h3', 'labels' => [], 'controls' => null])
@php
    $N = \Nasaq\Nasaq::class;
    $strings = [
        'title' => $N::t('Test run', 'تشغيل تجريبي'),
        'description' => $N::t('Runs once without publishing anything, and shows each step as it happens.', 'يعمل مرة واحدة دون نشر أي شيء، ويعرض كل خطوة لحظة حدوثها.'),
        'run' => $N::t('Run test', 'تشغيل الاختبار'),
        'runAgain' => $N::t('Run again', 'تشغيل مرة أخرى'),
        'stop' => $N::t('Stop', 'إيقاف'),
        'clear' => $N::t('Clear', 'مسح'),
        'idleTitle' => $N::t('No test run yet', 'لا يوجد تشغيل تجريبي بعد'),
        'idleBody' => $N::t('Run a test to watch each step as it happens.', 'شغّل اختبارًا لمتابعة كل خطوة لحظة حدوثها.'),
        'steps' => $N::t('Steps', 'الخطوات'),
        'results' => $N::t('Saved', 'المحفوظ'),
        'running' => $N::t('Running', 'قيد التشغيل'),
        'stepsCount' => $N::t('{n} steps', '{n} خطوات'),
        'finished' => $N::t('Finished in {time}', 'انتهى خلال {time}'),
        'stopped' => $N::t('Stopped after {time}', 'توقف بعد {time}'),
        'failed' => $N::t('Failed after {time}', 'فشل بعد {time}'),
        'waiting' => $N::t('Waiting for the first step…', 'في انتظار الخطوة الأولى…'),
        'status' => [
            'running' => $N::t('Running', 'قيد التشغيل'),
            'ok' => $N::t('Passed', 'نجحت'),
            'error' => $N::t('Failed', 'فشلت'),
            'skipped' => $N::t('Skipped', 'تخطّي'),
        ],
        'summary' => [
            'ok' => $N::t('{n} passed', '{n} نجحت'),
            'error' => $N::t('{n} failed', '{n} فشلت'),
            'skipped' => $N::t('{n} skipped', '{n} تخطّي'),
        ],
        'items' => $N::t('{n} items', '{n} عناصر'),
        'untitled' => $N::t('Untitled', 'بلا عنوان'),
        'opensNewTab' => $N::t('(opens in a new tab)', '(يفتح في علامة تبويب جديدة)'),
        'showRaw' => $N::t('Show raw data', 'عرض البيانات الخام'),
        'hideRaw' => $N::t('Hide raw data', 'إخفاء البيانات الخام'),
        'raw' => $N::t('Raw data', 'البيانات الخام'),
        'noResults' => $N::t('Nothing was saved.', 'لم يُحفظ شيء.'),
    ];
    $t = array_replace_recursive($strings, (array) $labels);
    $heading = $title === null ? $t['title'] : ($title === false ? null : $title);
    $sub = $description === null ? $t['description'] : ($description === false ? null : $description);
    $options = ['blocked' => (bool) $blocked, 'labels' => $t];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'test-run-stream') }}" x-data="nqTestRunStream({!! \Illuminate\Support\Js::from($options) !!})" x-id="['nq-test-run']"
    x-bind:data-state="state" @if ($heading) x-bind:aria-labelledby="uid(`title`)" @endif
    {{ $attributes->except('data-slot')->cn('flex flex-col rounded-card border border-border bg-card') }}>
    <header class="flex flex-wrap items-start gap-3 border-b border-border px-5 py-4">
        @if ($heading || $sub)
            <div class="flex min-w-48 flex-1 flex-col gap-1">
                @if ($heading)
                    <{{ $headingAs }} x-bind:id="uid(`title`)" class="text-h4 text-foreground">{{ $heading }}</{{ $headingAs }}>
                @endif
                @if ($sub)
                    <p class="text-body-sm text-muted-foreground">{{ $sub }}</p>
                @endif
            </div>
        @endif
        <div class="flex flex-wrap items-center gap-2">
            {{ $controls }}
            <x-nq::button data-action="stop" x-show="isRunning()" x-on:click="stop()" style="display: none">
                <x-lucide-square aria-hidden="true" />
                {{ $t['stop'] }}
            </x-nq::button>
            <x-nq::button variant="ghost" x-show="showClear()" x-on:click="clear()" style="display: none">
                <x-lucide-rotate-ccw aria-hidden="true" />
                {{ $t['clear'] }}
            </x-nq::button>
            <x-nq::button variant="primary" data-action="run" x-show="! isRunning()" x-bind:disabled="blocked" x-on:click="start()">
                <x-lucide-play aria-hidden="true" />
                <span x-text="runLabel()">{{ $t['run'] }}</span>
            </x-nq::button>
        </div>
    </header>

    <div class="flex flex-col gap-4 px-5 py-4">
        <p role="status" data-slot="test-run-summary" x-text="line()" x-bind:class="isIdle() ? `sr-only` : `text-muted-foreground`" class="text-body-sm tabular-nums sr-only"></p>

        <p role="alert" dir="auto" x-show="error" x-text="error" style="display: none" class="rounded-control bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text"></p>

        <div x-show="isIdle()">
            <x-nq::states.empty icon="flask-conical" :title="$t['idleTitle']" :description="$t['idleBody']" />
        </div>

        <div x-show="! isIdle()" style="display: none" class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <h4 x-bind:id="uid(`steps`)" class="text-caption text-muted-foreground">{{ $t['steps'] }}</h4>
                <ol x-show="steps.length" x-bind:aria-labelledby="uid(`steps`)" style="display: none" class="divide-y divide-border rounded-control border border-border">
                    <template x-for="(step, i) in steps" x-bind:key="stepKey(step)">
                        <li data-slot="test-run-step" x-bind:data-status="stepStatus(step)" class="flex items-start gap-3 px-3 py-2.5">
                            <span aria-hidden="true" class="mt-0.5 flex size-5 shrink-0 items-center justify-center">
                                <x-nq::spinner x-show="stepIs(step, `running`)" />
                                <x-nq::status tone="success" x-show="stepIs(step, `ok`)" style="display: none" />
                                <x-nq::status tone="danger" x-show="stepIs(step, `error`)" style="display: none" />
                                <x-nq::status tone="neutral" x-show="stepIs(step, `skipped`)" style="display: none" />
                            </span>
                            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span class="text-caption text-muted-foreground tabular-nums" x-text="stepNumber(i)"></span>
                                    <span dir="auto" class="text-label text-foreground" x-text="step.name"></span>
                                    <x-nq::badge variant="neutral" x-show="hasCount(step)" x-text="itemsText(step)" style="display: none" />
                                </div>
                                <p dir="auto" x-show="step.detail" x-text="step.detail" style="display: none" class="text-caption text-muted-foreground"></p>
                                <p dir="auto" x-show="step.error" x-text="step.error" style="display: none" class="text-caption text-nq-danger-text"></p>
                            </div>
                            <span class="flex shrink-0 flex-col items-end gap-0.5">
                                <span x-text="labels.status[stepStatus(step)]" x-bind:class="stepStatusClass(step)" class="text-caption"></span>
                                <bdi dir="ltr" x-show="hasDuration(step)" x-text="duration(step)" style="display: none" class="text-caption text-muted-foreground tabular-nums"></bdi>
                            </span>
                        </li>
                    </template>
                </ol>
                <p x-show="waiting()" style="display: none" class="flex items-center gap-2 rounded-control border border-dashed border-border px-3 py-2.5 text-body-sm text-muted-foreground">
                    <x-nq::spinner aria-hidden="true" />
                    {{ $t['waiting'] }}
                </p>
            </div>

            <div x-show="showResults()" style="display: none" class="flex flex-col gap-2">
                <h4 x-bind:id="uid(`results`)" class="flex items-center gap-2 text-caption text-muted-foreground">
                    {{ $t['results'] }}
                    <x-nq::badge variant="neutral" x-text="resultCount()">0</x-nq::badge>
                </h4>
                <ul x-show="results.length" x-bind:aria-labelledby="uid(`results`)" style="display: none" class="divide-y divide-border rounded-control border border-border">
                    <template x-for="r in results" x-bind:key="r.id">
                        <li data-slot="test-run-result" x-bind:data-result="r.id" class="flex flex-col gap-1.5 p-3">
                            <div class="flex min-w-0 items-start gap-2">
                                <template x-if="r.url">
                                    <a x-bind:href="r.url" target="_blank" rel="noopener noreferrer" dir="auto" class="min-w-0 flex-1 truncate text-label text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current">
                                        <span x-text="resultTitle(r)"></span>
                                        <x-lucide-external-link aria-hidden="true" class="ms-1 inline size-3.5 align-[-2px] text-muted-foreground" />
                                        <span class="sr-only">{{ $t['opensNewTab'] }}</span>
                                    </a>
                                </template>
                                <template x-if="! r.url">
                                    <span dir="auto" class="min-w-0 flex-1 truncate text-label text-foreground" x-text="resultTitle(r)"></span>
                                </template>
                            </div>
                            <div x-show="hasMeta(r)" style="display: none" class="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground">
                                <template x-for="(m, mi) in (r.meta || [])" x-bind:key="mi"><bdi x-text="m"></bdi></template>
                            </div>
                            <p dir="auto" x-show="r.body" x-text="r.body" style="display: none" class="line-clamp-3 text-body-sm text-muted-foreground"></p>
                            <div x-show="hasRaw(r)" style="display: none" class="flex flex-col gap-2">
                                <x-nq::button size="sm" variant="link" x-bind:aria-expanded="isRaw(r.id) ? `true` : `false`" x-bind:aria-controls="rawId(r.id)" x-on:click="toggleRaw(r.id)" class="w-fit">
                                    <span x-text="rawLabel(r.id)">{{ $t['showRaw'] }}</span>
                                </x-nq::button>
                                <template x-if="isRaw(r.id)">
                                    <div x-bind:id="rawId(r.id)">
                                        <x-nq::code-block language="json" :filename="$t['raw']" code-expr="rawJson(r)" pre-class="max-h-64" />
                                    </div>
                                </template>
                            </div>
                        </li>
                    </template>
                </ul>
                <p x-show="! results.length" class="text-body-sm text-muted-foreground" style="display: none">{{ $t['noResults'] }}</p>
            </div>
        </div>
    </div>
</section>
