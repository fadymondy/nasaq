{{-- Default kanban card body (partial, included by kanban-board; runs inside the Alpine `card` scope). --}}
<div data-slot="kanban-card" class="flex flex-col gap-2 rounded-card border border-border bg-card p-3 text-card-foreground">
    <div x-show="card.labels && card.labels.length" x-cloak style="display: none" class="flex flex-wrap gap-1">
        <template x-for="l in (card.labels || [])" :key="l.label">
            <span data-slot="badge" x-bind:style="tagStyle(l.hue)" class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3 border-transparent" x-text="l.label"></span>
        </template>
    </div>
    <div class="text-label text-foreground" x-text="card.title"></div>
    <div x-show="card.assignee" x-cloak style="display: none" class="flex items-center justify-end">
        <span data-slot="avatar" x-bind:title="card.assignee && card.assignee.name" class="inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-secondary align-middle font-medium text-secondary-foreground size-5 text-[9px] rounded-full" x-text="card.assignee ? initials(card.assignee.name) : ''"></span>
    </div>
</div>
