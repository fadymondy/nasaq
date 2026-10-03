{{-- <x-nq::funnel-chart :steps="[['id' => 'visit', 'label' => 'Visit', 'count' => 12000, 'detail' => '/'], ['id' => 'paid', 'label' => 'Paid', 'count' => 420]]" />
     A funnel: one bar per step sized against the first, with the count, the conversion from the previous step and from the first, and the drop-off between steps. The step with the biggest drop is flagged.
     Bars grow from the inline start, so the funnel reads right to left in Arabic. steps: ['id', 'label', 'count', 'detail' (event name or path, kept left to right)].
     segments: [['id', 'label', 'entered', 'converted']] adds a "conversion by segment" table under the chart; segment-label: its first heading (default "Segment").
     title, description: override the header. loading: skeleton bars. labels: array overriding the built-in words (continued uses {pct}, dropped uses {n} and {pct}). The action slot sits in the header.
     Static markup: no Alpine needed. For the saved-funnels table use <x-nq::funnel-chart.list>. --}}
@include('nasaq::components.metric-tiles._logic')
@props(['steps' => [], 'title' => null, 'description' => null, 'segments' => [], 'segmentLabel' => null, 'loading' => false, 'labels' => [], 'locale' => null, 'action' => null])
@php
    $locale ??= app()->getLocale();
    $T =\Nasaq\Nasaq::class;
    $L = fn (string $k, string $en, string $ar) => $labels[$k] ?? $T::t($en, $ar);
    $steps = array_values((array) $steps);
    $first = (float) ($steps[0]['count'] ?? 0);
    $last = (float) (end($steps)['count'] ?? 0);
    $pct = fn ($n) => number_format($n * 100, ($n > 0 && $n < 0.1) ? 1 : 0, '.', '').'%';
    $num = fn ($n) => number_format((float) $n);
    $rows = [];
    foreach ($steps as $i => $s) {
        $prev = $i === 0 ? (float) $s['count'] : (float) $steps[$i - 1]['count'];
        $rows[] = [
            'step' => $s,
            'fromPrevious' => $prev > 0 ? $s['count'] / $prev : 0,
            'fromFirst' => $first > 0 ? $s['count'] / $first : 0,
            'dropped' => max(0, $prev - $s['count']),
            'dropRate' => $prev > 0 ? max(0, $prev - $s['count']) / $prev : 0,
        ];
    }
    $worst = -1;
    $worstDrop = 0;
    foreach ($rows as $i => $r) {
        if ($i > 0 && $r['dropped'] > $worstDrop) { $worst = $i; $worstDrop = $r['dropped']; }
    }
    $overall = $first > 0 ? $last / $first : 0;
    $segRows = collect($segments)->map(fn ($s) => [
        'id' => (string) $s['id'], 'label' => $s['label'], 'value' => $s['converted'],
        'cells' => ['rate' => nq_mt_number($s['entered'] > 0 ? $s['converted'] / $s['entered'] : 0, ['style' => 'percent', 'maxFraction' => 1], $locale)],
    ])->all();
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'funnel-chart') }}" {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-4') }}>
    <x-nq::card :aria-busy="$loading ? 'true' : null">
        <x-nq::card.header>
            <x-nq::card.title as="h3">{{ $title ?? $L('title', 'Conversion funnel', 'قمع التحويل') }}</x-nq::card.title>
            <x-nq::card.description>{{ $description ?? $L('description', 'How many people reach each step, and where they leave.', 'كم شخصًا يصل إلى كل خطوة، وأين يغادرون.') }}</x-nq::card.description>
            @if ($action && ! $action->isEmpty())<div class="mt-2">{{ $action }}</div>@endif
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col gap-4">
            @if ($loading)
                <div class="flex flex-col gap-3">
                    @for ($i = 0; $i < 4; $i++)<x-nq::states.skeleton class="h-10 w-full" />@endfor
                </div>
            @elseif (count($steps) === 0)
                <x-nq::states.empty :title="$L('empty', 'No funnel data for this period', 'لا بيانات قمع لهذه الفترة')" />
            @else
                <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                    <div class="flex flex-col">
                        <span class="text-caption text-muted-foreground">{{ $L('overall', 'Overall conversion', 'التحويل الإجمالي') }}</span>
                        <span class="text-heading-sm text-foreground" data-slot="funnel-overall"><x-nq::numeric :value="$overall" style="percent" :max-fraction="1" :locale="$locale" /></span>
                    </div>
                    <span class="text-body-sm text-muted-foreground">
                        {{ $L('entered', 'Entered', 'دخلوا') }} <x-nq::numeric :value="$first" :locale="$locale" /> · {{ $L('completed', 'Completed', 'أتمّوا') }} <x-nq::numeric :value="$last" :locale="$locale" />
                    </span>
                </div>
                <ol aria-label="{{ $L('chart', 'Funnel steps', 'خطوات القمع') }}" class="flex flex-col">
                    @foreach ($rows as $i => $r)
                        <li data-slot="funnel-step" class="flex flex-col">
                            @if ($i > 0)
                                <div class="flex items-center gap-2 py-1.5 ps-3 text-caption text-muted-foreground" data-slot="funnel-gap">
                                    <x-lucide-arrow-down aria-hidden="true" class="size-3.5 shrink-0" />
                                    <span>{{ str_replace('{pct}', $pct($r['fromPrevious']), $L('continued', '{pct} continued', 'تابع {pct}')) }}</span>
                                    <span aria-hidden="true">·</span>
                                    <span class="{{ $worst === $i ? 'text-nq-danger-text' : '' }}">{{ str_replace(['{n}', '{pct}'], [$num($r['dropped']), $pct($r['dropRate'])], $L('dropped', '{n} left ({pct})', 'غادر {n} ({pct})')) }}</span>
                                    @if ($worst === $i)
                                        <x-nq::badge variant="danger"><x-lucide-triangle-alert aria-hidden="true" />{{ $L('biggest', 'Biggest drop', 'أكبر تسرّب') }}</x-nq::badge>
                                    @endif
                                </div>
                            @endif
                            <div class="flex flex-col gap-1.5 rounded-card border border-border p-3">
                                <div class="flex items-baseline justify-between gap-3">
                                    <span class="flex min-w-0 flex-col">
                                        <span dir="auto" class="truncate text-label text-foreground">{{ $r['step']['label'] }}</span>
                                        @if (! empty($r['step']['detail']))<bdi dir="ltr" class="truncate text-caption text-muted-foreground">{{ $r['step']['detail'] }}</bdi>@endif
                                    </span>
                                    <span class="flex shrink-0 flex-col items-end">
                                        <span class="text-label text-foreground"><x-nq::numeric :value="$r['step']['count']" :locale="$locale" /></span>
                                        <span class="text-caption text-muted-foreground"><x-nq::numeric :value="$r['fromFirst']" style="percent" :max-fraction="1" :locale="$locale" /> {{ $L('ofFirst', 'of first step', 'من الخطوة الأولى') }}</span>
                                    </span>
                                </div>
                                <div role="img" aria-label="{{ $r['step']['label'] }}: {{ $num($r['step']['count']) }} ({{ $pct($r['fromFirst']) }})" class="h-3 w-full overflow-hidden rounded-full bg-muted">
                                    <div class="h-full rounded-full bg-primary" style="inline-size: {{ round(($first > 0 ? max(0.03, min(1, $r['step']['count'] / $first)) : 0) * 100, 2) }}%"></div>
                                </div>
                            </div>
                        </li>
                    @endforeach
                </ol>
            @endif
        </x-nq::card.content>
    </x-nq::card>
    @if (count($segRows) > 0)
        <x-nq::breakdown-table :title="$L('segmentsTitle', 'Conversion by segment', 'التحويل حسب الشريحة')" :description="$L('segmentsDescription', 'The same funnel split by who came in.', 'القمع نفسه مقسومًا حسب مصدر الزوار.')"
            :dimension-label="$segmentLabel ?? $L('segment', 'Segment', 'الشريحة')" :value-label="$L('converted', 'Converted', 'أتمّوا')" :rows="$segRows"
            :columns="[['id' => 'rate', 'header' => $L('rate', 'Conversion', 'التحويل'), 'align' => 'end']]" :label="$L('segmentsTitle', 'Conversion by segment', 'التحويل حسب الشريحة')" :show-share="false" :locale="$locale" />
    @endif
</div>
