{{-- <x-nq::activity-composer.entry :activity="$a" :index="0" :t="$words" :now="$now" planned toggle delete />
     One row of x-nq::activity-composer.timeline (it uses the timeline's Alpine state): the timeline.item markup on a context-menu region, with the task checkbox and the "…" menu.
     activity: ['id', 'kind' => note|call|meeting|task|event, 'body', 'at', 'actor' => ['name'], 'durationMinutes', 'done', 'doneAt'].
     index: the position of the activity in the timeline's list (the Alpine actions find the id from it). t: the words (nq_ac_words). now: Carbon, for overdue.
     planned: the row is under "Planned" (the checkbox says "Due"). toggle, delete: which row actions are on. --}}
@include('nasaq::components.activity-composer._words')
@props(['activity', 'index' => 0, 't', 'now' => null, 'planned' => false, 'toggle' => false, 'delete' => false])
@php
    $a = $activity;
    $kind = $a['kind'];
    $done = ! empty($a['done']);
    $at = nq_ac_time($a['at']);
    $clock = $now ?? now();
    $overdue = $kind === 'task' && ! $done && $at->lt($clock);
    $icon = nq_ac_icons()[$kind] ?? 'zap';
    $canToggle = $kind === 'task' && $toggle;
    $hasMenu = $canToggle || $delete;
    $toggleLabel = sprintf($done ? $t['reopen'] : $t['complete'], $a['body']);
    $next = $done ? 'false' : 'true';
    $i = (int) $index;
@endphp
<li data-slot="timeline-item" data-activity-id="{{ $a['id'] }}" data-kind="{{ $kind }}" @if ($hasMenu) x-data="nqContextMenu()" @endif class="group/timeline grid grid-cols-[2rem_1fr] gap-x-3">
    <div @if ($hasMenu) data-slot="context-menu-trigger" x-bind="trigger" x-ref="trigger" @endif class="contents">
        <div class="flex flex-col items-center">
            <span data-slot="timeline-marker" class="flex size-8 shrink-0 items-center justify-center">
                <span class="flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground [&_svg]:size-4"><x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" /></span>
            </span>
            <span aria-hidden="true" data-slot="timeline-rail" class="my-1 w-px flex-1 bg-border group-last/timeline:hidden"></span>
        </div>
        <div data-slot="timeline-content" class="flex min-w-0 flex-col gap-1 pb-6 pt-1 group-last/timeline:pb-0">
            <div class="flex items-baseline justify-between gap-3">
                <p class="min-w-0 text-body-sm font-medium text-foreground">
                    @if ($kind === 'event')
                        <span class="font-normal text-muted-foreground">{{ $a['body'] }}</span>
                    @else
                        <span class="flex flex-wrap items-center gap-2">
                            {{ $t['kinds'][$kind] ?? $kind }}
                            @if (! empty($a['durationMinutes']))<x-nq::badge variant="outline">{{ sprintf($t['minutes'], (string) $a['durationMinutes']) }}</x-nq::badge>@endif
                            @if ($overdue)<x-nq::badge variant="danger">{{ $t['overdue'] }}</x-nq::badge>@endif
                            @if ($kind === 'task' && $done)<x-nq::badge variant="success">{{ $t['completed'] }}</x-nq::badge>@endif
                        </span>
                    @endif
                </p>
                <x-nq::numeric.date-time :value="$at" relative class="shrink-0 text-caption text-muted-foreground" />
            </div>
            @if ($kind === 'event' ? ! empty($a['actor']) : true)
                <p class="text-body-sm text-muted-foreground">
                    @if ($kind === 'event')
                        <span>{{ $t['by'] }} {{ $a['actor']['name'] }}</span>
                    @else
                        <span dir="auto" class="{{ \Nasaq\Cn::merge('block whitespace-pre-wrap text-foreground', $kind === 'task' && $done ? 'text-muted-foreground line-through' : '') }}">{{ $a['body'] }}</span>
                    @endif
                </p>
            @endif
            @if ((! empty($a['actor']) && $kind !== 'event') || $canToggle || $hasMenu)
                <div class="flex flex-wrap items-center gap-2">
                    @if (! empty($a['actor']) && $kind !== 'event')
                        <span class="text-caption text-muted-foreground">{{ $t['by'] }} {{ $a['actor']['name'] }}</span>
                    @endif
                    @if ($canToggle)
                        <label class="flex items-center gap-2 text-body-sm text-foreground">
                            <span class="contents" x-on:click="toggleTask({{ $i }}, {{ $next }}, $el)"><x-nq::checkbox :checked="$done" aria-label="{{ $toggleLabel }}" data-action="toggle" /></span>
                            {{ $done ? $t['completed'] : ($planned ? $t['due'] : '') }}
                        </label>
                    @endif
                    @if ($hasMenu)
                        <x-nq::dropdown-menu>
                            <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" aria-label="{{ $t['actions'] }}">
                                <x-lucide-ellipsis aria-hidden="true" />
                            </x-nq::dropdown-menu.trigger>
                            <x-nq::dropdown-menu.content align="end" class="min-w-44">
                                @if ($canToggle)
                                    <x-nq::dropdown-menu.item data-action="toggle" x-on:click="toggleTask({{ $i }}, {{ $next }})"><x-lucide-circle-check aria-hidden="true" />{{ $toggleLabel }}</x-nq::dropdown-menu.item>
                                @endif
                                @if ($canToggle && $delete)<x-nq::dropdown-menu.separator />@endif
                                @if ($delete)
                                    <x-nq::dropdown-menu.item variant="danger" data-action="delete" x-on:click="removeActivity({{ $i }})"><x-lucide-trash-2 aria-hidden="true" />{{ $t['delete'] }}</x-nq::dropdown-menu.item>
                                @endif
                            </x-nq::dropdown-menu.content>
                        </x-nq::dropdown-menu>
                    @endif
                </div>
            @endif
        </div>
    </div>
    @if ($hasMenu)
        <x-nq::context-menu.content class="min-w-44">
            @if ($canToggle)
                <x-nq::context-menu.item data-action="toggle" x-on:click="toggleTask({{ $i }}, {{ $next }})"><x-lucide-circle-check aria-hidden="true" />{{ $toggleLabel }}</x-nq::context-menu.item>
            @endif
            @if ($canToggle && $delete)<x-nq::context-menu.separator />@endif
            @if ($delete)
                <x-nq::context-menu.item variant="danger" data-action="delete" x-on:click="removeActivity({{ $i }})"><x-lucide-trash-2 aria-hidden="true" />{{ $t['delete'] }}</x-nq::context-menu.item>
            @endif
        </x-nq::context-menu.content>
    @endif
</li>
