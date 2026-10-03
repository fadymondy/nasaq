{{-- <x-nq::trash-bin :items="$items" :types="[['id' => 'doc', 'label' => 'Document', 'labelAr' => 'مستند', 'icon' => 'file-text']]" :retention-days="30" />
     The trash of an app: what was deleted, who deleted it, how long it stays, and buttons to restore it or delete it for good. Built on x-nq::entity-list:
     search, a type filter, table and card views, selection with bulk actions and a row menu / context menu. Deleting for good always asks first.
     items: [['id', 'name', 'type' (a types id), 'detail', 'deletedAt', 'deletedBy', 'purgeAt'], ...]. types: [['id', 'label', 'labelAr', 'icon' (a lucide name)]].
     retention-days: days an item stays (default 30; 0 or null keeps items until emptied). now: pins "now" (tests, docs). title: a string, or false to hide the heading.
     can-restore / can-delete / can-empty (all true): hide the matching buttons. loading, error: passed to the list. labels: override any string.
     Table cells are React's (type icon with name and detail, type badge, relative date, who, time-left badge by urgency); the card layout has the same pieces.
     Bubbling events: "trash-restore" { ids, fail(message) }, "trash-delete" { ids, fail }, "trash-empty" { ids, fail }, "trash-notify" { message }.
     The list updates at once; call fail to put the items back and show the message. Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'items' => [], 'types' => [], 'retentionDays' => 30, 'now' => null, 'title' => null, 'canRestore' => true, 'canDelete' => true, 'canEmpty' => true,
    'loading' => false, 'error' => null, 'labels' => [], 'locale' => null,
])
@include('nasaq::components.trash-bin._logic')
@include('nasaq::components.entity-list._cells')
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = nq_tb_words($locale, (array) $labels);
    $nowDate = $now ? \Carbon\CarbonImmutable::parse($now) : \Carbon\CarbonImmutable::now();
    $typeList = array_values(array_map(fn ($x) => (array) $x, (array) $types));
    $typeById = collect($typeList)->keyBy('id');
    $typeLabel = fn ($id) => ($x = $typeById->get($id)) ? ($ar ? ($x['labelAr'] ?? $x['label']) : $x['label']) : $t['unknownType'];
    $rows = collect((array) $items)->map(function ($item) use ($t, $ar, $nowDate, $retentionDays, $typeLabel, $locale) {
        $item = (array) $item;
        $r = nq_tb_retention((string) \Carbon\CarbonImmutable::parse($item['deletedAt'])->toIso8601String(), $retentionDays ? (int) $retentionDays : null, isset($item['purgeAt']) ? (string) $item['purgeAt'] : null, $nowDate);
        $left = $r['urgency'] === 'kept' ? $t['kept']
            : ($r['expired'] ? $t['due']
            : ($r['daysLeft'] === 1 && $r['hoursLeft'] < 24 ? nq_tb_count_words($t, 'hoursLeft', $r['hoursLeft'], $ar) : nq_tb_count_words($t, 'daysLeft', $r['daysLeft'] ?? 0, $ar)));

        return [
            'id' => (string) $item['id'], 'name' => $item['name'], 'detail' => $item['detail'] ?? '', 'type' => $item['type'] ?? '',
            'typeLabel' => $typeLabel($item['type'] ?? null), 'deletedBy' => $item['deletedBy'] ?? '', 'urgency' => $r['urgency'], 'left' => $left,
            'purgeOn' => $r['purgeAt'] ? nq_tb_fill($t['purgeOn'], ['name' => \Carbon\CarbonImmutable::createFromTimestamp($r['purgeAt'])->locale($ar ? 'ar' : 'en')->isoFormat('l')]) : '',
            'deleted' => \Carbon\CarbonImmutable::parse($item['deletedAt'])->locale($ar ? 'ar' : 'en')->diffForHumans($nowDate, \Carbon\CarbonInterface::DIFF_RELATIVE_TO_NOW),
            'sortAt' => $r['purgeAt'] ?? PHP_INT_MAX, 'purgeTs' => $r['purgeAt'] ?? PHP_INT_MAX, 'deletedTs' => \Carbon\CarbonImmutable::parse($item['deletedAt'])->getTimestamp(),
        ];
    })->sortBy('sortAt')->values()->map(fn ($r) => \Illuminate\Support\Arr::except($r, 'sortAt'))->all();
    $strings = \Illuminate\Support\Arr::only($t, [
        'deleteBody', 'deleteTitle', 'deleteTitleMany', 'emptyDialogTitle', 'emptyDialogBodyOne', 'emptyDialogBodyMany', 'error', 'restoredOne', 'restoredMany',
        'deletedOne', 'deletedMany', 'trashEmptied',
    ]);
    $badge = 'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3 ';
    $badgeClass = [
        'safe' => $badge.'border-border bg-secondary text-foreground',
        'soon' => $badge.'border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text',
        'urgent' => $badge.'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text',
        'expired' => $badge.'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text',
        'kept' => $badge.'border-border text-muted-foreground',
    ];
    $badge = 'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3 ';
    $rows = array_map(function ($r) use ($typeById, $badgeClass) {
        $icon = $typeById->get($r['type'])['icon'] ?? 'file-text';
        $c = nq_el_cells(<<<'BLADE'
<template data-cell="name"><span class="flex min-w-0 items-center gap-2.5"><x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" /><span class="flex min-w-0 flex-col"><bdi dir="auto" class="truncate text-body text-foreground">{{ $r['name'] }}</bdi>@if ($r['detail'])<bdi dir="auto" class="truncate text-caption text-muted-foreground">{{ $r['detail'] }}</bdi>@endif</span></span></template>
<template data-cell="type"><x-nq::badge variant="outline">{{ $r['typeLabel'] }}</x-nq::badge></template>
<template data-cell="deleted"><span class="text-body-sm text-muted-foreground">{{ $r['deleted'] }}</span></template>
<template data-cell="deletedBy">@if ($r['deletedBy'])<bdi dir="auto" class="text-body-sm text-muted-foreground">{{ $r['deletedBy'] }}</bdi>@else<span class="text-muted-foreground">-</span>@endif</template>
<template data-cell="left"><span data-slot="badge" data-urgency="{{ $r['urgency'] }}" @if ($r['purgeOn']) title="{{ $r['purgeOn'] }}" @endif class="{{ $badgeClass[$r['urgency']] }}">{{ $r['left'] }}</span></template>
BLADE, ['r' => $r, 'icon' => $icon, 'badgeClass' => $badgeClass]);

        return $r + ['nameCell' => $c['name'], 'typeCell' => $c['type'], 'deletedCell' => $c['deleted'], 'deletedByCell' => $c['deletedBy'], 'leftCell' => $c['left']];
    }, $rows);
    $heading = $title === null ? $t['title'] : ($title === false ? null : $title);
    $notice = $retentionDays && $retentionDays > 0 ? nq_tb_fill($t['notice'], ['n' => $retentionDays]) : $t['noticeKept'];
    $actions = array_values(array_filter([
        $canRestore ? ['id' => 'restore', 'label' => $t['restore'], 'icon' => 'rotate-ccw'] : null,
        $canDelete ? ['id' => 'delete', 'label' => $t['delete'], 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'] : null,
    ]));
    $facets = $typeList ? [['id' => 'type', 'title' => $t['types'], 'key' => 'type', 'options' => array_map(fn ($x) => ['value' => $x['id'], 'label' => $ar ? ($x['labelAr'] ?? $x['label']) : $x['label']], $typeList)]] : [];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'trash-bin') }}" x-data="nqTrashBin({!! \Illuminate\Support\Js::from($rows)->toHtml() !!}, {!! \Illuminate\Support\Js::from(['strings' => $strings])->toHtml() !!})"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    @if ($heading)<h2 class="text-title text-foreground">{{ $heading }}</h2>@endif
    <x-nq::alert tone="info" icon="trash-2">{{ $notice }}</x-nq::alert>
    <x-nq::alert tone="danger" x-show="failure" x-cloak style="display: none"><span x-text="failure"></span></x-nq::alert>
    <x-nq::entity-list :label="$t['listLabel']" :search="$t['search']" :columns="[
            ['id' => 'name', 'type' => 'html', 'key' => 'nameCell', 'sortKey' => 'name', 'searchKey' => 'name', 'header' => $t['name'], 'sortable' => true, 'searchable' => true],
            ['id' => 'type', 'type' => 'html', 'key' => 'typeCell', 'sortKey' => 'typeLabel', 'header' => $t['type'], 'sortable' => true],
            ['id' => 'deleted', 'type' => 'html', 'key' => 'deletedCell', 'sortKey' => 'deletedTs', 'header' => $t['deleted'], 'sortable' => true],
            ['id' => 'deletedBy', 'type' => 'html', 'key' => 'deletedByCell', 'sortKey' => 'deletedBy', 'searchKey' => 'deletedBy', 'header' => $t['deletedBy'], 'sortable' => true, 'searchable' => true],
            ['id' => 'timeLeft', 'type' => 'html', 'key' => 'leftCell', 'sortKey' => 'purgeTs', 'header' => $t['timeLeft'], 'sortable' => true],
        ]" :rows="$rows" :facets="$facets" :row-actions="$actions" :page-size="20" :loading="$loading" :error="$error" x-model="entries"
        x-on:nq-entity-list-action="onAction($event.detail)">
        <x-slot:toolbar>
            @if ($canEmpty)
                <x-nq::button size="sm" variant="danger" x-show="entries.length" x-on:click="askEmpty()" data-slot="trash-empty">
                    <x-lucide-trash-2 aria-hidden="true" />
                    {{ $t['empty'] }}
                </x-nq::button>
            @endif
        </x-slot:toolbar>
        <x-slot:bulk>
            @if ($canRestore)
                <x-nq::button size="sm" variant="secondary" x-on:click="bulkRestore(selectedIds()); clearSelection()">
                    <x-lucide-rotate-ccw aria-hidden="true" />
                    {{ $t['restoreSelected'] }}
                </x-nq::button>
            @endif
            @if ($canDelete)
                <x-nq::button size="sm" variant="danger" x-on:click="askDelete(selectedIds()); clearSelection()">
                    <x-lucide-trash-2 aria-hidden="true" />
                    {{ $t['deleteSelected'] }}
                </x-nq::button>
            @endif
        </x-slot:bulk>
        <x-slot:card>
            <div class="flex min-w-0 flex-col gap-2">
                <div class="flex min-w-0 items-start gap-2.5 pe-(--entity-card-controls)">
                    @foreach ($typeList as $x)
                        @if (! empty($x['icon']))
                            <x-dynamic-component :component="'lucide-'.$x['icon']" aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground" x-show="row.type === '{{ $x['id'] }}'" style="display: none" />
                        @endif
                    @endforeach
                    <x-lucide-file-text aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground" x-show="{{ \Illuminate\Support\Js::from(collect($typeList)->filter(fn ($x) => ! empty($x['icon']))->pluck('id')->all())->toHtml() }}.indexOf(row.type) === -1" />
                    <div class="flex min-w-0 flex-col">
                        <bdi dir="auto" class="truncate text-label text-foreground" x-text="row.name"></bdi>
                        <bdi dir="auto" class="truncate text-caption text-muted-foreground" x-show="row.detail" x-text="row.detail"></bdi>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                    <x-nq::badge variant="outline"><span x-text="row.typeLabel"></span></x-nq::badge>
                    <span data-slot="badge" x-bind:data-urgency="row.urgency" x-bind:title="row.purgeOn" x-bind:class="{!! \Illuminate\Support\Js::from($badgeClass)->toHtml() !!}[row.urgency]" x-text="row.left"></span>
                </div>
                <p class="text-caption text-muted-foreground">
                    <time dir="auto" class="tabular-nums [unicode-bidi:isolate]" x-text="row.deleted"></time><template x-if="row.deletedBy"> · <bdi dir="auto" x-text="row.deletedBy"></bdi></template>
                </p>
            </div>
        </x-slot:card>
        <x-slot:empty>
            <x-nq::states.empty icon="trash-2" :title="$t['emptyTitle']" :description="$t['emptyBody']" />
        </x-slot:empty>
    </x-nq::entity-list>
    <x-nq::alert-dialog x-model="confirmOpen">
        <x-nq::alert-dialog.content>
            <x-nq::alert-dialog.header>
                <x-nq::alert-dialog.title><span x-text="dialogTitle()"></span></x-nq::alert-dialog.title>
                <x-nq::alert-dialog.description><span x-text="dialogBody()"></span></x-nq::alert-dialog.description>
            </x-nq::alert-dialog.header>
            <x-nq::alert-dialog.footer>
                <x-nq::alert-dialog.cancel>{{ $t['cancel'] }}</x-nq::alert-dialog.cancel>
                <x-nq::alert-dialog.action variant="danger" x-on:click="confirmed()"><span x-text="confirmKind === 'empty' ? {{ \Illuminate\Support\Js::from($t['confirmEmpty'])->toHtml() }} : {{ \Illuminate\Support\Js::from($t['confirmDelete'])->toHtml() }}"></span></x-nq::alert-dialog.action>
            </x-nq::alert-dialog.footer>
        </x-nq::alert-dialog.content>
    </x-nq::alert-dialog>
</div>
