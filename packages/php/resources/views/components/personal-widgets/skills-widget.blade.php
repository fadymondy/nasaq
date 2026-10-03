{{-- <x-nq::personal-widgets.skills-widget :skills="[['name' => 'TypeScript', 'group' => 'Languages', 'level' => 5], ['name' => 'Figma', 'level' => 4]]" />
     Skills grouped by area, strongest first, with a five-dot level. The level is also in text for screen readers.
     skills: each ['name', 'group' (optional), 'level' => 1..5 (optional)]. levels: false hides the dots. labels: ['level' => 'Level {n} of 5']. --}}
@props(['skills' => [], 'levels' => true, 'labels' => []])
@php
    $t = array_merge(\Nasaq\Nasaq::rtl() ? ['level' => 'المستوى {n} من 5'] : ['level' => 'Level {n} of 5'], (array) $labels);
    // Grouped by area in order of first appearance; the ungrouped skills last; strongest first inside each group.
    $groups = [];
    foreach (array_values(array_map(fn ($s) => (array) $s, (array) $skills)) as $i => $s) {
        $s['_i'] = $i;
        $groups[$s['group'] ?? ''][] = $s;
    }
    uksort($groups, fn ($a, $b) => ($a === '') <=> ($b === ''));
    foreach ($groups as &$list) {
        usort($list, fn ($a, $b) => (($b['level'] ?? 0) <=> ($a['level'] ?? 0)) ?: ($a['_i'] <=> $b['_i']));
    }
    unset($list);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'skills-widget') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-5') }}>
    @foreach ($groups as $group => $list)
        <div class="flex flex-col gap-2">
            @if ($group !== '')<p class="eyebrow">{{ $group }}</p>@endif
            <ul class="flex flex-wrap gap-2">
                @foreach ($list as $s)
                    <li class="inline-flex h-control-sm items-center gap-2 rounded-control border border-border bg-card px-2.5 text-body-sm text-foreground">
                        <bdi>{{ $s['name'] ?? '' }}</bdi>
                        @if ($levels && ! empty($s['level']))
                            <span role="img" aria-label="{{ str_replace('{n}', (int) $s['level'], $t['level']) }}" class="flex gap-0.5">
                                @for ($d = 1; $d <= 5; $d++)<span class="size-1.5 rounded-full {{ $d <= (int) $s['level'] ? 'bg-primary' : 'bg-nq-line' }}"></span>@endfor
                            </span>
                        @endif
                    </li>
                @endforeach
            </ul>
        </div>
    @endforeach
</div>
