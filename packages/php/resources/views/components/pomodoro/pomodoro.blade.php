{{-- <x-nq::pomodoro :tasks="[['id' => 't1', 'title' => 'Write docs']]" task-id="t1" :completed="2"> <x-nq::pomodoro.break-lock-screen /> </x-nq::pomodoro>
     The pomodoro timer as a card: cycle dots, a timer ring with the phase inside, start / pause / skip / stop, a linked task and today's progress.
     The wrapper is the timer scope (focus, short break, focus ... and a long break after each set); put <x-nq::pomodoro.break-lock-screen /> inside it to get the full-screen break.
     config: { focusMs, shortBreakMs, longBreakMs, cyclesBeforeLongBreak, autoStartBreaks, autoStartFocus } (defaults 25 / 5 / 15 min, long break after 4).
     completed: sessions finished today. daily-target: goal in sessions (8; 0 hides the counter). focus-minutes-today. tasks: [{id, title, project?}] makes the task line a picker; without it
     pass task="Title" (and task-project) for a fixed line. task-id: the linked task. title: heading. speed runs the clock faster, for demos.
     Events from the wrapper: pomodoro-event (a phase finished, was skipped, stopped or postponed; detail { kind, phase, startedAt, endedAt, plannedMs, spentMs }),
     pomodoro-change (detail: the state, to persist it; pass it back as state) and pomodoro-task-change (detail: the task or null). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['config' => [], 'completed' => 0, 'speed' => 1, 'dailyTarget' => 8, 'focusMinutesToday' => null, 'tasks' => null, 'taskId' => null, 'task' => null, 'taskProject' => null, 'title' => null, 'state' => null, 'postponeMinutes' => 5, 'confirmSkip' => true])
@php
    $cfg = array_merge(['focusMs' => 1500000, 'shortBreakMs' => 300000, 'longBreakMs' => 900000, 'cyclesBeforeLongBreak' => 4], $config);
    $js = array_filter([
        'config' => (object) $config,
        'completed' => (int) $completed,
        'speed' => $speed != 1 ? $speed : null,
        'dailyTarget' => (int) $dailyTarget,
        'focusMinutesToday' => $focusMinutesToday,
        'tasks' => $tasks,
        'taskId' => $taskId,
        'state' => $state,
        'postponeMinutes' => (int) $postponeMinutes,
        'confirmSkip' => (bool) $confirmSkip,
    ], fn ($v) => $v !== null);
    $seconds = intdiv((int) $cfg['focusMs'], 1000);
    $clock = sprintf('%02d:%02d', intdiv($seconds, 60), $seconds % 60);
    $minutes = $focusMinutesToday ?? (int) round(((int) $completed * (int) $cfg['focusMs']) / 60000);
    $target = (int) $dailyTarget;
    $pct = $target > 0 ? (int) round(min(1, max(0, $completed / $target)) * 100) : 0;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'pomodoro-root') }}" x-data="nqPomodoro({{ \Illuminate\Support\Js::from((object) $js) }})" {{ $attributes->except('data-slot')->cn('contents') }}>
    <x-nq::card data-slot="pomodoro-card" x-bind:data-phase="st.phase" x-bind:data-status="st.timer.status" class="w-full max-w-md">
        <x-nq::card.header>
            <x-nq::card.title as="h2" class="flex items-center gap-2">
                <x-lucide-timer aria-hidden="true" class="size-4 text-muted-foreground" />
                {{ $title ?? \Nasaq\Nasaq::t('Pomodoro', 'بومودورو') }}
            </x-nq::card.title>
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col items-center gap-5">
            <x-nq::countdown.cycle-dots :total="(int) $cfg['cyclesBeforeLongBreak']" :done="0" live />
            <x-nq::countdown.timer-ring live>
                <span x-bind:class="toneText()" class="text-primary">
                    <x-lucide-brain x-show="is('focus')" aria-hidden="true" class="size-6" />
                    <x-lucide-coffee x-show="is('shortBreak')" x-cloak style="display: none" aria-hidden="true" class="size-6" />
                    <x-lucide-armchair x-show="is('longBreak')" x-cloak style="display: none" aria-hidden="true" class="size-6" />
                </span>
                <time data-slot="timer-readout" role="timer" aria-live="off" dir="ltr" aria-label="{{ \Nasaq\Nasaq::t('Focus', 'تركيز') }}" x-bind:aria-label="phaseName()" datetime="PT{{ intdiv($seconds, 60) }}M{{ $seconds % 60 }}S" x-bind:datetime="iso()" x-text="clock()"
                    class="font-medium leading-none tabular-nums text-foreground text-[clamp(2rem,9vw,3rem)]">{{ $clock }}</time>
                <span x-bind:class="toneText()" x-text="stateWord()" class="text-label text-primary">{{ \Nasaq\Nasaq::t('Focus · Ready', 'تركيز · جاهز') }}</span>
            </x-nq::countdown.timer-ring>

            <div class="flex flex-wrap items-center justify-center gap-2">
                <x-nq::button variant="primary" size="lg" x-show="idle() || paused()" x-on:click="toggle()">
                    <x-lucide-play aria-hidden="true" class="rtl:-scale-x-100" />
                    <span x-text="startLabel()">{{ \Nasaq\Nasaq::t('Start focus', 'ابدأ التركيز') }}</span>
                </x-nq::button>
                <x-nq::button variant="secondary" size="lg" x-show="running()" x-cloak style="display: none" x-on:click="toggle()">
                    <x-lucide-pause aria-hidden="true" />
                    {{ \Nasaq\Nasaq::t('Pause', 'إيقاف مؤقت') }}
                </x-nq::button>
                <x-nq::button variant="ghost" size="lg" x-on:click="skip()">
                    <x-lucide-skip-forward aria-hidden="true" class="rtl:-scale-x-100" />
                    {{ \Nasaq\Nasaq::t('Skip', 'تخطَّ') }}
                </x-nq::button>
                <x-nq::button variant="ghost" size="lg" x-show="hasProgress()" x-cloak style="display: none" x-on:click="stop()">
                    <x-lucide-square aria-hidden="true" />
                    {{ \Nasaq\Nasaq::t('Stop', 'إنهاء') }}
                </x-nq::button>
            </div>

            @if ($tasks !== null)
                <div data-slot="pomodoro-task" class="flex w-full flex-col gap-1.5">
                    <span class="text-caption text-muted-foreground">{{ \Nasaq\Nasaq::t('Working on', 'أعمل على') }}</span>
                    <x-nq::native-select :value="$taskId" :placeholder="\Nasaq\Nasaq::t('No task linked', 'لا توجد مهمة مرتبطة')" aria-label="{{ \Nasaq\Nasaq::t('Link a task', 'اربط مهمة') }}"
                        :options="collect($tasks)->map(fn ($x) => ['value' => $x['id'], 'label' => $x['title']])->all()" x-on:change="pickTask($event.target.value)" />
                </div>
            @elseif ($task)
                <p data-slot="pomodoro-task" class="flex w-full min-w-0 items-baseline gap-2 text-body-sm">
                    <span class="shrink-0 text-muted-foreground">{{ \Nasaq\Nasaq::t('Working on', 'أعمل على') }}</span>
                    <span class="truncate text-foreground">{{ $task }}</span>
                    @if ($taskProject)
                        <x-nq::badge variant="outline">{{ $taskProject }}</x-nq::badge>
                    @endif
                </p>
            @endif

            @if ($target > 0)
                <div data-slot="pomodoro-today" class="flex w-full flex-col gap-1.5">
                    <div class="flex items-baseline justify-between gap-3 text-body-sm">
                        <span class="text-label text-foreground">{{ \Nasaq\Nasaq::t('Today', 'اليوم') }}</span>
                        <span class="text-muted-foreground tabular-nums" x-text="sessionsText()">{{ \Nasaq\Nasaq::t((int) $completed.' of '.$target.' sessions', (int) $completed.' من '.$target.' جلسات') }}</span>
                    </div>
                    <div data-slot="progress" data-tone="success" role="progressbar" aria-label="{{ \Nasaq\Nasaq::t('Today', 'اليوم') }}" aria-valuemin="0" aria-valuemax="100"
                        aria-valuenow="{{ $pct }}" x-bind:aria-valuenow="progressPct()" class="h-1.5 w-full overflow-hidden rounded-full bg-nq-line">
                        <span class="block h-full rounded-full bg-nq-success transition-[width] duration-300 ease-nq motion-reduce:transition-none" style="width: {{ $pct }}%" x-bind:style="{ width: progressPct() + '%' }"></span>
                    </div>
                    <span class="text-caption text-muted-foreground tabular-nums" x-text="focusText()">{{ \Nasaq\Nasaq::t($minutes.' min focused', $minutes.' دقيقة تركيز') }}</span>
                </div>
            @endif
            <p role="status" class="sr-only" x-text="announce()"></p>
        </x-nq::card.content>
    </x-nq::card>
    {{ $slot }}
</div>
