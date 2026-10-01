{{-- <x-nq::metric-tiles :metrics="[['id' => 'users', 'label' => 'Users', 'value' => 48210, 'previous' => 42980, 'sparkline' => [4, 6, 5, 9, 8, 12]]]" />
     A row of KPI tiles, each comparing against the previous period: the figure, a signed percentage with an arrow and tone (up is good unless invert),
     "was 42,980", and an optional trend line. metrics: array of ['id', 'label', 'value', 'previous', 'format' => ['style' => 'percent', 'maxFraction' => 1],
     'display' (replaces the formatted value, for a duration like "1m 38s"), 'previousDisplay', 'invert', 'sparkline', 'sparklineLabel', 'icon' => a lucide
     name such as 'users']. selectable: tiles become toggle buttons; selected: id of the pressed one. Choosing one dispatches a bubbling "nq-select"
     ({ id }) for the host to switch a chart. comparison-label: text before "was". loading: skeleton tiles (skeletons: how many with no metrics, default 4).
     labels: array overriding the built-in words (vsPrevious, was, group). --}}
@include('nasaq::components.metric-tiles._logic')
@props(['metrics' => [], 'selected' => null, 'selectable' => false, 'comparisonLabel' => null, 'loading' => false, 'skeletons' => 4, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? ['vsPrevious' => 'مقارنة بالفترة السابقة', 'was' => 'كانت', 'group' => 'المؤشرات الرئيسية'] : ['vsPrevious' => 'vs previous period', 'was' => 'was', 'group' => 'Key metrics'], $labels);
@endphp
@if ($loading && count($metrics) === 0)
    <div data-slot="metric-tiles" aria-busy="true" {{ $attributes->cn('grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3') }}>
        @for ($i = 0; $i < $skeletons; $i++)
            <x-nq::stat-card label="" :value="0" loading />
        @endfor
    </div>
@else
    <div data-slot="metric-tiles" role="group" aria-label="{{ $t['group'] }}" x-data="nqMetricTiles(@js($selected))" {{ $attributes->cn('grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3') }}>
        @foreach ($metrics as $m)
            @php
                $format = $m['format'] ?? [];
                $previous = $m['previous'] ?? null;
                $was = $previous === null ? null : ($m['previousDisplay'] ?? nq_mt_number($previous, $format, $locale));
                $pressed = $selectable && $selected === $m['id'];
                $cardAttrs = new \Illuminate\View\ComponentAttributeBag($selectable ? ['x-bind:class' => 'selected === '.json_encode($m['id'])." ? 'border-primary ring-1 ring-primary' : ''"] : []);
                $cardClass = ($selectable ? 'h-full' : '').($pressed ? ' border-primary ring-1 ring-primary' : '');
            @endphp
            @if ($selectable)
                <button type="button" x-bind:aria-pressed="String(selected === @js($m['id']))" x-on:click="select(@js($m['id']))" class="rounded-card text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
            @endif
            <x-nq::stat-card
                :label="$m['label']"
                :value="isset($m['display']) ? null : $m['value']"
                :format="$format"
                :delta="nq_mt_change_ratio($m['value'], $previous)"
                :invert="$m['invert'] ?? false"
                :loading="$loading"
                :delta-label="$was === null ? null : ($comparisonLabel ?? $t['vsPrevious']).' · '.$t['was'].' '.$was"
                :sparkline="$m['sparkline'] ?? null"
                :sparkline-label="$m['sparklineLabel'] ?? null"
                :locale="$locale"
                :data-metric="$m['id']"
                class="{{ $cardClass }}"
                :attributes="$cardAttrs">
                @if (! empty($m['icon']))
                    <x-slot:icon><x-dynamic-component :component="'lucide-'.$m['icon']" /></x-slot:icon>
                @endif
                @if (isset($m['display'])){{ $m['display'] }}@endif
            </x-nq::stat-card>
            @if ($selectable)
                </button>
            @endif
        @endforeach
    </div>
@endif
