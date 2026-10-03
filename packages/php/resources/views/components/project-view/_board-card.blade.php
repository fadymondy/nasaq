{{-- Internal: the card of project-view.board (partial, runs inside the kanban `card` Alpine scope). Mirrors x-nq::issue-view.card, drawn on the client so it follows a drag.
     The due colour needs the column: a card dropped in a finished column is never overdue. --}}
<div data-slot="issue-card" x-on:click="openIssue(card.id)"
    x-data="{ cls: { overdue: 'text-nq-danger-text', today: 'text-nq-warning-text', soon: 'text-nq-warning-text', later: 'text-muted-foreground', none: 'text-muted-foreground' },
        due(card, columns) { const stage = (columns.find((c) => c.id === card.columnId) || {}).stage; return card.dueState === 'overdue' && (stage === 'done' || stage === 'canceled') ? 'later' : card.dueState; } }"
    class="flex w-full cursor-pointer flex-col gap-2 rounded-card border border-border bg-card p-3 text-start text-card-foreground">
    <div class="flex items-center gap-2 text-caption text-muted-foreground">
        @foreach (['bug', 'feature', 'improvement', 'task', 'chore'] as $ty)
            <span x-show="card.type === '{{ $ty }}'" x-cloak style="display: none" role="img" x-bind:aria-label="card.typeLabel" class="inline-flex"><x-nq::issue-view.type-icon type="{{ $ty }}" /></span>
        @endforeach
        <bdi dir="ltr" class="font-mono" x-text="card.key"></bdi>
        <span class="ms-auto inline-flex items-center gap-1" x-bind:title="card.priorityLabel">
            @foreach (['urgent', 'high', 'medium', 'low', 'none'] as $pr)
                <span x-show="card.priority === '{{ $pr }}'" x-cloak style="display: none" class="contents"><x-nq::issue-view.priority-icon priority="{{ $pr }}" /></span>
            @endforeach
            <span class="sr-only" x-text="card.priorityLabel"></span>
        </span>
    </div>
    <div class="text-label text-foreground" x-text="card.issueTitle"></div>
    <div x-show="card.labels && card.labels.length" x-cloak style="display: none" class="flex flex-wrap gap-1">
        <template x-for="l in (card.labels || [])" :key="l.label">
            <span data-slot="badge" x-bind:style="tagStyle(l.hue)" class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3 border-transparent" x-text="l.label"></span>
        </template>
    </div>
    <div x-show="card.due || card.assignee" x-cloak style="display: none" class="flex items-center gap-3 text-caption text-muted-foreground">
        <span x-show="card.due" x-cloak style="display: none" x-bind:data-due="due(card, columns)" x-bind:class="cls[due(card, columns)]" class="inline-flex items-center gap-1">
            <x-lucide-calendar-days aria-hidden="true" class="size-3.5" />
            <span class="sr-only" x-text="card.dueWord"></span>
            <span x-text="card.due"></span>
            <span x-show="due(card, columns) === 'overdue'" x-cloak style="display: none" class="sr-only" x-text="'(' + card.overdueWord + ')'"></span>
        </span>
        <span x-show="card.assignee" x-cloak style="display: none" data-slot="avatar" x-bind:title="card.assignee && card.assignee.name" x-bind:aria-label="card.assigneeLabel" class="ms-auto inline-flex size-5 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-secondary align-middle text-[9px] font-medium text-secondary-foreground" x-text="card.assignee ? initials(card.assignee.name) : ''"></span>
    </div>
</div>
