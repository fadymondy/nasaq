{{-- Internal: the tabs, filters, search, sort and rows shared by alerts.list and alerts.security. Included with $alerts, $security, $actions,
     $canAcknowledge, $canResolve, $canReopen, $hideFilters, $loading, $title, $defaultStatus, $defaultSort, $labels and $locale in scope. --}}
@php
    $t = nq_alerts_strings($locale, $labels);
    $js = fn ($v) => \Illuminate\Support\Js::from($v);
    $items = nq_alerts_sort(array_values($alerts), $defaultSort);
    $total = count($items);
    $counts = ['all' => $total, 'open' => 0, 'acknowledged' => 0, 'resolved' => 0];
    foreach ($items as $a) {
        $counts[$a['status']]++;
    }
    $sources = collect($items)->pluck('source')->unique()->sort()->values()->all();
    $uid = 'nq-alerts-'.substr(md5(json_encode(array_column($items, 'id'))), 0, 8);
    $visibleNow = fn ($a) => $defaultStatus === 'all' || $a['status'] === $defaultStatus;
    $shownNow = count(array_filter($items, $visibleNow));
    $rows = array_map(fn ($a) => [
        'id' => (string) $a['id'], 'severity' => $a['severity'], 'status' => $a['status'], 'source' => $a['source'], 'at' => nq_alerts_ms($a['createdAt']),
        'search' => mb_strtolower(implode(' ', array_filter([$a['title'], $a['source'], $a['id'], ...($security ? [$a['ip'] ?? null, $a['location'] ?? null, $a['account'] ?? null, $a['category'] ?? null] : [])]))),
    ], $items);
    $config = ['rows' => $rows, 'status' => $defaultStatus, 'sort' => $defaultSort, 'strings' => ['shown' => $t['shown'], 'failed' => $t['failed']]];
    $statuses = ['all', 'open', 'acknowledged', 'resolved'];
@endphp
<section data-slot="{{ $security ? 'security-alerts' : 'alert-list' }}" aria-labelledby="{{ $uid }}" x-data="nqAlerts(@js($config))"
    {{ $attributes->cn('flex flex-col gap-4') }}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="{{ $uid }}" class="text-heading-sm text-foreground">{{ $title ?? ($security ? $t['securityTitle'] : $t['title']) }}</h2>
        <p class="text-caption text-muted-foreground" aria-live="polite" x-text="shownText">{{ str_replace(['{n}', '{total}'], [$shownNow, $total], $t['shown']) }}</p>
    </div>

    <x-nq::tabs x-model="statusTab" :default-value="$defaultStatus">
        <x-nq::tabs.list variant="underline" :aria-label="$t['label']">
            @foreach ($statuses as $s)
                <x-nq::tabs.tab :value="$s">
                    {{ $t['status'][$s] }}
                    <x-nq::badge variant="outline"><bdi dir="ltr">{{ $counts[$s] }}</bdi></x-nq::badge>
                </x-nq::tabs.tab>
            @endforeach
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>
    </x-nq::tabs>

    @unless ($hideFilters)
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_11rem_11rem_12rem]">
            <div class="relative sm:col-span-2 lg:col-span-1">
                <x-lucide-search aria-hidden="true" class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <x-nq::field.input type="search" x-model="query" :aria-label="$t['search']" :placeholder="$t['searchPlaceholder']" class="ps-9" />
            </div>
            <x-nq::select x-model="sevFilter" value="all">
                <x-nq::select.trigger :aria-label="$t['severityFilter']"><x-nq::select.value /></x-nq::select.trigger>
                <x-nq::select.content>
                    <x-nq::select.item value="all">{{ $t['allSeverities'] }}</x-nq::select.item>
                    @foreach (['critical', 'high', 'medium', 'low', 'info'] as $s)
                        <x-nq::select.item :value="$s">{{ $t['severity'][$s] }}</x-nq::select.item>
                    @endforeach
                </x-nq::select.content>
            </x-nq::select>
            <x-nq::select x-model="srcFilter" value="all">
                <x-nq::select.trigger :aria-label="$t['sourceFilter']"><x-nq::select.value /></x-nq::select.trigger>
                <x-nq::select.content>
                    <x-nq::select.item value="all">{{ $t['allSources'] }}</x-nq::select.item>
                    @foreach ($sources as $s)
                        <x-nq::select.item :value="$s">{{ $s }}</x-nq::select.item>
                    @endforeach
                </x-nq::select.content>
            </x-nq::select>
            <x-nq::select x-model="sortBy" :value="$defaultSort">
                <x-nq::select.trigger :aria-label="$t['sortLabel']"><x-nq::select.value /></x-nq::select.trigger>
                <x-nq::select.content>
                    @foreach (['severity', 'newest'] as $s)
                        <x-nq::select.item :value="$s">{{ $t['sort'][$s] }}</x-nq::select.item>
                    @endforeach
                </x-nq::select.content>
            </x-nq::select>
        </div>
    @endunless

    @if ($loading)
        <div role="status" aria-label="{{ $t['loading'] }}" class="flex flex-col gap-3">
            @for ($n = 0; $n < 3; $n++)
                <x-nq::states.skeleton class="h-24 w-full rounded-card" />
            @endfor
        </div>
    @else
        <div @if ($shownNow > 0) style="display: none" @endif x-show="visibleCount === 0" x-cloak>
            <x-nq::states.empty icon="bell" :title="$t['emptyTitle']" :description="$total === 0 ? $t['emptyAll'] : $t['emptyBody']">
                @if ($total > 0)
                    <x-slot:actions>
                        <x-nq::button type="button" variant="secondary" size="sm" x-on:click="clear()" x-show="canClear" x-cloak>{{ $t['clear'] }}</x-nq::button>
                    </x-slot:actions>
                @endif
            </x-nq::states.empty>
        </div>
        <ul x-ref="list" class="m-0 flex list-none flex-col gap-3 p-0">
            @foreach ($items as $a)
                @include('nasaq::components.alerts._alert-row', ['a' => $a, 'show' => $visibleNow($a), 'panelId' => $uid.'-'.$loop->index])
            @endforeach
        </ul>
    @endif
</section>
