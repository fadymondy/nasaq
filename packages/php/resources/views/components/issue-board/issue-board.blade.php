{{-- <x-nq::issue-board :issues="$issues" :statuses="$statuses" :labels="$labels" :people="$people" votable creatable />
     A kanban board of issues, a column per status: cards show type, key, priority, title, labels, votes, comments, attachments, due date
     and assignee. A toolbar searches key / title / label and filters by assignee and reporter; filtering hides cards but a drop still
     lands in the right place among the hidden ones. Right-click (or long-press, Shift+F10) a card for Open issue and Copy key.
     issues: [{ id, key, title, statusId, type?, priority?, assigneeId?, reporterId?, labelIds?, dueDate? (Y-m-d), votes?, voted?, comments?, attachments? }]
     statuses: [{ id, name, stage? (todo|active|done|canceled) }]  labels: [{ id, name, hue? }]  people: [{ id, name }]
     votable: a vote button on each card (toggles votes / voted).  creatable: a "New issue" button.  hide-title: no header row; title: header text.
     reporter-filter: show the reporter select (default: when any issue has a reporterId).  now: Carbon date for the due colours (default now).
     text: array overriding the words (title, board, empty, search, searchPlaceholder, assignee, reporter, anyone, nobody, noReporter, newIssue, clear, open, copyKey).
     Bubbling events from the root: "move" { cardId, toColumn, toIndex } (toIndex among ALL the column's issues), "nq-open" { id },
     "nq-vote" { id, voted }, "nq-create", "nq-filter-change" { query, assigneeId, reporterId }.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.issue-view._logic')
@include('nasaq::components.project-view._logic')
@props(['issues' => [], 'statuses' => [], 'labels' => [], 'people' => [], 'votable' => false, 'creatable' => false, 'hideTitle' => false, 'title' => null, 'reporterFilter' => null, 'now' => null, 'text' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $T = fn (string $en, string $arabic) => $ar ? $arabic : $en;
    $w = array_merge([
        'title' => $T('Issues', 'المهام'), 'board' => $T('Issue board', 'لوحة المهام'), 'empty' => $T('No issues', 'لا توجد مهام'),
        'search' => $T('Search issues', 'بحث في المهام'), 'searchPlaceholder' => $T('Search by key, title or label', 'ابحث بالمعرّف أو العنوان أو الوسم'),
        'assignee' => $T('Assignee', 'المسؤول'), 'reporter' => $T('Reporter', 'المُبلّغ'), 'anyone' => $T('Anyone', 'الجميع'),
        'nobody' => $T('Unassigned', 'غير مسندة'), 'noReporter' => $T('No reporter', 'بلا مُبلّغ'), 'newIssue' => $T('New issue', 'مهمة جديدة'),
        'clear' => $T('Clear filters', 'مسح عوامل التصفية'), 'open' => $T('Open issue', 'فتح المهمة'), 'copyKey' => $T('Copy key', 'نسخ المعرّف'),
    ], (array) $text);
    $iv = nq_iv_words($locale);
    $nowAt = $now ? \Carbon\Carbon::parse($now) : \Carbon\Carbon::now();
    $personOf = collect($people)->keyBy('id');
    $labelOf = collect($labels)->keyBy('id');
    $columns = collect($statuses)->map(fn ($s) => ['id' => (string) $s['id'], 'title' => $s['name']])->values()->all();
    $withReporter = $reporterFilter ?? collect($issues)->contains(fn ($i) => ! empty($i['reporterId']));
    $cards = collect($issues)->map(function ($i) use ($personOf, $labelOf, $iv, $ar, $statuses, $nowAt, $votable) {
        $p = ! empty($i['assigneeId']) ? $personOf->get($i['assigneeId']) : null;
        $tags = collect($i['labelIds'] ?? [])->filter(fn ($id) => $labelOf->has($id))->map(fn ($id) => ['label' => $labelOf[$id]['name'], 'hue' => $labelOf[$id]['hue'] ?? 'gray'])->values()->all();

        return [
            'id' => (string) $i['id'], 'columnId' => (string) $i['statusId'], 'title' => $i['key'].' '.$i['title'], 'key' => $i['key'], 'issueTitle' => $i['title'],
            'type' => $i['type'] ?? 'task', 'priority' => $i['priority'] ?? 'none', 'priorityLabel' => $iv[$i['priority'] ?? 'none'] ?? '',
            'due' => ! empty($i['dueDate']) ? nq_pv_date($i['dueDate'], $ar, false) : '',
            'dueState' => nq_iv_due_state($i['dueDate'] ?? null, $nowAt, nq_iv_is_open($i, $statuses)),
            'labels' => $tags, 'labelNames' => array_column($tags, 'label'),
            'assigneeId' => $i['assigneeId'] ?? null, 'reporterId' => $i['reporterId'] ?? null,
            'assignee' => $p ? ['name' => $p['name']] : null,
            'votes' => $votable || isset($i['votes']) ? (int) ($i['votes'] ?? 0) : null, 'voted' => (bool) ($i['voted'] ?? false),
            'comments' => (int) ($i['comments'] ?? 0), 'attachments' => (int) ($i['attachments'] ?? 0),
        ];
    })->values()->all();
    $config = [
        'cards' => $cards, 'columns' => $columns,
        'text' => ['count' => $T('{total} issues', '{total} مهام'), 'countOf' => $T('{shown} of {total} issues', '{shown} من {total} مهام')],
    ];
    $hintId = 'nq-kanban-hint-'.substr(md5(json_encode($columns)), 0, 6);
    $heading = $title ?? $w['title'];
    $options = fn (string $none, string $label) => array_merge([['value' => '', 'label' => $label.': '.$w['anyone']], ['value' => 'none', 'label' => $none]], collect($people)->map(fn ($p) => ['value' => (string) $p['id'], 'label' => $p['name']])->all());
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'issue-board') }}" aria-label="{{ $hideTitle ? $w['board'] : $heading }}"
    x-data="nqIssueBoard({!! \Illuminate\Support\Js::from($config)->toHtml() !!})"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    @unless ($hideTitle)
        <header class="flex flex-wrap items-center gap-2">
            <h2 class="m-0 text-heading-sm text-foreground">{{ $heading }}</h2>
            <span class="text-caption tabular-nums text-muted-foreground" aria-live="polite" x-text="countText()">{{ $T(count($cards).' issues', count($cards).' مهام') }}</span>
            @if ($creatable)
                <x-nq::button type="button" size="sm" variant="primary" class="ms-auto" x-on:click="create()"><x-lucide-plus aria-hidden="true" />{{ $w['newIssue'] }}</x-nq::button>
            @endif
        </header>
    @endunless
    <div data-slot="issue-board-toolbar" class="flex flex-wrap items-center gap-2">
        <x-nq::input-group class="min-w-48 flex-1 basis-60 sm:max-w-80">
            <x-nq::input-group.addon align="start"><x-lucide-search aria-hidden="true" class="size-4 text-muted-foreground" /></x-nq::input-group.addon>
            <x-nq::input-group.input type="search" placeholder="{{ $w['searchPlaceholder'] }}" aria-label="{{ $w['search'] }}" x-model="filter.query" x-on:input="changed()" x-on:keydown="searchKey($event)" />
        </x-nq::input-group>
        <x-nq::native-select size="sm" data-slot="issue-board-assignee" aria-label="{{ $w['assignee'] }}" :options="$options($w['nobody'], $w['assignee'])" class="w-auto"
            x-effect="$el.value = filter.assigneeId ?? ''" x-on:change="pick('assigneeId', $event.target.value)" />
        @if ($withReporter)
            <x-nq::native-select size="sm" data-slot="issue-board-reporter" aria-label="{{ $w['reporter'] }}" :options="$options($w['noReporter'], $w['reporter'])" class="w-auto"
                x-effect="$el.value = filter.reporterId ?? ''" x-on:change="pick('reporterId', $event.target.value)" />
        @endif
        <span x-show="active" x-cloak style="display: none">
            <x-nq::button type="button" size="sm" variant="ghost" x-on:click="clear()"><x-lucide-x aria-hidden="true" />{{ $w['clear'] }}</x-nq::button>
        </span>
    </div>
    <div data-slot="kanban-board" role="group" aria-label="{{ $w['board'] }}" x-data="nqKanbanBoard({!! \Illuminate\Support\Js::from($columns)->toHtml() !!}, [], { optimistic: false })"
        x-effect="cards = visible" x-on:move.stop="onMove($event)" class="flex w-full items-start gap-4 overflow-x-auto pb-2">
        <p id="{{ $hintId }}" class="sr-only">{{ $T('To pick up a card, press Space or Enter. Use the arrow keys to move it within or between columns, Space or Enter to drop it, Escape to cancel.', 'لالتقاط بطاقة اضغط مسافة أو إدخال. استخدم مفاتيح الأسهم لنقلها داخل العمود أو بين الأعمدة، ومسافة أو إدخال لإفلاتها، وEscape للإلغاء.') }}</p>
        <template x-for="column in columns" :key="column.id">
            <section data-slot="kanban-column" x-bind:data-column-id="column.id" x-bind:data-over="overColumn() === column.id ? '' : null"
                class="flex max-h-full w-72 shrink-0 flex-col gap-3 rounded-card border border-border bg-secondary p-3 transition-colors duration-150 ease-nq data-over:border-nq-focus">
                <header data-slot="kanban-column-header" class="flex items-center justify-between gap-2">
                    <h3 class="min-w-0 truncate text-label text-foreground" x-text="column.title"></h3>
                    <span data-slot="badge" x-bind:aria-label="countLabel(column.id)" class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3 border-border text-muted-foreground">
                        <span class="tabular-nums" x-text="num(count(column.id))"></span>
                    </span>
                </header>
                <ul data-slot="kanban-list" class="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto">
                    <template x-for="card in list(column.id)" :key="card.id">
                        <li data-slot="kanban-item" x-bind:data-card-id="card.id" x-bind:data-dragging="activeId === card.id ? '' : null" role="button" tabindex="0"
                            aria-roledescription="{{ $T('draggable card', 'بطاقة قابلة للسحب') }}" x-bind:aria-pressed="activeId === card.id ? 'true' : 'false'" aria-describedby="{{ $hintId }}"
                            x-bind:class="activeId === card.id && 'opacity-40'" x-on:pointerdown="down($event, card.id)" x-on:keydown="key($event, card.id)"
                            class="cursor-grab touch-manipulation rounded-card outline-none active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                            <x-nq::context-menu>
                                <x-nq::context-menu.trigger>
                                    @include('nasaq::components.issue-board._card')
                                </x-nq::context-menu.trigger>
                                <x-nq::context-menu.content>
                                    <x-nq::context-menu.item x-on:click="openIssue(card.id)"><x-lucide-external-link aria-hidden="true" />{{ $w['open'] }}</x-nq::context-menu.item>
                                    <x-nq::context-menu.item x-on:click="copyKey(card.key)"><x-lucide-link-2 aria-hidden="true" />{{ $w['copyKey'] }}</x-nq::context-menu.item>
                                </x-nq::context-menu.content>
                            </x-nq::context-menu>
                        </li>
                    </template>
                    <li data-slot="kanban-empty" x-show="count(column.id) === 0" x-cloak style="display: none" class="flex flex-1 items-center justify-center rounded-card border border-dashed border-border p-4 text-body-sm text-muted-foreground">{{ $w['empty'] }}</li>
                </ul>
            </section>
        </template>

        <div data-slot="kanban-overlay" aria-hidden="true" x-show="activeCard() && overlay" x-cloak style="display: none" x-bind:style="overlay ? 'left:' + overlay.left + 'px;top:' + overlay.top + 'px;width:' + overlay.width + 'px' : null" class="pointer-events-none fixed z-50 cursor-grabbing shadow-lg">
            <template x-if="activeCard()">
                <template x-for="card in [activeCard()]" :key="card.id">
                    @include('nasaq::components.issue-board._card')
                </template>
            </template>
        </div>
        <div role="status" aria-live="assertive" class="sr-only" x-text="announcement"></div>
    </div>
</section>
