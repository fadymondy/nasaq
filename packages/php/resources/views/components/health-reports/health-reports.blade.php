{{-- <x-nq::health-reports :days="$days" :engines="[['engine' => 'hydration', 'days' => $hydrationHistory]]" :period="30" export />
     A report over a period: averages that skip missing days, one chart per figure (water, steps, sleep, weight, resting heart rate; the toggle shows one
     at a time), meals and caffeine per day as stacked bars, and each day-judging engine's days on and off protocol with streaks. Counts and verdicts,
     never a score. days: array of ['date' => 'YYYY-MM-DD', 'waterMl', 'meals' => ['total','safe','unsafe'], 'caffeine' => ['total','sugar','clean'],
     'steps', 'sleepMinutes', 'restingHeartRate', 'weightKg', 'shutdownViolations'], oldest first; leave out what a device did not send. engines: array
     of ['engine' => 'hydration', 'days' => [['date', 'verdict', 'entries']]]. periods: default [7, 30, 90]; period: the applied one. Choosing a period
     dispatches a bubbling "nq-period-change" ({ days }) for the host to load. export: draw the Export button (dispatches "nq-export"; the host builds the
     file, see nq_hr_csv() for the CSV). export-error: the server's message. loading, error (the server's message), retry (draws the retry button;
     dispatches "nq-retry"). labels: array overriding the built-in words. --}}
@include('nasaq::components.engine-card._health')
@include('nasaq::components.engine-details._logic')
@include('nasaq::components.health-reports._logic')
@props(['days' => [], 'engines' => [], 'periods' => [7, 30, 90], 'period' => null, 'export' => false, 'exportError' => null, 'loading' => false, 'error' => null, 'retry' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = nq_hr_words($locale, $labels);
    $days = array_values($days);
    $active = (int) ($period ?? ($periods[0] ?? 30));
    $summary = nq_hr_summarise($days);
    $empty = count($days) === 0 || $summary['daysWithData'] === 0;
    $headingId = 'nq-health-report-'.substr(md5(json_encode($days).$active), 0, 8);
    $label = fn ($date) => nq_ed_civil($date, $locale, 'short');
    $measure = fn ($text) => '<bdi data-slot="measure" data-numeric="" dir="ltr" class="tabular-nums [unicode-bidi:isolate]">'.e($text).'</bdi>';
    $dayCount = fn ($n) => $measure(nq_ed_long($n, 'day', $locale));
    $none = '<span class="text-body-sm font-normal text-muted-foreground">'.e($t['notEnough']).'</span>';
    $avg = $summary['averages'];
    $metrics = [
        'waterMl' => ['droplets', false],
        'steps' => ['footprints', false],
        'sleepMinutes' => ['bed-double', false],
        'weightKg' => ['scale', true],
        'restingHeartRate' => ['heart', true],
    ];
    $hasMeals = count(array_filter($days, fn ($d) => isset($d['meals']))) > 0;
    $hasCaffeine = count(array_filter($days, fn ($d) => isset($d['caffeine']))) > 0;
    $judged = array_values(array_filter($engines, fn ($e) => count($e['days'] ?? []) > 0));
    $engineIcon = ['hydration' => 'droplets', 'caffeine' => 'coffee', 'gerd' => 'bed-double', 'medication' => 'pill', 'triggers' => 'utensils', 'cycle' => 'calendar-heart', 'contraceptive' => 'calendar-clock'];
    $stack = fn (string $a, string $b, string $ca, string $cb) => [$a => ['label' => $t[$a], 'color' => $ca], $b => ['label' => $t[$b], 'color' => $cb]];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'health-report') }}" role="region" aria-labelledby="{{ $headingId }}" x-data="nqHealthReport(@js($active))" {{ $attributes->except('data-slot')->cn('flex flex-col gap-6') }}>
    <header class="flex flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex min-w-0 flex-col gap-1">
                <h1 id="{{ $headingId }}" class="text-h1 text-foreground">{{ $t['title'] }}</h1>
                <p class="max-w-prose text-pretty text-body text-muted-foreground">{{ $t['lede'] }}</p>
            </div>
            @if ($export)
                <x-nq::button variant="secondary" :disabled="$loading || count($days) === 0" x-on:click="exportReport()">
                    <x-lucide-download aria-hidden="true" />
                    {{ $t['export'] }}
                </x-nq::button>
            @endif
        </div>
        @if ($exportError)
            <p role="alert" class="text-body-sm text-nq-danger-text">{{ $exportError }}</p>
        @endif
        <div class="flex flex-wrap items-center gap-2">
            <span class="text-label text-muted-foreground">{{ $t['period'] }}</span>
            <x-nq::toggle-group :aria-label="$t['period']" :default-value="[(string) $active]" x-model="selected">
                @foreach ($periods as $n)
                    <x-nq::toggle-group.toggle :value="(string) $n">{{ sprintf($t['periodOption'], $n) }}</x-nq::toggle-group.toggle>
                @endforeach
            </x-nq::toggle-group>
        </div>
    </header>

    @if ($loading)
        <div aria-busy="true" class="flex flex-col gap-4">
            <x-nq::stat-card.grid>@for ($i = 0; $i < 5; $i++)<x-nq::states.skeleton class="h-24" />@endfor</x-nq::stat-card.grid>
            <x-nq::states.skeleton class="h-64" />
        </div>
    @elseif ($error)
        <x-nq::states.error :title="$t['loadError']" :description="$error">
            @if ($retry)
                <x-slot:actions><x-nq::button variant="secondary" size="sm" x-on:click="retry()">{{ $t['retry'] }}</x-nq::button></x-slot:actions>
            @endif
        </x-nq::states.error>
    @elseif ($empty)
        <x-nq::states.empty :title="$t['empty']" :description="$t['emptyHint']" />
    @else
        <div class="flex flex-col gap-8">
            <section aria-labelledby="{{ $headingId }}-avg" class="flex flex-col gap-4">
                <x-nq::section-header as="h2" :heading-id="$headingId.'-avg'" :title="$t['averages']" :description="sprintf($t['averagesDescription'], $summary['daysWithData'])" />
                <x-nq::stat-card.grid>
                    <x-nq::stat-card :label="$t['avgWater']"><x-slot:icon><x-lucide-droplets /></x-slot:icon>{!! $avg['waterMl'] === null ? $none : $measure(nq_health_measure_text($avg['waterMl'], 'milliliter', $locale, $t)) !!}</x-nq::stat-card>
                    <x-nq::stat-card :label="$t['avgSteps']"><x-slot:icon><x-lucide-footprints /></x-slot:icon>{!! $avg['steps'] === null ? $none : $measure(nq_health_measure_text($avg['steps'], 'steps', $locale, $t)) !!}</x-nq::stat-card>
                    <x-nq::stat-card :label="$t['avgSleep']"><x-slot:icon><x-lucide-bed-double /></x-slot:icon>{!! $avg['sleepMinutes'] === null ? $none : $measure(nq_health_duration((int) round($avg['sleepMinutes'] * 60), $locale)) !!}</x-nq::stat-card>
                    <x-nq::stat-card :label="$t['avgHeartRate']"><x-slot:icon><x-lucide-heart /></x-slot:icon>{!! $avg['restingHeartRate'] === null ? $none : $measure(nq_health_measure_text($avg['restingHeartRate'], 'bpm', $locale, $t)) !!}</x-nq::stat-card>
                    <x-nq::stat-card :label="$t['weightChange']"><x-slot:icon><x-lucide-scale /></x-slot:icon>{!! $summary['weight'] === null ? $none : $measure(($summary['weight']['change'] > 0 ? '+' : '').nq_health_number($summary['weight']['change'], $locale, 1).' '.($ar ? 'كجم' : 'kg')) !!}</x-nq::stat-card>
                    <x-nq::stat-card :label="$t['shutdownDays']">{!! $dayCount($summary['daysWithShutdownViolations']) !!}</x-nq::stat-card>
                </x-nq::stat-card.grid>
            </section>

            <section aria-labelledby="{{ $headingId }}-trend" class="flex flex-col gap-4">
                <x-nq::section-header as="h2" :heading-id="$headingId.'-trend'" :title="$t['trend']" />
                <div class="overflow-x-auto pb-1">
                    <x-nq::toggle-group :aria-label="$t['metricPicker']" :default-value="['waterMl']" x-model="metric">
                        @foreach ($metrics as $key => [$icon])
                            <x-nq::toggle-group.toggle :value="$key"><x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />{{ $t['metrics'][$key] }}</x-nq::toggle-group.toggle>
                        @endforeach
                    </x-nq::toggle-group>
                </div>
                <x-nq::card>
                    <x-nq::card.content>
                        @foreach ($metrics as $key => [$icon, $line])
                            @php
                                $series = nq_hr_series($days, $key);
                                $hasSeries = count(array_filter($series, fn ($p) => $p['value'] !== null)) > 0;
                                $summaryText = sprintf($t['trendSummary'], $t['metrics'][$key], count($days));
                                $config = ['value' => ['label' => $t['metrics'][$key], 'color' => 'var(--primary)']];
                            @endphp
                            <div data-metric="{{ $key }}" @if ($key !== 'waterMl') x-cloak @endif x-show="metric[0] === '{{ $key }}'">
                                @if (! $hasSeries)
                                    <p class="py-10 text-center text-body-sm text-muted-foreground">{{ $t['noReadings'] }}</p>
                                @elseif ($line)
                                    <x-nq::health-reports.line-chart :config="$config" :label="$summaryText" :points="array_map(fn ($p) => ['label' => $label($p['date']), 'value' => $p['value']], $series)" />
                                @else
                                    <x-nq::engine-details.history-chart class="h-64" :config="$config" :label="$summaryText" :bars="array_map(fn ($p) => ['label' => $label($p['date']), 'values' => ['value' => $p['value'] ?? 0]], $series)" />
                                @endif
                            </div>
                        @endforeach
                    </x-nq::card.content>
                </x-nq::card>
            </section>

            @if ($hasMeals || $hasCaffeine)
                <section class="grid gap-4 lg:grid-cols-2">
                    @if ($hasMeals)
                        <x-nq::card>
                            <x-nq::card.header>
                                <x-nq::card.title as="h3" class="text-h3">{{ $t['meals'] }}</x-nq::card.title>
                                <x-nq::card.description>{{ $t['mealsDescription'] }}</x-nq::card.description>
                            </x-nq::card.header>
                            <x-nq::card.content>
                                <x-nq::engine-details.history-chart stacked :config="$stack('safe', 'unsafe', 'var(--nq-success)', 'var(--nq-warning)')" :label="$t['meals'].', '.count($days)"
                                    :bars="array_map(fn ($d) => ['label' => $label($d['date']), 'values' => ['safe' => $d['meals']['safe'] ?? 0, 'unsafe' => $d['meals']['unsafe'] ?? 0]], $days)" />
                            </x-nq::card.content>
                        </x-nq::card>
                    @endif
                    @if ($hasCaffeine)
                        <x-nq::card>
                            <x-nq::card.header>
                                <x-nq::card.title as="h3" class="text-h3">{{ $t['caffeine'] }}</x-nq::card.title>
                                <x-nq::card.description>{{ $t['caffeineDescription'] }}</x-nq::card.description>
                            </x-nq::card.header>
                            <x-nq::card.content>
                                <x-nq::engine-details.history-chart stacked :config="$stack('clean', 'sugar', 'var(--nq-success)', 'var(--nq-warning)')" :label="$t['caffeine'].', '.count($days)"
                                    :bars="array_map(fn ($d) => ['label' => $label($d['date']), 'values' => ['clean' => $d['caffeine']['clean'] ?? 0, 'sugar' => $d['caffeine']['sugar'] ?? 0]], $days)" />
                            </x-nq::card.content>
                        </x-nq::card>
                    @endif
                </section>
            @endif

            @if (count($judged) > 0)
                <section aria-labelledby="{{ $headingId }}-adh" class="flex flex-col gap-4">
                    <x-nq::section-header as="h2" :heading-id="$headingId.'-adh'" :title="$t['adherence']" :description="$t['adherenceDescription']" />
                    <x-nq::card>
                        <x-nq::card.content>
                            <x-nq::table :label="$t['tableCaption']">
                                <x-nq::table.header>
                                    <x-nq::table.row>
                                        <x-nq::table.head>{{ $t['engine'] }}</x-nq::table.head>
                                        <x-nq::table.head>{{ $t['onProtocol'] }}</x-nq::table.head>
                                        <x-nq::table.head>{{ $t['offProtocol'] }}</x-nq::table.head>
                                        <x-nq::table.head>{{ $t['notJudged'] }}</x-nq::table.head>
                                        <x-nq::table.head>{{ $t['currentStreak'] }}</x-nq::table.head>
                                        <x-nq::table.head>{{ $t['bestStreak'] }}</x-nq::table.head>
                                    </x-nq::table.row>
                                </x-nq::table.header>
                                <x-nq::table.body>
                                    @foreach ($judged as $e)
                                        @php $totals = nq_ed_summarise(array_values($e['days'])); @endphp
                                        <x-nq::table.row :data-engine="$e['engine']">
                                            <x-nq::table.cell>
                                                <span class="inline-flex items-center gap-2 font-medium">
                                                    <x-dynamic-component :component="'lucide-'.$engineIcon[$e['engine']]" aria-hidden="true" class="size-4 text-muted-foreground" />
                                                    {{ $t['engines'][$e['engine']]['title'] }}
                                                </span>
                                            </x-nq::table.cell>
                                            <x-nq::table.cell>{!! $dayCount($totals['daysOnProtocol']) !!}</x-nq::table.cell>
                                            <x-nq::table.cell>{!! $dayCount($totals['daysOffProtocol']) !!}</x-nq::table.cell>
                                            <x-nq::table.cell>{!! $dayCount($totals['daysUnevaluated']) !!}</x-nq::table.cell>
                                            <x-nq::table.cell>{!! $dayCount($totals['currentStreak']) !!}</x-nq::table.cell>
                                            <x-nq::table.cell>{!! $dayCount($totals['bestStreak']) !!}</x-nq::table.cell>
                                        </x-nq::table.row>
                                    @endforeach
                                </x-nq::table.body>
                            </x-nq::table>
                        </x-nq::card.content>
                    </x-nq::card>
                </section>
            @endif
        </div>
    @endif
</div>
