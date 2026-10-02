{{-- <x-nq::clinic-queue :entries="$queue" x-on:nq-clinic-queue-action="$event.detail.promise = fetch('/queue/' + $event.detail.action, { method: 'POST', body: $event.detail.id })" />
     A doctor's live patient queue: a big Call next button, the patients who are with the doctor or being called, and a table of everyone else with the
     moves that make sense for each row (call now, call again, skip, start, finish, put back). The same moves open from the row's ⋯ menu, the context menu
     (right-click, long-press, Shift+F10) and the keyboard. Waiting patients come in the order urgent, appointment, walk-in; first come first served in each.
     entries: arrays of ['id', 'ticket', 'number', 'name', 'status' (waiting|called|serving|done|skipped|no_show|left), 'priority' (normal|appointment|urgent),
     'queuedAt' (epoch ms), 'calledAt', 'room', 'recalls', 'providerId']. Pass one doctor's entries or all.
     grace-minutes: minutes a call may go unanswered before the warning (5). connection (live|reconnecting|offline), updated-at (epoch ms): the live indicator.
     now: epoch ms that freezes the clock (default: the server's clock; re-render, for example with wire:poll, to refresh the minutes).
     labels: array overriding any built-in word. locale overrides the app's.
     Every move dispatches a bubbling "nq-clinic-queue-action" { action, id } (action: call-next | call | recall | skip | start | finish | no-show; no id for call-next).
     A listener may set event.detail.promise to a Promise (or one resolving to { error }): moves are blocked until it settles and an error shows in a danger alert.
     Persist the move, then pass fresh entries. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.waiting-screen._logic')
@props(['entries' => [], 'graceMinutes' => 5, 'connection' => 'live', 'updatedAt' => null, 'now' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = \Nasaq\Nasaq::rtl($locale);
    $en = [
        'title' => 'Patient queue', 'callNext' => 'Call next', 'nextIs' => 'Next in line: :n', 'empty' => 'Nobody is waiting.', 'serving' => 'With you now',
        'nothingServing' => 'No one has been called.', 'table' => 'Patients in the queue', 'ticket' => 'Ticket', 'patient' => 'Patient', 'status' => 'Status',
        'priority' => 'Priority', 'waited' => 'Waiting', 'min' => ':n min', 'actionsFor' => 'Actions for :n', 'actions' => 'Actions',
        'st' => ['waiting' => 'Waiting', 'called' => 'Called', 'serving' => 'In visit', 'done' => 'Done', 'skipped' => 'Skipped', 'no_show' => 'No-show', 'left' => 'Left'],
        'pr' => ['normal' => 'Walk-in', 'appointment' => 'Appointment', 'urgent' => 'Urgent'],
        'act' => ['call-next' => 'Call next', 'call' => 'Call now', 'recall' => 'Call again', 'skip' => 'Skip', 'start' => 'Start visit', 'finish' => 'Finish visit', 'no-show' => 'Mark no-show'],
        'putBack' => 'Put back in line', 'overdue' => ':t has not answered for :n min. Call again or skip.', 'recalledOne' => 'Called :n time', 'recalledMany' => 'Called :n times',
        'failed' => 'That did not work. Try again.', 'room' => 'Room :n',
    ];
    $arabic = [
        'title' => 'طابور المرضى', 'callNext' => 'نداء التالي', 'nextIs' => 'التالي في الصف: :n', 'empty' => 'لا أحد في الانتظار.', 'serving' => 'معك الآن',
        'nothingServing' => 'لم يُنادَ على أحد.', 'table' => 'المرضى في الطابور', 'ticket' => 'التذكرة', 'patient' => 'المريض', 'status' => 'الحالة',
        'priority' => 'الأولوية', 'waited' => 'الانتظار', 'min' => ':n دقيقة', 'actionsFor' => 'إجراءات :n', 'actions' => 'الإجراءات',
        'st' => ['waiting' => 'ينتظر', 'called' => 'تم النداء', 'serving' => 'في الزيارة', 'done' => 'انتهى', 'skipped' => 'تم التخطي', 'no_show' => 'لم يحضر', 'left' => 'غادر'],
        'pr' => ['normal' => 'بدون موعد', 'appointment' => 'بموعد', 'urgent' => 'عاجل'],
        'act' => ['call-next' => 'نداء التالي', 'call' => 'نداء الآن', 'recall' => 'نداء مجددًا', 'skip' => 'تخطي', 'start' => 'بدء الزيارة', 'finish' => 'إنهاء الزيارة', 'no-show' => 'تسجيل عدم الحضور'],
        'putBack' => 'إعادة إلى الصف', 'overdue' => 'لم يردّ :t منذ :n دقيقة. نادِ مجددًا أو تخطَّ.', 'recalledOne' => 'نودي مرة واحدة', 'recalledMany' => 'نودي :n مرات',
        'failed' => 'لم تنجح العملية. حاول مجددًا.', 'room' => 'الغرفة :n',
    ];
    $t = array_replace_recursive($ar ? $arabic : $en, (array) $labels);
    $clock = $now ?? nq_ws_now();
    $entries = array_values((array) $entries);
    $waiting = nq_ws_order($entries);
    $order = [];
    foreach ($waiting as $i => $w) {
        $order[$w['id']] = $i;
    }
    $rank = ['serving' => 0, 'called' => 1, 'waiting' => 2, 'skipped' => 3];
    $rows = array_values(array_filter($entries, fn ($e) => isset($rank[$e['status'] ?? ''])));
    usort($rows, fn ($a, $b) => ($rank[$a['status']] <=> $rank[$b['status']]) ?: (($order[$a['id']] ?? 0) <=> ($order[$b['id']] ?? 0)) ?: (($a['queuedAt'] ?? 0) <=> ($b['queuedAt'] ?? 0)));
    $active = array_values(array_filter($entries, fn ($e) => in_array($e['status'] ?? '', ['called', 'serving'], true)));
    $overdue = array_values(array_filter($active, fn ($e) => $e['status'] === 'called' && isset($e['calledAt']) && $clock - $e['calledAt'] >= $graceMinutes * 60000));
    $nextUp = $waiting[0] ?? null;
    $minutes = fn (array $e) => max(0, (int) floor(($clock - ($e['queuedAt'] ?? $clock)) / 60000));
    $stVariant = fn (string $s) => $s === 'serving' ? 'brand' : ($s === 'called' ? 'info' : ($s === 'skipped' ? 'warning' : 'neutral'));
    $icons = ['call' => 'phone-call', 'start' => 'circle-play', 'recall' => 'megaphone', 'skip' => 'skip-forward', 'no-show' => 'user-x', 'finish' => 'check-check'];
    // The moves that make sense for one row: [id, label, icon, group, danger].
    $movesFor = function (array $e) use ($t, $icons): array {
        $a = fn (string $id, ?string $icon = null, ?string $group = null, bool $danger = false, ?string $label = null) => ['id' => $id, 'label' => $label ?? $t['act'][$id], 'icon' => $icon ?? $icons[$id], 'group' => $group, 'danger' => $danger];

        return match ($e['status'] ?? '') {
            'waiting' => [$a('call')],
            'called' => [$a('start'), $a('recall'), $a('skip', null, 'more'), $a('no-show', null, 'more', true)],
            'serving' => [$a('finish')],
            'skipped' => [$a('recall', 'rotate-ccw', null, false, $t['putBack']), $a('no-show', null, null, true)],
            default => [],
        };
    };
    $head = 'flex items-center h-row px-4 py-3 text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground';
    $cell = 'flex items-center h-row px-4 py-3 align-middle whitespace-nowrap';
    $cols = [['ticket', $t['ticket'], ''], ['patient', $t['patient'], ''], ['priority', $t['priority'], ''], ['status', $t['status'], ''], ['waited', $t['waited'], 'text-end justify-end']];
@endphp
<div data-slot="clinic-queue" x-data="nqClinicQueue({!! \Illuminate\Support\Js::from(['failed' => $t['failed']]) !!})" {{ $attributes->cn('flex flex-col gap-4') }}>
    <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-col">
            <h2 class="text-h3">{{ $t['title'] }}</h2>
            <p class="text-body-sm text-muted-foreground">{{ $nextUp ? nq_ws_fill($t['nextIs'], $nextUp['ticket']) : $t['empty'] }}</p>
        </div>
        <div class="flex items-center gap-3">
            <x-nq::waiting-screen.live-indicator :connection="$connection" :updated-at="$updatedAt" :now="$now" :locale="$locale" />
            @if ($nextUp)
                <x-nq::button size="lg" x-on:click="act('call-next')" x-bind:disabled="busy ? '' : null">
                    <x-lucide-bell-ring aria-hidden="true" />
                    {{ $t['callNext'] }}
                    <bdi dir="ltr" class="rounded-control bg-primary-foreground/20 px-1.5 font-mono tabular-nums">{{ $nextUp['ticket'] }}</bdi>
                </x-nq::button>
            @else
                <x-nq::button size="lg" disabled>
                    <x-lucide-bell-ring aria-hidden="true" />
                    {{ $t['callNext'] }}
                </x-nq::button>
            @endif
        </div>
    </div>

    <x-nq::alert tone="danger" x-show="error" style="display: none"><span x-text="error"></span></x-nq::alert>
    @foreach ($overdue as $e)
        <x-nq::alert tone="warning">{{ str_replace([':t', ':n'], [$e['ticket'], (string) max(0, (int) floor(($clock - ($e['calledAt'] ?? $clock)) / 60000))], $t['overdue']) }}</x-nq::alert>
    @endforeach

    <section aria-label="{{ $t['serving'] }}" class="grid gap-3 sm:grid-cols-2">
        @if (count($active) === 0)
            <p class="text-body-sm text-muted-foreground sm:col-span-2">{{ $t['nothingServing'] }}</p>
        @else
            @foreach ($active as $e)
                <x-nq::card data-slot="clinic-queue-active" data-status="{{ $e['status'] }}">
                    <x-nq::card.header>
                        <x-nq::card.title as="h3" class="flex items-center gap-2">
                            <bdi dir="ltr" class="font-mono text-h3 tabular-nums">{{ $e['ticket'] }}</bdi>
                            <x-nq::badge :variant="$e['status'] === 'serving' ? 'brand' : 'info'">{{ $t['st'][$e['status']] }}</x-nq::badge>
                        </x-nq::card.title>
                        <x-nq::card.description>{{ $e['name'] ?? '' }}{{ ! empty($e['room']) ? ' · '.nq_ws_fill($t['room'], $e['room']) : '' }}{{ ! empty($e['recalls']) ? ' · '.nq_ws_fill($e['recalls'] + 1 === 1 ? $t['recalledOne'] : $t['recalledMany'], $e['recalls'] + 1) : '' }}</x-nq::card.description>
                    </x-nq::card.header>
                    <x-nq::card.content class="flex flex-wrap gap-2">
                        @foreach ($movesFor($e) as $m)
                            <x-nq::button size="sm" :variant="in_array($m['id'], ['start', 'finish'], true) ? 'primary' : 'secondary'" x-on:click="act('{{ $m['id'] }}', '{{ $e['id'] }}')" x-bind:disabled="busy ? '' : null">{{ $m['label'] }}</x-nq::button>
                        @endforeach
                    </x-nq::card.content>
                </x-nq::card>
            @endforeach
        @endif
    </section>

    <div data-slot="data-table" class="flex min-w-0 flex-col gap-3">
        <div data-slot="table-container" role="region" tabindex="0" aria-label="{{ $t['table'] }}"
            class="relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
            <div data-slot="table" role="table" aria-label="{{ $t['table'] }}" data-density="default" style="grid-template-columns: repeat({{ count($cols) + 1 }}, auto)" class="grid w-full min-w-max text-body-sm"
                x-on:keydown="rowKey($event)">
                <div data-slot="table-header" role="rowgroup" class="contents">
                    <div role="row" data-slot="table-row" class="col-span-full grid grid-cols-subgrid border-b border-border">
                        @foreach ($cols as [$id, $header, $align])
                            <div role="columnheader" data-slot="table-head" data-col="{{ $id }}" class="{{ $head }} {{ $align }}">{{ $header }}</div>
                        @endforeach
                        <div role="columnheader" data-slot="table-head" class="flex items-center h-row w-12 px-4 py-3 text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground"><span class="sr-only">{{ $t['actions'] }}</span></div>
                    </div>
                </div>
                @if (count($rows) === 0)
                    <div role="rowgroup" class="contents" data-slot="table-body">
                        <div role="row" data-slot="table-row" class="col-span-full grid grid-cols-subgrid border-0">
                            <div role="cell" data-slot="table-cell" class="col-span-full h-auto p-0 whitespace-normal"><x-nq::states.empty class="border-0"><span>{{ $t['empty'] }}</span></x-nq::states.empty></div>
                        </div>
                    </div>
                @endif
                @foreach ($rows as $i => $e)
                    @php $moves = $movesFor($e); @endphp
                    <div role="rowgroup" class="contents" data-slot="table-body">
                        <x-nq::context-menu>
                            <x-nq::context-menu.trigger role="row" data-row tabindex="{{ $i === 0 ? 0 : -1 }}" data-ticket="{{ $e['ticket'] }}"
                                class="group/row col-span-full grid grid-cols-subgrid border-b border-border outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus data-popup-open:bg-nq-hover">
                                <div role="cell" data-slot="table-cell" class="{{ $cell }}"><bdi dir="ltr" class="font-mono font-semibold tabular-nums">{{ $e['ticket'] }}</bdi></div>
                                <div role="cell" data-slot="table-cell" class="{{ $cell }}">{{ $e['name'] ?? '-' }}</div>
                                <div role="cell" data-slot="table-cell" class="{{ $cell }}">
                                    @if (($e['priority'] ?? 'normal') === 'urgent')
                                        <x-nq::badge variant="danger">{{ $t['pr']['urgent'] }}</x-nq::badge>
                                    @else
                                        <span class="text-muted-foreground">{{ $t['pr'][$e['priority'] ?? 'normal'] }}</span>
                                    @endif
                                </div>
                                <div role="cell" data-slot="table-cell" class="{{ $cell }}"><x-nq::badge :variant="$stVariant($e['status'])">{{ $t['st'][$e['status']] }}</x-nq::badge></div>
                                <div role="cell" data-slot="table-cell" class="{{ $cell }} text-end justify-end"><span class="tabular-nums">{{ nq_ws_fill($t['min'], $minutes($e)) }}</span></div>
                                <div role="cell" data-slot="table-cell" class="flex items-center h-row w-12 px-4 py-3 pe-2 text-end align-middle whitespace-nowrap">
                                    @if (count($moves))
                                        <x-nq::dropdown-menu>
                                            <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="data-table-row-actions" aria-label="{{ nq_ws_fill($t['actionsFor'], $e['ticket']) }}" tabindex="-1"
                                                class="text-muted-foreground opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100">
                                                <x-lucide-ellipsis aria-hidden="true" />
                                            </x-nq::dropdown-menu.trigger>
                                            <x-nq::dropdown-menu.content align="end" class="min-w-44">
                                                @foreach ($moves as $k => $m)
                                                    @if ($k > 0 && $m['group'] !== $moves[$k - 1]['group'])
                                                        <x-nq::dropdown-menu.separator />
                                                    @endif
                                                    <x-nq::dropdown-menu.item :variant="$m['danger'] ? 'danger' : 'default'" x-on:click="act('{{ $m['id'] }}', '{{ $e['id'] }}')">
                                                        <x-dynamic-component :component="'lucide-'.$m['icon']" aria-hidden="true" />
                                                        {{ $m['label'] }}
                                                    </x-nq::dropdown-menu.item>
                                                @endforeach
                                            </x-nq::dropdown-menu.content>
                                        </x-nq::dropdown-menu>
                                    @endif
                                </div>
                            </x-nq::context-menu.trigger>
                            @if (count($moves))
                                <x-nq::context-menu.content class="min-w-44">
                                    @foreach ($moves as $k => $m)
                                        @if ($k > 0 && $m['group'] !== $moves[$k - 1]['group'])
                                            <x-nq::context-menu.separator />
                                        @endif
                                        <x-nq::context-menu.item :variant="$m['danger'] ? 'danger' : 'default'" x-on:click="act('{{ $m['id'] }}', '{{ $e['id'] }}')">
                                            <x-dynamic-component :component="'lucide-'.$m['icon']" aria-hidden="true" />
                                            {{ $m['label'] }}
                                        </x-nq::context-menu.item>
                                    @endforeach
                                </x-nq::context-menu.content>
                            @endif
                        </x-nq::context-menu>
                    </div>
                @endforeach
            </div>
        </div>
    </div>
    <p class="sr-only" aria-live="polite">{{ $t['title'] }}: <x-nq::numeric :value="count($waiting)" :locale="$locale" /></p>
</div>
