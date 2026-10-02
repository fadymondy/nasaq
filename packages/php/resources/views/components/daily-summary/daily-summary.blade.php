{{-- <x-nq::daily-summary :summary="['date' => '2026-09-29', 'waterMl' => 2400, 'steps' => 8421]" :water-goal-ml="3000" max-date="2026-09-29" switcher />
     A day at a glance: water, meals by safety, caffeine by kind, focus sessions, shutdown violations, steps, sleep, energy, resting heart rate and
     weight. A figure the device did not send reads "Not synced", never zero. summary: array with the keys of the React DailySummaryData (date,
     waterMl, meals ['total','safe','unsafe'], caffeine ['total','sugar','clean'], pomodorosCompleted, shutdownViolations, steps, sleepMinutes,
     activeEnergyKcal, restingHeartRate, weightKg, source ios|android|watch|wearos|web). date: the day shown without a summary (YYYY-MM-DD).
     max-date: the last day the next button reaches. switcher draws the previous/next buttons: a click dispatches a bubbling "nq-date-change" event
     with { date } (the neighbouring civil date) for the host to load. water-goal-ml: the person's own goal. loading, error, retry (draws the retry
     button, which dispatches "nq-retry"). labels: array overriding the built-in words. --}}
@include('nasaq::components.engine-card._health')
@include('nasaq::components.daily-summary._logic')
@props(['summary' => null, 'date' => null, 'maxDate' => null, 'switcher' => false, 'waterGoalMl' => null, 'loading' => false, 'error' => null, 'retry' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_ds_words($locale, $labels);
    $s = $summary;
    $day = $s['date'] ?? $date;
    $headingId = 'nq-daily-summary-'.substr(md5((string) $day), 0, 8);
    $canNext = $day ? ! ($maxDate && nq_ds_add_days($day, 1) > $maxDate) : false;
    $sourceIcon = ['ios' => 'smartphone', 'android' => 'smartphone', 'watch' => 'watch', 'wearos' => 'watch', 'web' => 'laptop'];
    $isEmpty = ! $s || collect(['waterMl', 'meals', 'caffeine', 'pomodorosCompleted', 'shutdownViolations', 'steps', 'sleepMinutes', 'activeEnergyKcal', 'restingHeartRate', 'weightKg'])->every(fn ($k) => ! isset($s[$k]));
    $missing = $t['notSynced'];
    $missingHtml = '<span class="text-body-sm font-normal text-muted-foreground">'.e($missing).'</span>';
    $unclassifiedMeals = isset($s['meals']) ? nq_ds_unclassified($s['meals']['total'], $s['meals']['safe'], $s['meals']['unsafe']) : 0;
    $mealRows = ! isset($s['meals']) ? [] : array_values(array_filter([
        ['key' => 'safe', 'tone' => 'success', 'icon' => 'circle-check', 'label' => $t['safe'], 'count' => $s['meals']['safe']],
        ['key' => 'unsafe', 'tone' => 'warning', 'icon' => 'circle-alert', 'label' => $t['unsafe'], 'count' => $s['meals']['unsafe']],
        $unclassifiedMeals > 0 ? ['key' => 'un', 'tone' => 'neutral', 'icon' => null, 'label' => $t['unclassified'], 'count' => $unclassifiedMeals] : null,
    ]));
    $caffeineRows = ! isset($s['caffeine']) ? [] : [
        ['key' => 'clean', 'tone' => 'success', 'icon' => 'circle-check', 'label' => $t['clean'], 'count' => $s['caffeine']['clean']],
        ['key' => 'sugar', 'tone' => 'warning', 'icon' => 'circle-alert', 'label' => $t['sugar'], 'count' => $s['caffeine']['sugar']],
    ];
    $shutdown = $s['shutdownViolations'] ?? null;
    $figure = fn ($key, $unit, $frac = 0) => isset($s[$key]) ? nq_ds_measure($s[$key], $unit, $locale, $frac) : $missingHtml;
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'daily-summary') }}" @if ($day) data-date="{{ $day }}" aria-labelledby="{{ $headingId }}" @endif x-data="nqDailySummary"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-6') }}>
    <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
            @if ($switcher && $day)
                <x-nq::button variant="secondary" size="icon" :aria-label="$t['previous']" x-on:click="step(-1)"><x-lucide-chevron-left aria-hidden="true" class="rtl:-scale-x-100" /></x-nq::button>
            @endif
            <h2 id="{{ $headingId }}" class="min-w-0 text-h3 text-foreground">{{ $day ? nq_ds_heading($day, $locale) : '' }}</h2>
            @if ($switcher && $day)
                <x-nq::button variant="secondary" size="icon" :aria-label="$t['next']" :disabled="! $canNext" x-on:click="step(1)"><x-lucide-chevron-right aria-hidden="true" class="rtl:-scale-x-100" /></x-nq::button>
            @endif
        </div>
        @if (! empty($s['source']))
            <x-nq::badge variant="outline">
                <x-dynamic-component :component="'lucide-'.($sourceIcon[$s['source']] ?? 'laptop')" aria-hidden="true" />
                <span class="sr-only">{{ $t['source'] }}: </span>
                {{ $t['sources'][$s['source']] ?? $s['source'] }}
            </x-nq::badge>
        @endif
    </header>

    @if ($loading)
        <div aria-busy="true" class="flex flex-col gap-3">
            <x-nq::stat-card.grid>
                @for ($i = 0; $i < 6; $i++)<x-nq::states.skeleton class="h-24" />@endfor
            </x-nq::stat-card.grid>
        </div>
    @elseif ($error)
        <x-nq::states.error :title="$t['loadError']" :description="$error">
            @if ($retry)
                <x-slot:actions><x-nq::button variant="secondary" size="sm" x-on:click="retry()">{{ $t['retry'] }}</x-nq::button></x-slot:actions>
            @endif
        </x-nq::states.error>
    @elseif ($isEmpty)
        <x-nq::states.empty :title="$t['empty']" :description="$t['emptyHint']" />
    @else
        <section aria-label="{{ $t['protocol'] }}" class="flex flex-col gap-3">
            <h3 class="text-label text-muted-foreground">{{ $t['protocol'] }}</h3>
            <x-nq::stat-card.grid>
                <div data-slot="daily-summary-water" class="flex flex-col gap-3 rounded-card border border-border bg-card px-4 py-4 text-card-foreground">
                    <x-nq::daily-summary.tile :label="$t['water']"><x-slot:icon><x-lucide-droplets /></x-slot:icon></x-nq::daily-summary.tile>
                    <div class="text-h2 leading-tight text-foreground tabular-nums">{!! $figure('waterMl', 'milliliter') !!}</div>
                    @if (isset($s['waterMl']) && $waterGoalMl)
                        <x-nq::progress.meter :label="$t['goalLabel']" :value="$s['waterMl']" :max="$waterGoalMl" :tone="$s['waterMl'] >= $waterGoalMl ? 'success' : 'default'" :value-text="strip_tags(nq_ds_measure($waterGoalMl, 'milliliter', $locale))" show-value />
                    @endif
                </div>
                <x-nq::daily-summary.tally :label="$t['meals']" :total="isset($s['meals']) ? nq_ds_count('meals', $s['meals']['total'], $locale) : null" :missing="$missing" :rows="$mealRows" :locale="$locale"><x-slot:icon><x-lucide-utensils /></x-slot:icon></x-nq::daily-summary.tally>
                <x-nq::daily-summary.tally :label="$t['caffeine']" :total="isset($s['caffeine']) ? nq_ds_count('drinks', $s['caffeine']['total'], $locale) : null" :missing="$missing" :rows="$caffeineRows" :locale="$locale"><x-slot:icon><x-lucide-coffee /></x-slot:icon></x-nq::daily-summary.tally>
                <div data-slot="daily-summary-shutdown" class="flex flex-col gap-3 rounded-card border border-border bg-card px-4 py-4 text-card-foreground">
                    <x-nq::daily-summary.tile :label="$t['shutdown']"><x-slot:icon><x-lucide-moon /></x-slot:icon></x-nq::daily-summary.tile>
                    <div class="flex flex-col gap-1">
                        <div class="text-h2 leading-tight text-foreground tabular-nums">{!! $figure('shutdownViolations', 'level') !!}</div>
                        @if ($shutdown !== null)
                            <x-nq::status :tone="$shutdown === 0 ? 'success' : 'warning'" :icon="$shutdown === 0 ? 'circle-check' : 'circle-alert'">{{ $shutdown === 0 ? $t['none'] : nq_ds_count('violations', $shutdown, $locale) }}</x-nq::status>
                        @endif
                    </div>
                </div>
                <x-nq::stat-card :label="$t['pomodoros']"><x-slot:icon><x-lucide-timer /></x-slot:icon>{!! $figure('pomodorosCompleted', 'level') !!}</x-nq::stat-card>
            </x-nq::stat-card.grid>
        </section>

        <section aria-label="{{ $t['body'] }}" class="flex flex-col gap-3">
            <h3 class="text-label text-muted-foreground">{{ $t['body'] }}</h3>
            <x-nq::stat-card.grid>
                <x-nq::stat-card :label="$t['steps']"><x-slot:icon><x-lucide-footprints /></x-slot:icon>{!! $figure('steps', 'steps') !!}</x-nq::stat-card>
                <x-nq::stat-card :label="$t['sleep']"><x-slot:icon><x-lucide-bed-double /></x-slot:icon>{!! isset($s['sleepMinutes']) ? nq_ds_duration((int) round($s['sleepMinutes'] * 60), $locale) : $missingHtml !!}</x-nq::stat-card>
                <x-nq::stat-card :label="$t['activeEnergy']"><x-slot:icon><x-lucide-flame /></x-slot:icon>{!! $figure('activeEnergyKcal', 'kcal') !!}</x-nq::stat-card>
                <x-nq::stat-card :label="$t['restingHeartRate']"><x-slot:icon><x-lucide-heart /></x-slot:icon>{!! $figure('restingHeartRate', 'bpm') !!}</x-nq::stat-card>
                <x-nq::stat-card :label="$t['weight']"><x-slot:icon><x-lucide-scale /></x-slot:icon>{!! $figure('weightKg', 'kilogram', 1) !!}</x-nq::stat-card>
            </x-nq::stat-card.grid>
        </section>
    @endif
</section>
