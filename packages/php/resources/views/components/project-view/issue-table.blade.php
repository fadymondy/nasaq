{{-- <x-nq::project-view.issue-table :issues="$issues" :statuses="$statuses" :people="$people" editable openable deletable creatable />
     The List tab of x-nq::project-view: a data table of the issues with in-cell editing, facet filters on status and priority, a New issue button and row actions (Open, Copy key, Delete).
     issues: as for x-nq::issue-view (id, key, title, statusId, priority, assigneeId, dueDate, estimateHours). statuses: [['id', 'name', 'hue']]. people: [['id', 'name']].
     editable: cells can be edited. openable: rows open (event). deletable: shows Delete. creatable: shows the New issue button (opens the dialog of the enclosing project-view).
     The edits, row clicks and row actions bubble as the events of x-nq::data-table; x-nq::project-view listens on this part's wrapper and turns them into
     nq-project-update-issue, nq-project-open-issue and nq-project-delete-issue. text: array overriding the words. locale: default the app locale. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.project-view._logic')
@props(['issues' => [], 'statuses' => [], 'people' => [], 'editable' => false, 'openable' => false, 'deletable' => false, 'creatable' => false, 'text' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_pv_words($locale, (array) $text);
    $iv = nq_iv_words($locale);
    $priorities = ['urgent' => 'red', 'high' => 'orange', 'medium' => 'amber', 'low' => 'blue', 'none' => 'gray'];
    $rows = collect($issues)->map(fn ($i) => [
        'id' => (string) $i['id'], 'key' => $i['key'], 'title' => $i['title'], 'status' => (string) $i['statusId'], 'priority' => $i['priority'] ?? 'none',
        'assignee' => (string) ($i['assigneeId'] ?? ''), 'due' => $i['dueDate'] ?? null, 'estimate' => $i['estimateHours'] ?? null,
    ])->values()->all();
    $edit = fn (string $kind) => $editable ? ['edit' => $kind] : [];
    $columns = [
        ['id' => 'key', 'header' => $t['colKey'], 'type' => 'mono', 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'title', 'header' => $t['colTitle'], 'sortable' => true, 'searchable' => true] + $edit('text'),
        ['id' => 'status', 'header' => $t['colStatus'], 'type' => 'tag', 'sortable' => true, 'filter' => true,
            'options' => collect($statuses)->map(fn ($s) => ['value' => (string) $s['id'], 'label' => $s['name'], 'hue' => $s['hue'] ?? 'gray'])->values()->all()] + $edit('select'),
        ['id' => 'priority', 'header' => $t['colPriority'], 'type' => 'tag', 'sortable' => true, 'filter' => true,
            'options' => collect($priorities)->map(fn ($hue, $p) => ['value' => $p, 'label' => $iv[$p], 'hue' => $hue])->values()->all()] + $edit('select'),
        ['id' => 'assignee', 'header' => $t['colAssignee'], 'type' => 'tag', 'sortable' => true, 'filter' => true,
            'options' => array_merge([['value' => '', 'label' => $t['unassigned'], 'hue' => 'gray']], collect($people)->map(fn ($p) => ['value' => (string) $p['id'], 'label' => $p['name'], 'hue' => 'gray'])->values()->all())] + $edit('select'),
        ['id' => 'due', 'header' => $t['colDue'], 'type' => 'date', 'sortable' => true] + $edit('date'),
        ['id' => 'estimate', 'header' => $t['colEstimate'], 'type' => 'number', 'align' => 'end', 'sortable' => true] + $edit('number'),
    ];
    $actions = array_values(array_filter([
        $openable ? ['id' => 'open', 'label' => $t['openIssue'], 'icon' => 'external-link'] : null,
        ['id' => 'copy', 'label' => $t['copyKey'], 'icon' => 'link-2'],
        $deletable ? ['id' => 'delete', 'label' => $t['deleteIssue'], 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'] : null,
    ]));
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'project-issue-table') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <x-nq::data-table :label="$t['listLabel']" :columns="$columns" :rows="$rows" :search="$t['search']" :view-options="false" :page-size="25" :row-actions="$actions" :row-click="$openable" :locale="$locale">
        @if ($creatable)
            <x-slot:toolbar><x-nq::button variant="primary" size="sm" class="ms-auto" x-on:click="newOpen = true"><x-lucide-plus aria-hidden="true" />{{ $t['newIssue'] }}</x-nq::button></x-slot:toolbar>
        @endif
        <x-slot:empty><x-nq::states.empty :title="$t['emptyIssues']" :description="$t['emptyIssuesHint']" /></x-slot:empty>
    </x-nq::data-table>
</div>
