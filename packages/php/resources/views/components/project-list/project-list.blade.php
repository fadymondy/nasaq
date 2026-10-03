{{-- <x-nq::project-list :projects="$projects" />
     Projects as a table or as cards: status, progress, members, lead, due date and tags, with search, status / client / member / tag filters, sorting and selection.
     Built on x-nq::entity-list, so the table cells are text; the card layout has the status, progress bar, due date, members and tags. Needs the Alpine runtime (@nasaqScripts).
     projects: [['id', 'name', 'key', 'logo', 'client', 'status' => planning | active | on-hold | completed | archived, 'progress' (0 to 100), 'members' => [['name', 'avatar']], 'owner' => ['name', 'avatar'],
     'dueDate', 'tags' => [['label', 'hue']] (or strings), 'lastActivity' (a date)]]. A project past its due date that is not completed or archived shows "Overdue". Rows start newest activity first.
     now: pins "now" for the overdue check (tests, docs). label: the list's accessible name. labels: override any string, e.g. ['statuses' => ['active' => 'Live']].
     view: table | cards. selectable, page-size, row-actions, loading, error, search pass to the list.
     Bubbling events from the list: nq-entity-list-row-click { row }, nq-entity-list-action { action, row }, nq-entity-list-selection { ids }, nq-entity-list-view { view }. row.id is the project id. --}}
@props(['projects' => [], 'label' => null, 'labels' => [], 'now' => null, 'view' => 'table', 'selectable' => true, 'pageSize' => 0, 'rowActions' => [], 'loading' => false, 'error' => null, 'search' => true])
@include('nasaq::components.entity-list._cells')
@php
    $ar = \Nasaq\Nasaq::rtl();
    $loc = $ar ? 'ar' : 'en';
    $labels = (array) $labels;
    $base = [
        'en' => [
            'label' => 'Projects', 'search' => 'Search projects…', 'name' => 'Project', 'client' => 'Client', 'status' => 'Status', 'progress' => 'Progress', 'members' => 'Members', 'owner' => 'Lead', 'due' => 'Due',
            'tags' => 'Tags', 'lastActivity' => 'Last activity', 'overdue' => 'Overdue',
            'statuses' => ['planning' => 'Planning', 'active' => 'Active', 'on-hold' => 'On hold', 'completed' => 'Completed', 'archived' => 'Archived'],
            'empty' => 'No projects yet', 'emptyHint' => 'Create a project to start planning work.',
        ],
        'ar' => [
            'label' => 'المشاريع', 'search' => 'ابحث في المشاريع…', 'name' => 'المشروع', 'client' => 'العميل', 'status' => 'الحالة', 'progress' => 'التقدم', 'members' => 'الأعضاء', 'owner' => 'المسؤول', 'due' => 'الاستحقاق',
            'tags' => 'الوسوم', 'lastActivity' => 'آخر نشاط', 'overdue' => 'متأخر',
            'statuses' => ['planning' => 'قيد التخطيط', 'active' => 'نشط', 'on-hold' => 'معلّق', 'completed' => 'مكتمل', 'archived' => 'مؤرشف'],
            'empty' => 'لا توجد مشاريع بعد', 'emptyHint' => 'أنشئ مشروعًا لبدء تخطيط العمل.',
        ],
    ][$loc];
    $t = array_merge($base, \Illuminate\Support\Arr::except($labels, ['statuses']));
    $t['statuses'] = array_merge($base['statuses'], (array) ($labels['statuses'] ?? []));
    $view_ = ['planning' => ['neutral', 'circle-dashed', 'default'], 'active' => ['info', 'circle-dot', 'info'], 'on-hold' => ['warning', 'circle-pause', 'warning'], 'completed' => ['success', 'circle-check', 'success'], 'archived' => ['neutral', 'archive', 'default']];
    $nowAt = $now ? \Carbon\Carbon::parse($now) : \Carbon\Carbon::now();
    $tagsOf = fn ($p) => array_values(array_map(fn ($x) => is_array($x) ? $x : ['label' => (string) $x], (array) ($p['tags'] ?? [])));
    $list = collect((array) $projects)->map(fn ($p) => (array) $p)->sortByDesc(fn ($p) => ! empty($p['lastActivity']) ? \Carbon\Carbon::parse($p['lastActivity'])->getTimestamp() : 0)->values();
    $rows = $list->map(function ($p) use ($t, $view_, $tagsOf, $loc, $nowAt) {
        $tags = $tagsOf($p);
        $status = $p['status'] ?? 'planning';
        $progress = (int) ($p['progress'] ?? 0);
        $overdue = ! empty($p['dueDate']) && ! in_array($status, ['completed', 'archived'], true) && \Carbon\Carbon::parse($p['dueDate'])->lt($nowAt);
        $due = ! empty($p['dueDate']) ? \Carbon\Carbon::parse($p['dueDate'])->locale($loc)->isoFormat('ll') : '—';
        $card = \Illuminate\Support\Facades\Blade::render(<<<'BLADE'
<div class="flex min-w-0 flex-col gap-3">
    <x-nq::entity-list.identity class="pe-(--entity-card-controls)" :avatar-name="$p['name']" :avatar="$p['logo'] ?? null" shape="square" size="lg">
        {{ $p['name'] }}
        <x-slot:subtitle>@if (! empty($p['client'])){{ $p['client'] }}@elseif (! empty($p['key']))<bdi dir="ltr">{{ $p['key'] }}</bdi>@endif</x-slot:subtitle>
    </x-nq::entity-list.identity>
    <div class="flex flex-col gap-1.5">
        <x-nq::entity-list.card-meta :label="$t['status']"><x-nq::status :tone="$view_[$status][0]" :icon="$view_[$status][1]">{{ $t['statuses'][$status] ?? $status }}</x-nq::status></x-nq::entity-list.card-meta>
        <x-nq::progress :value="$progress" size="sm" :tone="$view_[$status][2]" :label="$t['progress']" :aria-label="$t['progress'].': '.$p['name']" class="py-1" />
        <x-nq::entity-list.card-meta :label="$t['due']">
            @if (empty($p['dueDate']))—@else<x-nq::numeric.date-time :value="$p['dueDate']" :class="$overdue ? 'text-nq-danger-text' : null" />@endif
        </x-nq::entity-list.card-meta>
        <x-nq::entity-list.card-meta :label="$t['members']"><x-nq::entity-list.avatar-stack :people="$p['members'] ?? []" /></x-nq::entity-list.card-meta>
    </div>
    @if ($tags)<x-nq::entity-list.tag-list :tags="$tags" />@endif
</div>
BLADE, ['p' => $p, 't' => $t, 'view_' => $view_, 'status' => $status, 'progress' => $progress, 'overdue' => $overdue, 'tags' => $tags]);

        $cell = nq_el_cells(<<<'BLADE'
<template data-cell="name"><x-nq::entity-list.identity :avatar-name="$p['name']" :avatar="$p['logo'] ?? null" shape="square">
    {{ $p['name'] }}
    <x-slot:subtitle>@if (! empty($p['key']))<bdi dir="ltr">{{ $p['key'] }}</bdi>@endif{{ ! empty($p['key']) && ! empty($p['client']) ? ' · ' : '' }}{{ $p['client'] ?? '' }}</x-slot:subtitle>
</x-nq::entity-list.identity></template>
<template data-cell="status"><x-nq::status :tone="$view_[$status][0]" :icon="$view_[$status][1]">{{ $t['statuses'][$status] ?? $status }}</x-nq::status></template>
<template data-cell="progress"><span class="flex w-36 items-center gap-2">
    <x-nq::progress :value="$progress" size="sm" :tone="$view_[$status][2]" :aria-label="$t['progress'].': '.$p['name']" class="flex-1" />
    <span class="w-9 shrink-0 text-end text-caption tabular-nums text-muted-foreground">{{ $progress }}%</span>
</span></template>
<template data-cell="members"><x-nq::entity-list.avatar-stack :people="$p['members'] ?? []" /></template>
<template data-cell="due">@if (empty($p['dueDate']))<span class="text-muted-foreground">—</span>@else<span class="inline-flex items-center gap-1.5 {{ $overdue ? 'text-nq-danger-text' : '' }}"><x-nq::numeric.date-time :value="$p['dueDate']" class="text-body-sm" />@if ($overdue)<span class="text-caption">{{ $t['overdue'] }}</span>@endif</span>@endif</template>
<template data-cell="activity"><x-nq::entity-list.activity-cell :value="$p['lastActivity'] ?? null" /></template>
BLADE, ['p' => $p, 't' => $t, 'view_' => $view_, 'status' => $status, 'progress' => $progress, 'overdue' => $overdue]);

        return [
            'nameCell' => $cell['name'], 'statusCell' => $cell['status'], 'progressCell' => $cell['progress'], 'membersCell' => $cell['members'], 'dueCell' => $cell['due'], 'activityCell' => $cell['activity'],
            'searchText' => trim(($p['name'] ?? '').' '.($p['key'] ?? '').' '.($p['client'] ?? '')),
            'statusRank' => array_search($status, array_keys($view_)),
            'dueTs' => ! empty($p['dueDate']) ? \Carbon\Carbon::parse($p['dueDate'])->getTimestamp() : null,
            'activityTs' => ! empty($p['lastActivity']) ? \Carbon\Carbon::parse($p['lastActivity'])->getTimestamp() : 0,
            'id' => (string) $p['id'], 'name' => $p['name'], 'client' => $p['client'] ?? '—', 'status' => $status, 'statusLabel' => $t['statuses'][$status] ?? $status, 'progress' => $progress, 'progressText' => $progress.'%',
            'members' => array_map(fn ($m) => $m['name'], (array) ($p['members'] ?? [])), 'membersText' => implode(', ', array_map(fn ($m) => $m['name'], (array) ($p['members'] ?? []))) ?: '—',
            'owner' => $p['owner']['name'] ?? '—', 'due' => $due.($overdue ? ' · '.$t['overdue'] : ''), 'tags' => array_map(fn ($x) => $x['label'], $tags),
            'lastActivityText' => ! empty($p['lastActivity']) ? \Carbon\Carbon::parse($p['lastActivity'])->locale($loc)->diffForHumans() : '—', 'card' => $card,
        ];
    })->all();
    $options = fn ($values) => collect($values)->filter(fn ($v) => $v !== null && $v !== '' && $v !== '—')->unique()->sort()->values()->map(fn ($v) => ['value' => $v, 'label' => $v])->all();
    $facets = array_values(array_filter([
        ['id' => 'status', 'title' => $t['status'], 'key' => 'status', 'options' => array_map(fn ($k) => ['value' => $k, 'label' => $t['statuses'][$k]], array_keys($view_))],
        ['id' => 'client', 'title' => $t['client'], 'key' => 'client', 'options' => $options(collect($rows)->pluck('client'))],
        ['id' => 'members', 'title' => $t['members'], 'key' => 'members', 'options' => $options(collect($rows)->pluck('members')->flatten())],
        ['id' => 'tags', 'title' => $t['tags'], 'key' => 'tags', 'options' => $options(collect($rows)->pluck('tags')->flatten())],
    ], fn ($f) => $f['options']));
    $columns = [
        ['id' => 'name', 'type' => 'html', 'key' => 'nameCell', 'sortKey' => 'name', 'searchKey' => 'searchText', 'header' => $t['name'], 'sortable' => true, 'searchable' => true],
        ['id' => 'status', 'type' => 'html', 'key' => 'statusCell', 'sortKey' => 'statusRank', 'header' => $t['status'], 'sortable' => true],
        ['id' => 'progress', 'type' => 'html', 'key' => 'progressCell', 'sortKey' => 'progress', 'header' => $t['progress'], 'sortable' => true],
        ['id' => 'members', 'type' => 'html', 'key' => 'membersCell', 'header' => $t['members']],
        ['id' => 'due', 'type' => 'html', 'key' => 'dueCell', 'sortKey' => 'dueTs', 'header' => $t['due'], 'sortable' => true],
        ['id' => 'lastActivity', 'type' => 'html', 'key' => 'activityCell', 'sortKey' => 'activityTs', 'header' => $t['lastActivity'], 'align' => 'end', 'sortable' => true],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'project-list') }}" {{ $attributes->except('data-slot')->cn('min-w-0') }}>
    <x-nq::entity-list :label="$label ?? $t['label']" :search="$search === true ? $t['search'] : $search" :columns="$columns" :rows="$rows" :facets="$facets" :view="$view" :selectable="$selectable"
        :page-size="$pageSize" :row-actions="$rowActions" :loading="$loading" :error="$error">
        <x-slot:card><div x-html="row.card"></div></x-slot:card>
        <x-slot:empty><x-nq::states.empty icon="folder-kanban" :title="$t['empty']" :description="$t['emptyHint']" /></x-slot:empty>
    </x-nq::entity-list>
</div>
