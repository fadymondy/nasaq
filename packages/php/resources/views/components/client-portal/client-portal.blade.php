{{-- <x-nq::client-portal :project="['name' => 'New booking platform', 'client' => 'Tamkeen Co.']" :tasks="$tasks" :requests="$requests" :weeks="$weeks" :budget-hours="240"
       :invoices="$invoices" currency="USD" :activity="$activity" :open-issues="4" request-form />
     What a customer sees of their project. Aggregates and sent documents only: progress ring, hours against the budget, a read-only board, requests (with a form),
     hours per week, sent invoices and an activity feed. Drafts are removed from the invoices here; no internal issues, no single time entries.
     project: ['name', 'client'?, 'summary'?, 'due'?]. tasks: [['id', 'title', 'status' => todo|doing|review|done, 'assignee'?, 'due'?]]. requests: [['id', 'title', 'description'?,
     'status' => pending|accepted|declined|done, 'createdAt', 'by'?, 'reply'?]]. weeks: [['week' => '2026-09-07', 'hours']]. budget-hours: 0 hides the budget bar.
     invoices: as x-nq::invoice-list. currency: ISO 4217 (USD, or SAR in Arabic). activity: [['id', 'actor' => ['name', 'avatar'?], 'title', 'description'?, 'at']].
     request-form: shows the "Ask for something" form. open-invoice / pay-invoice / download-invoice: passed to the invoice list as open / pay / download.
     task-actions / request-actions / activity-actions: [['id', 'label', 'icon' (a lucide name), 'danger', 'group', 'disabled']] open on context-click, long-press, Shift+F10 or the Menu key
     on a card, request or event; week-actions are the weekly table's row menu (x-nq::data-table row-actions). tab / default-tab: overview | board | requests | time | invoices | activity.
     chart-weeks: weeks drawn on Overview (8). labels: override any string (the same keys as the React ClientPortal). Replace the header with the `header` slot.
     Bubbling events: "portal-request" { title, description, waitUntil(promise), fail(message) } (fail or a rejected promise keeps the text and shows the message),
     "portal-action" { kind: task | request | activity, action, id }, "portal-tab-change" { tab }, plus the invoice list's nq-invoice-* and the table's nq-data-table-action.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'project', 'tasks' => [], 'openIssues' => 0, 'requests' => [], 'weeks' => [], 'budgetHours' => 0, 'invoices' => [], 'currency' => null, 'activity' => [],
    'requestForm' => false, 'openInvoice' => false, 'payInvoice' => false, 'downloadInvoice' => false, 'taskActions' => [], 'requestActions' => [], 'weekActions' => [],
    'activityActions' => [], 'tab' => null, 'defaultTab' => 'overview', 'chartWeeks' => 8, 'locale' => null, 'labels' => [], 'header' => null,
])
@include('nasaq::components.client-portal._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_cp_words($locale, (array) $labels);
    $num = fn ($n, $o = []) => nq_cp_num($n, $locale, $o);
    $hrs = fn ($n) => nq_cp_num($n, $locale, ['max' => 1]);
    $tasks = array_values(array_map(fn ($x) => (array) $x, (array) $tasks));
    $requests = array_values(array_map(fn ($x) => (array) $x, (array) $requests));
    $weeks = array_values(array_map(fn ($x) => (array) $x, (array) $weeks));
    $activity = array_values(array_map(fn ($x) => (array) $x, (array) $activity));
    $statuses = ['todo', 'doing', 'review', 'done'];
    $progress = nq_cp_progress($tasks);
    $used = nq_cp_total_hours($weeks);
    $budget = nq_cp_budget($budgetHours, $used);
    $pending = count(array_filter($requests, fn ($r) => $r['status'] === 'pending'));
    $visibleInvoices = array_values(array_filter((array) $invoices, fn ($i) => ((array) $i)['status'] !== 'draft'));
    $recentWeeks = array_reverse(array_slice(nq_cp_weeks_newest_first($weeks), 0, $chartWeeks));
    $maxWeek = max(1, ...array_map(fn ($w) => $w['hours'], $recentWeeks ?: [['hours' => 1]]));
    $ring = nq_cp_ring($progress['percent'], 52);
    $percentText = $num($progress['percent'] / 100, ['percent' => true]);
    $budgetText = nq_cp_fill($t['budgetUsed'], ['used' => $hrs($used), 'budget' => $hrs($budget['budget'])]);
    $requestTone = ['pending' => 'warning', 'accepted' => 'info', 'declined' => 'danger', 'done' => 'success'];
    $startTab = $tab ?? $defaultTab;
    $sortedRequests = collect($requests)->sortByDesc('createdAt')->values()->all();
    $sortedActivity = collect($activity)->sortByDesc('at')->values()->all();
    $weekRows = array_map(fn ($w) => ['id' => $w['week'], 'week' => $w['week'], 'hours' => $w['hours']], nq_cp_weeks_newest_first($weeks));
    $weekColumns = [
        ['id' => 'week', 'header' => $t['weekOf'], 'type' => 'date', 'sortable' => true, 'hideable' => false],
        ['id' => 'hours', 'header' => $t['hours'], 'type' => 'number', 'align' => 'end', 'sortable' => true, 'hideable' => false],
    ];
    $weekActionList = array_values((array) $weekActions);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'client-portal') }}" x-data="nqClientPortal(@js(['tab' => $startTab, 'strings' => ['titleRequired' => $t['titleRequired']]]))"
    {{ $attributes->except('data-slot')->cn('flex w-full min-w-0 flex-col gap-5') }}>
    @if ($header && ! $header->isEmpty())
        {{ $header }}
    @else
        <header class="flex flex-col gap-1">
            @if (! empty($project['client']))<p class="text-caption text-muted-foreground">{{ $project['client'] }}</p>@endif
            <h1 class="text-heading-lg font-semibold">{{ $project['name'] }}</h1>
            @if (! empty($project['summary']))<p class="max-w-prose text-body-sm text-muted-foreground">{{ $project['summary'] }}</p>@endif
            @if (! empty($project['due']))<p class="text-caption text-muted-foreground">{{ $t['due'] }}: {{ nq_cp_date($project['due'], $locale) }}</p>@endif
        </header>
    @endif

    <x-nq::tabs :default-value="$startTab" x-model="portalTab">
        <x-nq::tabs.list variant="underline" class="max-w-full overflow-x-auto">
            @foreach ($t['tabs'] as $k => $label)
                <x-nq::tabs.tab :value="$k">{{ $label }}</x-nq::tabs.tab>
            @endforeach
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>

        <x-nq::tabs.panel value="overview" class="flex flex-col gap-4 pt-4">
            <div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <x-nq::card>
                    <x-nq::card.header><x-nq::card.title as="h2">{{ $t['progress'] }}</x-nq::card.title></x-nq::card.header>
                    <x-nq::card.content class="flex flex-wrap items-center gap-5">
                        <div data-slot="portal-ring" class="relative size-36 shrink-0">
                            <svg viewBox="0 0 120 120" role="img" aria-label="{{ $percentText }} {{ $t['percentDone'] }}" class="size-full -rotate-90">
                                <circle cx="60" cy="60" r="52" fill="none" stroke-width="10" class="stroke-muted" />
                                <circle cx="60" cy="60" r="52" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="{{ $ring['circumference'] }}" stroke-dashoffset="{{ $ring['offset'] }}" class="stroke-primary transition-[stroke-dashoffset] motion-reduce:transition-none" />
                            </svg>
                            <div aria-hidden="true" class="absolute inset-0 flex flex-col items-center justify-center">
                                <span class="text-heading-lg font-semibold tabular-nums">{{ $percentText }}</span>
                                <span class="text-caption text-muted-foreground">{{ $t['percentDone'] }}</span>
                            </div>
                        </div>
                        <div class="flex min-w-0 flex-1 flex-col gap-2">
                            <p class="text-body-sm">{{ nq_cp_fill($t['tasksDone'], ['done' => $num($progress['done']), 'total' => $num($progress['total'])]) }}</p>
                            <ul class="flex flex-col gap-1 text-caption text-muted-foreground">
                                @foreach ($statuses as $s)
                                    <li class="flex justify-between gap-3"><span>{{ $t['columns'][$s] }}</span><span class="tabular-nums">{{ $num($progress['byStatus'][$s]) }}</span></li>
                                @endforeach
                            </ul>
                        </div>
                    </x-nq::card.content>
                </x-nq::card>
                <div class="flex min-w-0 flex-col gap-4">
                    <x-nq::stat-card.grid>
                        <x-nq::stat-card :label="$t['hoursUsed']">{{ $hrs($used) }}</x-nq::stat-card>
                        <x-nq::stat-card :label="$budget['budget'] > 0 ? $t['hoursLeft'] : $t['hoursBudget']">{{ $budget['budget'] > 0 ? $hrs($budget['remaining']) : $t['noBudget'] }}</x-nq::stat-card>
                        <x-nq::stat-card :label="$t['openIssues']">{{ $num($openIssues ?? 0) }}</x-nq::stat-card>
                        <x-nq::stat-card :label="$t['pendingRequests']">{{ $num($pending) }}</x-nq::stat-card>
                    </x-nq::stat-card.grid>
                    @if ($budget['budget'] > 0)
                        <x-nq::progress :value="$budget['percent']" :tone="$budget['tone']" :label="$budget['over'] ? $t['overBudget'] : $budgetText" aria-label="{{ $budgetText }}" />
                    @endif
                </div>
            </div>
            <x-nq::card>
                <x-nq::card.header><x-nq::card.title as="h2">{{ $t['weekly'] }}</x-nq::card.title></x-nq::card.header>
                <x-nq::card.content>
                    @if (! $recentWeeks)
                        <p class="text-body-sm text-muted-foreground">{{ $t['noTime'] }}</p>
                    @else
                        <div role="img" aria-label="{{ nq_cp_fill($t['weeklyLabel'], ['n' => $num(count($recentWeeks))]) }}" class="flex h-40 items-end gap-2">
                            @foreach ($recentWeeks as $w)
                                <div aria-hidden="true" class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                                    <span class="text-caption tabular-nums text-muted-foreground">{{ $hrs($w['hours']) }}</span>
                                    <div class="w-full max-w-10 rounded-t-control bg-primary" style="height: {{ max(4, $w['hours'] / $maxWeek * 100) }}%"></div>
                                    <span class="w-full truncate text-center text-caption text-muted-foreground">{{ nq_cp_date($w['week'], $locale, 'MMM d') }}</span>
                                </div>
                            @endforeach
                        </div>
                    @endif
                </x-nq::card.content>
            </x-nq::card>
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="board" class="flex flex-col gap-3 pt-4">
            <p class="text-caption text-muted-foreground">{{ $t['boardNote'] }}</p>
            <div class="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
                @foreach ($statuses as $s)
                    @php $cards = array_values(array_filter($tasks, fn ($x) => $x['status'] === $s)); @endphp
                    <section aria-label="{{ $t['columns'][$s] }}" class="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-muted/40 p-2">
                        <h3 class="flex items-center justify-between px-1 text-label">
                            <span>{{ $t['columns'][$s] }}</span>
                            <span class="text-caption tabular-nums text-muted-foreground">{{ $num(count($cards)) }}</span>
                        </h3>
                        <div role="list" class="flex flex-col gap-2">
                            @if (! $cards)<div role="listitem" class="px-1 py-3 text-caption text-muted-foreground">{{ $t['noCards'] }}</div>@endif
                            @foreach ($cards as $c)
                                @php $cardClass = 'flex flex-col gap-2 rounded-control border border-border bg-card p-3 text-body-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'; @endphp
                                @if ($taskActions)
                                    <x-nq::context-menu>
                                        <x-nq::context-menu.trigger role="listitem" data-slot="portal-task" tabindex="0" :class="$cardClass">
                                            <span>{{ $c['title'] }}</span>
                                            <span class="flex items-center gap-2 text-caption text-muted-foreground">
                                                @if (! empty($c['assignee']))<x-nq::avatar :name="$c['assignee']" size="sm" />@endif
                                                <span class="truncate">{{ $c['assignee'] ?? $t['unassigned'] }}</span>
                                            </span>
                                        </x-nq::context-menu.trigger>
                                        @include('nasaq::components.client-portal._actions', ['kind' => 'task', 'actions' => array_values($taskActions), 'id' => (string) $c['id']])
                                    </x-nq::context-menu>
                                @else
                                    <div role="listitem" data-slot="portal-task" class="{{ $cardClass }}">
                                        <span>{{ $c['title'] }}</span>
                                        <span class="flex items-center gap-2 text-caption text-muted-foreground">
                                            @if (! empty($c['assignee']))<x-nq::avatar :name="$c['assignee']" size="sm" />@endif
                                            <span class="truncate">{{ $c['assignee'] ?? $t['unassigned'] }}</span>
                                        </span>
                                    </div>
                                @endif
                            @endforeach
                        </div>
                    </section>
                @endforeach
            </div>
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="requests" class="flex flex-col gap-4 pt-4">
            @if ($requestForm)
                <form data-slot="portal-request-form" novalidate class="flex w-full max-w-xl flex-col gap-3 rounded-card border border-border bg-card p-4" x-on:submit.prevent="submit()">
                    <h2 class="text-heading-sm font-semibold">{{ $t['newRequest'] }}</h2>
                    <x-nq::field x-model="formInvalid">
                        <x-nq::field.label>{{ $t['requestTitle'] }}</x-nq::field.label>
                        <x-nq::field.input x-model="reqTitle" />
                        <x-nq::field.error><span x-text="error"></span></x-nq::field.error>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['requestDetails'] }} {{ $t['requestDetailsOptional'] }}</x-nq::field.label>
                        <x-nq::field.textarea x-model="reqDescription" />
                    </x-nq::field>
                    <div class="flex items-center gap-3">
                        <x-nq::button type="submit" variant="primary" x-bind:disabled="busy" x-bind:aria-busy="busy">{{ $t['send'] }}</x-nq::button>
                        <span role="status" class="text-body-sm text-muted-foreground" x-show="sent" style="display: none">{{ $t['sent'] }}</span>
                    </div>
                </form>
            @endif
            <h2 class="text-heading-sm font-semibold">{{ $t['requests'] }}</h2>
            @if (! $requests)
                <x-nq::states.empty :title="$t['noRequests']" :description="$t['noRequestsBody']" />
            @else
                <div role="list" class="flex w-full flex-col gap-2">
                    @foreach ($sortedRequests as $r)
                        @php $reqClass = 'flex flex-col gap-1 rounded-card border border-border bg-card p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring'; @endphp
                        @if ($requestActions)
                            <x-nq::context-menu>
                                <x-nq::context-menu.trigger role="listitem" data-slot="portal-request" tabindex="0" :class="$reqClass">
                                    @include('nasaq::components.client-portal._request', ['r' => $r])
                                </x-nq::context-menu.trigger>
                                @include('nasaq::components.client-portal._actions', ['kind' => 'request', 'actions' => array_values($requestActions), 'id' => (string) $r['id']])
                            </x-nq::context-menu>
                        @else
                            <div role="listitem" data-slot="portal-request" class="{{ $reqClass }}">
                                @include('nasaq::components.client-portal._request', ['r' => $r])
                            </div>
                        @endif
                    @endforeach
                </div>
            @endif
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="time" class="pt-4">
            <div class="flex w-full flex-col gap-4">
                <x-nq::stat-card.grid>
                    <x-nq::stat-card :label="$t['total']">{{ $hrs($used) }}</x-nq::stat-card>
                    <x-nq::stat-card :label="$t['hoursBudget']">{{ $budget['budget'] > 0 ? $hrs($budget['budget']) : $t['noBudget'] }}</x-nq::stat-card>
                    <x-nq::stat-card :label="$t['hoursLeft']">{{ $budget['budget'] > 0 ? $hrs($budget['remaining']) : '—' }}</x-nq::stat-card>
                </x-nq::stat-card.grid>
                @if ($budget['budget'] > 0)
                    <x-nq::progress :value="$budget['percent']" :tone="$budget['tone']" aria-label="{{ $budgetText }}" />
                @endif
                <x-nq::data-table :label="$t['weeksTable']" :columns="$weekColumns" :rows="$weekRows" :search="false" :view-options="false" :row-actions="$weekActionList" :locale="$locale">
                    <x-slot:empty>{{ $t['noTime'] }}</x-slot:empty>
                </x-nq::data-table>
            </div>
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="invoices" class="pt-4">
            @if (! $visibleInvoices)
                <x-nq::states.empty :title="$t['noInvoices']" :description="$t['noInvoicesBody']" />
            @else
                <x-nq::invoice-list :invoices="$visibleInvoices" :currency="$currency" :open="$openInvoice" :pay="$payInvoice" :download="$downloadInvoice" />
            @endif
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="activity" class="pt-4">
            @if (! $activity)
                <x-nq::states.empty :title="$t['noActivity']" />
            @else
                <x-nq::timeline>
                    @foreach ($sortedActivity as $a)
                        @if ($activityActions)
                            <x-nq::context-menu>
                                <x-nq::context-menu.trigger tabindex="0" class="outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    <x-nq::timeline.item :actor="$a['actor'] ?? null" :title="$a['title']" :description="$a['description'] ?? null" :time="$a['at']" />
                                </x-nq::context-menu.trigger>
                                @include('nasaq::components.client-portal._actions', ['kind' => 'activity', 'actions' => array_values($activityActions), 'id' => (string) $a['id']])
                            </x-nq::context-menu>
                        @else
                            <x-nq::timeline.item :actor="$a['actor'] ?? null" :title="$a['title']" :description="$a['description'] ?? null" :time="$a['at']" />
                        @endif
                    @endforeach
                </x-nq::timeline>
            @endif
        </x-nq::tabs.panel>
    </x-nq::tabs>
</div>
