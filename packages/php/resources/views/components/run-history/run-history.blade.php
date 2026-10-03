{{-- <x-nq::run-history :runs="$runs" retryable x-on:nq-run-retry="$event.detail.waitUntil(rerun($event.detail.id))" />
     Runs newest first with a status filter and search, and the chosen run's detail beside it (below on a phone, with a back button):
     steps with timings, input, output, logs and screenshots, the failing step called out, the span trace with attributes, and the raw payload.
     It has no backend: pass the runs and handle the events.
     runs: [['id' => 'run_1', 'name' => 'Nightly sync', 'status' => idle|running|success|error|waiting|skipped, 'startedAt' => DateTime|timestamp|string,
       'durationMs' => 4200, 'trigger' => 'Schedule', 'error' => '...', 'payload' => mixed, 'steps' => [...], 'spans' => [...]]] (see <x-nq::run-history.detail> for steps and spans).
     default-selected-id: start with one open. loading: skeleton list. retryable: "Run again" on finished runs. cancellable: "Cancel run" on running ones.
     Both are yours: listen for nq-run-retry / nq-run-cancel ({ id }) and call event.detail.waitUntil(promise); resolve { error: "..." } or reject to show the message.
     Selecting dispatches nq-run-select ({ id }, id is null when cleared).
     labels: an array overriding any built-in string (runs, search, filters, filterAll, filterFailed, filterSuccess, filterRunning, none, noneBody, pick, pickBody, back,
     unnamed) plus every label of <x-nq::run-history.detail>.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['runs' => [], 'defaultSelectedId' => null, 'loading' => false, 'retryable' => false, 'cancellable' => false, 'labels' => []])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $ar = \Nasaq\Nasaq::rtl();
    $l = array_merge([
        'runs' => $t('Runs', 'التشغيلات'),
        'search' => $t('Search runs', 'ابحث في التشغيلات'),
        'filters' => $t('Filter by status', 'التصفية بالحالة'),
        'filterAll' => $t('All', 'الكل'),
        'filterFailed' => $t('Failed', 'الفاشلة'),
        'filterSuccess' => $t('Succeeded', 'الناجحة'),
        'filterRunning' => $t('Running', 'الجارية'),
        'none' => $t('No runs match', 'لا تشغيلات مطابقة'),
        'noneBody' => $t('Change the filter or the search.', 'غيّر التصفية أو البحث.'),
        'pick' => $t('Choose a run', 'اختر تشغيلًا'),
        'pickBody' => $t('Pick a run on the left to see its steps, timing and output.', 'اختر تشغيلًا من القائمة لترى خطواته وتوقيته ومخرجاته.'),
        'back' => $t('Back to runs', 'العودة إلى التشغيلات'),
        'unnamed' => $t('Run', 'تشغيل'),
    ], (array) $labels);
    $statusNames = [
        'idle' => $t('Not run', 'لم يعمل'), 'running' => $t('Running', 'قيد التشغيل'), 'success' => $t('Succeeded', 'نجح'),
        'error' => $t('Failed', 'فشل'), 'skipped' => $t('Skipped', 'تم تخطيه'), 'waiting' => $t('Waiting', 'بالانتظار'),
    ];
    $tone = ['idle' => 'text-muted-foreground', 'running' => 'text-nq-info-text', 'success' => 'text-nq-success-text', 'error' => 'text-nq-danger-text', 'skipped' => 'text-muted-foreground', 'waiting' => 'text-nq-warning-text'];
    $icons = ['success' => 'circle-check', 'error' => 'circle-x', 'skipped' => 'circle-minus', 'waiting' => 'clock'];
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
    $ts = fn ($v) => $v instanceof \DateTimeInterface ? $v->getTimestamp() : (is_numeric($v) ? (int) $v : \Carbon\Carbon::parse($v)->getTimestamp());
    $rs = collect($runs)->map(fn ($r) => (array) $r)->sortByDesc(fn ($r) => $ts($r['startedAt']))->values();
    $length = function (array $r): float|int {
        if (isset($r['durationMs'])) {
            return $r['durationMs'];
        }
        $ends = array_map(fn ($s) => (($s = (array) $s)['startedAtMs'] ?? 0) + ($s['durationMs'] ?? 0), (array) ($r['steps'] ?? []));

        return $ends ? max(0, ...$ends) : 0;
    };
    $category = fn (string $s) => $s === 'error' ? 'failed' : ($s === 'success' ? 'success' : (in_array($s, ['running', 'waiting'], true) ? 'running' : ''));
    $counts = ['all' => $rs->count(), 'failed' => 0, 'success' => 0, 'running' => 0];
    foreach ($rs as $r) {
        $c = $category($r['status'] ?? 'idle');
        if ($c !== '') {
            $counts[$c]++;
        }
    }
    $startId = $defaultSelectedId !== null && $rs->contains('id', $defaultSelectedId) ? (string) $defaultSelectedId : null;
    $config = [
        'runs' => $rs->map(fn ($r) => [
            'id' => (string) $r['id'],
            'category' => $category($r['status'] ?? 'idle'),
            'text' => mb_strtolower(implode(' ', array_filter([$r['id'], $r['name'] ?? null, $r['trigger'] ?? null, $r['error'] ?? null], fn ($x) => is_string($x) && $x !== ''))),
        ])->all(),
        'selected' => $startId,
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'run-history') }}" x-data="nqRunHistory(@js($config))" @if ($loading) aria-busy="true" @endif
    {{ $attributes->except('data-slot')->cn('grid min-w-0 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start') }}>
    <section aria-label="{{ $l['runs'] }}" x-bind:class="selected !== null ? 'hidden lg:flex' : ''" class="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-3">
        <div class="relative">
            <x-lucide-search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
            <x-nq::field.input type="search" x-model="query" placeholder="{{ $l['search'] }}" aria-label="{{ $l['search'] }}" class="ps-9" />
        </div>
        <x-nq::toggle-group :default-value="['all']" x-model="filterSel" aria-label="{{ $l['filters'] }}" class="flex-wrap">
            @foreach (['all' => 'filterAll', 'failed' => 'filterFailed', 'success' => 'filterSuccess', 'running' => 'filterRunning'] as $f => $key)
                <x-nq::toggle-group.toggle :value="$f">
                    {{ $l[$key] }}
                    <span class="ms-1 text-caption text-muted-foreground tabular-nums">{{ $counts[$f] }}</span>
                </x-nq::toggle-group.toggle>
            @endforeach
        </x-nq::toggle-group>
        @if ($loading)
            <div class="flex flex-col gap-2">
                @for ($i = 0; $i < 4; $i++)<x-nq::states.skeleton class="h-14" />@endfor
            </div>
        @else
            <div x-show="shown === 0" @if ($rs->isNotEmpty()) style="display: none" @endif>
                <x-nq::states icon="list-checks" :title="$l['none']" :description="$l['noneBody']" />
            </div>
            @if ($rs->isNotEmpty())
                <ol class="flex max-h-[40rem] flex-col divide-y divide-border overflow-y-auto rounded-control border border-border" x-show="shown !== 0">
                    @foreach ($rs as $r)
                        @php($rid = (string) $r['id'])
                        <li data-run-row="{{ $rid }}" x-show="visible(@js($rid))" x-bind:class="selected === @js($rid) ? 'bg-nq-selected' : ''">
                            <button type="button" x-bind:aria-pressed="selected === @js($rid) ? 'true' : 'false'" x-on:click="toggle(@js($rid))"
                                class="flex w-full items-center gap-3 px-3 py-2.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                                {!! $glyph($r['status'] ?? 'idle', 'size-5', $statusNames[$r['status'] ?? 'idle'] ?? '') !!}
                                <span class="min-w-0 flex-1">
                                    <span class="block truncate text-label text-foreground">{{ $r['name'] ?? $l['unnamed'] }}</span>
                                    <span class="block truncate text-caption text-muted-foreground">
                                        <x-nq::numeric.date-time :value="$r['startedAt']" relative />
                                        @if (! empty($r['trigger'])) · {{ $r['trigger'] }}@endif
                                    </span>
                                </span>
                                <span class="shrink-0 text-caption text-muted-foreground tabular-nums" dir="ltr">{{ $dur($length($r)) }}</span>
                            </button>
                        </li>
                    @endforeach
                </ol>
            @endif
        @endif
    </section>

    <section x-bind:class="selected === null ? 'hidden lg:block' : ''" aria-label="{{ $l['pick'] }}" class="min-w-0 rounded-card border border-border bg-card p-4">
        <div x-show="selected === null" @if ($startId !== null) style="display: none" @endif>
            <x-nq::states icon="list-checks" :title="$l['pick']" :description="$l['pickBody']" />
        </div>
        @foreach ($rs as $r)
            <div x-show="selected === @js((string) $r['id'])" @if ($startId !== (string) $r['id']) style="display: none" @endif>
                <x-nq::run-history.detail :run="$r" :retryable="$retryable" :cancellable="$cancellable" :labels="$labels">
                    <x-slot:leading>
                        <x-nq::button variant="ghost" size="icon-sm" class="lg:hidden" aria-label="{{ $l['back'] }}" title="{{ $l['back'] }}" x-on:click="toggle(null)">
                            <x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" />
                        </x-nq::button>
                    </x-slot:leading>
                </x-nq::run-history.detail>
            </div>
        @endforeach
    </section>
</div>
