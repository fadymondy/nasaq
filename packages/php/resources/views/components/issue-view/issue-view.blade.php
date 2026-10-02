{{-- <x-nq::issue-view :issue="$issue" :statuses="$statuses" :labels="$labels" :people="$people" :projects="$projects" update :thread="['comments' => $comments, 'post' => true]" />
     Everything about one issue in one place: key and inline-editable title, description, a properties sidebar, checklist, sub-issues, linked pull requests and commits, then tabs for comments, activity, time (with the running timer) and AI cost.
     Presentational: you own the data. A tab appears only for the part you pass.
     issue: ['id', 'key', 'title', 'description' (HTML), 'type', 'priority', 'statusId', 'assigneeId', 'labelIds', 'estimateHours', 'dueDate' (Y-m-d), 'projectId', 'parentId', 'createdAt', 'updatedAt'].
     statuses: [['id', 'name', 'hue', 'stage' => backlog|todo|active|done|canceled]]. labels: [['id', 'name', 'hue']]. people: [['id', 'name', 'avatar']]. projects: [['id', 'name']].
     parent-options: [['id', 'key', 'title', 'statusId', 'parentId']]. sub-issues: [['id', 'key', 'title', 'statusId', 'assigneeId']].
     update: switch editing on (title, description and properties). add-sub-issue: show the add row. open-issue: sub-issue rows and the parent key open the issue (event). back: show the Back button (page variant).
     checklist: ['items', 'add', 'remove', 'readOnly']. development: ['repo', 'pulls', 'commits', 'runs']. thread: ['comments', 'currentUser', 'suggestions', 'post', 'edit', 'delete', 'approve', 'canModerate', 'signedIn'].
     activity: ['items', 'toggle', 'delete']. time: ['entries', 'running']. ai: ['days', 'byModel', 'byProduct', 'byRun', 'markup', 'currency', 'previousTotal', 'run' => ['tokensIn', 'tokensOut', 'cached', 'cost', 'budget']].
     variant: page (properties beside the content on wide containers) | drawer (stacked). default-tab: comments | activity | time | ai. now: Carbon or string, the clock for due colours and the timeline.
     load: a JS expression returning the Tiptap parts (see x-nq::rich-text-editor), for the rich description; without it the description is plain text. labels-text: array overriding the built-in words. locale: default the app locale.
     The page listens on the root; each event has detail.wait(promise), resolve { error } to show the message and keep the edit:
       nq-issue-update { patch: { title | description | statusId | priority | type | assigneeId | labelIds | estimateHours | dueDate | projectId | parentId }, wait }
       nq-issue-add-sub { title, wait }, nq-issue-open { id }, nq-issue-back {}; plus the events of the comment thread, activity, time tracker and checklist inside.
     The parts are drawn by the server: re-render after a save. Needs the Alpine module (nqIssueView). --}}
@include('nasaq::components.issue-view._logic')
@props(['issue', 'statuses' => [], 'labels' => [], 'people' => [], 'projects' => [], 'parentOptions' => [], 'subIssues' => [], 'update' => false, 'addSubIssue' => false, 'openIssue' => false, 'back' => false, 'checklist' => null, 'development' => null, 'thread' => null, 'activity' => null, 'time' => null, 'ai' => null, 'variant' => 'page', 'defaultTab' => null, 'now' => null, 'load' => null, 'labelsText' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = nq_iv_words($locale, $labelsText);
    $uid = 'nq-iv-'.preg_replace('/[^A-Za-z0-9_-]/', '', (string) $issue['id']);
    $drawer = $variant === 'drawer';
    $clock = $now ? \Carbon\Carbon::parse($now) : \Carbon\Carbon::now();
    $statusOf = collect($statuses)->keyBy('id');
    $personOf = collect($people)->keyBy('id');
    $status = $statusOf[$issue['statusId']] ?? null;
    $open = nq_iv_is_open($issue, $statuses);
    $parent = ! empty($issue['parentId']) ? collect($parentOptions)->first(fn ($p) => (string) $p['id'] === (string) $issue['parentId']) : null;
    $entries = (array) ($time['entries'] ?? []);
    $loggedSeconds = array_sum(array_map(fn ($e) => (int) ($e['seconds'] ?? 0), $entries));
    $running = $time['running'] ?? null;
    $timerHere = $running && (empty($running['taskId']) || (string) $running['taskId'] === (string) $issue['id']);
    $description = (string) ($issue['description'] ?? '');
    $plain = nq_iv_html_text($description);
    $hasDesc = trim(strip_tags($description)) !== '';
    $rich = (bool) $load;
    $tabs = [];
    if ($thread) { $tabs[] = ['id' => 'comments', 'label' => $t['comments'], 'count' => count($thread['comments'] ?? [])]; }
    if ($activity) { $tabs[] = ['id' => 'activity', 'label' => $t['activity'], 'count' => count($activity['items'] ?? [])]; }
    if ($time) { $tabs[] = ['id' => 'time', 'label' => $t['time'], 'count' => 0]; }
    if ($ai) { $tabs[] = ['id' => 'ai', 'label' => $t['ai'], 'count' => 0]; }
    $firstTab = $defaultTab && collect($tabs)->contains('id', $defaultTab) ? $defaultTab : ($tabs[0]['id'] ?? null);
    $timeProjects = [['id' => $issue['projectId'] ?? '', 'name' => collect($projects)->first(fn ($p) => (string) $p['id'] === (string) ($issue['projectId'] ?? ''))['name'] ?? ($issue['projectId'] ?? ''), 'tasks' => [['id' => $issue['id'], 'name' => $issue['key'].' '.$issue['title']]]]];
    $subs = nq_iv_sub_progress($subIssues, $statuses);
    $date = fn ($d) => \Carbon\Carbon::parse($d)->locale($ar ? 'ar' : 'en')->isoFormat('ll');
    $config = [
        'title' => (string) $issue['title'],
        'description' => $description,
        'plain' => $plain,
        'labels' => ['failed' => $t['failed'], 'titleEmpty' => $t['titleEmpty']],
    ];
    $iconBack = $ar ? 'lucide-arrow-right' : 'lucide-arrow-left';
@endphp
@php ob_start(); @endphp
<section aria-label="{{ $t['details'] }}" class="flex min-w-0 flex-col gap-3">
    <x-nq::issue-view.properties :issue="$issue" :statuses="$statuses" :labels="$labels" :people="$people" :projects="$projects" :parent-options="$parentOptions" :logged-seconds="$loggedSeconds" :update="$update" :now="$clock" :text="$labelsText" :locale="$locale" />
    <p class="m-0 flex flex-wrap gap-x-3 text-caption text-muted-foreground">
        <span>{{ $t['created'] }} <bdi>{{ ! empty($issue['createdAt']) ? $date($issue['createdAt']) : '' }}</bdi></span>
        @if (! empty($issue['updatedAt']))
            <span>{{ $t['updated'] }} <bdi>{{ $date($issue['updatedAt']) }}</bdi></span>
        @endif
    </p>
</section>
@php $detailsHtml = new \Illuminate\Support\HtmlString(ob_get_clean()); @endphp
<article data-slot="{{ $attributes->get('data-slot', 'issue-view') }}" data-variant="{{ $variant }}" x-data="nqIssueView(@js($config))"
    {{ $attributes->except('data-slot')->cn('@container flex min-w-0 flex-col gap-4') }}>
    <header class="flex min-w-0 flex-col gap-2">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
            @if ($back && ! $drawer)
                <x-nq::button variant="ghost" size="sm" x-on:click="back()">@svg($iconBack, 'size-4', ['aria-hidden' => 'true']){{ $t['back'] }}</x-nq::button>
            @endif
            @if ($parent)
                <button type="button" @if ($openIssue) x-on:click="openIssue(@js($parent['id']))" @endif class="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-foreground hover:underline">
                    <bdi dir="ltr" class="font-mono">{{ $parent['key'] }}</bdi>
                    <x-lucide-corner-left-up aria-hidden="true" class="size-3.5 rtl:-scale-x-100" />
                </button>
            @endif
            <x-nq::issue-view.type-icon :type="$issue['type'] ?? 'task'" />
            <bdi dir="ltr" class="font-mono text-body-sm text-muted-foreground">{{ $issue['key'] }}</bdi>
            <x-nq::copy-button :value="$issue['key']" :label="$t['copyKey']" variant="ghost" size="icon-sm" />
            @if ($status)
                <x-nq::badge variant="tag" :hue="$status['hue'] ?? 'gray'">{{ $status['name'] }}</x-nq::badge>
            @endif
            @if ($open && ($issue['priority'] ?? 'none') !== 'none')
                <x-nq::badge variant="outline">{{ $t[$issue['priority']] ?? $issue['priority'] }}</x-nq::badge>
            @endif
            @if ($timerHere)
                <x-nq::badge variant="info"><x-lucide-timer aria-hidden="true" class="size-3" />{{ $t['timerRunning'] }}</x-nq::badge>
            @endif
        </div>
        <h1 class="m-0 min-w-0 text-title-sm font-semibold text-foreground" @if ($update) x-show="!editingTitle" @endif>
            @if ($update)
                <button type="button" title="{{ $t['editTitle'] }}" x-on:click="startTitle()" class="group -mx-2 inline-flex max-w-full items-start gap-2 rounded-control px-2 py-0.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                    <span class="break-words" x-text="title">{{ $issue['title'] }}</span>
                    <x-lucide-pencil aria-hidden="true" class="mt-1.5 size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
                </button>
            @else
                <span class="break-words">{{ $issue['title'] }}</span>
            @endif
        </h1>
        @if ($update)
            <div x-show="editingTitle" x-cloak style="display: none" class="flex min-w-0 flex-col gap-1">
                <x-nq::field.input x-ref="titleInput" aria-label="{{ $t['editTitle'] }}" value="{{ $issue['title'] }}" x-model="titleDraft" x-bind:disabled="titleBusy" x-bind:aria-invalid="titleError ? true : null"
                    x-on:blur="commitTitle()" x-on:keydown.enter.prevent="commitTitle()" x-on:keydown.escape.prevent="cancelTitle()" class="h-control-lg text-title-sm font-semibold" />
                <p role="alert" x-show="titleError" x-text="titleError" x-cloak style="display: none" class="text-body-sm text-nq-danger-text"></p>
            </div>
        @endif
    </header>

    <div @class(['grid min-w-0 gap-6', '@3xl:grid-cols-[minmax(0,1fr)_19rem]' => ! $drawer])>
        @if ($drawer)
            <div class="rounded-card border border-border p-3">{{ $detailsHtml }}</div>
        @endif
        <div class="flex min-w-0 flex-col gap-6">
            <section data-slot="issue-description" aria-labelledby="{{ $uid }}-desc-h" class="flex min-w-0 flex-col gap-2">
                <div class="flex items-center justify-between gap-2">
                    <h2 id="{{ $uid }}-desc-h" class="m-0 text-body font-semibold">{{ $t['description'] }}</h2>
                    @if ($update)
                        <x-nq::button variant="ghost" size="sm" x-show="!editingDesc" x-on:click="startDesc({{ $rich ? 'true' : 'false' }})"><x-lucide-pencil aria-hidden="true" />{{ $t['edit'] }}</x-nq::button>
                    @endif
                </div>
                @if ($update)
                    <div x-show="editingDesc" x-cloak style="display: none" class="flex flex-col gap-2">
                        @if ($rich)
                            <x-nq::rich-text-editor aria-labelledby="{{ $uid }}-desc-h" :value="$description" :load="$load" min-height="9rem" x-model="descDraft" />
                        @else
                            <x-nq::field.textarea aria-labelledby="{{ $uid }}-desc-h" rows="6" x-model="descDraft" x-bind:disabled="descBusy" />
                        @endif
                        <p role="alert" x-show="descError" x-text="descError" x-cloak style="display: none" class="text-body-sm text-nq-danger-text"></p>
                        <div class="flex justify-end gap-2">
                            <x-nq::button variant="ghost" size="sm" x-bind:disabled="descBusy" x-on:click="cancelDesc()">{{ $t['cancel'] }}</x-nq::button>
                            <x-nq::button variant="primary" size="sm" x-bind:disabled="descBusy" x-on:click="saveDesc({{ $rich ? 'true' : 'false' }})">{{ $t['save'] }}</x-nq::button>
                        </div>
                    </div>
                @endif
                <div @if ($update) x-show="!editingDesc" @endif>
                    @if ($rich)
                        @if ($hasDesc)
                            <x-nq::rich-text-editor aria-labelledby="{{ $uid }}-desc-h" read-only :value="$description" :load="$load" :toolbar="[]" min-height="0" />
                        @else
                            <p class="m-0 text-body-sm text-muted-foreground">{{ $t['noDescription'] }}</p>
                        @endif
                    @else
                        <p x-text="plain" x-show="plain" class="m-0 whitespace-pre-line text-body text-nq-fg-body" @unless ($hasDesc) style="display: none" @endunless>{{ $plain }}</p>
                        <p x-show="!plain" x-cloak class="m-0 text-body-sm text-muted-foreground" @if ($hasDesc) style="display: none" @endif>{{ $t['noDescription'] }}</p>
                    @endif
                </div>
            </section>

            @if ($checklist)
                <x-nq::checklist :items="$checklist['items'] ?? []" :add="$checklist['add'] ?? false" :remove="$checklist['remove'] ?? false" :read-only="($checklist['readOnly'] ?? false) || (! $update && ! ($checklist['toggle'] ?? false))" />
            @endif

            @if (count($subIssues) > 0 || $addSubIssue)
                <section data-slot="issue-sub-issues" aria-labelledby="{{ $uid }}-sub-h" class="flex min-w-0 flex-col gap-2">
                    <div class="flex items-center justify-between gap-3">
                        <h2 id="{{ $uid }}-sub-h" class="m-0 text-body font-semibold">{{ $t['subIssues'] }}</h2>
                        @if (count($subIssues) > 0)
                            <span class="text-body-sm text-muted-foreground"><x-nq::numeric :value="$subs['done']" /> / <x-nq::numeric :value="$subs['total']" /></span>
                        @endif
                    </div>
                    @if (count($subIssues) > 0)
                        <x-nq::progress aria-label="{{ $t['subIssues'] }}" :value="$subs['percent']" size="sm" />
                        <div role="list" class="m-0 flex flex-col divide-y divide-border rounded-control border border-border p-0">
                            @foreach ($subIssues as $item)
                                @php
                                    $s = $statusOf[$item['statusId']] ?? null;
                                    $who = ! empty($item['assigneeId']) ? ($personOf[$item['assigneeId']] ?? null) : null;
                                    $idJs = \Illuminate\Support\Js::from((string) $item['id'])->toHtml();
                                    $keyJs = \Illuminate\Support\Js::from((string) $item['key'])->toHtml();
                                    $actions = $t['actions'].': '.$item['key'];
                                @endphp
                                <x-nq::context-menu>
                                    <x-nq::context-menu.trigger role="listitem" class="flex min-w-0 items-center gap-2 px-3 py-2">
                                        <x-nq::issue-view.status-dot :hue="$s['hue'] ?? null" />
                                        <bdi dir="ltr" class="shrink-0 font-mono text-caption text-muted-foreground">{{ $item['key'] }}</bdi>
                                        <button type="button" @if ($openIssue) x-on:click="openIssue({!! $idJs !!})" @endif title="{{ $s['name'] ?? '' }}"
                                            class="min-w-0 flex-1 truncate text-start text-body-sm outline-none hover:underline focus-visible:underline {{ ($s['stage'] ?? null) === 'done' ? 'text-muted-foreground line-through' : '' }}">{{ $item['title'] }}</button>
                                        @if ($who)
                                            <x-nq::avatar :name="$who['name']" :src="$who['avatar'] ?? null" size="xs" />
                                        @endif
                                        <x-nq::dropdown-menu>
                                            <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" aria-label="{{ $actions }}"><x-lucide-ellipsis aria-hidden="true" /></x-nq::dropdown-menu.trigger>
                                            <x-nq::dropdown-menu.content align="end" class="min-w-44">
                                                @if ($openIssue)
                                                    <x-nq::dropdown-menu.item x-on:click="openIssue({!! $idJs !!})"><x-lucide-external-link aria-hidden="true" />{{ $t['open'] }}</x-nq::dropdown-menu.item>
                                                @endif
                                                <x-nq::dropdown-menu.item x-on:click="copy({!! $keyJs !!})"><x-lucide-link-2 aria-hidden="true" />{{ $t['copyKeyAction'] }}</x-nq::dropdown-menu.item>
                                            </x-nq::dropdown-menu.content>
                                        </x-nq::dropdown-menu>
                                    </x-nq::context-menu.trigger>
                                    <x-nq::context-menu.content class="min-w-44">
                                        @if ($openIssue)
                                            <x-nq::context-menu.item x-on:click="openIssue({!! $idJs !!})"><x-lucide-external-link aria-hidden="true" />{{ $t['open'] }}</x-nq::context-menu.item>
                                        @endif
                                        <x-nq::context-menu.item x-on:click="copy({!! $keyJs !!})"><x-lucide-link-2 aria-hidden="true" />{{ $t['copyKeyAction'] }}</x-nq::context-menu.item>
                                    </x-nq::context-menu.content>
                                </x-nq::context-menu>
                            @endforeach
                        </div>
                    @else
                        <p class="m-0 text-body-sm text-muted-foreground">{{ $t['noSubIssues'] }}</p>
                    @endif
                    @if ($addSubIssue)
                        <form class="flex items-center gap-2" x-on:submit.prevent="addSub()">
                            <x-nq::field.input aria-label="{{ $t['subIssuePlaceholder'] }}" placeholder="{{ $t['subIssuePlaceholder'] }}" x-model="subTitle" x-bind:disabled="subBusy" />
                            <x-nq::button type="submit" variant="secondary" x-bind:disabled="subBusy || !subTitle.trim()"><x-lucide-plus aria-hidden="true" />{{ $t['addSubIssue'] }}</x-nq::button>
                        </form>
                    @endif
                    <p role="alert" x-show="subError" x-text="subError" x-cloak style="display: none" class="text-body-sm text-nq-danger-text"></p>
                </section>
            @endif

            @if ($development)
                <section aria-labelledby="{{ $uid }}-dev-h" class="flex min-w-0 flex-col gap-2">
                    <h2 id="{{ $uid }}-dev-h" class="m-0 text-body font-semibold">{{ $t['development'] }}</h2>
                    <x-nq::github-activity :repo="$development['repo']" :pulls="$development['pulls'] ?? null" :commits="$development['commits'] ?? null" :runs="$development['runs'] ?? null" hide-search />
                </section>
            @endif

            @if ($tabs)
                <x-nq::tabs :default-value="$firstTab">
                    <x-nq::tabs.list variant="underline" aria-label="{{ $t['activity'] }}" class="max-w-full overflow-x-auto">
                        @foreach ($tabs as $x)
                            <x-nq::tabs.tab :value="$x['id']">{{ $x['label'] }}@if ($x['count'])<span class="ms-1.5 text-caption text-muted-foreground"><x-nq::numeric :value="$x['count']" /></span>@endif</x-nq::tabs.tab>
                        @endforeach
                        <x-nq::tabs.indicator />
                    </x-nq::tabs.list>
                    @if ($thread)
                        <x-nq::tabs.panel value="comments" class="pt-4">
                            <x-nq::comment-thread hide-header :comments="$thread['comments'] ?? []" :current-user="$thread['currentUser'] ?? null" :signed-in="$thread['signedIn'] ?? true" :suggestions="$thread['suggestions'] ?? []" :can-moderate="$thread['canModerate'] ?? false"
                                :post="$thread['post'] ?? false" :edit="$thread['edit'] ?? false" :delete="$thread['delete'] ?? false" :approve="$thread['approve'] ?? false" :locale="$locale" />
                        </x-nq::tabs.panel>
                    @endif
                    @if ($activity)
                        <x-nq::tabs.panel value="activity" class="flex flex-col gap-4 pt-4">
                            <x-nq::activity-composer :locale="$locale" />
                            <x-nq::activity-composer.timeline :activities="$activity['items'] ?? []" :toggle="$activity['toggle'] ?? false" :delete="$activity['delete'] ?? false" :now="$clock" :locale="$locale" />
                        </x-nq::tabs.panel>
                    @endif
                    @if ($time)
                        <x-nq::tabs.panel value="time" class="pt-4">
                            <x-nq::time-tracker :projects="$timeProjects" :entries="$entries" :running="$running">
                                <x-nq::time-tracker.timer />
                                <x-nq::time-tracker.entries />
                            </x-nq::time-tracker>
                        </x-nq::tabs.panel>
                    @endif
                    @if ($ai)
                        <x-nq::tabs.panel value="ai" class="flex flex-col gap-4 pt-4">
                            @if (! empty($ai['run']))
                                <x-nq::ai-usage-cost.token-meter :tokens-in="$ai['run']['tokensIn'] ?? 0" :tokens-out="$ai['run']['tokensOut'] ?? 0" :cached="$ai['run']['cached'] ?? 0" :cost="$ai['run']['cost'] ?? null" :budget="$ai['run']['budget'] ?? false" :currency="$ai['currency'] ?? null" :locale="$locale" />
                            @endif
                            <x-nq::ai-usage-cost :days="$ai['days'] ?? []" :by-model="$ai['byModel'] ?? null" :by-product="$ai['byProduct'] ?? null" :by-run="$ai['byRun'] ?? null" :markup="$ai['markup'] ?? null" :previous-total="$ai['previousTotal'] ?? null" :currency="$ai['currency'] ?? null" :locale="$locale" />
                        </x-nq::tabs.panel>
                    @endif
                </x-nq::tabs>
            @endif
        </div>
        @unless ($drawer)
            <aside class="min-w-0 @3xl:sticky @3xl:top-4 @3xl:self-start">{{ $detailsHtml }}</aside>
        @endunless
    </div>
</article>
