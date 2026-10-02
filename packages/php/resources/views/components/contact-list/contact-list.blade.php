{{-- <x-nq::contact-list :contacts="$contacts" />
     Contacts as a table or as cards, with search, stage / tag / owner filters, sorting, selection, tags, owner and last activity.
     Built on x-nq::entity-list, so the table cells are text; the card layout has the avatar, stage, owner, activity and tags. Needs the Alpine runtime (@nasaqScripts).
     contacts: [['id', 'name', 'email', 'phone', 'avatar', 'company', 'jobTitle', 'stage' => lead | prospect | customer | churned, 'tags' => [['label', 'hue']] (or strings), 'owner' => ['name', 'avatar'], 'lastActivity' (a date)]].
     Rows start A to Z. label: the list's accessible name. labels: override any string, e.g. ['stages' => ['lead' => 'Warm lead']]. view: table | cards. selectable, page-size, row-actions, loading, error, search pass to the list.
     Bubbling events from the list: nq-entity-list-row-click { row }, nq-entity-list-action { action, row }, nq-entity-list-selection { ids }, nq-entity-list-view { view }. row.id is the contact id. --}}
@props(['contacts' => [], 'label' => null, 'labels' => [], 'view' => 'table', 'selectable' => true, 'pageSize' => 0, 'rowActions' => [], 'loading' => false, 'error' => null, 'search' => true])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $loc = $ar ? 'ar' : 'en';
    $labels = (array) $labels;
    $base = [
        'en' => [
            'label' => 'Contacts', 'search' => 'Search contacts…', 'name' => 'Name', 'email' => 'Email', 'company' => 'Company', 'stage' => 'Stage', 'tags' => 'Tags', 'owner' => 'Owner', 'lastActivity' => 'Last activity',
            'stages' => ['lead' => 'Lead', 'prospect' => 'Prospect', 'customer' => 'Customer', 'churned' => 'Churned'], 'empty' => 'No contacts yet', 'emptyHint' => 'Add a contact or import a list to get started.',
        ],
        'ar' => [
            'label' => 'جهات الاتصال', 'search' => 'ابحث في جهات الاتصال…', 'name' => 'الاسم', 'email' => 'البريد', 'company' => 'الشركة', 'stage' => 'المرحلة', 'tags' => 'الوسوم', 'owner' => 'المسؤول', 'lastActivity' => 'آخر نشاط',
            'stages' => ['lead' => 'عميل محتمل', 'prospect' => 'مهتم', 'customer' => 'عميل', 'churned' => 'منقطع'], 'empty' => 'لا توجد جهات اتصال بعد', 'emptyHint' => 'أضف جهة اتصال أو استورد قائمة للبدء.',
        ],
    ][$loc];
    $t = array_merge($base, \Illuminate\Support\Arr::except($labels, ['stages']));
    $t['stages'] = array_merge($base['stages'], (array) ($labels['stages'] ?? []));
    $tone = ['lead' => 'info', 'prospect' => 'warning', 'customer' => 'success', 'churned' => 'neutral'];
    $tagsOf = fn ($c) => array_values(array_map(fn ($x) => is_array($x) ? $x : ['label' => (string) $x], (array) ($c['tags'] ?? [])));
    $list = collect((array) $contacts)->map(fn ($c) => (array) $c)->sortBy(fn ($c) => mb_strtolower($c['name']))->values();
    $rows = $list->map(function ($c) use ($t, $tone, $tagsOf, $loc) {
        $tags = $tagsOf($c);
        $stage = $c['stage'] ?? null;
        $card = \Illuminate\Support\Facades\Blade::render(<<<'BLADE'
<div class="flex min-w-0 flex-col gap-3">
    <x-nq::entity-list.identity class="pe-(--entity-card-controls)" :avatar-name="$c['name']" :avatar="$c['avatar'] ?? null" size="lg">
        {{ $c['name'] }}
        <x-slot:subtitle>{{ $c['jobTitle'] ?? ($c['company'] ?? '') }}</x-slot:subtitle>
    </x-nq::entity-list.identity>
    <bdi dir="ltr" class="truncate text-body-sm text-muted-foreground">{{ $c['email'] }}</bdi>
    <div class="flex flex-col gap-1.5">
        @if ($stage)<x-nq::entity-list.card-meta :label="$t['stage']"><x-nq::status :tone="$tone[$stage] ?? 'neutral'">{{ $t['stages'][$stage] ?? $stage }}</x-nq::status></x-nq::entity-list.card-meta>@endif
        @if (! empty($c['company']) && ! empty($c['jobTitle']))<x-nq::entity-list.card-meta :label="$t['company']">{{ $c['company'] }}</x-nq::entity-list.card-meta>@endif
        <x-nq::entity-list.card-meta :label="$t['owner']"><x-nq::entity-list.person-cell :person="$c['owner'] ?? null" /></x-nq::entity-list.card-meta>
        <x-nq::entity-list.card-meta :label="$t['lastActivity']"><x-nq::entity-list.activity-cell :value="$c['lastActivity'] ?? null" /></x-nq::entity-list.card-meta>
    </div>
    @if ($tags)<x-nq::entity-list.tag-list :tags="$tags" />@endif
</div>
BLADE, ['c' => $c, 't' => $t, 'tone' => $tone, 'stage' => $stage, 'tags' => $tags]);

        return [
            'id' => (string) $c['id'], 'name' => $c['name'], 'email' => $c['email'], 'company' => $c['company'] ?? '—', 'stage' => $stage ?? '', 'stageLabel' => $stage ? ($t['stages'][$stage] ?? $stage) : '—',
            'tagsText' => implode(', ', array_map(fn ($x) => $x['label'], $tags)) ?: '—', 'tags' => array_map(fn ($x) => $x['label'], $tags), 'owner' => $c['owner']['name'] ?? '—',
            'lastActivityText' => ! empty($c['lastActivity']) ? \Carbon\Carbon::parse($c['lastActivity'])->locale($loc)->diffForHumans() : '—', 'card' => $card,
        ];
    })->all();
    $options = fn ($values) => collect($values)->filter(fn ($v) => $v !== null && $v !== '' && $v !== '—')->unique()->sort()->values()->map(fn ($v) => ['value' => $v, 'label' => $v])->all();
    $facets = array_values(array_filter([
        ['id' => 'stage', 'title' => $t['stage'], 'key' => 'stage', 'options' => array_map(fn ($k) => ['value' => $k, 'label' => $t['stages'][$k]], array_keys($tone))],
        ['id' => 'tags', 'title' => $t['tags'], 'key' => 'tags', 'options' => $options(collect($rows)->pluck('tags')->flatten())],
        ['id' => 'owner', 'title' => $t['owner'], 'key' => 'owner', 'options' => $options(collect($rows)->pluck('owner'))],
    ], fn ($f) => $f['options']));
    $columns = [
        ['id' => 'name', 'header' => $t['name'], 'sortable' => true, 'searchable' => true],
        ['id' => 'email', 'header' => $t['email'], 'searchable' => true],
        ['id' => 'company', 'header' => $t['company'], 'sortable' => true, 'searchable' => true],
        ['id' => 'stage', 'key' => 'stageLabel', 'header' => $t['stage'], 'sortable' => true],
        ['id' => 'tags', 'key' => 'tagsText', 'header' => $t['tags']],
        ['id' => 'owner', 'header' => $t['owner'], 'sortable' => true],
        ['id' => 'lastActivity', 'key' => 'lastActivityText', 'header' => $t['lastActivity'], 'align' => 'end'],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'contact-list') }}" {{ $attributes->except('data-slot')->cn('min-w-0') }}>
    <x-nq::entity-list :label="$label ?? $t['label']" :search="$search === true ? $t['search'] : $search" :columns="$columns" :rows="$rows" :facets="$facets" :view="$view" :selectable="$selectable"
        :page-size="$pageSize" :row-actions="$rowActions" :loading="$loading" :error="$error">
        <x-slot:card><div x-html="row.card"></div></x-slot:card>
        <x-slot:empty><x-nq::states.empty icon="users" :title="$t['empty']" :description="$t['emptyHint']" /></x-slot:empty>
    </x-nq::entity-list>
</div>
