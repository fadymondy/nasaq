{{-- Internal: the issue card of x-nq::issue-board (partial, runs inside the nested kanban Alpine scope, `card` in scope). Needs $votable, $ar, $T. --}}
<div data-slot="issue-card" x-on:click="openIssue(card.id)" class="flex w-full cursor-pointer flex-col gap-2 rounded-card border border-border bg-card p-3 text-start text-card-foreground">
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
    <div x-show="card.labels.length" x-cloak style="display: none" class="flex flex-wrap gap-1">
        <template x-for="l in card.labels" :key="l.label">
            <span data-slot="badge" x-bind:style="tagStyle(l.hue)" class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3 border-transparent bg-[var(--tag-soft)] text-[var(--tag-solid)]" x-text="l.label"></span>
        </template>
    </div>
    <div x-show="card.due || card.votes !== null || card.comments || card.attachments || card.assignee" x-cloak class="flex items-center gap-3 text-caption text-muted-foreground">
        @if ($votable)
            <button type="button" data-slot="issue-card-vote" x-bind:aria-pressed="card.voted ? 'true' : 'false'"
                x-bind:aria-label="(card.voted ? '{{ $T('Remove your vote, ', 'إلغاء تصويتك، ') }}' : '{{ $T('Upvote, ', 'تصويت، ') }}') + num(card.votes || 0) + '{{ $T(' votes', ' أصوات') }}'"
                x-bind:class="card.voted ? 'border-nq-accent/40 bg-nq-selected text-foreground' : 'border-border hover:bg-nq-hover'"
                x-on:click.stop="voteIssue(card.id)" x-on:keydown.stop x-on:pointerdown.stop
                class="-ms-1 inline-flex h-6 items-center gap-0.5 rounded-control border px-1.5 tabular-nums outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                <x-lucide-chevron-up aria-hidden="true" class="size-3.5" /><span x-text="num(card.votes || 0)"></span>
            </button>
        @else
            <span x-show="card.votes !== null" x-cloak style="display: none" class="inline-flex items-center gap-0.5 tabular-nums"><x-lucide-chevron-up aria-hidden="true" class="size-3.5" /><span x-text="num(card.votes || 0)"></span></span>
        @endif
        <span x-show="card.comments" x-cloak style="display: none" class="inline-flex items-center gap-1 tabular-nums">
            <x-lucide-message-square aria-hidden="true" class="size-3.5" /><span aria-hidden="true" x-text="num(card.comments)"></span>
            <span class="sr-only" x-text="num(card.comments) + '{{ $T(' comments', ' تعليقات') }}'"></span>
        </span>
        <span x-show="card.attachments" x-cloak style="display: none" class="inline-flex items-center gap-1 tabular-nums">
            <x-lucide-paperclip aria-hidden="true" class="size-3.5" /><span aria-hidden="true" x-text="num(card.attachments)"></span>
            <span class="sr-only" x-text="num(card.attachments) + '{{ $T(' attachments', ' مرفقات') }}'"></span>
        </span>
        <span x-show="card.due" x-cloak style="display: none" x-bind:data-due="card.dueState"
            x-bind:class="card.dueState === 'overdue' ? 'text-nq-danger-text' : (card.dueState === 'today' || card.dueState === 'soon' ? 'text-nq-warning-text' : 'text-muted-foreground')" class="inline-flex items-center gap-1">
            <x-lucide-calendar-days aria-hidden="true" class="size-3.5" /><span class="sr-only">{{ $T('Due', 'الاستحقاق') }}</span><span x-text="card.due"></span>
            <span x-show="card.dueState === 'overdue'" x-cloak style="display: none" class="sr-only">({{ $T('Overdue', 'متأخرة') }})</span>
        </span>
        <span x-show="card.assignee" x-cloak style="display: none" data-slot="avatar" x-bind:title="card.assignee ? card.assignee.name : null" x-bind:aria-label="card.assignee ? '{{ $T('Assigned to ', 'مسندة إلى ') }}' + card.assignee.name : null"
            class="ms-auto inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-secondary align-middle font-medium text-secondary-foreground size-5 text-[9px] rounded-full" x-text="card.assignee ? initials(card.assignee.name) : ''"></span>
    </div>
</div>
