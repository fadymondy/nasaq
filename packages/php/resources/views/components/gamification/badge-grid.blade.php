{{-- <x-nq::gamification.badge-grid :achievements="[['id' => 'a', 'title' => 'First order', 'icon' => 'rocket', 'earnedAt' => '2026-09-12'], ...]" selectable />
     Every badge and achievement as a grid, with earned, in-progress and locked states and a filter. filters: the tabs (default true). filter: the one to start on
     (all | earned | in-progress | locked). selectable: each badge is a button; it dispatches nq-select { id } and keeps selected-id marked. Needs the Alpine runtime.
     Achievements: id, title, description, icon (lucide name), rarity, progress, goal, earnedAt, xp, secret. --}}
@props(['achievements' => [], 'filters' => true, 'filter' => 'all', 'selectable' => false, 'selectedId' => null, 'labels' => [], 'locale' => null])
@include('nasaq::components.gamification._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_gm_words($locale, $labels);
    $achievements = array_values($achievements);
    $counts = nq_gm_counts($achievements);
    $tabs = ['all' => $t['all'], 'earned' => $t['earned'], 'in-progress' => $t['inProgress'], 'locked' => $t['locked']];
    $tag = $selectable ? 'button' : 'div';
    $empty = ($counts[$filter] ?? 0) === 0;
@endphp
<section data-slot="badge-grid" x-data="nqBadgeGrid(@js($filter), @js($selectedId), @js($counts))" {{ $attributes->cn('flex min-w-0 flex-col gap-4') }}>
    @if ($filters)
        <x-nq::tabs :default-value="$filter" x-model="filter">
            <x-nq::tabs.list :aria-label="$t['badgesFilter']">
                @foreach ($tabs as $id => $label)
                    <x-nq::tabs.tab :value="$id">{{ $label }}<span class="text-caption tabular-nums text-muted-foreground">{{ nq_gm_num($counts[$id], $locale) }}</span></x-nq::tabs.tab>
                @endforeach
                <x-nq::tabs.indicator />
            </x-nq::tabs.list>
        </x-nq::tabs>
    @endif
    <x-nq::states icon="award" :title="$t['noMatches']" :description="$t['noMatchesHint']" x-show="empty" style="{{ $empty ? '' : 'display: none' }}" />
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3">
        @foreach ($achievements as $a)
            @php
                $status = nq_gm_status($a);
                $hidden = ! empty($a['secret']) && $status !== 'earned';
                $rarity = $a['rarity'] ?? 'common';
                $selected = $selectedId !== null && $selectedId === $a['id'];
            @endphp
            <li class="min-w-0" x-show="match('{{ $status }}')" style="{{ $filter === 'all' || $filter === $status ? '' : 'display: none' }}">
                <{{ $tag }} @if ($selectable) type="button" aria-pressed="{{ $selected ? 'true' : 'false' }}" data-id="{{ $a['id'] }}" x-on:click="select($el.dataset.id)" x-effect="$el.setAttribute('aria-pressed', selected === $el.dataset.id ? 'true' : 'false'); selected === $el.dataset.id ? $el.setAttribute('data-selected', '') : $el.removeAttribute('data-selected')" @endif
                    data-status="{{ $status }}" @if ($selected) data-selected @endif
                    class="{{ \Nasaq\Cn::merge(
                        'flex h-full w-full flex-col items-center gap-2 rounded-card border border-border bg-card p-3 text-center outline-none transition-colors duration-150 ease-nq',
                        $selectable ? 'hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus' : '',
                        'data-selected:border-nq-line-strong data-selected:bg-nq-selected',
                        $status === 'locked' ? 'text-muted-foreground' : '',
                    ) }}">
                    <x-nq::gamification.medal :achievement="$hidden ? array_diff_key($a, ['icon' => 1]) : $a" />
                    <span dir="auto" class="line-clamp-2 text-label {{ $status === 'locked' ? 'text-muted-foreground' : 'text-foreground' }}">{{ $hidden ? $t['secret'] : $a['title'] }}</span>
                    <span class="flex flex-col items-center gap-0.5 text-caption text-muted-foreground">
                        <span>@if ($status === 'earned'){{ $t['earned'] }}@elseif ($status === 'locked'){{ $t['locked'] }}@else{{ $t['inProgress'] }} · {{ nq_gm_say($t, 'progressOf', nq_gm_num($a['progress'] ?? 0, $locale), nq_gm_num($a['goal'] ?? 1, $locale)) }}@endif</span>
                        @if ($rarity !== 'common' && ! $hidden)<span class="{{ nq_gm_rarity_style($rarity)['text'] }}">{{ $t['rarity'][$rarity] ?? $rarity }}</span>@endif
                    </span>
                </{{ $tag }}>
            </li>
        @endforeach
    </ul>
</section>
