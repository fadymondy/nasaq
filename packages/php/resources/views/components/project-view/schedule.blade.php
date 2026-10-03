{{-- <x-nq::project-view.schedule :issues="$issues" :statuses="$statuses" today="2026-09-29" />
     The Timeline tab's schedule of x-nq::project-view: one bar per scheduled issue between its start and due date, a week ruler and a today line.
     Each row has a context menu (and a more button) with Open and Copy key; they call openAt(i) and copyAt(i) on the enclosing x-nq::project-view (i is the index of the issue in `issues`).
     issues: as for x-nq::issue-view (startDate, dueDate, createdAt, completedAt, statusId, key, title). statuses: [['id', 'name', 'hue', 'stage']]. today: civil "Y-m-d".
     text: array overriding the words (see x-nq::project-view). locale: default the app locale. Static: re-render after a change. --}}
@include('nasaq::components.project-view._logic')
@props(['issues' => [], 'statuses' => [], 'today', 'text' => [], 'locale' => null, 'openable' => true])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = nq_pv_words($locale, (array) $text);
    $issues = array_values((array) $issues);
    $range = nq_pv_range($issues);
    $bars = $range ? nq_pv_bars($issues, $range, (array) $statuses) : [];
    $ticks = $range ? nq_pv_ticks($range) : [];
    $statusOf = collect($statuses)->keyBy('id');
    $loose = collect($issues)->filter(fn ($i) => ! isset($bars[(string) $i['id']]))->pluck('key');
    $todayAt = null;
    if ($range && $today >= $range['start'] && $today <= $range['end']) {
        $todayAt = nq_pv_days_between($range['start'], $today) / (nq_pv_days_between($range['start'], $range['end']) + 1) * 100;
    }
    $d = fn ($key) => nq_pv_date($key, $ar, false);
    $pct = fn ($v) => rtrim(rtrim(number_format((float) $v, 3, '.', ''), '0'), '.');
@endphp
@if (! $range || count($bars) === 0)
    <x-nq::states.empty :title="$t['scheduleEmpty']" :description="$t['scheduleEmptyHint']" />
@else
    <div data-slot="{{ $attributes->get('data-slot', 'project-schedule') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
        <div role="group" aria-label="{{ $t['scheduleLabel'] }}" class="min-w-0 overflow-x-auto rounded-card border border-border">
            <div class="min-w-[44rem]">
                <div class="grid grid-cols-[13rem_minmax(0,1fr)] border-b border-border bg-muted/40 text-caption text-muted-foreground">
                    <div class="px-3 py-2"></div>
                    <div class="relative h-8">
                        @foreach ($ticks as $tick)
                            <span class="absolute top-2 whitespace-nowrap ps-1.5" style="inset-inline-start: {{ $pct($tick['offset']) }}%">{{ $d($tick['date']) }}</span>
                        @endforeach
                    </div>
                </div>
                <div role="list" class="m-0 p-0">
                    @foreach ($issues as $n => $issue)
                        @continue(! isset($bars[(string) $issue['id']]))
                        @php $bar = $bars[(string) $issue['id']]; $st = $statusOf[$issue['statusId']] ?? null; @endphp
                        <x-nq::context-menu>
                            <x-nq::context-menu.trigger role="listitem" data-issue-id="{{ $issue['id'] }}" class="grid grid-cols-[13rem_minmax(0,1fr)] items-center border-b border-border last:border-b-0">
                                <div class="flex min-w-0 items-center gap-2 px-3 py-2">
                                    <x-nq::issue-view.status-dot :hue="$st['hue'] ?? 'gray'" />
                                    <bdi dir="ltr" class="shrink-0 font-mono text-caption text-muted-foreground">{{ $issue['key'] }}</bdi>
                                    <button type="button" x-on:click="openAt({{ $n }})" class="min-w-0 flex-1 truncate text-start text-body-sm outline-none hover:underline focus-visible:underline">{{ $issue['title'] }}</button>
                                    <x-nq::dropdown-menu>
                                        <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" aria-label="{{ $t['actions'] }}: {{ $issue['key'] }}"><x-lucide-ellipsis aria-hidden="true" /></x-nq::dropdown-menu.trigger>
                                        <x-nq::dropdown-menu.content align="end">
                                            <x-nq::dropdown-menu.item x-on:click="openAt({{ $n }})"><x-lucide-external-link aria-hidden="true" />{{ $t['openIssue'] }}</x-nq::dropdown-menu.item>
                                            <x-nq::dropdown-menu.item x-on:click="copyAt({{ $n }})"><x-lucide-link-2 aria-hidden="true" />{{ $t['copyKey'] }}</x-nq::dropdown-menu.item>
                                        </x-nq::dropdown-menu.content>
                                    </x-nq::dropdown-menu>
                                </div>
                                <div class="relative h-9">
                                    @if ($todayAt !== null)
                                        <span aria-hidden="true" class="absolute inset-y-0 w-px bg-nq-danger" style="inset-inline-start: {{ $pct($todayAt) }}%"></span>
                                    @endif
                                    <span role="img" aria-label="{{ $issue['key'] }}: {{ $d($bar['start']) }} - {{ $d($bar['end']) }}"
                                        class="{{ $bar['done'] ? 'absolute top-2.5 h-4 rounded-full opacity-60' : 'absolute top-2.5 h-4 rounded-full' }}"
                                        style="inset-inline-start: {{ $pct($bar['offset']) }}%; inline-size: {{ $pct($bar['width']) }}%; background: var(--nq-tag-{{ $st['hue'] ?? 'gray' }})"></span>
                                </div>
                            </x-nq::context-menu.trigger>
                            <x-nq::context-menu.content>
                                <x-nq::context-menu.item x-on:click="openAt({{ $n }})"><x-lucide-external-link aria-hidden="true" />{{ $t['openIssue'] }}</x-nq::context-menu.item>
                                <x-nq::context-menu.item x-on:click="copyAt({{ $n }})"><x-lucide-link-2 aria-hidden="true" />{{ $t['copyKey'] }}</x-nq::context-menu.item>
                            </x-nq::context-menu.content>
                        </x-nq::context-menu>
                    @endforeach
                </div>
            </div>
        </div>
        @if ($todayAt !== null)
            <p class="m-0 flex items-center gap-2 text-caption text-muted-foreground"><span aria-hidden="true" class="inline-block h-3 w-px bg-nq-danger"></span>{{ $t['today'] }}</p>
        @endif
        @if ($loose->isNotEmpty())
            <p class="m-0 text-body-sm text-muted-foreground">{{ $t['unscheduled'] }}: <bdi dir="ltr">{{ $loose->implode(', ') }}</bdi></p>
        @endif
    </div>
@endif
