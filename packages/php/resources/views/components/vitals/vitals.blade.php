{{-- <x-nq::vitals :vitals="['weightKg' => 84.2, 'heightCm' => 178, 'hasBaseline' => true, 'targets' => ['weight' => ['current' => 84.2, 'target' => 80, 'percent' => 62, 'onTarget' => false]]]" />
     Body readings from a scale or wearable: weight, BMI with its category, body water, visceral fat, muscle mass, metabolic age and resting heart
     rate, then progress towards the person's targets. A missing reading says "Not measured", never zero. vitals: array with the keys of the React
     VitalsData (weightKg, heightCm, bmi, bodyWaterPercent, visceralFat, muscleMassKg, metabolicAge, restingHeartRate, measuredAt, hasBaseline,
     targets [weight|visceralFat|bodyWater|metabolicAge => current, target, percent, onTarget], trends [weight|restingHeartRate => numbers]).
     loading draws skeletons. hide-heading skips the heading. labels: array overriding the built-in words. --}}
@include('nasaq::components.engine-card._health')
@include('nasaq::components.vitals._logic')
@props(['vitals' => null, 'loading' => false, 'hideHeading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_vt_words($locale, $labels);
    $v = $vitals ?? [];
    $bmi = $v['bmi'] ?? nq_vt_bmi($v['weightKg'] ?? null, $v['heightCm'] ?? null);
    $category = $bmi === null ? null : nq_vt_category($bmi);
    $bmiIcon = ['underweight' => 'circle-alert', 'normal' => 'circle-check', 'overweight' => 'circle-alert', 'obese' => 'circle-x'];
    $anything = collect([$v['weightKg'] ?? null, $bmi, $v['bodyWaterPercent'] ?? null, $v['visceralFat'] ?? null, $v['muscleMassKg'] ?? null, $v['metabolicAge'] ?? null, $v['restingHeartRate'] ?? null])->contains(fn ($x) => $x !== null);
    $missing = '<span class="text-body-sm font-normal text-muted-foreground">'.e($t['notMeasured']).'</span>';
    $figure = fn ($value, $unit, $frac = 0, $long = false) => $value === null ? $missing : nq_vt_measure($value, $unit, $locale, $frac, $long);
    $targetMeta = ['weight' => ['kilogram', 'weight', 1], 'visceralFat' => ['level', 'visceralFat', 0], 'bodyWater' => ['percent', 'bodyWater', 1], 'metabolicAge' => ['year', 'metabolicAge', 0]];
    $targets = $v['targets'] ?? [];
    $hasTargets = ($v['hasBaseline'] ?? true) !== false && count($targets) > 0;
    $measuredOn = ! empty($v['measuredAt']) ? sprintf($t['measuredOn'], nq_vt_date($v['measuredAt'], $locale)) : null;
@endphp
@if ($loading)
    <section aria-busy="true" data-slot="{{ $attributes->get('data-slot', 'vitals') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
        <x-nq::stat-card.grid>
            @for ($i = 0; $i < 4; $i++)<x-nq::states.skeleton class="h-24" />@endfor
        </x-nq::stat-card.grid>
    </section>
@else
    <section data-slot="vitals" @if ($hideHeading) aria-label="{{ $t['title'] }}" @endif {{ $attributes->cn('flex flex-col gap-4') }}>
        @unless ($hideHeading)
            <header class="flex flex-wrap items-baseline justify-between gap-2">
                <h2 class="text-h3 text-foreground">{{ $t['title'] }}</h2>
                @if ($measuredOn)<span class="text-caption text-muted-foreground">{{ $measuredOn }}</span>@endif
            </header>
        @endunless

        @if (! $anything)
            <p class="rounded-card border border-dashed border-border p-6 text-center text-body-sm text-muted-foreground">{{ $t['empty'] }}</p>
        @else
            <x-nq::stat-card.grid>
                <x-nq::stat-card :label="$t['weight']" :sparkline="$v['trends']['weight'] ?? null" :sparkline-label="sprintf($t['trendLabel'], $t['weight'])"><x-slot:icon><x-lucide-scale /></x-slot:icon>{!! $figure($v['weightKg'] ?? null, 'kilogram', 1) !!}</x-nq::stat-card>
                <x-nq::stat-card :label="$t['bmi']"><x-slot:icon><x-lucide-activity /></x-slot:icon>
                    @if ($bmi !== null)
                        <span class="flex flex-wrap items-center gap-2">
                            {!! nq_vt_measure($bmi, 'bmi', $locale, 1) !!}
                            @if ($category)
                                <x-nq::badge :variant="nq_vt_tone($category)"><x-dynamic-component :component="'lucide-'.$bmiIcon[$category]" aria-hidden="true" />{{ $t['categories'][$category] }}</x-nq::badge>
                            @endif
                        </span>
                    @else
                        {!! $missing !!}
                    @endif
                </x-nq::stat-card>
                <x-nq::stat-card :label="$t['bodyWater']"><x-slot:icon><x-lucide-droplet /></x-slot:icon>{!! $figure($v['bodyWaterPercent'] ?? null, 'percent', 1) !!}</x-nq::stat-card>
                <x-nq::stat-card :label="$t['visceralFat']"><x-slot:icon><x-lucide-flame /></x-slot:icon>{!! $figure($v['visceralFat'] ?? null, 'level') !!}</x-nq::stat-card>
                <x-nq::stat-card :label="$t['muscleMass']"><x-slot:icon><x-lucide-dumbbell /></x-slot:icon>{!! $figure($v['muscleMassKg'] ?? null, 'kilogram', 1) !!}</x-nq::stat-card>
                <x-nq::stat-card :label="$t['metabolicAge']"><x-slot:icon><x-lucide-hourglass /></x-slot:icon>{!! $figure($v['metabolicAge'] ?? null, 'year', 0, true) !!}</x-nq::stat-card>
                <x-nq::stat-card :label="$t['restingHeartRate']" :sparkline="$v['trends']['restingHeartRate'] ?? null" :sparkline-label="sprintf($t['trendLabel'], $t['restingHeartRate'])"><x-slot:icon><x-lucide-heart /></x-slot:icon>{!! $figure($v['restingHeartRate'] ?? null, 'bpm') !!}</x-nq::stat-card>
            </x-nq::stat-card.grid>
        @endif

        @if ($category)<p class="text-caption text-muted-foreground">{{ $t['bmiNote'] }}</p>@endif

        <x-nq::card>
            <x-nq::card.header>
                <x-nq::card.title as="h3" class="text-h3">{{ $t['targets'] }}</x-nq::card.title>
                <x-nq::card.description>{{ $t['targetsDescription'] }}</x-nq::card.description>
            </x-nq::card.header>
            <x-nq::card.content>
                @if (! $hasTargets)
                    <p class="text-body-sm text-muted-foreground">{{ $t['noBaseline'] }}</p>
                @else
                    <ul class="m-0 grid list-none gap-5 p-0 sm:grid-cols-2">
                        @foreach ($targetMeta as $key => [$unit, $labelKey, $digits])
                            @continue(empty($targets[$key]))
                            @php
                                $target = $targets[$key];
                                $on = ! empty($target['onTarget']);
                                $togo = abs(nq_vt_distance($target));
                            @endphp
                            <li data-slot="vitals-target" @if ($on) data-on-target="true" @endif class="flex flex-col gap-2">
                                <div class="flex items-center justify-end gap-2">
                                    <x-nq::status :tone="$on ? 'success' : 'info'" :icon="$on ? 'circle-check' : 'circle-dot'">{{ $on ? $t['onTarget'] : $t['inProgress'] }}</x-nq::status>
                                </div>
                                <x-nq::progress.meter :label="$t[$labelKey]" :value="nq_vt_percent($target['percent'])" :max="100" :tone="$on ? 'success' : 'default'" show-value
                                    :value-text="nq_vt_measure_text($target['current'], $unit, $locale, $digits).' / '.nq_vt_measure_text($target['target'], $unit, $locale, $digits)" />
                                @unless ($on)
                                    <span class="text-caption text-muted-foreground">{{ $t['toGo'] }} {!! nq_vt_measure($togo, $unit, $locale, $digits) !!}</span>
                                @endunless
                            </li>
                        @endforeach
                    </ul>
                @endif
            </x-nq::card.content>
        </x-nq::card>
    </section>
@endif
