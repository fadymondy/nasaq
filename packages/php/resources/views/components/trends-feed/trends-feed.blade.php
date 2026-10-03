{{-- <x-nq::trends-feed :topics="$topics" time-zone="Asia/Riyadh" @nq-trend-action="$event.detail.waitUntil(save($event.detail.id, $event.detail.action))" />
     Trending topics found in the news, grouped by the day they were detected and split into New, Saved, Reviewed and Dismissed tabs with counts.
     A topic shows its score with the reasons behind it, the outlets that carry it and, on request, its articles. Save, review, dismiss and
     restore work from buttons and from the topic's context menu (also its Ellipsis button). It stores nothing: it fires events on the root.
       nq-trend-action   detail { id, action: save|review|dismiss|restore, waitUntil }   the buttons wait on it; a rejection shows an error on the topic
       nq-trend-menu     detail { id, action }                                          an item of the topic's extraActions
       nq-trend-state    detail { state }                                               the tab changed
       nq-retry          {}                                                             "Retry now" in the error state
     After an action re-render the feed with the topic's new state.
     topics: [['id', 'title', 'summary', 'score' (0-100), 'reasons' => [], 'outlets' => [['id', 'name']], 'items' => [['id', 'title', 'outlet', 'url', 'publishedAt']],
     'detectedAt', 'state' => new|saved|reviewed|dismissed, 'extraActions' => [['id', 'label']]]]. state: the open tab (new). time-zone: for the day headings.
     now: "now" for Today and Yesterday (the current time). hot-at: scores at or above get the Hot badge (80). actionable (true) shows the action buttons.
     loading / error (a message) / retryable (adds Retry now) replace the list. labels: override any string. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['topics' => [], 'state' => 'new', 'timeZone' => null, 'now' => null, 'hotAt' => 80, 'actionable' => true, 'loading' => false, 'error' => null, 'retryable' => false, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $ar = str_starts_with(app()->getLocale(), 'ar');
    $states = ['new', 'saved', 'reviewed', 'dismissed'];
    $stateName = array_merge([
        'new' => $t::t('New', 'جديدة'), 'saved' => $t::t('Saved', 'محفوظة'), 'reviewed' => $t::t('Reviewed', 'تمت مراجعتها'), 'dismissed' => $t::t('Dismissed', 'مستبعدة'),
    ], (array) ($labels['states'] ?? []));
    $actionName = array_merge([
        'save' => $t::t('Save', 'حفظ'), 'review' => $t::t('Mark reviewed', 'تمت المراجعة'), 'dismiss' => $t::t('Dismiss', 'استبعاد'), 'restore' => $t::t('Restore', 'استعادة'),
    ], (array) ($labels['actions'] ?? []));
    $s = array_merge([
        'tabs' => $t::t('Topic state', 'حالة الموضوع'),
        'score' => $t::t('Score', 'الدرجة'),
        'hot' => $t::t('Hot', 'رائج جدًا'),
        'why' => $t::t('Why it is trending', 'لماذا هو رائج'),
        'hideItems' => $t::t('Hide articles', 'إخفاء المقالات'),
        'open' => $t::t('Open', 'فتح'),
        'emptyBody' => $t::t('Topics appear here as they are found.', 'تظهر المواضيع هنا عند رصدها.'),
        'today' => $t::t('Today', 'اليوم'),
        'yesterday' => $t::t('Yesterday', 'أمس'),
        'retry' => $t::t('Retry now', 'أعد المحاولة الآن'),
    ], array_diff_key((array) $labels, ['states' => 1, 'actions' => 1]));
    $outlets = fn (int $n): string => $ar ? ($n === 1 ? 'منفذ واحد' : ($n === 2 ? 'منفذان' : $n.' منافذ')) : ($n === 1 ? '1 outlet' : $n.' outlets');
    $articles = fn (int $n): string => $ar ? ($n === 1 ? 'مقال واحد' : ($n === 2 ? 'مقالان' : $n.' مقالات')) : ($n === 1 ? '1 article' : $n.' articles');
    $showItems = fn (int $n): string => $ar ? 'عرض '.($n === 1 ? 'مقال واحد' : ($n === 2 ? 'مقالين' : $n.' مقالات')) : 'Show '.$articles($n);
    $emptyTitle = fn (string $name): string => $ar ? 'لا مواضيع '.$name : 'No '.mb_strtolower($name).' topics';
    $moreFor = fn (string $title): string => $ar ? 'إجراءات '.$title : 'Actions for '.$title;
    $failedFor = fn (string $action): string => $ar ? 'تعذّر تنفيذ «'.$action.'». حاول مرة أخرى.' : 'Could not '.mb_strtolower($action).'. Try again.';
    $order = [
        'new' => ['save', 'review', 'dismiss'],
        'saved' => ['review', 'dismiss', 'restore'],
        'reviewed' => ['save', 'dismiss', 'restore'],
        'dismissed' => ['restore'],
    ];
    $icons = ['save' => 'bookmark', 'review' => 'check-check', 'dismiss' => 'eye-off', 'restore' => 'rotate-ccw'];

    $zone = $timeZone ?: (config('app.timezone') ?: 'UTC');
    $when = fn ($v) => $v instanceof \DateTimeInterface ? \Carbon\Carbon::instance($v) : (is_numeric($v) ? \Carbon\Carbon::createFromTimestamp($v) : \Carbon\Carbon::parse($v));
    $today = $now ? $when($now) : \Illuminate\Support\Carbon::now();
    $todayKey = $today->copy()->setTimezone($zone)->format('Y-m-d');
    $yesterdayKey = $today->copy()->subDay()->setTimezone($zone)->format('Y-m-d');
    $list = collect($topics)->values()->map(fn ($topic, $n) => $topic + ['_n' => $n])->all();
    $counts = array_fill_keys($states, 0);
    foreach ($list as $topic) {
        $counts[$topic['state']] = ($counts[$topic['state']] ?? 0) + 1;
    }
    $groupsFor = function (string $st) use ($list, $when, $zone): array {
        $map = [];
        foreach ($list as $topic) {
            if ($topic['state'] !== $st) continue;
            $map[$when($topic['detectedAt'])->copy()->setTimezone($zone)->format('Y-m-d')][] = $topic;
        }
        krsort($map);
        foreach ($map as $day => $items) {
            usort($items, fn ($a, $b) => ($b['score'] <=> $a['score']) ?: ($when($b['detectedAt'])->getTimestamp() <=> $when($a['detectedAt'])->getTimestamp()));
            $map[$day] = $items;
        }
        return $map;
    };
    $config = [
        'topics' => array_map(fn ($topic) => ['id' => (string) $topic['id'], 'state' => $topic['state'], 'extras' => array_map(fn ($x) => (string) $x['id'], array_values($topic['extraActions'] ?? []))], $list),
        'tab' => $state,
        'failed' => array_map(fn ($a) => $failedFor($a), $actionName),
    ];
@endphp
<section data-slot="trends-feed" x-data="nqTrendsFeed(@js($config))" {{ $attributes->cn('flex flex-col gap-4') }}>
    <x-nq::tabs :default-value="$state" x-model="tab">
        <x-nq::tabs.list aria-label="{{ $s['tabs'] }}" class="max-w-full overflow-x-auto">
            @foreach ($states as $st)
                <x-nq::tabs.tab :value="$st">
                    {{ $stateName[$st] }}
                    <x-nq::badge variant="neutral" class="ms-1.5"><x-nq::numeric :value="$counts[$st]" /></x-nq::badge>
                </x-nq::tabs.tab>
            @endforeach
        </x-nq::tabs.list>
        @foreach ($states as $st)
            <x-nq::tabs.panel :value="$st" class="mt-4">
                @if ($error)
                    <x-nq::states.error :title="$error">
                        @if ($retryable)
                            <x-slot:actions><x-nq::button type="button" x-on:click="retry()">{{ $s['retry'] }}</x-nq::button></x-slot:actions>
                        @endif
                    </x-nq::states.error>
                @elseif ($loading)
                    <x-nq::states.loading :rows="3" />
                @elseif (! count($groupsFor($st)))
                    <x-nq::states.empty :title="$emptyTitle($stateName[$st])" :description="$s['emptyBody']" />
                @else
                    <div class="flex flex-col gap-6">
                        @foreach ($groupsFor($st) as $day => $dayTopics)
                            <div class="flex flex-col gap-3">
                                <h3 class="text-label font-medium text-muted-foreground">
                                    @if ($day === $todayKey){{ $s['today'] }}@elseif ($day === $yesterdayKey){{ $s['yesterday'] }}@else<x-nq::numeric.date-time :value="$day.'T12:00:00Z'" date-style="full" />@endif
                                </h3>
                                <ul class="flex flex-col gap-3">
                                    @foreach ($dayTopics as $topic)
                                        @php
                                            $n = $topic['_n'];
                                            $acts = $order[$topic['state']] ?? [];
                                            $extras = array_values($topic['extraActions'] ?? []);
                                            $items = $topic['items'] ?? [];
                                            $topicOutlets = $topic['outlets'] ?? [];
                                        @endphp
                                        <li class="min-w-0">
                                            <x-nq::context-menu>
                                                <x-nq::context-menu.trigger>
                                                    <x-nq::card class="w-full">
                                                        <x-nq::card.content class="flex flex-col gap-3 pt-4">
                                                            <div class="flex items-start gap-3">
                                                                <div class="flex min-w-0 flex-1 flex-col gap-1">
                                                                    <h4 class="text-body font-medium">{{ $topic['title'] }}</h4>
                                                                    @if (! empty($topic['summary']))<p class="text-body-sm text-muted-foreground">{{ $topic['summary'] }}</p>@endif
                                                                </div>
                                                                <div class="flex shrink-0 items-center gap-2">
                                                                    @if ($topic['score'] >= $hotAt)
                                                                        <x-nq::badge variant="danger"><x-lucide-flame aria-hidden="true" />{{ $s['hot'] }}</x-nq::badge>
                                                                    @endif
                                                                    <x-nq::badge variant="outline">{{ $s['score'] }} <x-nq::numeric :value="$topic['score']" /></x-nq::badge>
                                                                </div>
                                                            </div>
                                                            @if (! empty($topic['reasons']))
                                                                <div>
                                                                    <p class="text-caption font-medium text-muted-foreground">{{ $s['why'] }}</p>
                                                                    <ul class="mt-1 list-disc ps-5 text-body-sm">
                                                                        @foreach ($topic['reasons'] as $reason)<li>{{ $reason }}</li>@endforeach
                                                                    </ul>
                                                                </div>
                                                            @endif
                                                            <div class="flex flex-wrap items-center gap-1.5">
                                                                <span class="text-caption text-muted-foreground">{{ $outlets(count($topicOutlets)) }}</span>
                                                                @foreach ($topicOutlets as $o)<x-nq::badge variant="neutral">{{ $o['name'] }}</x-nq::badge>@endforeach
                                                            </div>
                                                            <x-nq::collapsible>
                                                                <x-nq::collapsible.trigger variant="ghost" size="sm" class="-ms-2">
                                                                    <x-lucide-chevron-down aria-hidden="true" class="transition-transform motion-reduce:transition-none" x-bind:class="open ? 'rotate-180' : ''" />
                                                                    <span x-show="! open">{{ $showItems(count($items)) }}</span>
                                                                    <span x-show="open" style="display: none">{{ $s['hideItems'] }}</span>
                                                                </x-nq::collapsible.trigger>
                                                                <x-nq::collapsible.panel>
                                                                    <ul class="mt-2 flex flex-col divide-y divide-border rounded-control border border-border">
                                                                        @foreach ($items as $it)
                                                                            <li class="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                                                                                <div class="min-w-0">
                                                                                    @if (! empty($it['url']))
                                                                                        <a href="{{ $it['url'] }}" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 text-body-sm font-medium underline-offset-2 hover:underline">
                                                                                            {{ $it['title'] }}
                                                                                            <x-lucide-external-link aria-hidden="true" class="size-3 rtl:-scale-x-100" />
                                                                                            <span class="sr-only">{{ $s['open'] }}</span>
                                                                                        </a>
                                                                                    @else
                                                                                        <span class="text-body-sm font-medium">{{ $it['title'] }}</span>
                                                                                    @endif
                                                                                    <p class="text-caption text-muted-foreground">{{ $it['outlet'] }} · <x-nq::numeric.date-time :value="$it['publishedAt']" relative /></p>
                                                                                </div>
                                                                            </li>
                                                                        @endforeach
                                                                    </ul>
                                                                </x-nq::collapsible.panel>
                                                            </x-nq::collapsible>
                                                            <p role="alert" class="flex items-center gap-1.5 text-body-sm text-nq-danger-text" x-show="failed[{{ $n }}]" style="display: none">
                                                                <x-lucide-circle-alert aria-hidden="true" class="size-4" />
                                                                <span x-text="failed[{{ $n }}]"></span>
                                                            </p>
                                                            @if ($actionable)
                                                                <div class="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                                                                    @foreach ($acts as $a)
                                                                        <x-nq::button type="button" :variant="$a === 'dismiss' ? 'ghost' : 'secondary'" size="sm" x-bind:aria-busy="isBusy({{ $n }}) ? 'true' : null" x-bind:disabled="isBusy({{ $n }})" x-on:click="act({{ $n }}, '{{ $a }}')">
                                                                            <x-nq::spinner x-show="isBusy({{ $n }})" style="display: none" />
                                                                            <x-dynamic-component :component="'lucide-'.$icons[$a]" aria-hidden="true" x-show="! isBusy({{ $n }})" />
                                                                            {{ $actionName[$a] }}
                                                                        </x-nq::button>
                                                                    @endforeach
                                                                    <x-nq::button type="button" variant="ghost" size="icon-sm" class="ms-auto" aria-label="{{ $moreFor($topic['title']) }}" x-on:click="menuAt($el)">
                                                                        <x-lucide-ellipsis aria-hidden="true" />
                                                                    </x-nq::button>
                                                                </div>
                                                            @endif
                                                        </x-nq::card.content>
                                                    </x-nq::card>
                                                </x-nq::context-menu.trigger>
                                                <x-nq::context-menu.content>
                                                    @foreach ($acts as $a)
                                                        <x-nq::context-menu.item :variant="$a === 'dismiss' ? 'danger' : 'default'" x-on:click="act({{ $n }}, '{{ $a }}')">
                                                            <x-dynamic-component :component="'lucide-'.$icons[$a]" aria-hidden="true" />{{ $actionName[$a] }}
                                                        </x-nq::context-menu.item>
                                                    @endforeach
                                                    @if (count($extras))
                                                        <x-nq::context-menu.separator />
                                                        @foreach ($extras as $k => $x)
                                                            <x-nq::context-menu.item x-on:click="extra({{ $n }}, {{ $k }})">{{ $x['label'] }}</x-nq::context-menu.item>
                                                        @endforeach
                                                    @endif
                                                </x-nq::context-menu.content>
                                            </x-nq::context-menu>
                                        </li>
                                    @endforeach
                                </ul>
                            </div>
                        @endforeach
                    </div>
                @endif
            </x-nq::tabs.panel>
        @endforeach
    </x-nq::tabs>
</section>
