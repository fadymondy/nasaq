{{-- Internal: the card of project-view.board (partial, runs inside the kanban `card` Alpine scope). --}}
<div data-slot="kanban-card" x-on:click="openIssue(card.id)" class="flex w-full flex-col gap-2 rounded-card border border-border bg-card p-3 text-card-foreground">
    <div class="flex items-center gap-2 text-caption text-muted-foreground">
        @foreach (['bug', 'feature', 'improvement', 'task', 'chore'] as $ty)
            <span x-show="card.type === '{{ $ty }}'" x-cloak style="display: none" class="contents"><x-nq::issue-view.type-icon type="{{ $ty }}" /></span>
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
    <div class="flex items-center justify-between gap-2">
        <span x-show="card.due" x-cloak style="display: none" class="inline-flex items-center gap-1 text-caption text-muted-foreground"><x-lucide-calendar-days aria-hidden="true" class="size-3.5" /><span x-text="card.due"></span></span>
        <span x-show="!card.due" x-cloak style="display: none"></span>
        <span x-show="card.assignee" x-cloak style="display: none" data-slot="avatar" x-bind:title="card.assignee && card.assignee.name" class="inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-secondary align-middle font-medium text-secondary-foreground size-5 text-[9px] rounded-full" x-text="card.assignee ? initials(card.assignee.name) : ''"></span>
    </div>
</div>
