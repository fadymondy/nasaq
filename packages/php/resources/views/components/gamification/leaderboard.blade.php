{{-- <x-nq::gamification.leaderboard :entries="[['id' => 'a', 'name' => 'Salma', 'score' => 1200, 'previousRank' => 2], ...]" you-id="a" unit="XP" :periods="[['id' => 'week', 'label' => 'This week'], ...]" />
     Ranking of people or teams: period tabs, a podium for the top three, the rest as a list with movement since last period, and your own row pinned at the bottom when you are further down.
     entries: id, name, score, avatar, subtitle, previousRank. limit: rows shown (default 10). podium: false keeps everyone in the list. loading: skeleton rows. period: starting tab.
     Named slot "title" replaces the heading. Period tabs need the Alpine runtime; they dispatch nq-period-change { id }. --}}
@props(['entries' => [], 'youId' => null, 'periods' => [], 'period' => null, 'unit' => null, 'limit' => 10, 'podium' => true, 'loading' => false, 'title' => null, 'labels' => [], 'locale' => null])
@include('nasaq::components.gamification._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_gm_words($locale, $labels);
    $ranked = nq_gm_rank(array_values($entries));
    $visible = array_slice($ranked, 0, $limit);
    $top = $podium ? array_slice($visible, 0, 3) : [];
    $rest = $podium ? array_slice($visible, 3) : $visible;
    $pinned = null;
    if ($youId !== null) {
        foreach ($ranked as $i => $r) {
            if ($r['id'] === $youId && $i >= count($visible)) {
                $pinned = $r;
            }
        }
    }
    $podiumStyle = [
        1 => ['h-24', 'order-2', 'border-nq-accent bg-nq-accent/15 text-nq-accent-text'],
        2 => ['h-16', 'order-1', 'border-nq-line-strong bg-secondary text-foreground'],
        3 => ['h-12', 'order-3', 'border-nq-line-strong bg-secondary text-foreground'],
    ];
    $headingId = 'nq-lb-'.substr(md5(json_encode($entries).$locale), 0, 8);
    $active = $period ?? ($periods[0]['id'] ?? null);
@endphp
<section data-slot="leaderboard" aria-labelledby="{{ $headingId }}" x-data="nqLeaderboard(@js($active))" {{ $attributes->cn('min-w-0 overflow-hidden rounded-card border border-border bg-card') }}>
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id="{{ $headingId }}" class="flex items-center gap-2 text-label text-foreground">
            <x-lucide-trophy aria-hidden="true" class="size-4 text-nq-accent-text" />
            @if ($title && ! $title->isEmpty()){{ $title }}@else{{ $t['leaderboard'] }}@endif
        </h2>
        @if (count($periods))
            <x-nq::tabs :default-value="$active" x-model="period">
                <x-nq::tabs.list :aria-label="$t['period']">
                    @foreach ($periods as $p)
                        <x-nq::tabs.tab :value="$p['id']">{{ $p['label'] }}</x-nq::tabs.tab>
                    @endforeach
                    <x-nq::tabs.indicator />
                </x-nq::tabs.list>
            </x-nq::tabs>
        @endif
    </header>

    @if ($loading)
        <div role="status" aria-busy="true" class="flex flex-col gap-3 p-4">
            <span class="sr-only">…</span>
            @for ($i = 0; $i < 5; $i++)
                <div class="flex items-center gap-3">
                    <x-nq::states.skeleton class="size-8 rounded-full" />
                    <x-nq::states.skeleton class="h-3 flex-1" />
                    <x-nq::states.skeleton class="h-3 w-12" />
                </div>
            @endfor
        </div>
    @elseif (count($ranked) === 0)
        <x-nq::states.empty icon="trophy" :title="$t['emptyBoard']" :description="$t['emptyBoardHint']" class="m-4 border-0" />
    @else
        @if (count($top))
            <ol data-slot="leaderboard-podium" class="flex items-end justify-center gap-2 border-b border-border px-4 pt-6 sm:gap-4">
                @foreach ($top as $e)
                    @php $ps = $podiumStyle[min(3, $e['rank'])]; @endphp
                    <li @if ($e['id'] === $youId) data-you="" @endif class="flex min-w-0 flex-1 basis-0 flex-col items-center gap-1.5 sm:max-w-40 {{ $ps[1] }}">
                        <span class="relative">
                            @if ($e['rank'] === 1)<x-lucide-crown aria-hidden="true" class="absolute -top-4 start-1/2 size-5 -translate-x-1/2 text-nq-accent-text rtl:translate-x-1/2" />@endif
                            <x-nq::avatar :name="$e['name']" :src="$e['avatar'] ?? null" size="lg" class="size-14 text-body ring-2 ring-offset-2 ring-offset-card {{ $e['rank'] === 1 ? 'ring-nq-accent' : 'ring-nq-line-strong' }}" />
                        </span>
                        <span class="flex w-full min-w-0 flex-col items-center text-center">
                            <bdi dir="auto" class="w-full truncate text-label text-foreground">{{ $e['name'] }}</bdi>
                            <span class="text-caption"><span class="tabular-nums text-foreground">{{ nq_gm_num($e['score'], $locale) }}@if ($unit)<span class="ms-1 text-caption text-muted-foreground">{{ $unit }}</span>@endif</span></span>
                        </span>
                        <span class="flex w-full flex-col items-center justify-start gap-0.5 rounded-t-control border border-b-0 pt-2 text-h3 tabular-nums {{ $ps[0] }} {{ $ps[2] }}">
                            <span class="sr-only">{{ $t['rank'] }}</span>
                            {{ nq_gm_num($e['rank'], $locale) }}
                            @include('nasaq::components.gamification._movement', ['rank' => $e['rank'], 'previousRank' => $e['previousRank'] ?? null])
                        </span>
                    </li>
                @endforeach
            </ol>
        @endif
        @if (count($rest))
            <ol class="divide-y divide-border">
                @foreach ($rest as $e)
                    @include('nasaq::components.gamification._lb-row', ['e' => $e, 'pin' => false, 'isYou' => $e['id'] === $youId])
                @endforeach
            </ol>
        @endif
        @if ($pinned)
            <ol aria-label="{{ $t['yourRank'] }}" class="sticky bottom-0 shadow-[0_-4px_8px_-6px_color-mix(in_oklab,var(--nq-fg)_25%,transparent)]">
                @include('nasaq::components.gamification._lb-row', ['e' => $pinned, 'pin' => true, 'isYou' => true])
            </ol>
        @endif
    @endif
</section>
