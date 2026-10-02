{{-- <x-nq::issue-view.properties :issue="$issue" :statuses="$statuses" :labels="$labels" :people="$people" :projects="$projects" update />
     The properties of an issue as an editable list: status, priority, type, assignee, labels, estimate, due date, project and parent.
     Each field saves on its own; errors show under the list and the field goes back to its saved value.
     issue: ['id', 'key', 'title', 'type', 'priority', 'statusId', 'assigneeId', 'labelIds', 'estimateHours', 'dueDate' (Y-m-d), 'projectId', 'parentId'].
     statuses: [['id', 'name', 'hue', 'stage']]. labels: [['id', 'name', 'hue']]. people: [['id', 'name', 'avatar']]. projects: [['id', 'name']].
     parent-options: [['id', 'key', 'title', 'statusId', 'parentId']] (the issue and its descendants are left out). logged-seconds: for the estimate line.
     update: switch editing on (off by default, like omitting the callback). now: Carbon or string, the clock for the due colour. text: array overriding the built-in words. locale: default the app locale.
     The page listens on the root (or on the issue view around it); detail.wait(promise) resolves { error } to show the message and put the field back:
       nq-issue-update { patch: { statusId | priority | type | assigneeId | labelIds | estimateHours | dueDate | projectId | parentId }, wait }.
     Needs the Alpine module (nqIssueProperties). Differences from the React component: the trigger of a picker shows the text without its icon; the hints under the estimate and due fields are drawn by the server, so re-render after a save. --}}
@include('nasaq::components.issue-view._logic')
@props(['issue', 'statuses' => [], 'labels' => [], 'people' => [], 'projects' => [], 'parentOptions' => [], 'loggedSeconds' => 0, 'update' => false, 'now' => null, 'text' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_iv_words($locale, $text);
    $uid = 'nq-iv-'.preg_replace('/[^A-Za-z0-9_-]/', '', (string) $issue['id']);
    $clock = $now ? \Carbon\Carbon::parse($now) : \Carbon\Carbon::now();
    $open = nq_iv_is_open($issue, $statuses);
    $due = nq_iv_due_state($issue['dueDate'] ?? null, $clock, $open);
    $summary = nq_iv_estimate_summary($loggedSeconds, $issue['estimateHours'] ?? null);
    $parents = nq_iv_parent_candidates((string) $issue['id'], $parentOptions);
    $statusOf = collect($statuses)->keyBy('id');
    $selected = (array) ($issue['labelIds'] ?? []);
    $estimate = isset($issue['estimateHours']) ? nq_iv_format_hours($issue['estimateHours']) : '';
    $config = [
        'values' => [
            'status' => (string) $issue['statusId'],
            'priority' => (string) ($issue['priority'] ?? 'none'),
            'type' => (string) ($issue['type'] ?? 'task'),
            'assignee' => $issue['assigneeId'] ?? '__none__',
            'project' => (string) ($issue['projectId'] ?? ''),
            'parent' => $issue['parentId'] ?? '__none__',
        ],
        'labelIds' => array_values($selected),
        'estimate' => $estimate,
        'due' => (string) ($issue['dueDate'] ?? ''),
        'readOnly' => ! $update,
        'labels' => ['failed' => $t['failed'], 'estimateHint' => $t['estimateHint']],
    ];
    $trigger = 'h-control-sm border-transparent bg-transparent px-2 hover:bg-nq-hover';
    $input = 'h-control-sm border-transparent bg-transparent px-2 hover:bg-nq-hover focus:bg-card';
    $row = 'grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2';
    $item = 'flex min-w-0 items-center gap-2';
    $priorities = ['urgent', 'high', 'medium', 'low', 'none'];
    $types = ['bug', 'feature', 'improvement', 'task', 'chore'];
@endphp
<dl data-slot="{{ $attributes->get('data-slot', 'issue-properties') }}" x-data="nqIssueProperties(@js($config))" x-bind:aria-busy="busy ? 'true' : 'false'"
    {{ $attributes->except('data-slot')->cn('m-0 flex min-w-0 flex-col gap-1.5') }}>
    <div data-slot="issue-property" class="{{ $row }}">
        <dt id="{{ $uid }}-status" class="text-body-sm text-muted-foreground">{{ $t['status'] }}</dt>
        <dd class="m-0 min-w-0">
            <x-nq::select :value="$issue['statusId']" x-model="v.status">
                <x-nq::select.trigger aria-labelledby="{{ $uid }}-status" x-bind:disabled="locked" class="{{ $trigger }}"><x-nq::select.value /></x-nq::select.trigger>
                <x-nq::select.content>
                    @foreach ($statuses as $s)
                        <x-nq::select.item :value="$s['id']"><span class="{{ $item }}"><x-nq::issue-view.status-dot :hue="$s['hue'] ?? null" />{{ $s['name'] }}</span></x-nq::select.item>
                    @endforeach
                </x-nq::select.content>
            </x-nq::select>
        </dd>
    </div>
    <div data-slot="issue-property" class="{{ $row }}">
        <dt id="{{ $uid }}-priority" class="text-body-sm text-muted-foreground">{{ $t['priority'] }}</dt>
        <dd class="m-0 min-w-0">
            <x-nq::select :value="$issue['priority'] ?? 'none'" x-model="v.priority">
                <x-nq::select.trigger aria-labelledby="{{ $uid }}-priority" x-bind:disabled="locked" class="{{ $trigger }}"><x-nq::select.value /></x-nq::select.trigger>
                <x-nq::select.content>
                    @foreach ($priorities as $p)
                        <x-nq::select.item :value="$p"><span class="{{ $item }}"><x-nq::issue-view.priority-icon :priority="$p" />{{ $t[$p] }}</span></x-nq::select.item>
                    @endforeach
                </x-nq::select.content>
            </x-nq::select>
        </dd>
    </div>
    <div data-slot="issue-property" class="{{ $row }}">
        <dt id="{{ $uid }}-type" class="text-body-sm text-muted-foreground">{{ $t['type'] }}</dt>
        <dd class="m-0 min-w-0">
            <x-nq::select :value="$issue['type'] ?? 'task'" x-model="v.type">
                <x-nq::select.trigger aria-labelledby="{{ $uid }}-type" x-bind:disabled="locked" class="{{ $trigger }}"><x-nq::select.value /></x-nq::select.trigger>
                <x-nq::select.content>
                    @foreach ($types as $x)
                        <x-nq::select.item :value="$x"><span class="{{ $item }}"><x-nq::issue-view.type-icon :type="$x" />{{ $t[$x] }}</span></x-nq::select.item>
                    @endforeach
                </x-nq::select.content>
            </x-nq::select>
        </dd>
    </div>
    <div data-slot="issue-property" class="{{ $row }}">
        <dt id="{{ $uid }}-assignee" class="text-body-sm text-muted-foreground">{{ $t['assignee'] }}</dt>
        <dd class="m-0 min-w-0">
            <x-nq::select :value="$issue['assigneeId'] ?? '__none__'" x-model="v.assignee">
                <x-nq::select.trigger aria-labelledby="{{ $uid }}-assignee" x-bind:disabled="locked" class="{{ $trigger }}"><x-nq::select.value /></x-nq::select.trigger>
                <x-nq::select.content>
                    <x-nq::select.item value="__none__"><span class="{{ $item }}">{{ $t['unassigned'] }}</span></x-nq::select.item>
                    @foreach ($people as $p)
                        <x-nq::select.item :value="$p['id']"><span class="{{ $item }}"><x-nq::avatar :name="$p['name']" :src="$p['avatar'] ?? null" size="xs" />{{ $p['name'] }}</span></x-nq::select.item>
                    @endforeach
                </x-nq::select.content>
            </x-nq::select>
        </dd>
    </div>
    <div data-slot="issue-property" class="{{ $row }}">
        <dt id="{{ $uid }}-labels" class="text-body-sm text-muted-foreground">{{ $t['labels'] }}</dt>
        <dd class="m-0 min-w-0">
            <x-nq::popover>
                <button type="button" x-ref="trigger" x-on:click="toggle()" x-bind:disabled="locked" aria-haspopup="dialog" aria-labelledby="{{ $uid }}-labels" x-bind:aria-expanded="open ? 'true' : 'false'"
                    class="flex min-h-control-sm w-full min-w-0 flex-wrap items-center gap-1 rounded-control px-2 py-1 text-start text-body outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus disabled:opacity-50">
                    <span class="text-muted-foreground" x-show="labelIds.length === 0" x-cloak @if ($selected) style="display: none" @endif>{{ $t['noLabels'] }}</span>
                    @foreach ($labels as $l)
                        <span class="contents" x-show="has(@js($l['id']))" x-cloak @unless (in_array($l['id'], $selected, true)) style="display: none" @endunless>
                            <x-nq::badge variant="tag" :hue="$l['hue'] ?? 'gray'">{{ $l['name'] }}</x-nq::badge>
                        </span>
                    @endforeach
                </button>
                <x-nq::popover.content align="start" class="w-56 p-1">
                    <ul aria-label="{{ $t['pickLabels'] }}" class="m-0 flex max-h-64 list-none flex-col overflow-y-auto p-0">
                        @foreach ($labels as $l)
                            <li>
                                <button type="button" role="checkbox" x-bind:aria-checked="has(@js($l['id'])) ? 'true' : 'false'" x-on:click="toggleLabel(@js($l['id']))"
                                    class="flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-start text-body-sm outline-none hover:bg-nq-hover focus-visible:bg-nq-hover">
                                    <x-nq::issue-view.status-dot :hue="$l['hue'] ?? null" />
                                    <span class="min-w-0 flex-1 truncate">{{ $l['name'] }}</span>
                                    <span x-show="has(@js($l['id']))" x-cloak class="contents" @unless (in_array($l['id'], $selected, true)) style="display: none" @endunless><x-lucide-check aria-hidden="true" class="size-4 text-foreground" /></span>
                                </button>
                            </li>
                        @endforeach
                    </ul>
                </x-nq::popover.content>
            </x-nq::popover>
        </dd>
    </div>
    <div data-slot="issue-property" class="{{ $row }}">
        <dt id="{{ $uid }}-estimate" class="text-body-sm text-muted-foreground">{{ $t['estimate'] }}</dt>
        <dd class="m-0 min-w-0">
            <div class="flex min-w-0 flex-col gap-0.5">
                <x-nq::field.input aria-labelledby="{{ $uid }}-estimate" ltr placeholder="{{ $t['noEstimate'] }}" title="{{ $t['estimateHint'] }}" value="{{ $estimate }}" class="{{ $input }}"
                    x-model="estimate" x-bind:disabled="locked" x-on:blur="commitEstimate()" x-on:keydown.enter.prevent="commitEstimate()" x-on:keydown.escape="revertEstimate()" />
                @if ($loggedSeconds > 0)
                    <span class="px-2 text-caption {{ $summary['over'] ? 'text-nq-danger-text' : 'text-muted-foreground' }}">
                        <bdi>{{ sprintf($t['logged'], nq_iv_format_hours($summary['loggedHours'])) }}</bdi>@if ($summary['over']) · {{ $t['over'] }}@endif
                        @if ($summary['ratio'] !== null) · <x-nq::numeric :value="$summary['ratio']" style="percent" :max-fraction="0" />@endif
                    </span>
                @endif
            </div>
        </dd>
    </div>
    <div data-slot="issue-property" class="{{ $row }}">
        <dt id="{{ $uid }}-due" class="text-body-sm text-muted-foreground">{{ $t['due'] }}</dt>
        <dd class="m-0 min-w-0">
            <div class="flex min-w-0 flex-col gap-0.5">
                <x-nq::field.input aria-labelledby="{{ $uid }}-due" type="date" ltr value="{{ $issue['dueDate'] ?? '' }}" class="{{ $input }}"
                    x-model="due" x-bind:disabled="locked" x-on:blur="commitDue()" x-on:change="commitDue()" x-on:keydown.enter.prevent="commitDue()" x-on:keydown.escape="revertDue()" />
                @if (in_array($due, ['overdue', 'today', 'soon'], true))
                    <span class="px-2 text-caption {{ $due === 'overdue' ? 'text-nq-danger-text' : ($due === 'today' ? 'text-nq-warning-text' : 'text-muted-foreground') }}">{{ $due === 'overdue' ? $t['overdue'] : ($due === 'today' ? $t['dueToday'] : $t['dueSoon']) }}</span>
                @endif
            </div>
        </dd>
    </div>
    <div data-slot="issue-property" class="{{ $row }}">
        <dt id="{{ $uid }}-project" class="text-body-sm text-muted-foreground">{{ $t['project'] }}</dt>
        <dd class="m-0 min-w-0">
            <x-nq::select :value="$issue['projectId'] ?? null" x-model="v.project">
                <x-nq::select.trigger aria-labelledby="{{ $uid }}-project" x-bind:disabled="locked" class="{{ $trigger }}"><x-nq::select.value /></x-nq::select.trigger>
                <x-nq::select.content>
                    @foreach ($projects as $p)
                        <x-nq::select.item :value="$p['id']"><span class="{{ $item }}">{{ $p['name'] }}</span></x-nq::select.item>
                    @endforeach
                </x-nq::select.content>
            </x-nq::select>
        </dd>
    </div>
    <div data-slot="issue-property" class="{{ $row }}">
        <dt id="{{ $uid }}-parent" class="text-body-sm text-muted-foreground">{{ $t['parent'] }}</dt>
        <dd class="m-0 min-w-0">
            <x-nq::select :value="$issue['parentId'] ?? '__none__'" x-model="v.parent">
                <x-nq::select.trigger aria-labelledby="{{ $uid }}-parent" x-bind:disabled="locked" class="{{ $trigger }}"><x-nq::select.value /></x-nq::select.trigger>
                <x-nq::select.content>
                    <x-nq::select.item value="__none__"><span class="{{ $item }}">{{ $t['noParent'] }}</span></x-nq::select.item>
                    @foreach ($parents as $p)
                        <x-nq::select.item :value="$p['id']"><span class="{{ $item }}"><x-nq::issue-view.status-dot :hue="$statusOf[$p['statusId']]['hue'] ?? null" />{{ $p['key'].' '.$p['title'] }}</span></x-nq::select.item>
                    @endforeach
                </x-nq::select.content>
            </x-nq::select>
        </dd>
    </div>
    <p role="alert" x-show="error" x-text="error" x-cloak style="display: none" class="text-body-sm text-nq-danger-text"></p>
</dl>
