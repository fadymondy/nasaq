{{-- <x-nq::github-activity :repo="['owner' => 'acme', 'name' => 'storefront', 'href' => 'https://github.com/acme/storefront']" :commits="$commits" :runs="$runs" can-rerun
         x-on:rerun="$event.detail.wait(fetch('/api/runs/' + $event.detail.runId + '/rerun', { method: 'POST' }))" />
     A repository's recent life in one card: a merged timeline plus a tab each for commits, pull requests, workflow runs and deployments, every row with status, author, time and a link to GitHub.
     Presentational: you fetch the feeds and pass them in. A tab appears only for a feed that is given (null = not given, [] = given but empty); with more than one feed an Activity tab merges them, newest first.
     repo: ['owner', 'name', 'href']. Dates: DateTime, ISO string or epoch milliseconds.
     commits: [['id' => full sha, 'message', 'author' => ['login', 'avatar'], 'date', 'href', 'branch', 'checks' => success|failure|pending]]
     pulls: [['id', 'number', 'title', 'author', 'state' => open|draft|merged|closed, 'createdAt', 'mergedAt', 'mergedBy', 'href', 'head', 'base', 'labels' => [['name', 'hue']], 'checks', 'comments']]
     runs: [['id', 'name', 'number', 'status' => queued|in_progress|success|failure|cancelled|skipped, 'branch', 'sha', 'event', 'actor', 'startedAt', 'durationMs', 'href']]
     deployments: [['id', 'environment', 'status' => pending|in_progress|success|failure|inactive, 'ref', 'sha', 'creator', 'createdAt', 'url', 'href']]
     default-tab: activity | commits | pulls | runs | deployments. loading shows skeleton rows. hide-search hides the filter box.
     can-refresh / can-deploy show the Refresh / Deploy buttons; can-rerun shows Re-run on finished runs.
     Events on the root with detail { …, wait(promise) }; resolve, or resolve { error } to show the message (a rejection shows a generic one):
       refresh   detail {}            reload the feeds
       deploy    detail {}            start a deploy
       rerun     detail.runId         run a workflow again
     labels: an array that overrides any string by key (tabs is nested: ['tabs' => ['commits' => '…']]); {who} and {n} are placeholders.
     Differences from the React component: the filter hides rows in place (the first visible row drops its top rule through a binding).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['repo', 'commits' => null, 'pulls' => null, 'runs' => null, 'deployments' => null, 'defaultTab' => null, 'loading' => false, 'canRefresh' => false, 'canDeploy' => false, 'canRerun' => false, 'hideSearch' => false, 'labels' => []])
@php
    $ar = str_starts_with(app()->getLocale(), 'ar');
    $STRINGS = [
        'en' => [
            'title' => 'GitHub activity',
            'description' => 'Commits, pull requests, workflow runs and deployments for this repository.',
            'openOnGithub' => 'Open on GitHub', 'refresh' => 'Refresh', 'deploy' => 'Deploy',
            'search' => 'Filter by title, author or branch',
            'tabs' => ['activity' => 'Activity', 'commits' => 'Commits', 'pulls' => 'Pull requests', 'runs' => 'Workflow runs', 'deployments' => 'Deployments'],
            'emptyTitle' => 'Nothing here yet', 'emptyBody' => 'New activity shows up as soon as GitHub reports it.',
            'noMatchTitle' => 'No matches', 'noMatchBody' => 'Nothing matches that filter. Clear it to see everything.',
            'committed' => '{who} committed', 'openedBy' => 'opened by {who}', 'mergedBy' => 'merged by {who}', 'startedBy' => 'started by {who}', 'deployedBy' => 'deployed by {who}',
            'commentsOne' => '1 comment', 'commentsTwo' => '{n} comments', 'commentsMany' => '{n} comments',
            'pullState' => ['open' => 'Open', 'draft' => 'Draft', 'merged' => 'Merged', 'closed' => 'Closed'],
            'runStatus' => ['queued' => 'Queued', 'in_progress' => 'Running', 'success' => 'Passed', 'failure' => 'Failed', 'cancelled' => 'Cancelled', 'skipped' => 'Skipped'],
            'deploymentStatus' => ['pending' => 'Pending', 'in_progress' => 'Deploying', 'success' => 'Live', 'failure' => 'Failed', 'inactive' => 'Replaced'],
            'checks' => ['success' => 'Checks passed', 'failure' => 'Checks failed', 'pending' => 'Checks running'],
            'rerun' => 'Re-run', 'rerunFor' => 'Re-run {name}', 'viewSite' => 'Open site',
            'duration' => ['ms' => 'ms', 's' => 's', 'm' => 'm', 'h' => 'h'],
            'kind' => ['commit' => 'Commit', 'pull' => 'Pull request', 'run' => 'Workflow run', 'deployment' => 'Deployment'],
            'genericError' => 'Something went wrong. Try again.', 'loading' => 'Loading activity', 'dismiss' => 'Dismiss',
        ],
        'ar' => [
            'title' => 'نشاط GitHub',
            'description' => 'الإيداعات وطلبات الدمج وتشغيلات سير العمل وعمليات النشر لهذا المستودع.',
            'openOnGithub' => 'افتح على GitHub', 'refresh' => 'تحديث', 'deploy' => 'نشر',
            'search' => 'تصفية بالعنوان أو المؤلف أو الفرع',
            'tabs' => ['activity' => 'النشاط', 'commits' => 'الإيداعات', 'pulls' => 'طلبات الدمج', 'runs' => 'تشغيلات سير العمل', 'deployments' => 'عمليات النشر'],
            'emptyTitle' => 'لا يوجد شيء بعد', 'emptyBody' => 'يظهر النشاط الجديد فور أن يبلّغ عنه GitHub.',
            'noMatchTitle' => 'لا نتائج', 'noMatchBody' => 'لا شيء يطابق هذه التصفية. امسحها لرؤية كل شيء.',
            'committed' => 'أودع {who}', 'openedBy' => 'فتحه {who}', 'mergedBy' => 'دمجه {who}', 'startedBy' => 'بدأه {who}', 'deployedBy' => 'نشره {who}',
            'commentsOne' => 'تعليق واحد', 'commentsTwo' => 'تعليقان', 'commentsMany' => '{n} تعليقات',
            'pullState' => ['open' => 'مفتوح', 'draft' => 'مسودة', 'merged' => 'مدموج', 'closed' => 'مغلق'],
            'runStatus' => ['queued' => 'في الانتظار', 'in_progress' => 'قيد التشغيل', 'success' => 'نجح', 'failure' => 'فشل', 'cancelled' => 'أُلغي', 'skipped' => 'تم تخطيه'],
            'deploymentStatus' => ['pending' => 'معلّق', 'in_progress' => 'قيد النشر', 'success' => 'مباشر', 'failure' => 'فشل', 'inactive' => 'استُبدل'],
            'checks' => ['success' => 'نجحت الفحوصات', 'failure' => 'فشلت الفحوصات', 'pending' => 'الفحوصات قيد التشغيل'],
            'rerun' => 'إعادة التشغيل', 'rerunFor' => 'إعادة تشغيل {name}', 'viewSite' => 'افتح الموقع',
            'duration' => ['ms' => 'ملي ث', 's' => 'ث', 'm' => 'د', 'h' => 'س'],
            'kind' => ['commit' => 'إيداع', 'pull' => 'طلب دمج', 'run' => 'تشغيل سير عمل', 'deployment' => 'نشر'],
            'genericError' => 'حدث خطأ ما. حاول مرة أخرى.', 'loading' => 'جارٍ تحميل النشاط', 'dismiss' => 'تجاهل',
        ],
    ];
    $L = array_replace_recursive($STRINGS[$ar ? 'ar' : 'en'], (array) $labels);
    $fill = fn (string $s, array $r) => strtr($s, $r);
    $who = fn (string $key, $actor) => $fill($L[$key], ['{who}' => (string) ($actor['login'] ?? '')]);
    $comments = fn (int $n) => $n === 1 ? $L['commentsOne'] : ($n === 2 ? $L['commentsTwo'] : $L['commentsMany']);

    // Dates: DateTime, ISO string, or epoch milliseconds.
    $when = function ($v) {
        if ($v instanceof \DateTimeInterface) return \Carbon\Carbon::instance($v)->setTimezone('UTC');
        if (is_int($v) || is_float($v) || (is_string($v) && ctype_digit($v))) return \Carbon\Carbon::createFromTimestampMsUTC((int) $v);
        return \Carbon\Carbon::parse((string) $v)->setTimezone('UTC');
    };
    $at = fn ($v) => (int) $when($v)->format('Uv');

    $fmtDuration = function ($v) use ($L) {
        $u = $L['duration'];
        if ($v < 1000) return round($v).$u['ms'];
        $s = $v / 1000;
        if (round($s) < 60) return ($s < 10 ? number_format($s, 1, '.', '') : (string) round($s)).$u['s'];
        $tm = (int) floor($s / 60); $rest = (int) round($s - $tm * 60);
        [$m, $sec] = $rest === 60 ? [$tm + 1, 0] : [$tm, $rest];
        if ($m < 60) return $m.$u['m'].' '.str_pad((string) $sec, 2, '0', STR_PAD_LEFT).$u['s'];
        return intdiv($m, 60).$u['h'].' '.str_pad((string) ($m % 60), 2, '0', STR_PAD_LEFT).$u['m'];
    };

    $tone = ['neutral' => 'neutral', 'info' => 'info', 'success' => 'success', 'warning' => 'warning', 'danger' => 'danger'];
    $runTone = ['queued' => 'neutral', 'in_progress' => 'info', 'success' => 'success', 'failure' => 'danger', 'cancelled' => 'warning', 'skipped' => 'neutral'];
    $pullTone = ['open' => 'success', 'draft' => 'neutral', 'merged' => 'info', 'closed' => 'danger'];
    $deploymentTone = ['pending' => 'neutral', 'in_progress' => 'info', 'success' => 'success', 'failure' => 'danger', 'inactive' => 'neutral'];
    $runIcon = ['queued' => 'circle-dashed', 'in_progress' => 'refresh-cw', 'success' => 'circle-check', 'failure' => 'circle-x', 'cancelled' => 'circle-slash', 'skipped' => 'circle-slash'];
    $pullIcon = ['open' => 'git-pull-request', 'draft' => 'git-pull-request-draft', 'merged' => 'git-merge', 'closed' => 'git-pull-request-closed'];
    $toneText = ['neutral' => 'text-muted-foreground', 'info' => 'text-nq-info-text', 'success' => 'text-nq-success-text', 'warning' => 'text-nq-warning-text', 'danger' => 'text-nq-danger-text'];
    $pullBadge = ['open' => 'success', 'draft' => 'neutral', 'merged' => 'info', 'closed' => 'danger'];
    $checksTone = ['success' => 'success', 'failure' => 'danger', 'pending' => 'info'];
    $isActive = fn (string $s) => in_array($s, ['in_progress', 'queued', 'pending'], true);
    $rowClass = 'flex items-start gap-3 border-t border-border px-4 py-3 first:border-t-0';

    $feedData = ['commits' => $commits, 'pulls' => $pulls, 'runs' => $runs, 'deployments' => $deployments];
    $feeds = array_values(array_filter(array_keys($feedData), fn ($id) => $feedData[$id] !== null));
    $tabs = count($feeds) > 1 ? ['activity', ...$feeds] : $feeds;
    $first = $defaultTab && in_array($defaultTab, $tabs, true) ? $defaultTab : ($tabs[0] ?? 'activity');
    $commits = array_values($commits ?? []); $pulls = array_values($pulls ?? []); $runs = array_values($runs ?? []); $deployments = array_values($deployments ?? []);

    $hay = fn (array $fields) => mb_strtolower(implode("\n", array_map('strval', array_filter($fields, fn ($f) => $f !== null && $f !== ''))));
    $search = [
        'commits' => array_map(fn ($c) => $hay([$c['message'] ?? null, $c['author']['login'] ?? null, $c['id'] ?? null, $c['branch'] ?? null]), $commits),
        'pulls' => array_map(fn ($p) => $hay([$p['title'] ?? null, $p['author']['login'] ?? null, '#'.($p['number'] ?? ''), $p['head'] ?? null, $p['base'] ?? null, ...array_column($p['labels'] ?? [], 'name')]), $pulls),
        'runs' => array_map(fn ($r) => $hay([$r['name'] ?? null, $r['branch'] ?? null, $r['actor']['login'] ?? null, $r['event'] ?? null, $r['sha'] ?? null]), $runs),
        'deployments' => array_map(fn ($d) => $hay([$d['environment'] ?? null, $d['ref'] ?? null, $d['creator']['login'] ?? null, $d['sha'] ?? null]), $deployments),
    ];

    // The merged timeline: the feeds in order (commits, pulls, runs, deployments), then a stable sort, newest first.
    $events = [];
    foreach ($commits as $i => $c) $events[] = ['kind' => 'commit', 'i' => $i, 'time' => $at($c['date']), 'item' => $c, 'search' => $search['commits'][$i]];
    foreach ($pulls as $i => $p) $events[] = ['kind' => 'pull', 'i' => $i, 'time' => $at($p['createdAt']), 'item' => $p, 'search' => $search['pulls'][$i]];
    foreach ($runs as $i => $r) $events[] = ['kind' => 'run', 'i' => $i, 'time' => $at($r['startedAt']), 'item' => $r, 'search' => $search['runs'][$i]];
    foreach ($deployments as $i => $d) $events[] = ['kind' => 'deployment', 'i' => $i, 'time' => $at($d['createdAt']), 'item' => $d, 'search' => $search['deployments'][$i]];
    usort($events, fn ($a, $b) => $b['time'] <=> $a['time']);
    $search['activity'] = array_column($events, 'search');

    $counts = ['commits' => count($commits), 'pulls' => count($pulls), 'runs' => count($runs), 'deployments' => count($deployments)];
    $repoName = ($repo['owner'] ?? '').'/'.($repo['name'] ?? '');
    $config = ['search' => $search, 'runIds' => array_map(fn ($r) => (string) $r['id'], $runs), 'genericError' => $L['genericError']];
    $emptyIcon = 'git-commit-horizontal';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'github-activity') }}" x-data="nqGithubActivity(@js($config))"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full max-w-5xl') }}>
    <x-nq::card.header class="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div class="flex min-w-0 items-start gap-3">
            <span data-slot="github-mark" class="mt-0.5 shrink-0"><x-nq::oauth-buttons.github-logo class="size-7" /></span>
            <div class="flex min-w-0 flex-col gap-1.5">
                <x-nq::card.title as="h2">{{ $L['title'] }}</x-nq::card.title>
                <x-nq::card.description>{{ $L['description'] }}</x-nq::card.description>
                <x-nq::github-activity.ref :href="$repo['href'] ?? null" class="w-fit text-label text-foreground" :aria-label="$L['openOnGithub'].': '.$repoName"><bdi dir="ltr" class="font-mono text-code">{{ $repoName }}</bdi></x-nq::github-activity.ref>
            </div>
        </div>
        <div class="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">
            @if ($canRefresh)
                <x-nq::button type="button" variant="secondary" x-on:click="act(`refresh`)" x-bind:aria-busy="isBusy(`refresh`) ? `true` : null" x-bind:data-disabled="anyBusy() ? `` : null">
                    <x-nq::spinner x-show="isBusy(`refresh`)" style="display: none" />
                    <x-lucide-refresh-cw aria-hidden="true" />
                    {{ $L['refresh'] }}
                </x-nq::button>
            @endif
            @if ($canDeploy)
                <x-nq::button type="button" variant="primary" x-on:click="act(`deploy`)" x-bind:aria-busy="isBusy(`deploy`) ? `true` : null" x-bind:data-disabled="anyBusy() ? `` : null">
                    <x-nq::spinner x-show="isBusy(`deploy`)" style="display: none" />
                    <x-lucide-rocket aria-hidden="true" />
                    {{ $L['deploy'] }}
                </x-nq::button>
            @endif
        </div>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-4">
        <template x-if="error">
            <x-nq::alert tone="danger" role="alert">
                <span x-text="error"></span>
                <x-slot:action><x-nq::button variant="ghost" size="icon-sm" :aria-label="$L['dismiss']" x-on:click="error = null" class="text-muted-foreground [&_svg]:size-3.5"><x-lucide-x aria-hidden="true" /></x-nq::button></x-slot:action>
            </x-nq::alert>
        </template>
        @if ($loading)
            <div role="status" aria-label="{{ $L['loading'] }}" class="flex flex-col gap-3">
                @for ($i = 0; $i < 5; $i++)<x-nq::states.skeleton class="h-14 w-full" />@endfor
            </div>
        @elseif (count($tabs) === 0)
            <x-nq::states.empty :icon="$emptyIcon" :title="$L['emptyTitle']" :description="$L['emptyBody']" />
        @else
            <x-nq::tabs :default-value="$first">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <x-nq::tabs.list variant="underline">
                        @foreach ($tabs as $id)
                            <x-nq::tabs.tab :value="$id">{{ $L['tabs'][$id] }}@if ($id !== 'activity') <x-nq::badge variant="neutral"><x-nq::numeric :value="$counts[$id]" /></x-nq::badge>@endif</x-nq::tabs.tab>
                        @endforeach
                    </x-nq::tabs.list>
                    @unless ($hideSearch)
                        <div class="relative w-full sm:w-64">
                            <x-lucide-search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground" />
                            <x-nq::field.input type="search" x-model="query" :placeholder="$L['search']" :aria-label="$L['search']" class="ps-8" />
                        </div>
                    @endunless
                </div>

                @if (in_array('activity', $tabs, true))
                    <x-nq::tabs.panel value="activity">
                        @if (count($events) === 0)
                            <div x-show="! filtered()"><x-nq::states.empty :icon="$emptyIcon" :title="$L['emptyTitle']" :description="$L['emptyBody']" /></div>
                            <div x-show="filtered()" style="display: none"><x-nq::states.empty icon="search" :title="$L['noMatchTitle']" :description="$L['noMatchBody']" /></div>
                        @else
                            <div x-show="none('activity')" style="display: none"><x-nq::states.empty icon="search" :title="$L['noMatchTitle']" :description="$L['noMatchBody']" /></div>
                            <div x-show="any('activity')">
                                <x-nq::timeline :aria-label="$L['tabs']['activity']">
                                    @foreach ($events as $n => $e)
                                        @php $it = $e['item']; @endphp
                                        @if ($e['kind'] === 'commit')
                                            <x-nq::timeline.item :actor="['name' => $it['author']['login'], 'avatar' => $it['author']['avatar'] ?? null]" :time="$when($it['date'])" x-show="showActivity({{ $n }})">
                                                <x-slot:title><x-nq::github-activity.ref :href="$it['href'] ?? null" dir="auto">{{ \Illuminate\Support\Str::of($it['message'])->before("\n")->trim() }}</x-nq::github-activity.ref></x-slot:title>
                                                <x-slot:description><bdi>{{ $who('committed', $it['author']) }}</bdi></x-slot:description>
                                                <x-nq::badge variant="outline">{{ $L['kind']['commit'] }}</x-nq::badge>
                                                <x-nq::github-activity.sha :sha="$it['id']" :href="$it['href'] ?? null" />
                                            </x-nq::timeline.item>
                                        @elseif ($e['kind'] === 'pull')
                                            <x-nq::timeline.item :time="$when($it['createdAt'])" x-show="showActivity({{ $n }})">
                                                <x-slot:icon><x-dynamic-component :component="'lucide-'.$pullIcon[$it['state']]" aria-hidden="true" class="{{ $toneText[$pullTone[$it['state']]] }}" /></x-slot:icon>
                                                <x-slot:title><x-nq::github-activity.ref :href="$it['href'] ?? null" dir="auto">{{ $it['title'] }}</x-nq::github-activity.ref></x-slot:title>
                                                <x-slot:description><bdi>{{ $who('openedBy', $it['author']) }}</bdi></x-slot:description>
                                                <x-nq::badge variant="outline">{{ $L['kind']['pull'] }}</x-nq::badge>
                                                <x-nq::badge :variant="$pullBadge[$it['state']]">{{ $L['pullState'][$it['state']] }}</x-nq::badge>
                                                <span dir="ltr" class="text-caption text-muted-foreground">#{{ $it['number'] }}</span>
                                            </x-nq::timeline.item>
                                        @elseif ($e['kind'] === 'run')
                                            <x-nq::timeline.item :time="$when($it['startedAt'])" x-show="showActivity({{ $n }})">
                                                <x-slot:icon><x-dynamic-component :component="'lucide-'.$runIcon[$it['status']]" aria-hidden="true" class="{{ $toneText[$runTone[$it['status']]] }} {{ $it['status'] === 'in_progress' ? 'motion-safe:animate-spin' : '' }}" /></x-slot:icon>
                                                <x-slot:title><x-nq::github-activity.ref :href="$it['href'] ?? null" dir="auto">{{ $it['name'] }}</x-nq::github-activity.ref></x-slot:title>
                                                <x-nq::badge variant="outline">{{ $L['kind']['run'] }}</x-nq::badge>
                                                <x-nq::status :tone="$runTone[$it['status']]">{{ $L['runStatus'][$it['status']] }}</x-nq::status>
                                                @if (! empty($it['branch']))<x-nq::github-activity.branch :name="$it['branch']" />@endif
                                            </x-nq::timeline.item>
                                        @else
                                            <x-nq::timeline.item :time="$when($it['createdAt'])" x-show="showActivity({{ $n }})">
                                                <x-slot:icon><x-lucide-rocket aria-hidden="true" class="{{ $toneText[$deploymentTone[$it['status']]] }}" /></x-slot:icon>
                                                <x-slot:title><x-nq::github-activity.ref :href="$it['href'] ?? null" dir="auto">{{ $it['environment'] }}</x-nq::github-activity.ref></x-slot:title>
                                                <x-nq::badge variant="outline">{{ $L['kind']['deployment'] }}</x-nq::badge>
                                                <x-nq::status :tone="$deploymentTone[$it['status']]">{{ $L['deploymentStatus'][$it['status']] }}</x-nq::status>
                                                <x-nq::github-activity.branch :name="$it['ref']" />
                                            </x-nq::timeline.item>
                                        @endif
                                    @endforeach
                                </x-nq::timeline>
                            </div>
                        @endif
                    </x-nq::tabs.panel>
                @endif

                @if ($commits || $feedData['commits'] !== null)
                    <x-nq::tabs.panel value="commits">
                        @if (count($commits) === 0)
                            <div x-show="! filtered()"><x-nq::states.empty :icon="$emptyIcon" :title="$L['emptyTitle']" :description="$L['emptyBody']" /></div>
                            <div x-show="filtered()" style="display: none"><x-nq::states.empty icon="search" :title="$L['noMatchTitle']" :description="$L['noMatchBody']" /></div>
                        @else
                            <div x-show="none('commits')" style="display: none"><x-nq::states.empty icon="search" :title="$L['noMatchTitle']" :description="$L['noMatchBody']" /></div>
                            <ul aria-label="{{ $L['tabs']['commits'] }}" x-show="any('commits')" class="overflow-hidden rounded-card border border-border">
                                @foreach ($commits as $i => $c)
                                    <li data-slot="github-commit" x-show="show('commits', {{ $i }})" x-bind:class="{ 'border-t-0': firstVisible('commits', {{ $i }}) }" class="{{ $rowClass }}">
                                        <x-nq::avatar :name="$c['author']['login']" :src="$c['author']['avatar'] ?? null" size="sm" />
                                        <div class="flex min-w-0 flex-1 flex-col gap-1">
                                            <x-nq::github-activity.ref :href="$c['href'] ?? null" class="text-label text-foreground" dir="auto">{{ \Illuminate\Support\Str::of($c['message'])->before("\n")->trim() }}</x-nq::github-activity.ref>
                                            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                                                <bdi>{{ $who('committed', $c['author']) }}</bdi>
                                                <x-nq::numeric.date-time :value="$when($c['date'])" relative />
                                                @if (! empty($c['branch']))<x-nq::github-activity.branch :name="$c['branch']" />@endif
                                                @if (! empty($c['checks']))<x-nq::status :tone="$checksTone[$c['checks']]">{{ $L['checks'][$c['checks']] }}</x-nq::status>@endif
                                            </div>
                                        </div>
                                        <x-nq::github-activity.sha :sha="$c['id']" :href="$c['href'] ?? null" />
                                    </li>
                                @endforeach
                            </ul>
                        @endif
                    </x-nq::tabs.panel>
                @endif

                @if ($feedData['pulls'] !== null)
                    <x-nq::tabs.panel value="pulls">
                        @if (count($pulls) === 0)
                            <div x-show="! filtered()"><x-nq::states.empty :icon="$emptyIcon" :title="$L['emptyTitle']" :description="$L['emptyBody']" /></div>
                            <div x-show="filtered()" style="display: none"><x-nq::states.empty icon="search" :title="$L['noMatchTitle']" :description="$L['noMatchBody']" /></div>
                        @else
                            <div x-show="none('pulls')" style="display: none"><x-nq::states.empty icon="search" :title="$L['noMatchTitle']" :description="$L['noMatchBody']" /></div>
                            <ul aria-label="{{ $L['tabs']['pulls'] }}" x-show="any('pulls')" class="overflow-hidden rounded-card border border-border">
                                @foreach ($pulls as $i => $p)
                                    @php $isMerged = $p['state'] === 'merged'; @endphp
                                    <li data-slot="github-pull" data-state="{{ $p['state'] }}" x-show="show('pulls', {{ $i }})" x-bind:class="{ 'border-t-0': firstVisible('pulls', {{ $i }}) }" class="{{ $rowClass }}">
                                        <x-dynamic-component :component="'lucide-'.$pullIcon[$p['state']]" aria-hidden="true" class="mt-0.5 size-4 shrink-0 {{ $toneText[$pullTone[$p['state']]] }}" />
                                        <div class="flex min-w-0 flex-1 flex-col gap-1">
                                            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <x-nq::github-activity.ref :href="$p['href'] ?? null" class="text-label text-foreground" dir="auto">{{ $p['title'] }}</x-nq::github-activity.ref>
                                                <x-nq::badge :variant="$pullBadge[$p['state']]">{{ $L['pullState'][$p['state']] }}</x-nq::badge>
                                                @foreach ($p['labels'] ?? [] as $l)<x-nq::badge variant="tag" :hue="$l['hue'] ?? 'gray'">{{ $l['name'] }}</x-nq::badge>@endforeach
                                            </div>
                                            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                                                <span dir="ltr">#{{ $p['number'] }}</span>
                                                <bdi>{{ $isMerged && ! empty($p['mergedBy']) ? $who('mergedBy', $p['mergedBy']) : $who('openedBy', $p['author']) }}</bdi>
                                                <x-nq::numeric.date-time :value="$when($isMerged && ! empty($p['mergedAt']) ? $p['mergedAt'] : $p['createdAt'])" relative />
                                                @if (! empty($p['head']))<span dir="ltr" class="font-mono text-code">{{ $p['head'] }}{{ ! empty($p['base']) ? ' → '.$p['base'] : '' }}</span>@endif
                                                @if (! empty($p['checks']))<x-nq::status :tone="$checksTone[$p['checks']]">{{ $L['checks'][$p['checks']] }}</x-nq::status>@endif
                                                @if (! empty($p['comments']))<span class="inline-flex items-center gap-1"><x-lucide-message-square aria-hidden="true" class="size-3" />{{ $fill($comments((int) $p['comments']), ['{n}' => $p['comments']]) }}</span>@endif
                                            </div>
                                        </div>
                                        <x-nq::avatar :name="$p['author']['login']" :src="$p['author']['avatar'] ?? null" size="sm" />
                                    </li>
                                @endforeach
                            </ul>
                        @endif
                    </x-nq::tabs.panel>
                @endif

                @if ($feedData['runs'] !== null)
                    <x-nq::tabs.panel value="runs">
                        @if (count($runs) === 0)
                            <div x-show="! filtered()"><x-nq::states.empty :icon="$emptyIcon" :title="$L['emptyTitle']" :description="$L['emptyBody']" /></div>
                            <div x-show="filtered()" style="display: none"><x-nq::states.empty icon="search" :title="$L['noMatchTitle']" :description="$L['noMatchBody']" /></div>
                        @else
                            <div x-show="none('runs')" style="display: none"><x-nq::states.empty icon="search" :title="$L['noMatchTitle']" :description="$L['noMatchBody']" /></div>
                            <ul aria-label="{{ $L['tabs']['runs'] }}" x-show="any('runs')" class="overflow-hidden rounded-card border border-border">
                                @foreach ($runs as $i => $r)
                                    <li data-slot="github-run" data-status="{{ $r['status'] }}" x-show="show('runs', {{ $i }})" x-bind:class="{ 'border-t-0': firstVisible('runs', {{ $i }}) }" class="{{ $rowClass }}">
                                        <x-dynamic-component :component="'lucide-'.$runIcon[$r['status']]" aria-hidden="true" class="mt-0.5 size-4 shrink-0 {{ $toneText[$runTone[$r['status']]] }} {{ $r['status'] === 'in_progress' ? 'motion-safe:animate-spin' : '' }}" />
                                        <div class="flex min-w-0 flex-1 flex-col gap-1">
                                            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <x-nq::github-activity.ref :href="$r['href'] ?? null" class="text-label text-foreground" dir="auto">{{ $r['name'] }}</x-nq::github-activity.ref>
                                                @if (isset($r['number']))<span dir="ltr" class="text-caption text-muted-foreground">#{{ $r['number'] }}</span>@endif
                                                <x-nq::status :tone="$runTone[$r['status']]">{{ $L['runStatus'][$r['status']] }}</x-nq::status>
                                            </div>
                                            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                                                @if (! empty($r['branch']))<x-nq::github-activity.branch :name="$r['branch']" />@endif
                                                @if (! empty($r['sha']))<x-nq::github-activity.sha :sha="$r['sha']" />@endif
                                                @if (! empty($r['event']))<x-nq::badge variant="outline"><bdi dir="ltr">{{ $r['event'] }}</bdi></x-nq::badge>@endif
                                                @if (! empty($r['actor']))<bdi>{{ $who('startedBy', $r['actor']) }}</bdi>@endif
                                                <x-nq::numeric.date-time :value="$when($r['startedAt'])" relative />
                                                @if (isset($r['durationMs']))<span dir="ltr" class="tabular-nums">{{ $fmtDuration($r['durationMs']) }}</span>@endif
                                            </div>
                                        </div>
                                        @if ($canRerun && ! $isActive($r['status']))
                                            <x-nq::button type="button" size="sm" variant="secondary" :aria-label="$fill($L['rerunFor'], ['{name}' => $r['name']])" x-on:click="rerun({{ $i }})" x-bind:aria-busy="isRerunning({{ $i }}) ? `true` : null" x-bind:data-disabled="isRerunning({{ $i }}) ? `` : null">
                                                <x-nq::spinner x-show="isRerunning({{ $i }})" style="display: none" />
                                                <x-lucide-play aria-hidden="true" />
                                                {{ $L['rerun'] }}
                                            </x-nq::button>
                                        @endif
                                    </li>
                                @endforeach
                            </ul>
                        @endif
                    </x-nq::tabs.panel>
                @endif

                @if ($feedData['deployments'] !== null)
                    <x-nq::tabs.panel value="deployments">
                        @if (count($deployments) === 0)
                            <div x-show="! filtered()"><x-nq::states.empty :icon="$emptyIcon" :title="$L['emptyTitle']" :description="$L['emptyBody']" /></div>
                            <div x-show="filtered()" style="display: none"><x-nq::states.empty icon="search" :title="$L['noMatchTitle']" :description="$L['noMatchBody']" /></div>
                        @else
                            <div x-show="none('deployments')" style="display: none"><x-nq::states.empty icon="search" :title="$L['noMatchTitle']" :description="$L['noMatchBody']" /></div>
                            <ul aria-label="{{ $L['tabs']['deployments'] }}" x-show="any('deployments')" class="overflow-hidden rounded-card border border-border">
                                @foreach ($deployments as $i => $d)
                                    <li data-slot="github-deployment" data-status="{{ $d['status'] }}" x-show="show('deployments', {{ $i }})" x-bind:class="{ 'border-t-0': firstVisible('deployments', {{ $i }}) }" class="{{ $rowClass }}">
                                        <x-lucide-rocket aria-hidden="true" class="mt-0.5 size-4 shrink-0 {{ $toneText[$deploymentTone[$d['status']]] }}" />
                                        <div class="flex min-w-0 flex-1 flex-col gap-1">
                                            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <x-nq::github-activity.ref :href="$d['href'] ?? null" class="text-label text-foreground" dir="auto">{{ $d['environment'] }}</x-nq::github-activity.ref>
                                                <x-nq::status :tone="$deploymentTone[$d['status']]">{{ $L['deploymentStatus'][$d['status']] }}</x-nq::status>
                                            </div>
                                            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                                                <x-nq::github-activity.branch :name="$d['ref']" />
                                                @if (! empty($d['sha']))<x-nq::github-activity.sha :sha="$d['sha']" />@endif
                                                @if (! empty($d['creator']))<bdi>{{ $who('deployedBy', $d['creator']) }}</bdi>@endif
                                                <x-nq::numeric.date-time :value="$when($d['createdAt'])" relative />
                                            </div>
                                        </div>
                                        @if (! empty($d['url']))
                                            <a href="{{ $d['url'] }}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-sm text-caption text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                                                {{ $L['viewSite'] }}
                                                <x-lucide-external-link aria-hidden="true" class="size-3 rtl:-scale-x-100" />
                                            </a>
                                        @endif
                                    </li>
                                @endforeach
                            </ul>
                        @endif
                    </x-nq::tabs.panel>
                @endif
            </x-nq::tabs>
        @endif
    </x-nq::card.content>
</div>
