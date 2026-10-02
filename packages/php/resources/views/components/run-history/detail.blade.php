{{-- <x-nq::run-history.detail :run="$run" retryable x-on:nq-run-retry="$event.detail.waitUntil(rerun($event.detail.id))" />
     One run: its status and timing, the step that failed and why, every step with its input, output, logs and screenshots on a shared
     time axis, the span trace with attributes, and the raw data. Also the right-hand side of <x-nq::run-history>.
     run: ['id' => 'run_1', 'name' => 'Nightly sync', 'status' => idle|running|success|error|waiting|skipped, 'startedAt' => DateTime|timestamp|string,
       'durationMs' => 4200, 'trigger' => 'Schedule', 'error' => 'why it failed', 'payload' => mixed,
       'steps' => [['id', 'name', 'status', 'startedAtMs', 'durationMs', 'depth', 'input', 'output', 'error', 'logs' => [...], 'screenshots' => [['src', 'alt', 'caption']], 'attempt']],
       'spans' => [['id', 'parentId', 'name', 'service', 'startMs', 'durationMs', 'error' => bool, 'attributes' => [...]]]].
     default-tab: steps (default) | trace | raw. retryable: "Run again" on a finished run. cancellable: "Cancel run" on a running one.
     Both are yours to handle: listen for nq-run-retry / nq-run-cancel ({ id }) and call event.detail.waitUntil(promise);
     resolve { error: "…" } or reject to show the message under the header.
     slot `leading`: at the start of the header (a back button on small screens).
     labels: an array overriding any built-in string (unnamed, started, duration, trigger, retry, cancel, steps, trace, raw, stepsNone, failedHere, skippedNote,
     failure (":name"), failureRun, showStep, attempt (":n"), input, output, error, logs, shots, openShot (":name"), expand (":name"), collapse (":name"), noDetail,
     waterfall, spanDetail, spanName, spanService, spanStart, spanDuration, spanAttrs, spanNoAttrs, spanFailed, pickSpan, traceNone, rawLabel, failed).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['run', 'defaultTab' => 'steps', 'retryable' => false, 'cancellable' => false, 'labels' => []])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $ar = \Nasaq\Nasaq::rtl();
    $l = array_merge([
        'unnamed' => $t('Run', 'تشغيل'),
        'started' => $t('Started', 'بدأ'),
        'duration' => $t('Duration', 'المدة'),
        'trigger' => $t('Trigger', 'المشغّل'),
        'retry' => $t('Run again', 'أعد التشغيل'),
        'cancel' => $t('Cancel run', 'إلغاء التشغيل'),
        'steps' => $t('Steps', 'الخطوات'),
        'trace' => $t('Trace', 'التتبع'),
        'raw' => $t('Raw', 'الخام'),
        'stepsNone' => $t('This run recorded no steps.', 'لم يسجّل هذا التشغيل أي خطوات.'),
        'failedHere' => $t('Failed here', 'فشل هنا'),
        'skippedNote' => $t('Skipped', 'تم تخطيها'),
        'failure' => $t('Failed at :name', 'فشل عند :name'),
        'failureRun' => $t('This run failed', 'فشل هذا التشغيل'),
        'showStep' => $t('Show the step', 'اعرض الخطوة'),
        'attempt' => $t('Attempt :n', 'المحاولة :n'),
        'input' => $t('Input', 'المُدخل'),
        'output' => $t('Output', 'المخرج'),
        'error' => $t('Error', 'الخطأ'),
        'logs' => $t('Logs', 'السجل'),
        'shots' => $t('Screenshots', 'لقطات الشاشة'),
        'openShot' => $t('Enlarge: :name', 'تكبير: :name'),
        'expand' => $t('Show details of :name', 'عرض تفاصيل :name'),
        'collapse' => $t('Hide details of :name', 'إخفاء تفاصيل :name'),
        'noDetail' => $t('No input, output or logs were recorded for this step.', 'لم يُسجَّل مُدخل أو مخرج أو سجل لهذه الخطوة.'),
        'waterfall' => $t('Spans', 'المقاطع الزمنية'),
        'spanDetail' => $t('Span details', 'تفاصيل المقطع'),
        'spanName' => $t('Name', 'الاسم'),
        'spanService' => $t('Service', 'الخدمة'),
        'spanStart' => $t('Starts at', 'يبدأ عند'),
        'spanDuration' => $t('Duration', 'المدة'),
        'spanAttrs' => $t('Attributes', 'الخصائص'),
        'spanNoAttrs' => $t('No attributes.', 'لا خصائص.'),
        'spanFailed' => $t('Failed', 'فشل'),
        'pickSpan' => $t('Choose a span to see its attributes.', 'اختر مقطعًا لترى خصائصه.'),
        'traceNone' => $t('No trace was recorded for this run.', 'لم يُسجَّل تتبع لهذا التشغيل.'),
        'rawLabel' => $t('Raw run data', 'بيانات التشغيل الخام'),
        'failed' => $t('Could not finish. Try again.', 'تعذّر الإكمال. حاول مرة أخرى.'),
    ], (array) $labels);
    $st = [
        'idle' => $t('Not run', 'لم يعمل'), 'running' => $t('Running', 'قيد التشغيل'), 'success' => $t('Succeeded', 'نجح'),
        'error' => $t('Failed', 'فشل'), 'skipped' => $t('Skipped', 'تم تخطيه'), 'waiting' => $t('Waiting', 'بالانتظار'),
    ];
    $tone = ['idle' => 'text-muted-foreground', 'running' => 'text-nq-info-text', 'success' => 'text-nq-success-text', 'error' => 'text-nq-danger-text', 'skipped' => 'text-muted-foreground', 'waiting' => 'text-nq-warning-text'];
    $icons = ['success' => 'circle-check', 'error' => 'circle-x', 'skipped' => 'circle-minus', 'waiting' => 'clock'];
    // Every status has its own shape, so state never relies on colour alone.
    $glyph = function (string $status, string $class, string $label) use ($tone, $icons): string {
        $cls = \Nasaq\Cn::merge('size-4 shrink-0', $tone[$status] ?? '', $class);
        if ($status === 'running') {
            return \Illuminate\Support\Facades\Blade::render('<x-nq::spinner :label="$label" class="'.$cls.'" />', ['label' => $label]);
        }

        return isset($icons[$status]) ? svg('lucide-'.$icons[$status], $cls, ['role' => 'img', 'aria-label' => $label])->toHtml() : '';
    };
    $dur = function (float|int $ms) use ($ar): string {
        $u = $ar ? ['ms' => 'م.ث', 's' => 'ث', 'min' => 'د'] : ['ms' => 'ms', 's' => 's', 'min' => 'min'];
        if ($ms < 1000) {
            return round($ms).' '.$u['ms'];
        }
        if ($ms < 60000) {
            return (string) round($ms / 1000, $ms < 10000 ? 2 : 1).' '.$u['s'];
        }
        $min = intdiv((int) $ms, 60000);
        $sec = (int) round(($ms % 60000) / 1000);

        return $sec === 60 ? ($min + 1).' '.$u['min'] : $min.' '.$u['min'].' '.str_pad((string) $sec, 2, '0', STR_PAD_LEFT).' '.$u['s'];
    };
    $pretty = function (mixed $v): string {
        if (is_string($v)) {
            return $v;
        }
        $json = json_encode($v, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);

        return preg_replace_callback('/^( +)/m', fn ($m) => str_repeat(' ', intdiv(strlen($m[1]), 2)), $json);
    };
    $iso = fn ($v) => $v instanceof \DateTimeInterface ? \Carbon\Carbon::instance($v)->utc()->format('Y-m-d\TH:i:s.v\Z') : (is_numeric($v) ? \Carbon\Carbon::createFromTimestampMs($v)->utc()->format('Y-m-d\TH:i:s.v\Z') : $v);

    $run = (array) $run;
    $steps = array_values(array_map(fn ($s) => (array) $s, (array) ($run['steps'] ?? [])));
    $spans = array_values(array_map(fn ($s) => (array) $s, (array) ($run['spans'] ?? [])));
    $failing = collect($steps)->first(fn ($s) => ($s['status'] ?? '') === 'error');
    $status = $run['status'] ?? 'idle';
    $isRunning = in_array($status, ['running', 'waiting'], true);
    $total = isset($run['durationMs']) ? $run['durationMs'] : max(0, ...array_map(fn ($s) => ($s['startedAtMs'] ?? 0) + ($s['durationMs'] ?? 0), $steps) ?: [0]);

    // Where each step sits on a shared time axis. Steps without a start time follow the one before.
    $cursor = 0;
    $placed = [];
    foreach ($steps as $s) {
        $start = $s['startedAtMs'] ?? $cursor;
        $d = max(0, $s['durationMs'] ?? 0);
        $cursor = max($cursor, $start + $d);
        $placed[] = [$start, $d];
    }
    $extent = max(1, ...array_map(fn ($p) => $p[0] + $p[1], $placed) ?: [1]);
    $bars = array_map(fn ($p) => ['left' => $p[0] / $extent * 100, 'width' => max(0.8, min(100 - $p[0] / $extent * 100, $p[1] / $extent * 100))], $placed);

    // Spans in start order with their depth following parentId; missing or cyclic parents count as roots.
    $byId = collect($spans)->keyBy(fn ($s) => (string) $s['id']);
    $depthOf = function (array $s) use ($byId): int {
        $d = 0;
        $seen = [];
        $cur = $s;
        while (isset($cur['parentId']) && $byId->has((string) $cur['parentId']) && ! isset($seen[(string) $cur['parentId']])) {
            $seen[(string) $cur['parentId']] = true;
            $cur = $byId[(string) $cur['parentId']];
            $d++;
        }

        return $d;
    };
    $ordered = collect($spans)->sort(fn ($a, $b) => [$a['startMs'], (string) $a['id']] <=> [$b['startMs'], (string) $b['id']])->map(fn ($s) => ['span' => $s, 'depth' => $depthOf($s)])->values()->all();
    $origin = $spans ? min(array_column($spans, 'startMs')) : 0;
    $spanExtent = $spans ? max(1, max(array_map(fn ($s) => $s['startMs'] + $s['durationMs'], $spans)) - $origin) : 1;

    // The raw tab: the payload when given, else the record without its bulky screenshots.
    if (array_key_exists('payload', $run) && $run['payload'] !== null) {
        $raw = $pretty($run['payload']);
    } else {
        $copy = $run;
        if (isset($copy['startedAt'])) {
            $copy['startedAt'] = $iso($copy['startedAt']);
        }
        $copy['steps'] = array_map(function ($s) {
            unset($s['screenshots']);

            return $s;
        }, $steps);
        $raw = $pretty($copy);
    }

    $uid = 'nq-rd-'.\Illuminate\Support\Str::random(6);
    $fill = fn (string $s, array $vars) => strtr($s, $vars);
    $hasShots = collect($steps)->contains(fn ($s) => ! empty($s['screenshots']));
    $config = [
        'id' => (string) $run['id'],
        'failing' => $failing ? (string) $failing['id'] : null,
        'tab' => $defaultTab,
        'failed' => $l['failed'],
    ];
    $statusVariant = $status === 'error' ? 'danger' : ($status === 'success' ? 'success' : ($status === 'running' ? 'info' : 'neutral'));
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'run-detail') }}" x-data="nqRunDetail(@js($config))"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <header class="flex flex-wrap items-start gap-3">
        {{ $leading ?? '' }}
        <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
                {!! $glyph($status, 'size-5', $st[$status] ?? '') !!}
                <h2 class="text-h4 text-foreground">{{ $run['name'] ?? $l['unnamed'] }}</h2>
                <x-nq::badge :variant="$statusVariant">{{ $st[$status] ?? '' }}</x-nq::badge>
            </div>
            <dl class="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-body-sm text-muted-foreground">
                <div class="flex gap-1.5">
                    <dt>{{ $l['started'] }}</dt>
                    <dd class="text-foreground"><x-nq::numeric.date-time :value="$run['startedAt']" date-style="medium" time-style="medium" /></dd>
                </div>
                <div class="flex gap-1.5">
                    <dt>{{ $l['duration'] }}</dt>
                    <dd class="text-foreground" dir="ltr">{{ $dur($total) }}</dd>
                </div>
                @if (! empty($run['trigger']))
                    <div class="flex gap-1.5">
                        <dt>{{ $l['trigger'] }}</dt>
                        <dd class="text-foreground">{{ $run['trigger'] }}</dd>
                    </div>
                @endif
                <div class="flex gap-1.5">
                    <dt class="sr-only">ID</dt>
                    <dd dir="ltr" class="font-mono text-code">{{ $run['id'] }}</dd>
                </div>
            </dl>
        </div>
        <div class="flex items-center gap-2">
            @if ($retryable && ! $isRunning)
                <x-nq::button variant="secondary" size="sm" data-slot="run-retry" x-on:click="retry()" x-bind:disabled="busy" x-bind:aria-busy="ariaBusy">
                    <template x-if="busy"><x-nq::spinner /></template>
                    <x-lucide-rotate-ccw aria-hidden="true" x-show="!busy" />
                    {{ $l['retry'] }}
                </x-nq::button>
            @endif
            @if ($cancellable && $isRunning)
                <x-nq::button variant="secondary" size="sm" data-slot="run-cancel" x-on:click="cancel()" x-bind:disabled="busy" x-bind:aria-busy="ariaBusy">
                    <template x-if="busy"><x-nq::spinner /></template>
                    <x-lucide-square aria-hidden="true" x-show="!busy" />
                    {{ $l['cancel'] }}
                </x-nq::button>
            @endif
        </div>
    </header>

    <p role="alert" x-show="error" x-text="error" style="display: none" class="rounded-control bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text"></p>

    @if ($status === 'error' || $failing)
        <x-nq::alert tone="danger" :title="$failing ? $fill($l['failure'], [':name' => $failing['name']]) : $l['failureRun']">
            <span dir="auto">{{ $failing['error'] ?? ($run['error'] ?? '') }}</span>
            @if ($failing)
                <x-slot:action>
                    <x-nq::button variant="secondary" size="sm" data-slot="run-show-step" x-on:click="showFailing()">{{ $l['showStep'] }}</x-nq::button>
                </x-slot:action>
            @endif
        </x-nq::alert>
    @endif

    <x-nq::tabs :default-value="$defaultTab" x-model="pane">
        <x-nq::tabs.list variant="underline">
            <x-nq::tabs.tab value="steps">{{ $l['steps'] }} <span class="ms-1 text-caption text-muted-foreground tabular-nums">{{ count($steps) }}</span></x-nq::tabs.tab>
            <x-nq::tabs.tab value="trace">{{ $l['trace'] }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="raw">{{ $l['raw'] }}</x-nq::tabs.tab>
        </x-nq::tabs.list>
        <x-nq::tabs.panel value="steps">
            @if (count($steps) === 0)
                <p class="text-body-sm text-muted-foreground">{{ $l['stepsNone'] }}</p>
            @else
                <ol class="divide-y divide-border rounded-control border border-border">
                    @foreach ($steps as $i => $s)
                        @php
                            $sid = (string) $s['id'];
                            $sStatus = $s['status'] ?? 'idle';
                            $isFailing = $failing !== null && (string) $failing['id'] === $sid;
                            $has = array_key_exists('input', $s) || array_key_exists('output', $s) || ! empty($s['error']) || ! empty($s['logs']) || ! empty($s['screenshots']);
                            $depth = (int) ($s['depth'] ?? 0);
                            $bodyId = $uid.'-'.$i.'-body';
                            $name = (string) $s['name'];
                            $logText = implode("\n", (array) ($s['logs'] ?? []));
                        @endphp
                        <li data-step="{{ $sid }}" @if ($isFailing) data-failing @endif class="scroll-mt-4 @if ($isFailing) bg-nq-danger-soft/40 @endif">
                            <button type="button" x-on:click="toggle(@js($sid))" x-bind:aria-expanded="isOpen(@js($sid)) ? 'true' : 'false'" aria-controls="{{ $bodyId }}"
                                x-bind:aria-label="isOpen(@js($sid)) ? @js($fill($l['collapse'], [':name' => $name])) : @js($fill($l['expand'], [':name' => $name]))"
                                class="grid w-full grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-3 py-2.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus sm:grid-cols-[auto_auto_minmax(0,14rem)_minmax(0,1fr)_auto]"
                                style="padding-inline-start: calc(0.75rem + {{ $depth * 1 }}rem)">
                                <span aria-hidden="true" class="inline-flex transition-transform" x-bind:class="isOpen(@js($sid)) ? 'rotate-90 rtl:rotate-90' : ''">
                                    <x-lucide-chevron-right aria-hidden="true" class="size-4 text-muted-foreground rtl:-scale-x-100" />
                                </span>
                                {!! $glyph($sStatus, 'size-5', $st[$sStatus] ?? '') !!}
                                <span class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                    <span class="truncate text-label text-foreground">{{ $name }}</span>
                                    @if ($isFailing)<x-nq::badge variant="danger">{{ $l['failedHere'] }}</x-nq::badge>@endif
                                    @if ($sStatus === 'skipped')<x-nq::badge variant="outline">{{ $l['skippedNote'] }}</x-nq::badge>@endif
                                    @if (($s['attempt'] ?? 0) > 1)<x-nq::badge variant="warning">{{ $fill($l['attempt'], [':n' => $s['attempt']]) }}</x-nq::badge>@endif
                                </span>
                                <span aria-hidden="true" class="col-span-full hidden h-2 rounded-full bg-nq-surface-soft sm:col-span-1 sm:block">
                                    <span class="relative block h-full rounded-full {{ $sStatus === 'error' ? 'bg-nq-danger' : ($sStatus === 'skipped' ? 'bg-nq-line-strong' : 'bg-primary') }}"
                                        style="margin-inline-start: {{ round($bars[$i]['left'], 4) }}%; width: {{ round($bars[$i]['width'], 4) }}%"></span>
                                </span>
                                <span class="hidden text-caption text-muted-foreground tabular-nums sm:block" dir="ltr">{{ isset($s['durationMs']) ? $dur($s['durationMs']) : '' }}</span>
                            </button>
                            <div id="{{ $bodyId }}" x-show="isOpen(@js($sid))" @if (! $isFailing) style="display: none" @endif class="flex flex-col gap-3 border-t border-border px-4 py-3"
                                style="padding-inline-start: calc(1rem + {{ $depth * 1 }}rem)">
                                @if (! empty($s['error']))
                                    <div role="alert" class="rounded-control border border-nq-danger/40 bg-nq-danger-soft p-3 text-body-sm text-nq-danger-text">
                                        <p class="font-medium">{{ $l['error'] }}</p>
                                        <p dir="auto">{{ $s['error'] }}</p>
                                    </div>
                                @endif
                                @if (array_key_exists('input', $s))<x-nq::code-block :code="$pretty($s['input'])" language="json" :label="$l['input']" :filename="$l['input']" pre-class="max-h-64" />@endif
                                @if (array_key_exists('output', $s))<x-nq::code-block :code="$pretty($s['output'])" language="json" :label="$l['output']" :filename="$l['output']" pre-class="max-h-64" />@endif
                                @if (! empty($s['logs']))<x-nq::code-block :code="$logText" language="text" :label="$l['logs']" :filename="$l['logs']" pre-class="max-h-48" />@endif
                                @if (! empty($s['screenshots']))
                                    <div class="flex flex-col gap-2">
                                        <p class="text-label text-foreground">{{ $l['shots'] }}</p>
                                        <ul class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            @foreach ($s['screenshots'] as $shot)
                                                <li>
                                                    <button type="button" x-on:click="openShot(@js(['src' => $shot['src'], 'alt' => $shot['alt'], 'caption' => $shot['caption'] ?? '']))"
                                                        aria-label="{{ $fill($l['openShot'], [':name' => $shot['alt']]) }}"
                                                        class="block w-full overflow-hidden rounded-control border border-border outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                                                        <img src="{{ $shot['src'] }}" alt="{{ $shot['alt'] }}" loading="lazy" class="aspect-video w-full object-cover">
                                                    </button>
                                                    @if (! empty($shot['caption']))<p class="mt-1 truncate text-caption text-muted-foreground">{{ $shot['caption'] }}</p>@endif
                                                </li>
                                            @endforeach
                                        </ul>
                                    </div>
                                @endif
                                @if (! $has)<p class="text-body-sm text-muted-foreground">{{ $l['noDetail'] }}</p>@endif
                            </div>
                        </li>
                    @endforeach
                </ol>
            @endif
        </x-nq::tabs.panel>
        <x-nq::tabs.panel value="trace">
            @if (count($spans))
                <div class="flex flex-col gap-3">
                    <section aria-label="{{ $l['waterfall'] }}" data-slot="run-trace" class="rounded-control border border-border p-3">
                        <ul class="flex flex-col gap-1">
                            @foreach ($ordered as $row)
                                @php
                                    $sp = $row['span'];
                                    $spId = (string) $sp['id'];
                                    $left = ($sp['startMs'] - $origin) / $spanExtent * 100;
                                    $width = max(0.8, $sp['durationMs'] / $spanExtent * 100);
                                    $spError = ! empty($sp['error']);
                                @endphp
                                <li>
                                    <button type="button" x-on:click="pickSpan(@js($spId))" x-bind:aria-pressed="span === @js($spId) ? 'true' : 'false'" x-bind:class="span === @js($spId) ? 'bg-nq-selected' : ''"
                                        class="grid w-full grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 rounded-control px-1 py-0.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus sm:grid-cols-[minmax(0,14rem)_1fr]">
                                        <span class="min-w-0" style="padding-inline-start: {{ $row['depth'] * 0.75 }}rem">
                                            <bdi dir="ltr" class="block truncate font-mono text-code text-foreground">
                                                @if ($spError)<x-lucide-circle-alert aria-hidden="true" class="me-1 inline size-3.5 text-nq-danger-text" />@endif
                                                {{ $sp['name'] }}
                                            </bdi>
                                            @if (! empty($sp['service']))<span dir="ltr" class="block truncate text-caption text-muted-foreground">{{ $sp['service'] }}</span>@endif
                                        </span>
                                        <span class="relative h-5 rounded-control bg-nq-surface-soft" role="img" aria-label="{{ $sp['name'] }}, {{ $dur($sp['durationMs']) }}{{ $spError ? ', '.$l['spanFailed'] : '' }}">
                                            <span class="absolute inset-y-0.5 rounded-[3px] {{ $spError ? 'bg-destructive' : 'bg-primary' }}" style="inset-inline-start: {{ round($left, 4) }}%; width: {{ round(min($width, 100 - $left), 4) }}%"></span>
                                            <span class="absolute inset-y-0 flex items-center text-caption text-foreground tabular-nums" style="inset-inline-start: {{ round(min($left + $width + 1, 78), 4) }}%" dir="ltr">{{ $dur($sp['durationMs']) }}</span>
                                        </span>
                                    </button>
                                </li>
                            @endforeach
                        </ul>
                    </section>
                    <section aria-label="{{ $l['spanDetail'] }}" aria-live="polite" data-slot="run-span-detail" class="rounded-control border border-border p-3">
                        <p x-show="span === null" class="text-body-sm text-muted-foreground">{{ $l['pickSpan'] }}</p>
                        @foreach ($ordered as $row)
                            @php($sp = $row['span'])
                            <div x-show="span === @js((string) $sp['id'])" style="display: none" class="flex flex-col gap-3">
                                <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
                                    <dt class="text-muted-foreground">{{ $l['spanName'] }}</dt>
                                    <dd dir="ltr" class="font-mono text-code">{{ $sp['name'] }}</dd>
                                    @if (! empty($sp['service']))
                                        <dt class="text-muted-foreground">{{ $l['spanService'] }}</dt>
                                        <dd dir="ltr">{{ $sp['service'] }}</dd>
                                    @endif
                                    <dt class="text-muted-foreground">{{ $l['spanStart'] }}</dt>
                                    <dd dir="ltr">{{ $dur($sp['startMs']) }}</dd>
                                    <dt class="text-muted-foreground">{{ $l['spanDuration'] }}</dt>
                                    <dd dir="ltr">{{ $dur($sp['durationMs']) }}</dd>
                                    @if (! empty($sp['error']))
                                        <dt class="text-muted-foreground">{{ $l['error'] }}</dt>
                                        <dd class="text-nq-danger-text">{{ $l['spanFailed'] }}</dd>
                                    @endif
                                </dl>
                                <div>
                                    <p class="mb-1 text-label text-foreground">{{ $l['spanAttrs'] }}</p>
                                    @if (! empty($sp['attributes']))
                                        <dl class="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-control bg-nq-surface-soft p-2 text-code" dir="ltr">
                                            @foreach ($sp['attributes'] as $k => $v)
                                                <div class="contents">
                                                    <dt class="font-mono text-muted-foreground">{{ $k }}</dt>
                                                    <dd class="min-w-0 break-words font-mono text-foreground">{{ is_bool($v) ? ($v ? 'true' : 'false') : (is_null($v) ? 'null' : (string) $v) }}</dd>
                                                </div>
                                            @endforeach
                                        </dl>
                                    @else
                                        <p class="text-body-sm text-muted-foreground">{{ $l['spanNoAttrs'] }}</p>
                                    @endif
                                </div>
                            </div>
                        @endforeach
                    </section>
                </div>
            @else
                <p class="text-body-sm text-muted-foreground">{{ $l['traceNone'] }}</p>
            @endif
        </x-nq::tabs.panel>
        <x-nq::tabs.panel value="raw">
            <x-nq::code-block :code="$raw" language="json" :label="$l['rawLabel']" filename="run.json" pre-class="max-h-[28rem]" />
        </x-nq::tabs.panel>
    </x-nq::tabs>

    @if ($hasShots)
        <x-nq::dialog x-model="shotOpen">
            <x-nq::dialog.content class="max-w-3xl">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="shot.alt"></span></x-nq::dialog.title>
                    <x-nq::dialog.description><span x-text="shot.caption || shot.alt"></span></x-nq::dialog.description>
                </x-nq::dialog.header>
                <img x-bind:src="shot.src || null" x-bind:alt="shot.alt" class="max-h-[70dvh] w-full rounded-control border border-border object-contain">
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
</div>
