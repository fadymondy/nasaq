{{-- <x-nq::project-view :project="$project" :issues="$issues" :statuses="$statuses" :labels="$labels" :people="$people" update create :activity="$activity" :budget="$budget" />
     A project on one screen: a header (name, key, status, client, dates, members, progress), then tabs for the Overview, Board, List, Timeline, Activity, Time, AI cost, Files, Memory, Vault, GitHub and Settings.
     Presentational: you own the data and re-render after a change. A tab appears only for the part you pass (Overview, Board, List and Timeline always).
     project: ['id', 'name', 'key', 'status' => planning|active|on-hold|completed|archived, 'client', 'startDate', 'dueDate' (Y-m-d), 'progress' (0..100), 'members' => [['name', 'avatar']], 'budget', 'currency'].
     issues: [['id', 'key', 'title', 'type', 'priority', 'statusId', 'assigneeId', 'labelIds', 'startDate', 'dueDate', 'estimateHours', 'createdAt', 'completedAt']] as for x-nq::issue-view.
     statuses: [['id', 'name', 'hue', 'stage']]. labels: [['id', 'name', 'hue']]. people: [['id', 'name', 'avatar']].
     update: the list cells edit and the board drops save. create: the New issue button and dialog. delete-issue: the list's Delete action. open-issue: rows, cards and bars open the issue (event).
     activity: [['id', 'title', 'description', 'at', 'actor' => ['name'], 'kind']] shows the Activity tab (a filterable feed) and the recent list in the Overview. budget: ['total', 'spent', 'currency'] or null.
     notes: ['items' => activities, 'toggle', 'delete'] adds the notes composer and its timeline to the Timeline tab. time: ['entries', 'running', 'projects'] shows the Time tab. ai: x-nq::ai-usage-cost props shows the AI cost tab.
     files: [['id', 'name', 'size', 'uploadedBy', 'uploadedAt']] shows the Files tab; upload, download and delete-file turn on its actions.
     memory: ['items' => [['id', 'kind', 'text', 'tags', 'source', 'at']], 'editable', 'deletable'] shows the Memory tab.
     vault: x-nq::vault props, plus 'env' => x-nq::env-list props, shows the Vault tab. github: ['repo', 'picker' => x-nq::repository-picker props, 'commits', 'pulls', 'runs', 'deployments', 'canRefresh', 'canDeploy', 'canRerun'] shows the GitHub tab.
     save: shows the Settings tab with the General and Budget forms. workflow: true (or ['defaultTab', 'copy']) adds Labels and statuses; members: x-nq::members-manager props; integrations: [['id', 'name', 'description', 'icon', 'connected']]; archive / delete: the danger zone.
     default-tab: overview | board | list | timeline | activity | time | ai | files | memory | vault | github | settings. tabs: which tabs to show, in order. now: the clock for overdue, the burndown edge and the Today heading. labels-text: array overriding the words. locale: default the app locale.
     The page listens on the root. Each event has detail.wait(promise); resolve { error } to show the message and keep the change (a board drop or an edit goes back):
       nq-project-update-issue { id, patch: { title | statusId | priority | assigneeId | dueDate | estimateHours }, wait }; nq-project-move-issue { id, statusId, index, wait }; nq-project-create-issue { input: { title, type, priority }, wait };
       nq-project-delete-issue { id, wait }; nq-project-open-issue { id }; nq-project-save { patch: { name, client, status, startDate, dueDate, budget }, wait }; nq-project-upload { files, wait };
       nq-project-download-file { id }; nq-project-delete-file { id, wait }; nq-project-memory-save { input: { kind, text, tags, source }, id?, wait }; nq-project-memory-forget { id, wait };
       nq-project-integration { id, connected, wait }; nq-project-archive { wait }; nq-project-delete { wait }; nq-project-tab { tab }.
     The vault, env list, members, time tracker, composer, GitHub feed and status manager keep their own events. Needs the Alpine module (nqProjectView). --}}
@include('nasaq::components.project-view._logic')
@props(['project', 'issues' => [], 'statuses' => [], 'labels' => [], 'people' => [], 'update' => false, 'create' => false, 'deleteIssue' => false, 'openIssue' => false, 'activity' => null, 'budget' => null, 'notes' => null, 'time' => null, 'ai' => null, 'files' => null, 'upload' => false, 'download' => false, 'deleteFile' => false, 'memory' => null, 'vault' => null, 'github' => null, 'save' => false, 'workflow' => null, 'members' => null, 'integrations' => null, 'archive' => false, 'delete' => false, 'defaultTab' => 'overview', 'tabs' => null, 'now' => null, 'labelsText' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = nq_pv_words($locale, (array) $labelsText);
    $clock = $now ? \Carbon\Carbon::parse($now) : \Carbon\Carbon::now();
    $today = $clock->format('Y-m-d');
    $issues = array_values((array) $issues);
    $statuses = array_values((array) $statuses);
    $open = count(nq_pv_open_issues($issues, $statuses));
    $hasSettings = $save || $workflow || $members || $integrations || $archive || $delete;
    $available = ['overview', 'board', 'list', 'timeline'];
    if ($activity !== null) { $available[] = 'activity'; }
    if ($time) { $available[] = 'time'; }
    if ($ai) { $available[] = 'ai'; }
    if ($files !== null) { $available[] = 'files'; }
    if ($memory) { $available[] = 'memory'; }
    if ($vault) { $available[] = 'vault'; }
    if ($github) { $available[] = 'github'; }
    if ($hasSettings) { $available[] = 'settings'; }
    $shown = $tabs ? array_values(array_filter((array) $tabs, fn ($x) => in_array($x, $available, true))) : $available;
    $first = in_array($defaultTab, $shown, true) ? $defaultTab : ($shown[0] ?? 'overview');
    $tabsOn = fn ($id) => in_array($id, $shown, true);
    $memoryItems = $memory ? nq_pv_memory_sorted((array) ($memory['items'] ?? [])) : [];
    $integrationList = array_values((array) ($integrations ?? []));
    $currency = $budget['currency'] ?? ($project['currency'] ?? \Nasaq\Nasaq::currency($locale));
    $timeProjects = $time['projects'] ?? [['id' => $project['id'] ?? '', 'name' => $project['name'], 'tasks' => array_map(fn ($i) => ['id' => $i['id'], 'name' => $i['key'].' '.$i['title']], $issues)]];
    $dateOf = fn ($v) => \Carbon\Carbon::parse($v);
    $status = $project['status'] ?? 'active';
    $config = [
        'tab' => $first,
        'locale' => $locale,
        'projectKey' => (string) ($project['key'] ?? $project['name']),
        'archived' => $status === 'archived',
        'project' => [
            'name' => (string) $project['name'], 'client' => (string) ($project['client'] ?? ''), 'status' => $status,
            'startDate' => (string) ($project['startDate'] ?? ''), 'dueDate' => (string) ($project['dueDate'] ?? ''), 'budget' => isset($project['budget']) ? (string) $project['budget'] : '',
        ],
        'issues' => array_map(fn ($i) => ['id' => (string) $i['id'], 'key' => (string) $i['key']], $issues),
        'memory' => array_map(fn ($m) => ['id' => (string) $m['id'], 'kind' => $m['kind'] ?? 'fact', 'text' => (string) $m['text'], 'tags' => array_values((array) ($m['tags'] ?? [])), 'source' => (string) ($m['source'] ?? '')], $memoryItems),
        'integrations' => array_map(fn ($i) => ['id' => (string) $i['id'], 'name' => (string) $i['name'], 'connected' => (bool) ($i['connected'] ?? false)], $integrationList),
        'feedTotal' => count((array) ($activity ?? [])),
        'labels' => [
            'failed' => nq_iv_words($locale)['failed'], 'title' => $t['title'], 'name' => $t['name'], 'memoryText' => $t['memoryText'], 'feedCount' => $t['feedCount'], 'memoryCount' => $t['memoryCount'],
            'connect' => $t['connect'], 'disconnect' => $t['disconnect'],
        ],
    ];
    $json = fn ($v) => \Illuminate\Support\Js::from($v)->toHtml();
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'project-view') }}" aria-label="{{ $project['name'] }}" x-data="nqProjectView({!! $json($config) !!})"
    {{ $attributes->except('data-slot')->cn('@container flex min-w-0 flex-col gap-5') }}>
    <header class="flex min-w-0 flex-col gap-3">
        <div class="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div class="flex min-w-0 flex-col gap-1.5">
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                    <h1 class="m-0 min-w-0 text-title-sm font-semibold">{{ $project['name'] }}</h1>
                    @if (! empty($project['key']))
                        <x-nq::badge variant="outline"><bdi dir="ltr" class="font-mono">{{ $project['key'] }}</bdi></x-nq::badge>
                    @endif
                    <x-nq::status :tone="nq_pv_status_tone($status)">{{ $t['statuses'][$status] ?? $status }}</x-nq::status>
                </div>
                <div class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
                    @if (! empty($project['client']))
                        <span>{{ $t['client'] }}: <span class="text-foreground">{{ $project['client'] }}</span></span>
                    @endif
                    <span class="inline-flex items-center gap-1.5">
                        <x-lucide-calendar-days aria-hidden="true" class="size-4" />
                        @if (! empty($project['startDate']) || ! empty($project['dueDate']))
                            @if (! empty($project['startDate']))<x-nq::numeric.date-time :value="$dateOf($project['startDate'])" date-style="medium" :locale="$locale" />@endif
                            @if (! empty($project['startDate']) && ! empty($project['dueDate'])) – @endif
                            @if (! empty($project['dueDate']))<x-nq::numeric.date-time :value="$dateOf($project['dueDate'])" date-style="medium" :locale="$locale" />@endif
                        @else
                            {{ $t['noDates'] }}
                        @endif
                    </span>
                    <span class="inline-flex items-center gap-2">
                        <span>{{ $t['members'] }}</span>
                        <x-nq::entity-list.avatar-stack :people="$project['members'] ?? []" />
                    </span>
                </div>
            </div>
            @if ($create)
                <x-nq::button x-on:click="newOpen = true"><x-lucide-plus aria-hidden="true" />{{ $t['newIssue'] }}</x-nq::button>
            @endif
        </div>
        <x-nq::progress aria-label="{{ $t['progress'] }}" :label="$t['progress']" :value="$project['progress'] ?? 0" size="sm" :locale="$locale" />
    </header>

    <x-nq::tabs :default-value="$first" x-model="tab">
        <x-nq::tabs.list variant="underline" aria-label="{{ $project['name'] }}" class="max-w-full overflow-x-auto">
            @foreach ($shown as $id)
                <x-nq::tabs.tab :value="$id">{{ $t['tabs'][$id] }}@if ($id === 'list' || $id === 'board')<span class="ms-1.5 text-caption text-muted-foreground"><x-nq::numeric :value="$id === 'board' ? $open : count($issues)" :locale="$locale" /></span>@endif</x-nq::tabs.tab>
            @endforeach
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>

        @if ($tabsOn('overview'))
            <x-nq::tabs.panel value="overview" class="pt-4">
                <x-nq::project-view.overview :issues="$issues" :statuses="$statuses" :activity="$activity ?? []" :budget="$budget" :today="$today" :text="$labelsText" :locale="$locale" />
            </x-nq::tabs.panel>
        @endif
        @if ($tabsOn('board'))
            <x-nq::tabs.panel value="board" class="flex flex-col gap-2 pt-4">
                <p role="alert" class="m-0 text-body-sm text-nq-danger-text" x-show="moveError" x-cloak style="display: none" x-text="moveError"></p>
                <div class="min-w-0 overflow-x-auto" data-pv-board x-on:move="onMove($event)">
                    <x-nq::project-view.board :issues="$issues" :statuses="$statuses" :labels="$labels" :people="$people" :now="$clock" :text="$labelsText" :locale="$locale" />
                </div>
            </x-nq::tabs.panel>
        @endif
        @if ($tabsOn('list'))
            <x-nq::tabs.panel value="list" class="flex flex-col gap-2 pt-4">
                <p role="alert" class="m-0 text-body-sm text-nq-danger-text" x-show="listError" x-cloak style="display: none" x-text="listError"></p>
                <div data-pv-list class="min-w-0" x-on:nq-data-table-edit="onListEdit($event)" x-on:nq-data-table-action="onListAction($event)" x-on:nq-data-table-row-click="onListRow($event)">
                    <x-nq::project-view.issue-table :issues="$issues" :statuses="$statuses" :people="$people" :editable="$update" :openable="$openIssue" :deletable="$deleteIssue" :creatable="$create" :text="$labelsText" :locale="$locale" />
                </div>
            </x-nq::tabs.panel>
        @endif
        @if ($tabsOn('timeline'))
            <x-nq::tabs.panel value="timeline" class="flex flex-col gap-6 pt-4">
                <x-nq::project-view.schedule :issues="$issues" :statuses="$statuses" :today="$today" :openable="$openIssue" :text="$labelsText" :locale="$locale" />
                @if ($notes)
                    <section aria-labelledby="project-notes-h" class="flex flex-col gap-3">
                        <h2 id="project-notes-h" class="m-0 text-body font-semibold">{{ $t['notes'] }}</h2>
                        <x-nq::activity-composer :locale="$locale" />
                        <x-nq::activity-composer.timeline :activities="$notes['items'] ?? []" :toggle="$notes['toggle'] ?? false" :delete="$notes['delete'] ?? false" :now="$clock" :locale="$locale" />
                    </section>
                @endif
            </x-nq::tabs.panel>
        @endif
        @if ($tabsOn('time'))
            <x-nq::tabs.panel value="time" class="flex flex-col gap-4 pt-4">
                <x-nq::time-tracker :projects="$timeProjects" :entries="$time['entries'] ?? []" :running="$time['running'] ?? null">
                    <x-nq::time-tracker.timer />
                    <x-nq::time-tracker.entries />
                </x-nq::time-tracker>
            </x-nq::tabs.panel>
        @endif
        @if ($tabsOn('ai'))
            <x-nq::tabs.panel value="ai" class="pt-4">
                <x-nq::ai-usage-cost :days="$ai['days'] ?? []" :by-model="$ai['byModel'] ?? null" :by-product="$ai['byProduct'] ?? null" :by-run="$ai['byRun'] ?? null" :markup="$ai['markup'] ?? null" :previous-total="$ai['previousTotal'] ?? null" :currency="$ai['currency'] ?? null" :locale="$locale" />
            </x-nq::tabs.panel>
        @endif
        @if ($tabsOn('files'))
            <x-nq::tabs.panel value="files" class="pt-4">
                <div data-pv-filelist class="min-w-0" x-on:nq-data-table-action="onFileAction($event)">
                    <x-nq::project-view.files :files="$files ?? []" :upload="$upload" :download="$download" :delete="$deleteFile" :text="$labelsText" :locale="$locale" />
                </div>
            </x-nq::tabs.panel>
        @endif
        @if ($tabsOn('activity'))
            <x-nq::tabs.panel value="activity" class="pt-4">
                <x-nq::project-view.feed :items="$activity ?? []" :today="$today" :text="$labelsText" :locale="$locale" />
            </x-nq::tabs.panel>
        @endif
        @if ($tabsOn('memory'))
            <x-nq::tabs.panel value="memory" class="pt-4">
                <x-nq::project-view.memory :items="$memoryItems" :editable="$memory['editable'] ?? false" :deletable="$memory['deletable'] ?? false" :text="$labelsText" :locale="$locale" />
            </x-nq::tabs.panel>
        @endif
        @if ($tabsOn('vault'))
            <x-nq::tabs.panel value="vault" class="flex flex-col gap-8 pt-4">
                <x-nq::vault :secrets="$vault['secrets'] ?? []" :access-log="$vault['accessLog'] ?? []" :editable="$vault['editable'] ?? true" :deletable="$vault['deletable'] ?? true" :loading="$vault['loading'] ?? false" :reveal-timeout="$vault['revealTimeout'] ?? 15000" :title="$vault['title'] ?? $t['vaultTitle']" :description="$vault['description'] ?? $t['vaultDescription']" />
                @if (! empty($vault['env']))
                    @php $env = $vault['env']; @endphp
                    <x-nq::env-list :variables="$env['variables'] ?? []" :title="$env['title'] ?? $t['envTitle']" :description="$env['description'] ?? $t['envDescription']" :environments="$env['environments'] ?? []" :environment="$env['environment'] ?? null"
                        :can-edit="$env['canEdit'] ?? true" :can-delete="$env['canDelete'] ?? true" :can-import="$env['canImport'] ?? true" :read-only="$env['readOnly'] ?? false" :export-filename="$env['exportFilename'] ?? '.env'" :reveal-timeout="$env['revealTimeout'] ?? 30000" :labels="$env['labels'] ?? []" />
                @endif
            </x-nq::tabs.panel>
        @endif
        @if ($tabsOn('github'))
            @php $gh = $github; $picker = $gh['picker'] ?? null; @endphp
            <x-nq::tabs.panel value="github" class="flex flex-col gap-4 pt-4">
                @if ($picker)
                    <section aria-label="{{ $t['ghRepo'] }}" class="flex max-w-xl flex-col gap-2">
                        <h2 class="m-0 text-body font-semibold">{{ ! empty($gh['repo']) ? $t['ghRepo'] : $t['ghConnectTitle'] }}</h2>
                        @if (empty($gh['repo']))
                            <p class="m-0 text-body-sm text-muted-foreground">{{ $t['ghConnectHint'] }}</p>
                        @endif
                        <x-nq::repository-picker :repo="$picker['repo'] ?? null" :branch="$picker['branch'] ?? null" :search-url="$picker['searchUrl'] ?? null" :branches-url="$picker['branchesUrl'] ?? null" :account="$picker['account'] ?? null" :configure="$picker['configure'] ?? false" :hide-branch="$picker['hideBranch'] ?? false" :disabled="$picker['disabled'] ?? false" :name="$picker['name'] ?? null" />
                    </section>
                @endif
                @if (! empty($gh['repo']))
                    <x-nq::github-activity :repo="$gh['repo']" :commits="$gh['commits'] ?? null" :pulls="$gh['pulls'] ?? null" :runs="$gh['runs'] ?? null" :deployments="$gh['deployments'] ?? null" :default-tab="$gh['defaultTab'] ?? null" :loading="$gh['loading'] ?? false"
                        :can-refresh="$gh['canRefresh'] ?? false" :can-deploy="$gh['canDeploy'] ?? false" :can-rerun="$gh['canRerun'] ?? false" :hide-search="$gh['hideSearch'] ?? false" :labels="$gh['labels'] ?? []" />
                @else
                    <x-nq::states.empty :title="$t['ghNotConnected']" :description="$t['ghNotConnectedHint']" icon="git-branch" />
                @endif
            </x-nq::tabs.panel>
        @endif
        @if ($tabsOn('settings'))
            <x-nq::tabs.panel value="settings" class="pt-4">
                <x-nq::project-view.settings :project="$project" :statuses="$statuses" :labels="$labels" :budget="$budget" :save="$save" :workflow="$workflow" :members="$members" :integrations="$integrations" :archive="$archive" :delete="$delete" :text="$labelsText" :locale="$locale" />
            </x-nq::tabs.panel>
        @endif
    </x-nq::tabs>

    @if ($create)
        <x-nq::project-view.new-issue :text="$labelsText" :locale="$locale" />
    @endif
</section>
