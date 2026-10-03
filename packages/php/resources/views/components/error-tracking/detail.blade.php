{{-- <x-nq::error-tracking.detail :issue="$issue" can-change />
     One error: summary, resolve / ignore / reopen, then stack trace, breadcrumbs, tags and the captured diagnostics. It is the detail view of x-nq::error-tracking
     (which renders one per issue and shows the open one); on its own it wraps itself in the same Alpine state, so the buttons and events work the same.
     issue: ['id', 'title', 'culprit', 'level' => fatal|error|warning|info, 'status' => unresolved|resolved|ignored, 'count', 'users', 'firstSeen', 'lastSeen', 'series' => [n, …],
     'release', 'environment', 'tags' => ['browser' => 'Chrome'], 'frames' => [['file', 'fn', 'line', 'column', 'inApp', 'context' => [['line', 'code']]]],
     'breadcrumbs' => [['at', 'type' => navigation|http|console|ui|error, 'message']], 'diagnostics' => (see x-nq::error-tracking.diagnostics)].
     can-change (default false): show Resolve / Ignore / Reopen; the page answers the "nq-error-status" event. show-back: a back button (the list view). now: pins "now" (tests, docs).
     labels: override any string. locale: en or ar. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['issue', 'canChange' => false, 'showBack' => false, 'now' => null, 'labels' => [], 'locale' => null, 'standalone' => false])
@include('nasaq::components.error-tracking._logic')
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = nq_et_words($locale, (array) $labels);
    $nowDate = $now ? \Carbon\CarbonImmutable::parse($now) : \Carbon\CarbonImmutable::now();
    $i = (array) $issue;
    $id = (string) $i['id'];
    $series = array_values((array) ($i['series'] ?? []));
    $trend = nq_et_trend($series);
    $frames = array_values(array_map(fn ($f) => (array) $f, (array) ($i['frames'] ?? [])));
    $crumbs = array_values(array_map(fn ($b) => (array) $b, (array) ($i['breadcrumbs'] ?? [])));
    $tags = (array) ($i['tags'] ?? []);
    $diag = (array) ($i['diagnostics'] ?? []);
    $hasDiag = ! empty($diag['screenshot']) || ! empty($diag['console']) || ! empty($diag['network']);
    $levelBadge = ['fatal' => 'danger', 'error' => 'danger', 'warning' => 'warning', 'info' => 'info'];
    $statusTone = ['unresolved' => 'warning', 'resolved' => 'success', 'ignored' => 'neutral'];
    $trendColor = ['up' => 'var(--nq-danger)', 'down' => 'var(--nq-success)', 'flat' => 'var(--primary)'];
    $when = fn ($v) => '<time datetime="'.e(\Carbon\CarbonImmutable::parse($v)->toIso8601String()).'" title="'.e(\Carbon\CarbonImmutable::parse($v)->locale($ar ? 'ar' : 'en')->isoFormat('LL')).'" class="[unicode-bidi:isolate]">'.e(nq_et_ago($v, $nowDate, $ar)).'</time>';
    $statusAttr = $standalone
        ? ['x-data' => 'nqErrorTracking('.\Illuminate\Support\Js::from(['rows' => [['id' => $id, 'status' => $i['status']]], 'openId' => $id, 'texts' => ['errorFailed' => $t['errorFailed'], 'statuses' => $t['statuses']]])->toHtml().')']
        : [];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'error-detail') }}" data-status="{{ $i['status'] }}" x-bind:data-status="statusOf('{{ $id }}')"
    @foreach ($statusAttr as $k => $v) {{ $k }}="{!! $v !!}" @endforeach
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    @if ($showBack)
        <div>
            <x-nq::button variant="ghost" size="sm" x-on:click="back()">
                @if ($ar)<x-lucide-arrow-right aria-hidden="true" />@else<x-lucide-arrow-left aria-hidden="true" />@endif
                {{ $t['back'] }}
            </x-nq::button>
        </div>
    @endif
    <header class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-1 flex-col gap-2">
            <div class="flex flex-wrap items-center gap-3">
                <x-nq::badge :variant="$levelBadge[$i['level']] ?? 'neutral'">{{ $t['levels'][$i['level']] ?? $i['level'] }}</x-nq::badge>
                @foreach ($statusTone as $s => $tone)
                    <x-nq::status :tone="$tone" x-show="statusOf('{{ $id }}') === '{{ $s }}'" :style="$i['status'] === $s ? '' : 'display: none'">{{ $t['statuses'][$s] }}</x-nq::status>
                @endforeach
            </div>
            <h2 dir="auto" class="break-words text-h3 text-foreground">{{ $i['title'] }}</h2>
            @if (! empty($i['culprit']))
                <p class="text-body-sm text-muted-foreground">{{ $t['culprit'] }}: <bdi dir="ltr" class="font-mono text-code">{{ $i['culprit'] }}</bdi></p>
            @endif
        </div>
        @if ($canChange)
            <div class="flex flex-wrap gap-2">
                <div class="flex flex-wrap gap-2" x-show="statusOf('{{ $id }}') === 'unresolved'" @if ($i['status'] !== 'unresolved') style="display: none" @endif>
                    <x-nq::button variant="primary" x-bind:disabled="busy !== null" x-bind:aria-busy="busy === 'resolved' ? 'true' : null" x-on:click="changeStatus('{{ $id }}', 'resolved')">
                        <x-nq::spinner x-show="busy === 'resolved'" style="display: none" /><x-lucide-check-check aria-hidden="true" x-show="busy !== 'resolved'" />{{ $t['resolve'] }}
                    </x-nq::button>
                    <x-nq::button variant="secondary" x-bind:disabled="busy !== null" x-bind:aria-busy="busy === 'ignored' ? 'true' : null" x-on:click="changeStatus('{{ $id }}', 'ignored')">
                        <x-nq::spinner x-show="busy === 'ignored'" style="display: none" /><x-lucide-eye-off aria-hidden="true" x-show="busy !== 'ignored'" />{{ $t['ignore'] }}
                    </x-nq::button>
                </div>
                <div class="flex flex-wrap gap-2" x-show="statusOf('{{ $id }}') !== 'unresolved'" @if ($i['status'] === 'unresolved') style="display: none" @endif>
                    <x-nq::button variant="secondary" x-bind:disabled="busy !== null" x-bind:aria-busy="busy === 'unresolved' ? 'true' : null" x-on:click="changeStatus('{{ $id }}', 'unresolved')">
                        <x-nq::spinner x-show="busy === 'unresolved'" style="display: none" /><x-lucide-rotate-ccw aria-hidden="true" x-show="busy !== 'unresolved'" />{{ $t['reopen'] }}
                    </x-nq::button>
                </div>
            </div>
        @endif
    </header>
    <p role="alert" class="text-body-sm text-nq-danger-text" x-show="failure" x-text="failure" style="display: none"></p>

    <div class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div class="min-w-0">
            <x-nq::tabs default-value="stack">
                <x-nq::tabs.list variant="underline">
                    <x-nq::tabs.tab value="stack">{{ $t['stack'] }}</x-nq::tabs.tab>
                    <x-nq::tabs.tab value="breadcrumbs">{{ $t['breadcrumbs'] }}</x-nq::tabs.tab>
                    <x-nq::tabs.tab value="tags">{{ $t['tags'] }}</x-nq::tabs.tab>
                    @if ($hasDiag)<x-nq::tabs.tab value="diagnostics">{{ $t['diagnostics'] }}</x-nq::tabs.tab>@endif
                    <x-nq::tabs.indicator />
                </x-nq::tabs.list>
                <x-nq::tabs.panel value="stack">
                    @if ($frames)
                        <ol class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
                            @foreach ($frames as $f)
                                @php $inApp = ! empty($f['inApp']); $ctx = array_values((array) ($f['context'] ?? [])); @endphp
                                <li data-in-app="{{ $inApp ? 'true' : 'false' }}" x-data="{ expanded: false, showText: {{ \Illuminate\Support\Js::from($t['showContext'])->toHtml() }}, hideText: {{ \Illuminate\Support\Js::from($t['hideContext'])->toHtml() }} }" class="flex flex-col gap-2 px-3 py-2 {{ array_key_exists('inApp', $f) && ! $inApp ? 'opacity-70' : '' }}">
                                    <div class="flex flex-wrap items-center gap-2">
                                        @if ($ctx)
                                            <x-nq::button size="icon-sm" variant="ghost" x-bind:aria-expanded="expanded ? 'true' : 'false'" aria-expanded="false" aria-label="{{ $t['showContext'] }}"
                                                x-bind:aria-label="expanded ? hideText : showText" x-on:click="expanded = ! expanded">
                                                <x-lucide-chevron-right aria-hidden="true" class="transition-transform rtl:-scale-x-100" x-bind:class="expanded ? 'rotate-90 rtl:rotate-90' : ''" />
                                            </x-nq::button>
                                        @endif
                                        <bdi dir="ltr" class="min-w-0 break-all font-mono text-code text-foreground">
                                            @if (! empty($f['fn']))<span class="font-semibold">{{ $f['fn'] }} </span>@endif
                                            <span class="text-muted-foreground">{{ nq_et_location($f) }}</span>
                                        </bdi>
                                        <x-nq::badge :variant="$inApp ? 'info' : 'neutral'" class="ms-auto">{{ $inApp ? $t['inApp'] : $t['library'] }}</x-nq::badge>
                                    </div>
                                    @if ($ctx)
                                        <ol dir="ltr" x-show="expanded" style="display: none" class="overflow-x-auto rounded-control border border-border bg-muted py-1 font-mono text-code">
                                            @foreach ($ctx as $c)
                                                @php $hot = isset($f['line']) && (int) $c['line'] === (int) $f['line']; @endphp
                                                <li @if ($hot) data-hot="true" @endif class="flex gap-3 px-3 {{ $hot ? 'bg-nq-danger-soft' : '' }}">
                                                    <span aria-hidden="true" class="w-8 shrink-0 select-none text-end tabular-nums text-muted-foreground">{{ $c['line'] }}</span>
                                                    <code class="whitespace-pre text-foreground">{{ $c['code'] }}</code>
                                                </li>
                                            @endforeach
                                        </ol>
                                    @endif
                                </li>
                            @endforeach
                        </ol>
                    @else
                        <p class="text-body-sm text-muted-foreground">{{ $t['noStack'] }}</p>
                    @endif
                </x-nq::tabs.panel>
                <x-nq::tabs.panel value="breadcrumbs">
                    @if ($crumbs)
                        <ol class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
                            @foreach ($crumbs as $b)
                                <li data-type="{{ $b['type'] }}" class="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
                                    <x-nq::badge :variant="$b['type'] === 'error' ? 'danger' : 'neutral'" class="shrink-0">{{ $t['crumbTypes'][$b['type']] ?? $b['type'] }}</x-nq::badge>
                                    <bdi dir="auto" class="min-w-0 flex-1 break-words text-body-sm text-foreground">{{ $b['message'] }}</bdi>
                                    <span class="text-caption tabular-nums text-muted-foreground"><time datetime="{{ \Carbon\CarbonImmutable::parse($b['at'])->toIso8601String() }}" class="[unicode-bidi:isolate]">{{ nq_et_clock($b['at'], $locale) }}</time></span>
                                </li>
                            @endforeach
                        </ol>
                    @else
                        <p class="text-body-sm text-muted-foreground">{{ $t['noBreadcrumbs'] }}</p>
                    @endif
                </x-nq::tabs.panel>
                <x-nq::tabs.panel value="tags">
                    @if ($tags)
                        <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-card border border-border bg-card p-3 text-body-sm">
                            @foreach ($tags as $k => $v)
                                <div class="col-span-2 grid grid-cols-subgrid">
                                    <dt class="text-muted-foreground"><bdi dir="ltr">{{ $k }}</bdi></dt>
                                    <dd class="text-foreground"><bdi dir="ltr">{{ $v }}</bdi></dd>
                                </div>
                            @endforeach
                        </dl>
                    @else
                        <p class="text-body-sm text-muted-foreground">{{ $t['noTags'] }}</p>
                    @endif
                </x-nq::tabs.panel>
                @if ($hasDiag)
                    <x-nq::tabs.panel value="diagnostics">
                        <x-nq::error-tracking.diagnostics :diagnostics="$diag" :labels="$labels" :locale="$locale" />
                    </x-nq::tabs.panel>
                @endif
            </x-nq::tabs>
        </div>

        <aside aria-label="{{ $t['summary'] }}" class="flex flex-col gap-3 self-start rounded-card border border-border bg-card p-4">
            <dl class="grid grid-cols-2 gap-3">
                <div>
                    <dt class="text-caption text-muted-foreground">{{ $t['events'] }}</dt>
                    <dd class="text-h3 tabular-nums"><bdi>{{ nq_et_num($i['count'] ?? 0, $locale) }}</bdi></dd>
                </div>
                <div>
                    <dt class="text-caption text-muted-foreground">{{ $t['users'] }}</dt>
                    <dd class="text-h3 tabular-nums"><bdi>{{ isset($i['users']) ? nq_et_num($i['users'], $locale) : '—' }}</bdi></dd>
                </div>
            </dl>
            @if ($series)
                <div class="flex flex-col gap-1">
                    <div class="flex items-center justify-between text-caption text-muted-foreground">
                        <span>{{ $t['frequency'] }}</span>
                        <span class="inline-flex items-center gap-1">
                            @if ($trend === 'up')<x-lucide-trending-up aria-hidden="true" class="size-3.5" />@elseif ($trend === 'down')<x-lucide-trending-down aria-hidden="true" class="size-3.5" />@endif
                            {{ $trend === 'up' ? $t['trendUp'] : ($trend === 'down' ? $t['trendDown'] : $t['trendFlat']) }}
                        </span>
                    </div>
                    <x-nq::chart.sparkline :data="$series" :color="$trendColor[$trend]" :label="str_replace('{n}', nq_et_num(nq_et_total($series), $locale), $t['frequencyLabel'])" class="h-12 w-full" />
                </div>
            @endif
            <dl class="flex flex-col gap-1.5 text-body-sm">
                <div class="flex items-center justify-between gap-3"><dt class="text-muted-foreground">{{ $t['firstSeen'] }}</dt><dd class="min-w-0 truncate text-foreground">{!! $when($i['firstSeen']) !!}</dd></div>
                <div class="flex items-center justify-between gap-3"><dt class="text-muted-foreground">{{ $t['lastSeen'] }}</dt><dd class="min-w-0 truncate text-foreground">{!! $when($i['lastSeen']) !!}</dd></div>
                @if (! empty($i['release']))
                    <div class="flex items-center justify-between gap-3"><dt class="text-muted-foreground">{{ $t['release'] }}</dt><dd class="min-w-0 truncate text-foreground"><bdi dir="ltr" class="font-mono text-code">{{ $i['release'] }}</bdi></dd></div>
                @endif
                @if (! empty($i['environment']))
                    <div class="flex items-center justify-between gap-3"><dt class="text-muted-foreground">{{ $t['environment'] }}</dt><dd class="min-w-0 truncate text-foreground"><x-nq::badge variant="outline">{{ $i['environment'] }}</x-nq::badge></dd></div>
                @endif
            </dl>
        </aside>
    </div>
</div>
