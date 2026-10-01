{{-- <x-nq::kanban-board :columns="[['id' => 'todo', 'title' => 'To do'], ['id' => 'done', 'title' => 'Done']]" :cards="[['id' => 'a', 'columnId' => 'todo', 'title' => 'Write the brief']]" />
     Columns of cards the user drags between and within: pointer, press-and-hold on touch, and keyboard (Space lifts, arrows move,
     Space drops, Escape cancels) with localised announcements. Native pointer events, no drag-and-drop library.
     columns: [{ id, title }]. cards: [{ id, columnId, title, labels?: [{ label, hue? }], assignee?: { name, src? } }]; ids are unique across columns AND cards.
     cards is x-modelable (x-model / wire:model). Cards keep the order of the array within their column.
     optimistic: false stops the board reordering `cards` itself on a drop. empty-label, label, instructions override the localised texts. column-class: e.g. "w-80".
     Bubbling event: "move" { cardId, toColumn, toIndex } (toIndex is the position in the destination column once the card is removed from its old place).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['columns' => [], 'cards' => [], 'optimistic' => true, 'emptyLabel' => null, 'label' => null, 'instructions' => null, 'columnClass' => null])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $options = array_filter(['optimistic' => $optimistic ? null : false], fn ($v) => $v !== null);
    $hintId = 'nq-kanban-hint-'.substr(md5(json_encode($columns)), 0, 6);
@endphp
<div data-slot="kanban-board" role="group" aria-label="{{ $label ?? $T('Kanban board', 'لوحة كانبان') }}"
    x-data="nqKanbanBoard({!! \Illuminate\Support\Js::from(array_values((array) $columns))->toHtml() !!}, {!! \Illuminate\Support\Js::from(array_values((array) $cards))->toHtml() !!}, {!! \Illuminate\Support\Js::from((object) $options)->toHtml() !!})" x-modelable="cards"
    {{ $attributes->cn('flex w-full items-start gap-4 overflow-x-auto pb-2') }}>
    <p id="{{ $hintId }}" class="sr-only">{{ $instructions ?? $T('To pick up a card, press Space or Enter. Use the arrow keys to move it within or between columns, Space or Enter to drop it, Escape to cancel.', 'لالتقاط بطاقة اضغط مسافة أو إدخال. استخدم مفاتيح الأسهم لنقلها داخل العمود أو بين الأعمدة، ومسافة أو إدخال لإفلاتها، وEscape للإلغاء.') }}</p>
    <template x-for="column in columns" :key="column.id">
        <section data-slot="kanban-column" x-bind:data-column-id="column.id" x-bind:data-over="overColumn() === column.id ? '' : null"
            class="flex max-h-full w-72 shrink-0 flex-col gap-3 rounded-card border border-border bg-secondary p-3 transition-colors duration-150 ease-nq data-over:border-nq-focus {{ $columnClass }}">
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
                        @include('nasaq::components.kanban-board.card')
                    </li>
                </template>
                <li data-slot="kanban-empty" x-show="count(column.id) === 0" x-cloak style="display: none" class="flex flex-1 items-center justify-center rounded-card border border-dashed border-border p-4 text-body-sm text-muted-foreground">{{ $emptyLabel ?? $T('No cards', 'لا توجد بطاقات') }}</li>
            </ul>
        </section>
    </template>

    <div data-slot="kanban-overlay" aria-hidden="true" x-show="activeCard() && overlay" x-cloak style="display: none" x-bind:style="overlay ? 'left:' + overlay.left + 'px;top:' + overlay.top + 'px;width:' + overlay.width + 'px' : null" class="pointer-events-none fixed z-50 cursor-grabbing shadow-lg">
        <template x-if="activeCard()">
            <template x-for="card in [activeCard()]" :key="card.id">
                @include('nasaq::components.kanban-board.card')
            </template>
        </template>
    </div>
    <div role="status" aria-live="assertive" class="sr-only" x-text="announcement"></div>
</div>
