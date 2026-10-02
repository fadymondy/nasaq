{{-- <x-nq::company-list :companies="$companies" />
     Companies as a table or as cards: logo, domain, contact count, industry, tags, owner and last activity, with search, industry / tag / owner filters, sorting and selection.
     Built on x-nq::entity-list, so the table cells are text; the card layout has the logo, domain, owner, activity and tags. Needs the Alpine runtime (@nasaqScripts).
     companies: [['id', 'name', 'domain', 'logo', 'industry', 'location', 'contactsCount', 'tags' => [['label', 'hue']] (or strings), 'owner' => ['name', 'avatar'], 'lastActivity' (a date)]].
     Rows start A to Z. label: the list's accessible name. labels: override any string. view: table | cards. selectable, page-size, row-actions, loading, error, search pass to the list.
     Bubbling events from the list: nq-entity-list-row-click { row }, nq-entity-list-action { action, row }, nq-entity-list-selection { ids }, nq-entity-list-view { view }. row.id is the company id. --}}
@props(['companies' => [], 'label' => null, 'labels' => [], 'view' => 'table', 'selectable' => true, 'pageSize' => 0, 'rowActions' => [], 'loading' => false, 'error' => null, 'search' => true])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $loc = $ar ? 'ar' : 'en';
    $t = array_merge([
        'en' => [
            'label' => 'Companies', 'search' => 'Search companies…', 'name' => 'Company', 'domain' => 'Domain', 'industry' => 'Industry', 'contacts' => 'Contacts', 'tags' => 'Tags', 'owner' => 'Owner', 'lastActivity' => 'Last activity',
            'empty' => 'No companies yet', 'emptyHint' => 'Add a company or import a list to get started.',
        ],
        'ar' => [
            'label' => 'الشركات', 'search' => 'ابحث في الشركات…', 'name' => 'الشركة', 'domain' => 'النطاق', 'industry' => 'المجال', 'contacts' => 'جهات الاتصال', 'tags' => 'الوسوم', 'owner' => 'المسؤول', 'lastActivity' => 'آخر نشاط',
            'empty' => 'لا توجد شركات بعد', 'emptyHint' => 'أضف شركة أو استورد قائمة للبدء.',
        ],
    ][$loc], (array) $labels);
    $num = fn ($v) => class_exists(\NumberFormatter::class) ? (new \NumberFormatter($loc.'@numbers=latn', \NumberFormatter::DECIMAL))->format($v ?? 0) : (string) ($v ?? 0);
    $tagsOf = fn ($c) => array_values(array_map(fn ($x) => is_array($x) ? $x : ['label' => (string) $x], (array) ($c['tags'] ?? [])));
    $list = collect((array) $companies)->map(fn ($c) => (array) $c)->sortBy(fn ($c) => mb_strtolower($c['name']))->values();
    $rows = $list->map(function ($c) use ($t, $num, $tagsOf, $loc) {
        $tags = $tagsOf($c);
        $card = \Illuminate\Support\Facades\Blade::render(<<<'BLADE'
<div class="flex min-w-0 flex-col gap-3">
    <x-nq::entity-list.identity class="pe-(--entity-card-controls)" :avatar-name="$c['name']" :avatar="$c['logo'] ?? null" shape="square" size="lg">
        {{ $c['name'] }}
        <x-slot:subtitle>@if (! empty($c['domain']))<bdi dir="ltr">{{ $c['domain'] }}</bdi>@else{{ $c['industry'] ?? '' }}@endif</x-slot:subtitle>
    </x-nq::entity-list.identity>
    <div class="flex flex-col gap-1.5">
        @if (! empty($c['industry']))<x-nq::entity-list.card-meta :label="$t['industry']">{{ $c['industry'] }}</x-nq::entity-list.card-meta>@endif
        <x-nq::entity-list.card-meta :label="$t['contacts']"><span class="tabular-nums">{{ $num($c['contactsCount'] ?? 0) }}</span></x-nq::entity-list.card-meta>
        <x-nq::entity-list.card-meta :label="$t['owner']"><x-nq::entity-list.person-cell :person="$c['owner'] ?? null" /></x-nq::entity-list.card-meta>
        <x-nq::entity-list.card-meta :label="$t['lastActivity']"><x-nq::entity-list.activity-cell :value="$c['lastActivity'] ?? null" /></x-nq::entity-list.card-meta>
    </div>
    @if ($tags)<x-nq::entity-list.tag-list :tags="$tags" />@endif
</div>
BLADE, ['c' => $c, 't' => $t, 'num' => $num, 'tags' => $tags]);

        return [
            'id' => (string) $c['id'], 'name' => $c['name'], 'domain' => $c['domain'] ?? '—', 'industry' => $c['industry'] ?? '—', 'contacts' => $c['contactsCount'] ?? 0, 'contactsText' => $num($c['contactsCount'] ?? 0),
            'tagsText' => implode(', ', array_map(fn ($x) => $x['label'], $tags)) ?: '—', 'tags' => array_map(fn ($x) => $x['label'], $tags), 'owner' => $c['owner']['name'] ?? '—',
            'lastActivity' => ! empty($c['lastActivity']) ? \Carbon\Carbon::parse($c['lastActivity'])->locale($loc)->diffForHumans() : '—', 'card' => $card,
        ];
    })->all();
    $options = fn ($values) => collect($values)->filter(fn ($v) => $v !== null && $v !== '' && $v !== '—')->unique()->sort()->values()->map(fn ($v) => ['value' => $v, 'label' => $v])->all();
    $facets = array_values(array_filter([
        ['id' => 'industry', 'title' => $t['industry'], 'key' => 'industry', 'options' => $options(collect($rows)->pluck('industry'))],
        ['id' => 'tags', 'title' => $t['tags'], 'key' => 'tags', 'options' => $options(collect($rows)->pluck('tags')->flatten())],
        ['id' => 'owner', 'title' => $t['owner'], 'key' => 'owner', 'options' => $options(collect($rows)->pluck('owner'))],
    ], fn ($f) => $f['options']));
    $columns = [
        ['id' => 'name', 'header' => $t['name'], 'sortable' => true, 'searchable' => true],
        ['id' => 'domain', 'header' => $t['domain'], 'sortable' => true, 'searchable' => true],
        ['id' => 'industry', 'header' => $t['industry'], 'sortable' => true, 'searchable' => true],
        ['id' => 'contacts', 'key' => 'contactsText', 'header' => $t['contacts'], 'align' => 'end'],
        ['id' => 'tags', 'key' => 'tagsText', 'header' => $t['tags']],
        ['id' => 'owner', 'header' => $t['owner'], 'sortable' => true],
        ['id' => 'lastActivity', 'header' => $t['lastActivity'], 'align' => 'end'],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'company-list') }}" {{ $attributes->except('data-slot')->cn('min-w-0') }}>
    <x-nq::entity-list :label="$label ?? $t['label']" :search="$search === true ? $t['search'] : $search" :columns="$columns" :rows="$rows" :facets="$facets" :view="$view" :selectable="$selectable"
        :page-size="$pageSize" :row-actions="$rowActions" :loading="$loading" :error="$error">
        <x-slot:card><div x-html="row.card"></div></x-slot:card>
        <x-slot:empty><x-nq::states.empty icon="building-2" :title="$t['empty']" :description="$t['emptyHint']" /></x-slot:empty>
    </x-nq::entity-list>
</div>
