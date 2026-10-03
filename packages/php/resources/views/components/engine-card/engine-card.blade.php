{{-- <x-nq::engine-card :snapshot="['engine' => 'hydration', 'state' => 'idle', 'totalMl' => 750, 'dailyCapMl' => 5000, 'unitMl' => 250, 'unitsLogged' => 3, 'unitsTotal' => 20]" actions detail-href="/engines/hydration" />
     One protocol engine's live state: name, a state badge (icon and words), the engine readout and its log action. Seven engines, one card.
     snapshot: the server's decision, keys as in the React EngineSnapshot (engine: hydration | caffeine | gerd | medication | triggers | cycle | contraceptive, state, ...).
     The card computes no protocol state. now: fixed time for countdowns (default: the clock at render, no live tick). actions draws the log buttons;
     a click dispatches a bubbling "nq-engine-action" event with { engine, kind, doseId, wait(promise) }. A listener hands wait() a promise that
     resolves with nothing or { error }: the buttons stay busy until it settles and the error shows as-is.
     detail-href links the engine page. heading-as: h2 | h3 (default) | h4. loading shows a skeleton. hide-title shows only the state.
     labels: array overriding the built-in words (one level deep, e.g. ['states' => ['hydration.idle' => 'Go']]). --}}
@include('nasaq::components.engine-card._health')
@props(['snapshot', 'now' => null, 'actions' => false, 'detailHref' => null, 'headingAs' => 'h3', 'loading' => false, 'hideTitle' => false, 'labels' => [], 'locale' => null, 'titleId' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_health_words($locale, $labels);
    $s = $snapshot;
    $engine = $s['engine'];
    $meta = $t['engines'][$engine];
    $tone = nq_health_tone($s);
    $stateKey = nq_health_state_key($s);
    $stateLabel = $t['states'][$engine.'.'.$stateKey] ?? $stateKey;
    $titleId ??= 'nq-engine-'.$engine.'-title';
    $toneIcon = ['neutral' => 'circle-minus', 'info' => 'circle-dot', 'success' => 'circle-check', 'warning' => 'circle-alert', 'danger' => 'circle-x'];
    // The badge classes of x-nq::badge by tone; the badge component cannot take a second data-slot.
    $toneBadge = ['neutral' => 'border-border bg-secondary text-foreground', 'info' => 'border-nq-info/40 bg-nq-info-soft text-nq-info-text', 'success' => 'border-nq-success/40 bg-nq-success-soft text-nq-success-text', 'warning' => 'border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text', 'danger' => 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text'];
    $engineIcon =['hydration' => 'droplets', 'caffeine' => 'coffee', 'gerd' => 'bed-double', 'medication' => 'pill', 'triggers' => 'utensils', 'cycle' => 'calendar-heart', 'contraceptive' => 'calendar-clock'];
    $doseIcon = ['scheduled' => 'clock', 'grace_open' => 'timer', 'logged' => 'circle-check', 'late_logged' => 'circle-alert', 'missed' => 'circle-minus'];
    $m = fn ($v, $unit, $frac = 0) => "\u{2066}".nq_health_measure_text($v, $unit, $locale, $t, $frac)."\u{2069}";
    $dur = fn (int $sec) => "\u{2066}".nq_health_duration($sec, $locale)."\u{2069}";
    $fmt = fn (string $tpl, ...$args) => sprintf($tpl, ...$args);
    $time = function ($value) use ($locale) {
        $d = nq_health_date($value);
        if (! class_exists(\IntlDateFormatter::class)) {
            return $d->format('H:i');
        }

        return (new \IntlDateFormatter(str_replace('_', '-', $locale).'@numbers=latn', \IntlDateFormatter::NONE, \IntlDateFormatter::SHORT, $d->getTimezone()->getName() === 'Z' ? 'UTC' : $d->getTimezone()->getName()))->format($d);
    };
    $day = function ($value) use ($locale) {
        $d = nq_health_date($value);
        if (! class_exists(\IntlDateFormatter::class)) {
            return $d->format('M j');
        }
        $f = new \IntlDateFormatter(str_replace('_', '-', $locale).'@numbers=latn', \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, $d->getTimezone()->getName() === 'Z' ? 'UTC' : $d->getTimezone()->getName(), null, 'd MMM');

        return $f->format($d);
    };
    $measure = fn ($v, $unit, $frac = 0) => '<bdi data-slot="measure" data-numeric="" dir="ltr" class="tabular-nums [unicode-bidi:isolate]">'.e(nq_health_measure_text($v, $unit, $locale, $t, $frac)).'</bdi>';

    $hydrationWait = $engine === 'hydration' && $s['state'] === 'cooldown' ? nq_health_seconds_until($s['nextAllowedAt'] ?? null, $now) : 0;
    $total = $engine === 'caffeine' ? $s['blockMinutes'] * 60 : 0;
    $caffeineLeft = $engine === 'caffeine' && $s['state'] === 'blocked' ? min($total, nq_health_seconds_until($s['blockEndsAt'] ?? null, $now)) : 0;
    $gerdLeft = $engine === 'gerd' && $s['state'] === 'window_active' ? nq_health_seconds_until($s['windowEndsAt'] ?? null, $now) : 0;
    $sum = $engine === 'medication' ? nq_health_summarise_medication($s['doses']) : null;
    $showFooter = $actions || $detailHref;
@endphp
<div data-slot="engine-card" data-engine="{{ $engine }}" data-state="{{ $stateKey }}" data-tone="{{ $tone }}"
    @if ($hideTitle) aria-label="{{ $meta['title'] }}" @else aria-labelledby="{{ $titleId }}" @endif
    @if ($actions) data-error-text="{{ $t['noSnapshot'] }}" x-data="nqEngineCard" @endif @if ($loading) aria-busy="true" @endif
    {{ $attributes->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground min-w-0') }}>
    @if ($loading)
        <div data-slot="engine-card-skeleton" class="flex flex-col gap-3 px-4">
            <x-nq::states.skeleton class="h-5 w-40" />
            <x-nq::states.skeleton class="h-3.5 w-56" />
            <x-nq::states.skeleton class="h-8 w-32" />
            <x-nq::states.skeleton class="h-2 w-full" />
        </div>
    @else
        <x-nq::card.header :class="$hideTitle ? 'grid-cols-[1fr_auto]' : null">
            @if ($hideTitle)
                <span class="text-label text-muted-foreground">{{ $t['stateLabel'] }}</span>
            @else
                <div class="flex min-w-0 items-start gap-3">
                    <span aria-hidden="true" data-slot="engine-card-icon" class="grid size-9 shrink-0 place-items-center rounded-control bg-secondary text-muted-foreground [&_svg]:size-4.5">
                        <x-dynamic-component :component="'lucide-'.$engineIcon[$engine]" />
                    </span>
                    <div class="flex min-w-0 flex-col gap-0.5">
                        <x-nq::card.title :as="$headingAs" id="{{ $titleId }}" class="text-h3 text-foreground">{{ $meta['title'] }}</x-nq::card.title>
                        <x-nq::card.description class="text-pretty text-body-sm">{{ $meta['subtitle'] }}</x-nq::card.description>
                    </div>
                </div>
            @endif
            <x-nq::card.action>
                <span data-slot="engine-card-state" title="{{ $t['stateLabel'] }}" class="{{ \Nasaq\Cn::merge('inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3', $toneBadge[$tone]) }}">
                    <x-dynamic-component :component="'lucide-'.$toneIcon[$tone]" aria-hidden="true" />
                    {{ $stateLabel }}
                </span>
            </x-nq::card.action>
        </x-nq::card.header>

        <x-nq::card.content class="flex flex-col gap-4">
            @if ($engine === 'hydration')
                <div class="flex flex-col gap-3">
                    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span data-slot="engine-card-value" class="text-h2 leading-tight text-foreground">{!! $measure($s['totalMl'], 'milliliter') !!}</span>
                        <span class="text-body-sm text-muted-foreground">{{ $t['ofCap'] }} {!! $measure($s['dailyCapMl'], 'milliliter') !!}</span>
                    </div>
                    <x-nq::progress.meter :label="$t['unitsToday']" :value="$s['unitsLogged']" :max="$s['unitsTotal']" :tone="$s['state'] === 'capped' ? 'success' : 'default'"
                        :value-text="$m($s['unitsLogged'], 'cups').' / '.$m($s['unitsTotal'], 'cups')" />
                    <ol aria-hidden="true" data-slot="engine-card-units" class="m-0 flex list-none flex-wrap gap-1 p-0">
                        @for ($i = 0; $i < $s['unitsTotal']; $i++)
                            <li class="{{ \Nasaq\Cn::merge('size-3.5 rounded-full border', $i < $s['unitsLogged'] ? 'border-primary bg-primary' : 'border-border bg-transparent') }}"></li>
                        @endfor
                    </ol>
                </div>
            @elseif ($engine === 'caffeine')
                <div class="flex flex-col gap-3">
                    @if ($s['state'] === 'awaiting_wake')
                        <p class="text-body-sm text-muted-foreground">{{ $t['blockWaiting'] }}</p>
                    @else
                        <x-nq::progress.meter :label="$t['blockProgress']" :value="$total - $caffeineLeft" :max="$total" :tone="$s['state'] === 'blocked' ? 'warning' : 'success'" show-value
                            :value-text="$caffeineLeft > 0 ? $fmt($t['blockLeft'], $dur($caffeineLeft)) : $t['blockOver']" />
                    @endif
                    <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
                        <div data-slot="engine-card-fact" class="flex min-w-0 flex-col gap-0.5">
                            <dt class="text-caption text-muted-foreground">{{ $t['cupsToday'] }}</dt>
                            <dd class="m-0 text-body-sm font-medium text-foreground">
                                @if (! empty($s['cupsAllowed']))
                                    {{ $fmt($t['cupsOf'], (string) $s['cupsToday'], (string) $s['cupsAllowed']) }}
                                @else
                                    {!! $measure($s['cupsToday'], 'cups') !!}
                                @endif
                            </dd>
                        </div>
                        <div data-slot="engine-card-fact" class="flex min-w-0 flex-col gap-0.5">
                            <dt class="text-caption text-muted-foreground">{{ $t['violations'] }}</dt>
                            <dd class="m-0 text-body-sm font-medium text-foreground">{!! $measure($s['violationsToday'], 'level') !!}</dd>
                        </div>
                    </dl>
                </div>
            @elseif ($engine === 'gerd')
                <div class="flex flex-col gap-3">
                    @if (! empty($s['windowStartsAt']) && ! empty($s['windowEndsAt']))
                        <div class="flex flex-wrap items-baseline gap-x-2">
                            <x-lucide-clock aria-hidden="true" class="size-4 self-center text-muted-foreground" />
                            <span data-slot="engine-card-value" class="text-h3 text-foreground"><bdi dir="ltr" class="tabular-nums">{{ $fmt($t['windowRange'], $time($s['windowStartsAt']), $time($s['windowEndsAt'])) }}</bdi></span>
                            @if ($gerdLeft > 0)
                                <span class="text-body-sm text-muted-foreground">{{ $fmt($t['windowLeft'], $dur($gerdLeft)) }}</span>
                            @endif
                        </div>
                    @else
                        <p class="text-body-sm text-muted-foreground">{{ $t['windowNone'] }}</p>
                    @endif
                    <div class="flex flex-col gap-1.5">
                        <span class="text-caption text-muted-foreground">{{ $t['allowedInside'] }}</span>
                        <ul class="m-0 flex list-none flex-wrap gap-1.5 p-0">
                            @foreach ($s['whitelist'] as $item)
                                <li><x-nq::badge variant="outline">{{ $t['whitelist'][$item] ?? $item }}</x-nq::badge></li>
                            @endforeach
                        </ul>
                    </div>
                    <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
                        <div data-slot="engine-card-fact" class="flex min-w-0 flex-col gap-0.5">
                            <dt class="text-caption text-muted-foreground">{{ $t['gerdViolations'] }}</dt>
                            <dd class="m-0 text-body-sm font-medium text-foreground">{!! $measure($s['violationsToday'], 'level') !!}</dd>
                        </div>
                        <div data-slot="engine-card-fact" class="flex min-w-0 flex-col gap-0.5">
                            <dt class="text-caption text-muted-foreground">{{ $t['needsReview'] }}</dt>
                            <dd class="m-0 text-body-sm font-medium text-foreground">{!! $measure($s['needsReviewToday'], 'level') !!}</dd>
                        </div>
                    </dl>
                </div>
            @elseif ($engine === 'medication')
                @if (count($s['doses']) === 0)
                    <p class="text-body-sm text-muted-foreground">{{ $t['noDoses'] }}</p>
                @else
                    <div class="flex flex-col gap-3">
                        <div class="flex flex-wrap items-baseline gap-x-2">
                            <span data-slot="engine-card-value" class="text-h2 leading-tight text-foreground">{!! $measure($sum['logged'] + $sum['lateLogged'], 'level') !!}</span>
                            <span class="text-body-sm text-muted-foreground">{{ $t['ofCap'] }} {!! $measure($sum['total'], 'level') !!} · {{ $t['logged'] }}</span>
                        </div>
                        <ul class="m-0 flex list-none flex-col divide-y divide-border p-0" data-slot="engine-card-doses">
                            @foreach ($s['doses'] as $dose)
                                <li class="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                                    <div class="flex min-w-0 flex-col">
                                        <span class="truncate text-body-sm font-medium text-foreground">{{ $dose['name'] }}</span>
                                        <span class="text-caption text-muted-foreground"><bdi dir="ltr" class="tabular-nums">{{ $time($dose['scheduledFor']) }}</bdi></span>
                                    </div>
                                    <div class="flex shrink-0 items-center gap-2">
                                        <x-nq::status :tone="nq_health_dose_tone($dose['status'])" :icon="$doseIcon[$dose['status']]">{{ $t['doseStatus'][$dose['status']] }}</x-nq::status>
                                        @if ($actions && in_array($dose['status'], ['grace_open', 'missed'], true))
                                            <x-nq::button size="sm" variant="secondary" x-on:click="act('log_dose', '{{ $dose['id'] }}')" x-bind:disabled="busy"
                                                x-bind:data-disabled="busy ? '' : null" x-bind:aria-busy="pending === 'log_dose:{{ $dose['id'] }}' ? 'true' : null">{{ $t['logDose'] }}</x-nq::button>
                                        @endif
                                    </div>
                                </li>
                            @endforeach
                        </ul>
                        <p class="text-caption text-muted-foreground">{{ $fmt($t['graceNote'], $dur($s['graceMinutes'] * 60)) }}</p>
                        <p class="text-caption text-muted-foreground">{{ $t['consult'] }}</p>
                    </div>
                @endif
            @elseif ($engine === 'triggers')
                <div class="flex flex-col gap-3">
                    <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
                        @foreach ([['triggerBearing', 'triggerBearing'], ['safe', 'safe'], ['unclassified', 'unclassified']] as [$label, $key])
                            <div data-slot="engine-card-fact" class="flex min-w-0 flex-col gap-0.5">
                                <dt class="text-caption text-muted-foreground">{{ $t[$label] }}</dt>
                                <dd class="m-0 text-body-sm font-medium text-foreground"><span class="text-h3">{!! $measure($s[$key], 'level') !!}</span></dd>
                            </div>
                        @endforeach
                    </dl>
                    @if (count($s['families']))
                        <div class="flex flex-col gap-1.5">
                            <span class="text-caption text-muted-foreground">{{ $t['byFamily'] }}</span>
                            <ul class="m-0 flex list-none flex-wrap gap-1.5 p-0">
                                @foreach ($s['families'] as $f)
                                    <li><x-nq::badge variant="outline">{{ $t['families'][$f['id']] ?? $f['id'] }} {!! $measure($f['count'], 'level') !!}</x-nq::badge></li>
                                @endforeach
                            </ul>
                        </div>
                    @endif
                    @if ($s['unclassified'] > 0)
                        <p class="text-caption text-muted-foreground">{{ $t['unclassifiedNote'] }}</p>
                    @endif
                </div>
            @elseif ($engine === 'cycle')
                <div class="flex flex-col gap-3">
                    @if ($s['state'] !== 'calibrated')
                        <x-nq::progress.meter :label="$t['calibration']" :value="min($s['countableCycles'], $s['minCycles'])" :max="$s['minCycles']" tone="default" :value-text="$m($s['countableCycles'], 'level')" />
                    @endif
                    @if (! empty($s['prediction']))
                        <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
                            <div data-slot="engine-card-fact" class="flex min-w-0 flex-col gap-0.5">
                                <dt class="text-caption text-muted-foreground">{{ $t['nextStart'] }}</dt>
                                <dd class="m-0 text-body-sm font-medium text-foreground"><x-nq::numeric.date-time :value="nq_health_date($s['prediction']['nextStart'])" date-style="medium" /></dd>
                            </div>
                            <div data-slot="engine-card-fact" class="flex min-w-0 flex-col gap-0.5">
                                <dt class="text-caption text-muted-foreground">{{ $t['ovulation'] }}</dt>
                                <dd class="m-0 text-body-sm font-medium text-foreground"><x-nq::numeric.date-time :value="nq_health_date($s['prediction']['ovulation'])" date-style="medium" /></dd>
                            </div>
                            <div data-slot="engine-card-fact" class="flex min-w-0 flex-col gap-0.5 col-span-2">
                                <dt class="text-caption text-muted-foreground">{{ $t['fertile'] }}</dt>
                                <dd class="m-0 text-body-sm font-medium text-foreground"><bdi class="tabular-nums">{{ $fmt($t['fertileRange'], $day($s['prediction']['fertileFrom']), $day($s['prediction']['fertileTo'])) }}</bdi></dd>
                            </div>
                        </dl>
                    @else
                        <div class="flex flex-col gap-1">
                            <span class="text-h3 text-foreground">{{ $t['unavailable'] }}</span>
                            @if (! empty($s['reason']))
                                <p class="text-body-sm text-muted-foreground">{{ $t['reasons'][$s['reason']] ?? '' }}</p>
                            @endif
                        </div>
                    @endif
                    @if (! empty($s['averageLengthDays']))
                        <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
                            <div data-slot="engine-card-fact" class="flex min-w-0 flex-col gap-0.5">
                                <dt class="text-caption text-muted-foreground">{{ $t['average'] }}</dt>
                                <dd class="m-0 text-body-sm font-medium text-foreground">{!! $measure($s['averageLengthDays'], 'day', 1) !!}</dd>
                            </div>
                        </dl>
                    @endif
                    <p class="text-caption text-muted-foreground">{{ ! empty($s['prediction']) ? $t['predictionNote'] : $t['consult'] }}</p>
                </div>
            @elseif ($engine === 'contraceptive')
                @if ($s['state'] === 'unconfigured')
                    <p class="text-body-sm text-muted-foreground">{{ $t['unconfiguredNote'] }}</p>
                @else
                    <div class="flex flex-col gap-3">
                        <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
                            @if (! empty($s['method']))
                                <div data-slot="engine-card-fact" class="flex min-w-0 flex-col gap-0.5">
                                    <dt class="text-caption text-muted-foreground">{{ $t['method'] }}</dt>
                                    <dd class="m-0 text-body-sm font-medium text-foreground">{{ $t['methods'][$s['method']] ?? $s['method'] }}</dd>
                                </div>
                            @endif
                            @if (! empty($s['nextDueAt']))
                                <div data-slot="engine-card-fact" class="flex min-w-0 flex-col gap-0.5">
                                    <dt class="text-caption text-muted-foreground">{{ $t['nextDue'] }}</dt>
                                    <dd class="m-0 text-body-sm font-medium text-foreground"><x-nq::numeric.date-time :value="nq_health_date($s['nextDueAt'])" date-style="medium" /></dd>
                                </div>
                            @endif
                            @if (! empty($s['lastRecordedAt']))
                                <div data-slot="engine-card-fact" class="flex min-w-0 flex-col gap-0.5">
                                    <dt class="text-caption text-muted-foreground">{{ $t['lastRecorded'] }}</dt>
                                    <dd class="m-0 text-body-sm font-medium text-foreground"><x-nq::numeric.date-time :value="nq_health_date($s['lastRecordedAt'])" relative /></dd>
                                </div>
                            @endif
                            @if (($s['daysOverdue'] ?? 0) > 0)
                                <div data-slot="engine-card-fact" class="flex min-w-0 flex-col gap-0.5">
                                    <dt class="text-caption text-muted-foreground">{{ $t['daysOverdue'] }}</dt>
                                    <dd class="m-0 text-body-sm font-medium text-foreground">{!! $measure($s['daysOverdue'], 'day') !!}</dd>
                                </div>
                            @endif
                        </dl>
                        @if ($s['state'] !== 'on_schedule')
                            <p class="text-body-sm text-foreground">{{ $t['consult'] }}</p>
                        @endif
                    </div>
                @endif
            @endif
            @if ($actions)
                <p role="alert" data-slot="engine-card-error" hidden x-show="error" x-text="error" class="flex items-start gap-2 rounded-control border border-nq-warning/30 bg-nq-warning-soft px-3 py-2 text-body-sm text-foreground"></p>
            @endif
        </x-nq::card.content>

        @if ($showFooter)
            <x-nq::card.footer class="flex flex-wrap items-center gap-2 px-4">
                @if ($actions && $engine === 'hydration')
                    @php $blocked = $s['state'] === 'capped' || $hydrationWait > 0; @endphp
                    <x-nq::button variant="primary" size="sm" :disabled="$blocked" x-on:click="act('log_unit')" x-bind:disabled="busy || {{ $blocked ? 'true' : 'false' }}" x-bind:data-disabled="(busy || {{ $blocked ? 'true' : 'false' }}) ? '' : null" x-bind:aria-busy="pending === 'log_unit:' ? 'true' : null">{{ $hydrationWait > 0 ? $fmt($t['wait'], $dur($hydrationWait)) : $t['logUnit'] }}</x-nq::button>
                @elseif ($actions && $engine === 'caffeine' && $s['state'] === 'awaiting_wake')
                    <x-nq::button variant="primary" size="sm" x-on:click="act('log_wake')" x-bind:disabled="busy" x-bind:data-disabled="busy ? '' : null" x-bind:aria-busy="pending === 'log_wake:' ? 'true' : null">{{ $t['logWake'] }}</x-nq::button>
                @elseif ($actions && $engine === 'contraceptive' && $s['state'] !== 'unconfigured')
                    <x-nq::button :variant="$s['state'] === 'on_schedule' ? 'secondary' : 'primary'" size="sm" x-on:click="act('record_dose')" x-bind:disabled="busy" x-bind:data-disabled="busy ? '' : null" x-bind:aria-busy="pending === 'record_dose:' ? 'true' : null">{{ $t['recordDose'] }}</x-nq::button>
                @endif
                @if ($detailHref)
                    <a data-slot="engine-card-details" href="{{ $detailHref }}" aria-describedby="{{ $titleId }}" class="{{ \Nasaq\Cn::merge('inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-foreground hover:bg-nq-hover h-control-sm px-2.5', 'ms-auto') }}">
                        {{ $t['details'] }}
                        <x-lucide-chevron-right aria-hidden="true" class="rtl:-scale-x-100" />
                    </a>
                @endif
            </x-nq::card.footer>
        @endif
    @endif
</div>
