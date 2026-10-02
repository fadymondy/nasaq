{{-- <x-nq::project-view.board :issues="$issues" :statuses="$statuses" :labels="$labels" :people="$people" />
     The Board tab of x-nq::project-view: a kanban board of the issues, a column per status, with a custom card (type, key, priority, title, labels, due date, assignee).
     Drag cards as in x-nq::kanban-board; a drop fires "move" { cardId, toColumn, toIndex } (the enclosing project-view turns it into nq-project-move-issue).
     Clicking a card calls openIssue(id) on the enclosing x-nq::project-view; right-click (or long-press, Shift+F10) opens Open and Copy key.
     issues: as for x-nq::issue-view (id, key, title, type, priority, statusId, assigneeId, labelIds, dueDate). statuses, labels, people as for x-nq::issue-view.
     text: array overriding the words (see x-nq::project-view). locale: default the app locale. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.project-view._logic')
@props(['issues' => [], 'statuses' => [], 'labels' => [], 'people' => [], 'text' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = nq_pv_words($locale, (array) $text);
    $iv = nq_iv_words($locale);
    $personOf = collect($people)->keyBy('id');
    $labelOf = collect($labels)->keyBy('id');
    $columns = collect($statuses)->map(fn ($s) => ['id' => (string) $s['id'], 'title' => $s['name']])->values()->all();
    $cards = collect($issues)->map(function ($i) use ($personOf, $labelOf, $iv, $ar) {
        $p = ! empty($i['assigneeId']) ? $personOf->get($i['assigneeId']) : null;

        return [
            'id' => (string) $i['id'], 'columnId' => (string) $i['statusId'], 'title' => $i['key'].' '.$i['title'], 'key' => $i['key'], 'issueTitle' => $i['title'],
            'type' => $i['type'] ?? 'task', 'priority' => $i['priority'] ?? 'none', 'priorityLabel' => $iv[$i['priority'] ?? 'none'] ?? '',
            'due' => ! empty($i['dueDate']) ? nq_pv_date($i['dueDate'], $ar, false) : '',
            'labels' => collect($i['labelIds'] ?? [])->filter(fn ($id) => $labelOf->has($id))->map(fn ($id) => ['label' => $labelOf[$id]['name'], 'hue' => $labelOf[$id]['hue'] ?? 'gray'])->values()->all(),
            'assignee' => $p ? ['name' => $p['name']] : null,
        ];
    })->values()->all();
    $hintId = 'nq-kanban-hint-'.substr(md5(json_encode($columns)), 0, 6);
    $T = fn (string $en, string $arabic) => $ar ? $arabic : $en;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'project-board') }}" role="group" aria-label="{{ $t['boardLabel'] }}"
    x-data="nqKanbanBoard({!! \Illuminate\Support\Js::from($columns)->toHtml() !!}, {!! \Illuminate\Support\Js::from($cards)->toHtml() !!}, {})" x-modelable="cards"
    {{ $attributes->except('data-slot')->cn('flex w-full items-start gap-4 overflow-x-auto pb-2') }}>
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
                                @include('nasaq::components.project-view._board-card')
                            </x-nq::context-menu.trigger>
                            <x-nq::context-menu.content>
                                <x-nq::context-menu.item x-on:click="openIssue(card.id)"><x-lucide-external-link aria-hidden="true" />{{ $t['openIssue'] }}</x-nq::context-menu.item>
                                <x-nq::context-menu.item x-on:click="copyKey(card.key)"><x-lucide-link-2 aria-hidden="true" />{{ $t['copyKey'] }}</x-nq::context-menu.item>
                            </x-nq::context-menu.content>
                        </x-nq::context-menu>
                    </li>
                </template>
                <li data-slot="kanban-empty" x-show="count(column.id) === 0" x-cloak style="display: none" class="flex flex-1 items-center justify-center rounded-card border border-dashed border-border p-4 text-body-sm text-muted-foreground">{{ $t['boardEmpty'] }}</li>
            </ul>
        </section>
    </template>

    <div data-slot="kanban-overlay" aria-hidden="true" x-show="activeCard() && overlay" x-cloak style="display: none" x-bind:style="overlay ? 'left:' + overlay.left + 'px;top:' + overlay.top + 'px;width:' + overlay.width + 'px' : null" class="pointer-events-none fixed z-50 cursor-grabbing shadow-lg">
        <template x-if="activeCard()">
            <template x-for="card in [activeCard()]" :key="card.id">
                @include('nasaq::components.project-view._board-card')
            </template>
        </template>
    </div>
    <div role="status" aria-live="assertive" class="sr-only" x-text="announcement"></div>
</div>
