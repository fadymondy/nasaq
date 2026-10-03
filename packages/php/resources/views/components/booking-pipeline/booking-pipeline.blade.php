{{-- <x-nq::booking-pipeline status="confirmed" :history="[['status' => 'requested', 'at' => '2030-01-01T09:00:00Z', 'by' => 'Sara']]" advance />
     The staff view of one booking: the five stages (requested, confirmed, checked in, in visit, done), the moves the workflow allows from
     here as buttons, and the history as a timeline. No-show and cancelled show where the booking stopped. No-show and cancel ask first.
     status: requested | confirmed | checked_in | in_visit | done | no_show | cancelled (x-modelable). history: [{ status, at, by?, note? }], oldest first.
     advance: show the move buttons (omit for a read-only pipeline). show-history (default true). orientation: horizontal | vertical.
     optimistic: false stops the pipeline moving itself on a click. by: the name written on the history rows it adds.
     Bubbling event: "advance" { to, fail(message) }: call fail to put the booking back and show the message.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['status' => 'requested', 'history' => [], 'advance' => false, 'showHistory' => true, 'orientation' => 'horizontal', 'optimistic' => true, 'by' => null])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $vertical = $orientation === 'vertical';
    $options = array_filter([
        'canAdvance' => $advance ?: null,
        'optimistic' => $optimistic ? null : false,
        'by' => $by,
    ], fn ($v) => $v !== null);
    $fade = 'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
    $marker = 'relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-medium transition-colors duration-150 ease-nq [&_svg]:size-3.5';
    $stages = ['requested', 'confirmed', 'checked_in', 'in_visit', 'done'];
    $moves = [
        'confirmed' => ['Confirm', 'تأكيد'],
        'checked_in' => ['Check in', 'تسجيل الوصول'],
        'in_visit' => ['Start visit', 'بدء الزيارة'],
        'done' => ['Finish visit', 'إنهاء الزيارة'],
    ];
    $icons = ['requested' => 'clock', 'confirmed' => 'calendar-check', 'checked_in' => 'log-in', 'in_visit' => 'stethoscope', 'done' => 'check-check', 'no_show' => 'user-x', 'cancelled' => 'x-circle'];
@endphp
<div data-slot="booking-pipeline" x-bind:data-status="status" x-data="nqBookingPipeline({!! \Illuminate\Support\Js::from($status)->toHtml() !!}, {!! \Illuminate\Support\Js::from(array_values((array) $history))->toHtml() !!}, {!! \Illuminate\Support\Js::from((object) $options)->toHtml() !!})" x-modelable="status"
    {{ $attributes->cn('flex flex-col gap-5') }}>
    <div tabindex="0" class="max-w-full overflow-x-auto rounded-control pb-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ol data-slot="stepper" data-orientation="{{ $orientation }}" aria-label="{{ $T('Booking progress', 'تقدّم الحجز') }}" class="m-0 flex list-none p-0 {{ $vertical ? 'flex-col' : 'flex-row items-start' }}">
            @foreach ($stages as $i => $stage)
                <li data-slot="stepper-item" x-bind:data-status="stageStatus({{ $i }})" class="{{ $vertical ? 'grid grid-cols-[1.75rem_1fr] gap-x-3' : 'group/step flex flex-1 items-start last:flex-none' }}">
                    <div data-slot="stepper-step" x-bind:aria-current="['current', 'error'].includes(stageStatus({{ $i }})) && current() === {{ $i }} ? 'step' : null"
                        class="items-start gap-3 rounded-control text-start outline-none {{ $vertical ? 'col-span-2 grid grid-cols-subgrid' : 'flex shrink-0' }}">
                        <span data-slot="stepper-marker" class="{{ $marker }}"
                            x-bind:class="{ 'border-transparent bg-primary text-primary-foreground': stageStatus({{ $i }}) === 'complete', 'border-nq-focus bg-background text-foreground ring-2 ring-nq-focus/30': stageStatus({{ $i }}) === 'current', 'border-border bg-background text-muted-foreground': stageStatus({{ $i }}) === 'upcoming', 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text': stageStatus({{ $i }}) === 'error' }">
                            <x-lucide-check aria-hidden="true" x-show="stageStatus({{ $i }}) === 'complete'" style="display: none" />
                            <x-lucide-x aria-hidden="true" x-show="stageStatus({{ $i }}) === 'error'" style="display: none" />
                            <x-nq::numeric :value="$i + 1" x-show="!['complete', 'error'].includes(stageStatus({{ $i }}))" />
                        </span>
                        <span data-slot="stepper-text" class="flex min-w-0 flex-col text-start">
                            <span class="text-label" x-bind:class="{ 'text-muted-foreground': stageStatus({{ $i }}) === 'upcoming', 'text-foreground': stageStatus({{ $i }}) !== 'upcoming' && stageStatus({{ $i }}) !== 'error', 'text-nq-danger-text': stageStatus({{ $i }}) === 'error' }">
                                <span x-text="name('{{ $stage }}')"></span>
                                <span class="sr-only" x-text="' (' + stageSr({{ $i }}) + ')'"></span>
                            </span>
                            <span x-show="stageStatus({{ $i }}) === 'error'" x-cloak style="display: none" class="text-caption text-muted-foreground" x-text="name(status)"></span>
                        </span>
                    </div>
                    <span aria-hidden="true" data-slot="stepper-connector" x-bind:data-complete="stageStatus({{ $i }}) === 'complete' ? '' : null"
                        x-bind:class="stageStatus({{ $i }}) === 'complete' ? 'bg-primary' : 'bg-border'"
                        class="rounded-full transition-colors duration-150 ease-nq {{ $vertical ? 'col-start-1 row-start-2 my-1 min-h-6 w-px justify-self-center' : 'mx-3 mt-3.5 h-px min-w-6 flex-1 group-last/step:hidden' }}"></span>
                </li>
            @endforeach
        </ol>
    </div>

    @if ($advance)
        <div role="group" aria-label="{{ $T('Move the booking', 'نقل الحجز') }}" x-show="next().length > 0" x-cloak style="display: none" class="flex flex-wrap items-center gap-2">
            @foreach ($moves as $to => [$en, $ar])
                <x-nq::button variant="primary" size="sm" x-show="next().includes('{{ $to }}')" style="display: none" x-on:click="go('{{ $to }}')"><span x-text="label('{{ $to }}')">{{ $T($en, $ar) }}</span></x-nq::button>
            @endforeach
            <x-nq::button variant="secondary" size="sm" x-show="next().includes('no_show')" style="display: none" x-on:click="ask('no_show')">{{ $T('Mark no-show', 'تسجيل عدم الحضور') }}</x-nq::button>
            <x-nq::button variant="secondary" size="sm" x-show="next().includes('cancelled')" style="display: none" x-on:click="ask('cancelled')">{{ $T('Cancel booking', 'إلغاء الحجز') }}</x-nq::button>
        </div>
    @endif
    <p role="alert" x-show="error" x-cloak style="display: none" class="text-caption text-nq-danger-text" x-text="error"></p>

    @if ($showHistory)
        <section aria-label="{{ $T('History', 'السجل') }}" class="flex flex-col gap-2">
            <h3 class="text-label font-semibold">{{ $T('History', 'السجل') }}</h3>
            <p x-show="history.length === 0" x-cloak style="display: none" class="text-body-sm text-muted-foreground">{{ $T('Nothing has happened yet.', 'لم يحدث شيء بعد.') }}</p>
            <ol data-slot="timeline" x-show="history.length > 0" class="m-0 flex list-none flex-col p-0">
                <template x-for="h in reversed()" :key="h.key">
                    <li data-slot="timeline-item" class="group/timeline grid grid-cols-[2rem_1fr] gap-x-3">
                        <div class="flex flex-col items-center">
                            <span data-slot="timeline-marker" class="flex size-8 shrink-0 items-center justify-center">
                                <span class="flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
                                    @foreach ($icons as $s => $icon)
                                        <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" class="size-3.5" x-show="h.status === '{{ $s }}'" style="display: none" />
                                    @endforeach
                                </span>
                            </span>
                            <span aria-hidden="true" data-slot="timeline-rail" class="my-1 w-px flex-1 bg-border group-last/timeline:hidden"></span>
                        </div>
                        <div data-slot="timeline-content" class="flex min-w-0 flex-col gap-1 pb-6 pt-1 group-last/timeline:pb-0">
                            <div class="flex items-baseline justify-between gap-3">
                                <p class="min-w-0 text-body-sm font-medium text-foreground" x-text="name(h.status)"></p>
                                <span class="shrink-0 text-caption text-muted-foreground" x-text="when(h.at)"></span>
                            </div>
                            <p x-show="describe(h)" class="text-body-sm text-muted-foreground" x-text="describe(h)"></p>
                        </div>
                    </li>
                </template>
            </ol>
        </section>
    @endif

    @if ($advance)
        <template x-teleport="body">
            <div data-slot="alert-dialog-portal" x-on:keydown.escape.window="confirming && (confirming = null)">
                <div data-slot="alert-dialog-backdrop" x-nq-presence="confirming !== null" class="fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60 {{ $fade }}"></div>
                <div data-slot="alert-dialog-content" role="alertdialog" aria-modal="true" x-nq-presence="confirming !== null" x-trap.noscroll="confirming !== null"
                    class="fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-md gap-4 rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none max-h-[calc(100dvh-2rem)] overflow-y-auto {{ $fade }}">
                    <div class="flex flex-col gap-1.5">
                        <h2 data-slot="alert-dialog-title" class="text-h3 text-foreground" x-text="confirmTitle()"></h2>
                        <p data-slot="alert-dialog-description" class="text-body-sm text-muted-foreground" x-text="confirmText()"></p>
                    </div>
                    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <x-nq::button variant="ghost" x-on:click="confirming = null">{{ $T('Cancel', 'إلغاء') }}</x-nq::button>
                        <x-nq::button variant="danger" x-on:click="confirm()"><span x-text="confirming ? label(confirming) : ''"></span></x-nq::button>
                    </div>
                </div>
            </div>
        </template>
    @endif
</div>
