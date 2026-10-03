{{-- <x-nq::breakdown-table title="Channels" dimension-label="Channel" value-label="Sessions"
         :rows="[['id' => 'organic', 'label' => 'Organic Search', 'value' => 28100, 'previous' => 24800], ['id' => 'direct', 'label' => 'Direct', 'value' => 13400, 'previous' => 14100]]" />
     A top-N table where each row carries a bar sized against the largest value: the label, the measure, its share of the total and its change against the
     previous period. Used for channels, sources, pages, devices and countries. Rows are sorted by value. rows: ['id', 'label' (localise it), 'value',
     'previous' (adds the change column), 'href' (the label becomes a link), 'cells' => [column id => text]]. dimension-label / value-label: the first two headings.
     format: ['style', 'currency', 'compact', 'minFraction', 'maxFraction'] for the value. limit: rows shown before "Show all" (default 8). show-share: the share
     column (default true). invert: lower is better, so a rise is the bad tone. color: bar colour, normally a token (default the brand colour). ltr-labels: labels
     are code, paths or URLs, kept left to right inside RTL. columns: extra columns after the value, ['id', 'header', 'align' => 'end', 'cell' => fn ($row) => text].
     label: accessible name of the table (default the title). loading: skeleton rows. labels: array overriding the built-in words. The action slot sits at the
     end of the header. Needs the Alpine runtime for Show all (@nasaqScripts). --}}
@include('nasaq::components.metric-tiles._logic')
@props(['rows' => [], 'title' => null, 'description' => null, 'dimensionLabel' => '', 'valueLabel' => '', 'format' => [], 'limit' => 8, 'showShare' => true, 'invert' => false, 'color' => 'var(--primary)', 'ltrLabels' => false, 'columns' => [], 'label' => null, 'loading' => false, 'labels' => [], 'locale' => null, 'action' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? [
        'share' => 'النسبة', 'change' => 'التغيّر', 'showAll' => 'عرض الكل (%d)', 'showLess' => 'عرض أقل', 'empty' => 'لا بيانات لهذه الفترة',
    ] : [
        'share' => 'Share', 'change' => 'Change', 'showAll' => 'Show all %d', 'showLess' => 'Show fewer', 'empty' => 'No data for this period',
    ], $labels);
    $sorted = collect($rows)->sortByDesc('value')->values()->all();
    $total = array_sum(array_column($sorted, 'value'));
    $max = $sorted[0]['value'] ?? 0;
    $hasPrevious = collect($rows)->contains(fn ($r) => isset($r['previous']));
    $overflow = ! $loading && count($sorted) > $limit;
    $pct = ['style' => 'percent', 'maxFraction' => 1];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'breakdown-table') }}" @if ($loading) aria-busy="true" @endif @if ($overflow) x-data="nqBreakdownTable" @endif
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground') }}>
    @if ($title || $description || ($action && ! $action->isEmpty()))
        <x-nq::card.header>
            @if ($title)<x-nq::card.title as="h3">{{ $title }}</x-nq::card.title>@endif
            @if ($description)<x-nq::card.description>{{ $description }}</x-nq::card.description>@endif
            @if ($action && ! $action->isEmpty())<x-nq::card.action>{{ $action }}</x-nq::card.action>@endif
        </x-nq::card.header>
    @endif
    <x-nq::card.content class="px-0">
        @if ($loading)
            <div class="flex flex-col gap-3 px-4">
                @for ($i = 0; $i < 5; $i++)<x-nq::states.skeleton class="h-8 w-full" />@endfor
            </div>
        @elseif (count($sorted) === 0)
            <p class="px-4 py-8 text-center text-body-sm text-muted-foreground">{{ $t['empty'] }}</p>
        @else
            <x-nq::table :label="$label ?? $title">
                <x-nq::table.header>
                    <x-nq::table.row>
                        <x-nq::table.head>{{ $dimensionLabel }}</x-nq::table.head>
                        <x-nq::table.head class="text-end">{{ $valueLabel }}</x-nq::table.head>
                        @if ($showShare)<x-nq::table.head class="hidden text-end sm:table-cell">{{ $t['share'] }}</x-nq::table.head>@endif
                        @if ($hasPrevious)<x-nq::table.head class="text-end">{{ $t['change'] }}</x-nq::table.head>@endif
                        @foreach ($columns as $c)
                            <x-nq::table.head class="{{ ($c['align'] ?? null) === 'end' ? 'text-end' : '' }}">{{ $c['header'] }}</x-nq::table.head>
                        @endforeach
                    </x-nq::table.row>
                </x-nq::table.header>
                <x-nq::table.body>
                    @foreach ($sorted as $i => $row)
                        @php
                            $delta = nq_mt_change_ratio($row['value'], $row['previous'] ?? null);
                            $good = $delta === null || $delta == 0 ? null : (($delta > 0) !== (bool) $invert);
                            $width = $max > 0 ? max(2, ($row['value'] / $max) * 100) : 0;
                            $deltaText = $delta === null ? null : nq_mt_number($delta, $pct, $locale);
                            if ($delta !== null && $delta > 0 && ! str_starts_with($deltaText, '+')) {
                                $deltaText = '+'.$deltaText;
                            }
                            $hidden = $i >= $limit;
                        @endphp
                        <x-nq::table.row :data-row="$row['id']" :attributes="new \Illuminate\View\ComponentAttributeBag($hidden ? ['x-show' => 'all', 'style' => 'display: none'] : [])">
                            <x-nq::table.cell class="min-w-40 max-w-0 sm:min-w-56">
                                @if (! empty($row['href']))<a href="{{ $row['href'] }}" class="block truncate text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus">@endif
                                @if ($ltrLabels)
                                    <bdi dir="ltr" class="block truncate">{{ $row['label'] }}</bdi>
                                @else
                                    <span class="block truncate" dir="auto">{{ $row['label'] }}</span>
                                @endif
                                @if (! empty($row['href']))</a>@endif
                                <span aria-hidden="true" data-slot="breakdown-bar" class="mt-1.5 block h-1.5 rounded-full bg-nq-surface-soft">
                                    <span class="block h-full rounded-full bg-[var(--bar)]" style="--bar: {{ $color }}; width: {{ round($width, 4) }}%"></span>
                                </span>
                            </x-nq::table.cell>
                            <x-nq::table.cell class="text-end tabular-nums">
                                <x-nq::numeric :value="$row['value']" :style="$format['style'] ?? 'decimal'" :currency="$format['currency'] ?? null" :compact="$format['compact'] ?? false" :min-fraction="$format['minFraction'] ?? null" :max-fraction="$format['maxFraction'] ?? null" :locale="$locale" />
                            </x-nq::table.cell>
                            @if ($showShare)
                                <x-nq::table.cell class="hidden text-end tabular-nums text-muted-foreground sm:table-cell">
                                    <x-nq::numeric :value="$total > 0 ? $row['value'] / $total : 0" style="percent" :max-fraction="1" :locale="$locale" />
                                </x-nq::table.cell>
                            @endif
                            @if ($hasPrevious)
                                <x-nq::table.cell class="text-end tabular-nums {{ $good === null ? 'text-muted-foreground' : ($good ? 'text-nq-success-text' : 'text-nq-danger-text') }}">
                                    @if ($deltaText === null)–@else<bdi data-slot="num" data-numeric="">{{ $deltaText }}</bdi>@endif
                                </x-nq::table.cell>
                            @endif
                            @foreach ($columns as $c)
                                <x-nq::table.cell class="{{ ($c['align'] ?? null) === 'end' ? 'text-end tabular-nums' : '' }}">
                                    @if (isset($c['cell']) && is_callable($c['cell'])){{ $c['cell']($row) }}@else{{ $row['cells'][$c['id']] ?? '' }}@endif
                                </x-nq::table.cell>
                            @endforeach
                        </x-nq::table.row>
                    @endforeach
                </x-nq::table.body>
            </x-nq::table>
        @endif
        @if ($overflow)
            <div class="flex justify-center px-4 pt-3">
                <x-nq::button size="sm" variant="ghost" x-on:click="all = ! all" x-bind:aria-expanded="String(all)"><span x-text="all ? @js($t['showLess']) : @js(sprintf($t['showAll'], count($sorted)))">{{ sprintf($t['showAll'], count($sorted)) }}</span></x-nq::button>
            </div>
        @endif
    </x-nq::card.content>
</div>
