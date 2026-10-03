{{-- <x-nq::issue-view.card :issue="$issue" :labels="$labels" :people="$people" :votes="4" :comments="2" voteable x-on:nq-issue-vote="save($event.detail)" />
     One issue as a board card: type, key and priority, the title, labels, due date, counts (votes, comments, attachments) and the assignee. Port of IssueCard.
     Use it inside x-nq::kanban-board or on its own; x-on:click and class fall through to the card.
     issue: id, key, title, type, priority, labelIds, assigneeId, dueDate (as for x-nq::issue-view). labels: [id, name, hue]. people: [id, name, avatar].
     votes: a number shows the count. voteable: the count becomes a toggle button; it fires nq-issue-vote { key, voted } and the host re-renders with the new count. voted: starts pressed.
     comments, attachments: counts, shown when above 0. open (default true): a finished issue is never overdue. now: a date for the due colour (default now).
     text: array overriding the words (vote, voted, comments, attachments, assignee, due; vote and voted take %s for the count). locale: default the app locale.
     The due date is coloured by how close it is (data-due: overdue | today | soon | later). --}}
@include('nasaq::components.project-view._logic')
@props(['issue', 'labels' => [], 'people' => [], 'votes' => null, 'voted' => false, 'voteable' => false, 'comments' => null, 'attachments' => null, 'open' => true, 'now' => null, 'text' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $T = array_merge($ar
        ? ['vote' => 'تصويت، %s أصوات', 'voted' => 'إلغاء تصويتك، %s أصوات', 'comments' => '%s تعليقات', 'attachments' => '%s مرفقات', 'assignee' => 'مسندة إلى %s', 'due' => 'الاستحقاق']
        : ['vote' => 'Upvote, %s votes', 'voted' => 'Remove your vote, %s votes', 'comments' => '%s comments', 'attachments' => '%s attachments', 'assignee' => 'Assigned to %s', 'due' => 'Due'], (array) $text);
    $iv = nq_iv_words($locale);
    $type = $issue['type'] ?? 'task';
    $priority = $issue['priority'] ?? 'none';
    $tags = collect($issue['labelIds'] ?? [])->flatMap(fn ($id) => collect($labels)->where('id', $id))->values()->all();
    $assignee = ! empty($issue['assigneeId']) ? collect($people)->firstWhere('id', $issue['assigneeId']) : null;
    $dueDate = $issue['dueDate'] ?? null;
    $when = $now instanceof \Carbon\CarbonInterface ? $now : ($now ? \Carbon\Carbon::parse($now) : \Carbon\Carbon::now());
    $due = nq_iv_due_state($dueDate, $when, (bool) $open);
    $dueText = ['overdue' => 'text-nq-danger-text', 'today' => 'text-nq-warning-text', 'soon' => 'text-nq-warning-text', 'later' => 'text-muted-foreground', 'none' => 'text-muted-foreground'][$due];
    $hasCounts = $votes !== null || $voteable || $comments || $attachments;
    $voteLabel = fn (bool $on) => sprintf($on ? $T['voted'] : $T['vote'], (string) ($votes ?? 0));
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'issue-card') }}" {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-2 rounded-card border border-border bg-card p-3 text-start text-card-foreground') }}>
    <div class="flex items-center gap-2 text-caption text-muted-foreground">
        <span role="img" aria-label="{{ $iv[$type] ?? $type }}" class="inline-flex"><x-nq::issue-view.type-icon :type="$type" /></span>
        <bdi dir="ltr" class="font-mono">{{ $issue['key'] }}</bdi>
        <span class="ms-auto inline-flex items-center gap-1" title="{{ $iv[$priority] ?? '' }}">
            <x-nq::issue-view.priority-icon :priority="$priority" />
            <span class="sr-only">{{ $iv[$priority] ?? '' }}</span>
        </span>
    </div>
    <div class="text-label text-foreground">{{ $issue['title'] }}</div>
    @if (count($tags))
        <div class="flex flex-wrap gap-1">
            @foreach ($tags as $l)
                <x-nq::badge variant="tag" :hue="$l['hue'] ?? 'gray'">{{ $l['name'] }}</x-nq::badge>
            @endforeach
        </div>
    @endif
    @if ($dueDate || $hasCounts || $assignee)
        <div class="flex items-center gap-3 text-caption text-muted-foreground">
            @if ($voteable)
                <button type="button" data-slot="issue-card-vote" x-data="{ on: @js((bool) $voted) }" x-bind:aria-pressed="on ? 'true' : 'false'"
                    x-bind:aria-label="on ? @js($voteLabel(true)) : @js($voteLabel(false))"
                    x-bind:class="on ? 'border-nq-accent/40 bg-nq-selected text-foreground' : 'border-border hover:bg-nq-hover'"
                    x-on:click.stop="on = ! on; $dispatch('nq-issue-vote', { key: @js($issue['key']), voted: on })" x-on:keydown.stop x-on:pointerdown.stop
                    aria-pressed="{{ $voted ? 'true' : 'false' }}" aria-label="{{ $voteLabel((bool) $voted) }}"
                    @class([
                        '-ms-1 inline-flex h-6 items-center gap-0.5 rounded-control border px-1.5 tabular-nums outline-none transition-colors duration-150 ease-nq',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
                        'border-nq-accent/40 bg-nq-selected text-foreground' => $voted,
                        'border-border hover:bg-nq-hover' => ! $voted,
                    ])>
                    <x-lucide-chevron-up aria-hidden="true" class="size-3.5" />
                    {{ (int) ($votes ?? 0) }}
                </button>
            @elseif ($votes !== null)
                <span class="inline-flex items-center gap-0.5 tabular-nums" aria-label="{{ $voteLabel(false) }}">
                    <x-lucide-chevron-up aria-hidden="true" class="size-3.5" />
                    {{ (int) $votes }}
                </span>
            @endif
            @if ($comments)
                <span class="inline-flex items-center gap-1 tabular-nums">
                    <x-lucide-message-square aria-hidden="true" class="size-3.5" />
                    <span aria-hidden="true">{{ (int) $comments }}</span>
                    <span class="sr-only">{{ sprintf($T['comments'], (string) (int) $comments) }}</span>
                </span>
            @endif
            @if ($attachments)
                <span class="inline-flex items-center gap-1 tabular-nums">
                    <x-lucide-paperclip aria-hidden="true" class="size-3.5" />
                    <span aria-hidden="true">{{ (int) $attachments }}</span>
                    <span class="sr-only">{{ sprintf($T['attachments'], (string) (int) $attachments) }}</span>
                </span>
            @endif
            @if ($dueDate)
                <span data-due="{{ $due }}" class="inline-flex items-center gap-1 {{ $dueText }}">
                    <x-lucide-calendar-days aria-hidden="true" class="size-3.5" />
                    <span class="sr-only">{{ $T['due'] }}</span>
                    <time datetime="{{ nq_pv_day($dueDate) }}">{{ nq_pv_date($dueDate, $ar, false) }}</time>
                    @if ($due === 'overdue')<span class="sr-only">({{ $iv['overdue'] }})</span>@endif
                </span>
            @endif
            @if ($assignee)
                <x-nq::avatar :name="$assignee['name']" :src="$assignee['avatar'] ?? null" size="xs" class="ms-auto" aria-label="{{ sprintf($T['assignee'], $assignee['name']) }}" />
            @endif
        </div>
    @endif
</div>
