{{-- <x-nq::engine-details :snapshot="['engine' => 'hydration', 'state' => 'idle', 'totalMl' => 1500, 'dailyCapMl' => 5000, 'unitMl' => 250, 'unitsLogged' => 6, 'unitsTotal' => 20]" :history="$history" :windows="[7, 30, 365]" :records="[...]" back-href="/health" />
     One protocol engine's own page: its live card, then for the engines that judge days (hydration, caffeine, GERD) a window switch, counts of days on
     protocol, off it and not judged, current and best streaks, a chart and a strip of every day; then the engine's record as a timeline and the fixed
     protocol it follows. Counts and verdicts only, never a rate. snapshot: the server's decision (keys as in the React EngineSnapshot). history: array of
     ['date' => 'YYYY-MM-DD', 'verdict' => on_protocol|off_protocol|unevaluated, 'entries' => n], OLDEST first, one per day. history-loading, history-error
     (the server's message), retry (draws the retry button; dispatches "nq-retry"). windows: default [7, 30, 365]; window-days: the applied window.
     Choosing a window dispatches a bubbling "nq-window-change" event ({ days }) for the host to load. records: array of ['id', 'at', 'title', 'detail',
     'tone' => neutral|info|success|warning|danger], newest first. actions draws the live card's log buttons (nq-engine-action, see engine-card). now:
     fixed time for countdowns. back-href: omit to hide the link. The default slot sits under the record. labels: array overriding the built-in words. --}}
@include('nasaq::components.engine-card._health')
@include('nasaq::components.engine-details._logic')
@props(['snapshot', 'now' => null, 'actions' => false, 'history' => null, 'historyLoading' => false, 'historyError' => null, 'retry' => false, 'windows' => [7, 30, 365], 'windowDays' => null, 'records' => null, 'backHref' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_ed_words($locale, $labels);
    $engine = $snapshot['engine'];
    $meta = $t['engines'][$engine];
    $engineIcon = ['hydration' => 'droplets', 'caffeine' => 'coffee', 'gerd' => 'bed-double', 'medication' => 'pill', 'triggers' => 'utensils', 'cycle' => 'calendar-heart', 'contraceptive' => 'calendar-clock'];
    $judges = in_array($engine, ['hydration', 'caffeine', 'gerd'], true);
    $headingId = 'nq-engine-details-'.$engine;
    $days = array_values($history ?? []);
    $active = (int) ($windowDays ?? (count($days) ?: ($windows[0] ?? 30)));
    $toneMark = ['neutral' => ['circle-minus', 'text-muted-foreground'], 'info' => ['circle-dashed', 'text-nq-info-text'], 'success' => ['circle-check', 'text-nq-success-text'], 'warning' => ['circle-alert', 'text-nq-warning-text'], 'danger' => ['circle-x', 'text-nq-danger-text']];
    $totals = nq_ed_summarise($days);
    $daily = count($days) <= 31;
    $summary = sprintf($t['chartSummary'], count($days));
    $dayCount = fn ($n) => '<bdi data-slot="measure" data-numeric="" dir="ltr" class="tabular-nums [unicode-bidi:isolate]">'.e(nq_ed_long($n, 'day', $locale)).'</bdi>';
    $measure = fn ($n, $unit, $long = false) => '<bdi data-slot="measure" data-numeric="" dir="ltr" class="tabular-nums [unicode-bidi:isolate]">'.e($long ? nq_ed_long($n, $unit, $locale) : nq_health_measure_text($n, $unit, $locale, $t)).'</bdi>';
    $P = nq_ed_protocol()[$engine];
    $rows = match ($engine) {
        'hydration' => [[$t['unit'], $measure($P['unitMl'], 'milliliter')], [$t['dailyCap'], $measure($P['dailyCapMl'], 'milliliter')], [$t['cooldown'], $measure($P['cooldownSeconds'], 'second', true)]],
        'caffeine' => [[$t['blockAfterWake'], $measure($P['blockMinutes'], 'minute', true)]],
        'gerd' => [[$t['windowBeforeSleep'], $measure($P['windowHours'], 'hour', true)], [$t['allowedInside'], e(implode(' · ', array_map(fn ($i) => $t['whitelist'][$i] ?? $i, $P['whitelist'])))]],
        'medication' => [[$t['graceWindow'], $measure($P['graceMinutes'], 'minute', true)]],
        'triggers' => [[$t['familiesLabel'], e(implode(' · ', array_map(fn ($i) => $t['families'][$i] ?? $i, $P['families'])))]],
        'cycle' => [
            [$t['minCycles'], $measure($P['minCycles'], 'cycles')],
            [$t['irregularSpread'], $measure($P['irregularSpreadDays'], 'day', true)],
            [$t['ovulationBefore'], $measure($P['ovulationBeforeNextStartDays'], 'day', true)],
            [$t['fertileWindow'], e(sprintf($t['fertileWindowValue'], nq_ed_long($P['fertileOpensBeforeOvulationDays'], 'day', $locale), nq_ed_long($P['fertileClosesAfterOvulationDays'], 'day', $locale)))],
        ],
        'contraceptive' => [[$t['methodsLabel'], e(implode(' · ', array_map(fn ($i) => $t['methods'][$i] ?? $i, $P['methods'])))]],
    };
@endphp
<div data-slot="engine-details" data-engine="{{ $engine }}" x-data="nqEngineDetails(@js($active))" {{ $attributes->cn('mx-auto flex w-full max-w-4xl flex-col gap-8') }}>
    <header class="flex flex-col gap-4">
        @if ($backHref)
            <a href="{{ $backHref }}" data-slot="engine-details-back" class="{{ \Nasaq\Cn::merge('inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control px-3 text-label text-foreground transition-colors hover:bg-accent [&_svg]:size-4', '-ms-2.5 w-fit') }}">
                <x-lucide-chevron-left aria-hidden="true" class="rtl:-scale-x-100" />
                {{ $t['back'] }}
            </a>
        @endif
        <div class="flex items-center gap-4">
            <span aria-hidden="true" class="grid size-14 shrink-0 place-items-center rounded-card bg-secondary text-muted-foreground [&_svg]:size-7"><x-dynamic-component :component="'lucide-'.$engineIcon[$engine]" /></span>
            <div class="flex min-w-0 flex-col gap-1">
                <h1 id="{{ $headingId }}" class="text-h1 text-foreground">{{ $meta['title'] }}</h1>
                <p class="text-pretty text-body text-muted-foreground">{{ $t['lede'] }}</p>
            </div>
        </div>
    </header>

    <x-nq::engine-card :snapshot="$snapshot" :now="$now" :actions="$actions" hide-title heading-as="h2" :locale="$locale" :labels="$labels" />

    @if ($judges)
        <section aria-labelledby="{{ $headingId }}-history" class="flex flex-col gap-4">
            <x-nq::section-header :heading-id="$headingId.'-history'" :title="$t['history']" :description="$t['historyDescription']">
                <x-slot:action>
                    <x-nq::toggle-group :aria-label="$t['windowLabel']" :default-value="[(string) $active]" x-model="selected">
                        @foreach ($windows as $w)
                            <x-nq::toggle-group.toggle :value="(string) $w">{{ sprintf($t['windowOption'], $w) }}</x-nq::toggle-group.toggle>
                        @endforeach
                    </x-nq::toggle-group>
                </x-slot:action>
            </x-nq::section-header>

            @if ($historyLoading)
                <div aria-busy="true" data-slot="engine-details-history-skeleton" class="flex flex-col gap-3">
                    <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">@for ($i = 0; $i < 5; $i++)<x-nq::states.skeleton class="h-20" />@endfor</div>
                    <x-nq::states.skeleton class="h-48" />
                </div>
            @elseif ($historyError)
                <x-nq::states.error :title="$t['loadError']" :description="$historyError">
                    @if ($retry)
                        <x-slot:actions><x-nq::button variant="secondary" size="sm" x-on:click="retry()">{{ $t['retry'] }}</x-nq::button></x-slot:actions>
                    @endif
                </x-nq::states.error>
            @elseif (count($days) === 0)
                <x-nq::states.empty icon="route" :title="$t['noHistory']" :description="$t['noHistoryHint']" />
            @else
                <div class="flex flex-col gap-4">
                    <x-nq::stat-card.grid>
                        <x-nq::stat-card :label="$t['onProtocol']"><x-slot:icon><x-lucide-circle-check /></x-slot:icon>{!! $dayCount($totals['daysOnProtocol']) !!}</x-nq::stat-card>
                        <x-nq::stat-card :label="$t['offProtocol']"><x-slot:icon><x-lucide-circle-x /></x-slot:icon>{!! $dayCount($totals['daysOffProtocol']) !!}</x-nq::stat-card>
                        <x-nq::stat-card :label="$t['unevaluated']"><x-slot:icon><x-lucide-circle-dashed /></x-slot:icon>{!! $dayCount($totals['daysUnevaluated']) !!}</x-nq::stat-card>
                        <x-nq::stat-card :label="$t['currentStreak']">{!! $dayCount($totals['currentStreak']) !!}</x-nq::stat-card>
                        <x-nq::stat-card :label="$t['bestStreak']">{!! $dayCount($totals['bestStreak']) !!}</x-nq::stat-card>
                    </x-nq::stat-card.grid>

                    <x-nq::card>
                        <x-nq::card.header>
                            <x-nq::card.title as="h3" class="text-h3">{{ $daily ? $t['entriesChart'] : $t['weeklyChart'] }}</x-nq::card.title>
                            <x-nq::card.description>{{ $summary }}</x-nq::card.description>
                        </x-nq::card.header>
                        <x-nq::card.content class="flex flex-col gap-4">
                            @if ($daily)
                                <x-nq::engine-details.history-chart
                                    :config="['entries' => ['label' => $t['entries'], 'color' => 'var(--primary)']]"
                                    :bars="array_map(fn ($d) => ['label' => nq_ed_civil($d['date'], $locale, 'short'), 'values' => ['entries' => $d['entries']]], $days)"
                                    :label="$t['entriesChart'].'. '.$summary" />
                            @else
                                <x-nq::engine-details.history-chart stacked class="h-56"
                                    :config="['onProtocol' => ['label' => $t['verdicts']['on_protocol'], 'color' => 'var(--nq-success)'], 'offProtocol' => ['label' => $t['verdicts']['off_protocol'], 'color' => 'var(--nq-danger)'], 'unevaluated' => ['label' => $t['verdicts']['unevaluated'], 'color' => 'var(--nq-line)']]"
                                    :bars="array_map(fn ($w) => ['label' => nq_ed_civil($w['start'], $locale, 'short'), 'values' => ['onProtocol' => $w['onProtocol'], 'offProtocol' => $w['offProtocol'], 'unevaluated' => $w['unevaluated']]], nq_ed_bucket($days))"
                                    :label="$t['weeklyChart'].'. '.$summary" />
                            @endif
                            <div class="flex flex-col gap-2">
                                <span class="text-label text-foreground">{{ $t['strip'] }}</span>
                                <x-nq::engine-details.history-strip :days="$days" :locale="$locale" :labels="$labels" />
                                <x-nq::engine-details.history-legend :locale="$locale" :labels="$labels" />
                            </div>
                        </x-nq::card.content>
                    </x-nq::card>
                </div>
            @endif
        </section>
    @else
        <x-nq::states.empty icon="flame" :title="$t['noLedger']" :description="$t['noLedgerHint']" class="py-8" />
    @endif

    <section aria-labelledby="{{ $headingId }}-record" class="flex flex-col gap-4">
        <x-nq::section-header :heading-id="$headingId.'-record'" :title="$t['record']" :description="$t['recordDescription']" />
        @if ($records && count($records) > 0)
            <x-nq::card>
                <x-nq::card.content>
                    <x-nq::timeline>
                        @foreach ($records as $entry)
                            @php $mark = $toneMark[$entry['tone'] ?? 'neutral']; @endphp
                            <x-nq::timeline.item :title="$entry['title']" :description="$entry['detail'] ?? null" :time="$entry['at']">
                                <x-slot:icon><x-dynamic-component :component="'lucide-'.$mark[0]" aria-hidden="true" class="{{ $mark[1] }}" /></x-slot:icon>
                            </x-nq::timeline.item>
                        @endforeach
                    </x-nq::timeline>
                </x-nq::card.content>
            </x-nq::card>
        @else
            <x-nq::states.empty :title="$t['noRecord']" class="py-8" />
        @endif
        {{ $slot }}
    </section>

    <section aria-labelledby="{{ $headingId }}-protocol" class="flex flex-col gap-4">
        <x-nq::section-header :heading-id="$headingId.'-protocol'" :title="$t['protocol']" :description="$t['protocolDescription']" />
        <x-nq::card>
            <x-nq::card.content>
                <dl class="m-0 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    @foreach ($rows as [$label, $value])
                        <div class="flex min-w-0 flex-col gap-0.5 border-b border-border pb-3 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
                            <dt class="text-caption text-muted-foreground">{{ $label }}</dt>
                            <dd class="m-0 text-body-sm font-medium text-foreground">{!! $value !!}</dd>
                        </div>
                    @endforeach
                </dl>
            </x-nq::card.content>
        </x-nq::card>
    </section>

    <p class="text-caption text-muted-foreground">{{ $t['disclaimer'] }}</p>
</div>
