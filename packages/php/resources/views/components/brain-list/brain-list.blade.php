{{-- <x-nq::brain-list :brains="$brains" />
     Zekra-style brains as a table or as cards: status, access, memory and source counts, members and tags, with search, status / access / tag filters, sorting and selection.
     Built on x-nq::entity-list: the table cells are React's (mark with name and description, status, access, counts, members, last activity); the card layout has the mark, status, counts, members and tags. Needs the Alpine runtime (@nasaqScripts).
     brains: [['id', 'name', 'description', 'avatar' (emoji or image URL), 'status' => ready | indexing | paused | error, 'visibility' => private | team | public, 'memories', 'sources', 'chats',
     'model', 'members' => [['name', 'avatar']], 'tags' => [['label', 'hue']] (or plain strings), 'lastActive' (a date)]]. Rows start newest activity first.
     label: the list's accessible name. labels: override any string, e.g. ['statuses' => ['ready' => 'Live']]. view: table | cards. selectable, page-size, row-actions, loading, error, search pass to the list.
     Bubbling events from the list: nq-entity-list-row-click { row }, nq-entity-list-action { action, row }, nq-entity-list-selection { ids }, nq-entity-list-view { view }. row.id is the brain id. --}}
@props(['brains' => [], 'label' => null, 'labels' => [], 'view' => 'table', 'selectable' => true, 'pageSize' => 0, 'rowActions' => [], 'loading' => false, 'error' => null, 'search' => true])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $loc = $ar ? 'ar' : 'en';
    $labels = (array) $labels;
    $base = [
        'en' => [
            'label' => 'Brains', 'search' => 'Search brains…', 'name' => 'Brain', 'status' => 'Status', 'visibility' => 'Access', 'memories' => 'Memories', 'sources' => 'Sources', 'chats' => 'Chats',
            'members' => 'Members', 'tags' => 'Tags', 'lastActive' => 'Last active',
            'statuses' => ['ready' => 'Ready', 'indexing' => 'Indexing', 'paused' => 'Paused', 'error' => 'Needs attention'],
            'visibilities' => ['private' => 'Private', 'team' => 'Team', 'public' => 'Public'],
            'empty' => 'No brains yet', 'emptyHint' => 'Create a brain to give your team a shared memory.',
        ],
        'ar' => [
            'label' => 'العقول', 'search' => 'ابحث في العقول…', 'name' => 'العقل', 'status' => 'الحالة', 'visibility' => 'الوصول', 'memories' => 'الذكريات', 'sources' => 'المصادر', 'chats' => 'المحادثات',
            'members' => 'الأعضاء', 'tags' => 'الوسوم', 'lastActive' => 'آخر نشاط',
            'statuses' => ['ready' => 'جاهز', 'indexing' => 'قيد الفهرسة', 'paused' => 'متوقف', 'error' => 'يحتاج إلى انتباه'],
            'visibilities' => ['private' => 'خاص', 'team' => 'الفريق', 'public' => 'عام'],
            'empty' => 'لا توجد عقول بعد', 'emptyHint' => 'أنشئ عقلًا ليكون لفريقك ذاكرة مشتركة.',
        ],
    ][$loc];
    $t = array_merge($base, \Illuminate\Support\Arr::except($labels, ['statuses', 'visibilities']));
    $t['statuses'] = array_merge($base['statuses'], (array) ($labels['statuses'] ?? []));
    $t['visibilities'] = array_merge($base['visibilities'], (array) ($labels['visibilities'] ?? []));
    $statusView = ['ready' => ['success', 'circle-check'], 'indexing' => ['info', 'loader'], 'paused' => ['neutral', 'circle-pause'], 'error' => ['danger', 'circle-alert']];
    $visIcon = ['private' => 'lock', 'team' => 'users', 'public' => 'globe'];
    $num = fn ($v) => $v === null ? '—' : (class_exists(\NumberFormatter::class) ? (new \NumberFormatter($loc.'@numbers=latn', \NumberFormatter::DECIMAL))->format($v) : (string) $v);
    $compact = function ($v) use ($loc) {
        if ($v === null) {
            return '—';
        }
        if (! class_exists(\NumberFormatter::class)) {
            return (string) $v;
        }
        $f = new \NumberFormatter($loc.'@numbers=latn', \NumberFormatter::DECIMAL);
        $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, 1);
        if ($v >= 1000) {
            return $f->format($v / 1000).($loc === 'ar' ? ' ألف' : 'K');
        }

        return $f->format($v);
    };
    $list = collect((array) $brains)->map(fn ($b) => (array) $b)->sortByDesc(fn ($b) => isset($b['lastActive']) ? \Carbon\Carbon::parse($b['lastActive'])->getTimestamp() : 0)->values();
    $tagsOf = fn ($b) => array_values(array_map(fn ($x) => is_array($x) ? $x : ['label' => (string) $x], (array) ($b['tags'] ?? [])));
    $rows = $list->map(function ($b) use ($t, $statusView, $visIcon, $num, $compact, $tagsOf) {
        $status = $b['status'] ?? 'ready';
        $vis = $b['visibility'] ?? 'private';
        $tags = $tagsOf($b);
        $card = \Illuminate\Support\Facades\Blade::render(<<<'BLADE'
<div data-slot="brain-card" class="flex min-w-0 flex-col gap-3">
    <div class="flex min-w-0 items-start gap-3 pe-(--entity-card-controls)">
        <span aria-hidden="true" class="inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary text-h3 text-foreground">
            @if (preg_match('/^(http|\/|data:)/', (string) ($b['avatar'] ?? '')))<img src="{{ $b['avatar'] }}" alt="" class="size-full object-cover" />
            @elseif (! empty($b['avatar'])){{ $b['avatar'] }}
            @else<x-lucide-brain class="size-5" />@endif
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="truncate text-label text-foreground">{{ $b['name'] }}</span>
            @if (! empty($b['description']))<span class="line-clamp-2 text-body-sm text-muted-foreground">{{ $b['description'] }}</span>@endif
        </div>
    </div>
    <div class="flex flex-wrap items-center gap-1.5">
        <x-nq::status :tone="$statusView[$status][0]" :icon="$statusView[$status][1]">{{ $t['statuses'][$status] ?? $status }}</x-nq::status>
        <x-nq::badge variant="outline"><x-dynamic-component :component="'lucide-'.$visIcon[$vis]" aria-hidden="true" />{{ $t['visibilities'][$vis] ?? $vis }}</x-nq::badge>
    </div>
    <dl class="grid w-full grid-cols-3 gap-1 rounded-control bg-secondary px-1 py-2 text-center">
        @foreach ([['memories', $b['memories'] ?? null], ['sources', $b['sources'] ?? null], ['chats', $b['chats'] ?? null]] as [$k, $v])
            <div class="flex min-w-0 flex-col items-center gap-0.5">
                <dt class="flex max-w-full items-center gap-1 text-caption text-muted-foreground"><span class="truncate" title="{{ $t[$k] }}">{{ $t[$k] }}</span></dt>
                <dd class="text-label tabular-nums text-foreground">{{ $compact($v) }}</dd>
            </div>
        @endforeach
    </dl>
    @if ($tags)<x-nq::entity-list.tag-list :tags="$tags" />@endif
    <div class="flex items-center justify-between gap-2">
        <x-nq::entity-list.avatar-stack :people="$b['members'] ?? []" />
        @if (! empty($b['lastActive']))<x-nq::numeric.date-time :value="$b['lastActive']" class="text-caption text-muted-foreground" />@endif
    </div>
</div>
BLADE, ['b' => $b, 't' => $t, 'status' => $status, 'vis' => $vis, 'statusView' => $statusView, 'visIcon' => $visIcon, 'compact' => $compact, 'tags' => $tags]);

        $cells = \Illuminate\Support\Facades\Blade::render(<<<'BLADE'
<template data-cell="name"><span class="flex min-w-0 items-center gap-3">
    <span aria-hidden="true" class="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary text-body text-foreground">
        @if (preg_match('/^(http|\/|data:)/', (string) ($b['avatar'] ?? '')))<img src="{{ $b['avatar'] }}" alt="" class="size-full object-cover" />
        @elseif (! empty($b['avatar'])){{ $b['avatar'] }}
        @else<x-lucide-brain class="size-4" />@endif
    </span>
    <span class="flex min-w-0 flex-col">
        <span class="truncate text-label text-foreground">{{ $b['name'] }}</span>
        @if (! empty($b['description']))<span class="truncate text-body-sm text-muted-foreground">{{ $b['description'] }}</span>@endif
    </span>
</span></template>
<template data-cell="status"><x-nq::status :tone="$statusView[$status][0]" :icon="$statusView[$status][1]">{{ $t['statuses'][$status] ?? $status }}</x-nq::status></template>
<template data-cell="visibility"><span class="inline-flex items-center gap-1.5 text-body-sm"><x-dynamic-component :component="'lucide-'.$visIcon[$vis]" aria-hidden="true" class="size-3.5 text-muted-foreground" />{{ $t['visibilities'][$vis] ?? $vis }}</span></template>
<template data-cell="members"><x-nq::entity-list.avatar-stack :people="$b['members'] ?? []" /></template>
<template data-cell="lastActive"><x-nq::entity-list.activity-cell :value="$b['lastActive'] ?? null" /></template>
BLADE, ['b' => $b, 't' => $t, 'status' => $status, 'vis' => $vis, 'statusView' => $statusView, 'visIcon' => $visIcon]);
        preg_match_all('/<template data-cell="(\w+)">(.*?)<\/template>/s', $cells, $m, PREG_SET_ORDER);
        $cell = collect($m)->mapWithKeys(fn ($x) => [$x[1] => trim($x[2])])->all();

        return [
            'id' => (string) $b['id'], 'name' => $b['name'], 'status' => $status, 'statusLabel' => $t['statuses'][$status] ?? $status, 'visibility' => $vis,
            'visibilityLabel' => $t['visibilities'][$vis] ?? $vis, 'memories' => $b['memories'] ?? null, 'sources' => $b['sources'] ?? null,
            'memoriesText' => $num($b['memories'] ?? null), 'sourcesText' => $num($b['sources'] ?? null),
            'tags' => array_map(fn ($x) => $x['label'], $tags), 'membersText' => implode(', ', array_map(fn ($m) => $m['name'], (array) ($b['members'] ?? []))) ?: '—',
            'lastActive' => ! empty($b['lastActive']) ? \Carbon\Carbon::parse($b['lastActive'])->locale($loc)->isoFormat('ll') : '—', 'card' => $card,
            'nameCell' => $cell['name'], 'statusCell' => $cell['status'], 'visibilityCell' => $cell['visibility'], 'membersCell' => $cell['members'], 'activityCell' => $cell['lastActive'],
            'statusRank' => array_search($status, array_keys($statusView)), 'visibilityRank' => array_search($vis, array_keys($visIcon)),
            'activityTs' => ! empty($b['lastActive']) ? \Carbon\Carbon::parse($b['lastActive'])->getTimestamp() : 0,
            'memoriesNum' => $b['memories'] ?? 0, 'sourcesNum' => $b['sources'] ?? 0,
        ];
    })->all();
    $tagOptions = collect($rows)->pluck('tags')->flatten()->unique()->values()->map(fn ($x) => ['value' => $x, 'label' => $x])->all();
    $facets = [
        ['id' => 'status', 'title' => $t['status'], 'key' => 'status', 'options' => array_map(fn ($k) => ['value' => $k, 'label' => $t['statuses'][$k]], array_keys($statusView))],
        ['id' => 'visibility', 'title' => $t['visibility'], 'key' => 'visibility', 'options' => array_map(fn ($k) => ['value' => $k, 'label' => $t['visibilities'][$k]], array_keys($visIcon))],
        ...($tagOptions ? [['id' => 'tags', 'title' => $t['tags'], 'key' => 'tags', 'options' => $tagOptions]] : []),
    ];
    $columns = [
        ['id' => 'name', 'type' => 'html', 'key' => 'nameCell', 'sortKey' => 'name', 'header' => $t['name'], 'sortable' => true, 'searchable' => true],
        ['id' => 'status', 'type' => 'html', 'key' => 'statusCell', 'sortKey' => 'statusRank', 'header' => $t['status'], 'sortable' => true],
        ['id' => 'visibility', 'type' => 'html', 'key' => 'visibilityCell', 'sortKey' => 'visibilityRank', 'header' => $t['visibility'], 'sortable' => true],
        ['id' => 'memories', 'key' => 'memoriesText', 'sortKey' => 'memoriesNum', 'header' => $t['memories'], 'align' => 'end', 'sortable' => true],
        ['id' => 'sources', 'key' => 'sourcesText', 'sortKey' => 'sourcesNum', 'header' => $t['sources'], 'align' => 'end', 'sortable' => true],
        ['id' => 'members', 'type' => 'html', 'key' => 'membersCell', 'header' => $t['members']],
        ['id' => 'lastActive', 'type' => 'html', 'key' => 'activityCell', 'sortKey' => 'activityTs', 'header' => $t['lastActive'], 'align' => 'end', 'sortable' => true],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'brain-list') }}" {{ $attributes->except('data-slot')->cn('min-w-0') }}>
    <x-nq::entity-list :label="$label ?? $t['label']" :search="$search === true ? $t['search'] : $search" :columns="$columns" :rows="$rows" :facets="$facets" :view="$view" :selectable="$selectable"
        :page-size="$pageSize" :row-actions="$rowActions" :loading="$loading" :error="$error">
        <x-slot:card><div x-html="row.card"></div></x-slot:card>
        <x-slot:empty><x-nq::states.empty icon="brain" :title="$t['empty']" :description="$t['emptyHint']" /></x-slot:empty>
    </x-nq::entity-list>
</div>
