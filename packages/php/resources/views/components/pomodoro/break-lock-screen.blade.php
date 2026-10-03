{{-- <x-nq::pomodoro.break-lock-screen postpone /> (inside <x-nq::pomodoro>)
     The full-screen break: it covers the page, traps focus and ignores clicks outside. It opens by itself when a break starts and closes when it ends.
     Escape does not close it: it opens "Skip this break?", and only "Skip anyway" skips. A suggestion (stretch, water, eyes, walk) rotates with the cycle and the
     refresh button. postpone adds a Postpone button that turns the break into more focus time. Motion stops under prefers-reduced-motion. --}}
@props(['postpone' => false])
@php
    $radius = (260 - 14) / 2;
    $fade = 'transition-opacity duration-300 ease-nq motion-reduce:transition-none data-starting-style:opacity-0 data-ending-style:opacity-0';
@endphp
<template x-teleport="body">
    <div data-slot="{{ $attributes->get('data-slot', 'break-lock-screen') }}" x-bind:data-phase="breakPhase()" x-bind:data-confirming="confirming ? '' : null" x-nq-presence="onBreak()" x-trap.noscroll="onBreak()"
        role="dialog" aria-modal="true" tabindex="-1" aria-labelledby="nq-break-title" aria-describedby="nq-break-description"
        x-on:keydown.escape.prevent.stop="escape()" x-cloak style="display: none"
        {{ $attributes->except('data-slot')->cn(['fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 overflow-y-auto bg-background p-6 text-center text-foreground outline-none', $fade]) }}>
        <h2 id="nq-break-title" class="text-h1 text-foreground" x-text="breakTitle()"></h2>
        <p id="nq-break-description" class="max-w-md text-body text-muted-foreground" x-text="breakBody()"></p>

        <div data-slot="break-lock-confirm" x-show="confirming" x-cloak style="display: none" class="flex flex-col gap-2 sm:flex-row">
            <x-nq::button variant="primary" size="lg" data-keep-resting x-on:click="keepResting()">
                <x-lucide-coffee aria-hidden="true" />
                {{ \Nasaq\Nasaq::t('Keep resting', 'واصل الراحة') }}
            </x-nq::button>
            <x-nq::button variant="secondary" size="lg" data-confirm-skip x-on:click="confirmedSkip()">
                <x-lucide-skip-forward aria-hidden="true" class="rtl:-scale-x-100" />
                {{ \Nasaq\Nasaq::t('Skip anyway', 'تخطَّ على أي حال') }}
            </x-nq::button>
        </div>

        <div x-show="!confirming" class="flex flex-col items-center gap-8">
            <div data-slot="timer-ring" x-bind:data-paused="paused() ? '' : null" class="relative inline-flex shrink-0 items-center justify-center" style="width: 260px; height: 260px; max-width: 100%">
                <svg aria-hidden="true" viewBox="0 0 260 260" class="absolute inset-0 size-full -rotate-90">
                    <circle cx="130" cy="130" r="{{ $radius }}" fill="none" stroke-width="14" class="stroke-nq-line" />
                    <circle data-slot="timer-ring-arc" cx="130" cy="130" r="{{ $radius }}" fill="none" stroke-width="14" stroke-linecap="round" x-bind="arc(260, 14, true)"
                        class="transition-[stroke-dashoffset,stroke] duration-500 ease-linear motion-reduce:transition-none" />
                </svg>
                <div class="relative flex flex-col items-center justify-center gap-1 text-center">
                    <time data-slot="timer-readout" role="timer" aria-live="off" dir="ltr" x-bind:aria-label="breakName()" x-bind:datetime="breakIso()" x-text="breakClock()"
                        class="font-medium leading-none tabular-nums text-foreground text-[clamp(3rem,14vw,5.5rem)]">00:00</time>
                    <span class="text-label" x-bind:class="breakToneText()" x-text="breakName()"></span>
                </div>
            </div>
            <div data-slot="cycle-dots" role="img" x-bind:aria-label="cyclesLabel()" class="inline-flex items-center gap-2">
                <template x-for="i in cfg.cyclesBeforeLongBreak" x-bind:key="i"><span x-bind:data-state="dotStateRest(i - 1)" x-bind:class="dotClassRest(i - 1)"></span></template>
            </div>

            <div data-slot="break-suggestion" role="group" aria-label="{{ \Nasaq\Nasaq::t('A suggestion for this break', 'اقتراح لهذه الاستراحة') }}"
                class="flex w-full max-w-md items-center gap-3 rounded-card border border-border bg-card p-4 text-start">
                <span class="grid size-10 shrink-0 place-items-center rounded-full bg-nq-success-soft text-nq-success-text motion-safe:animate-pulse">
                    <x-lucide-sparkles x-show="ideaIcon('sparkles')" aria-hidden="true" class="size-5" />
                    <x-lucide-droplets x-show="ideaIcon('droplets')" x-cloak style="display: none" aria-hidden="true" class="size-5" />
                    <x-lucide-eye x-show="ideaIcon('eye')" x-cloak style="display: none" aria-hidden="true" class="size-5" />
                    <x-lucide-footprints x-show="ideaIcon('footprints')" x-cloak style="display: none" aria-hidden="true" class="size-5" />
                </span>
                <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span class="text-label text-foreground" x-text="ideaTitle()"></span>
                    <span class="text-body-sm text-muted-foreground" x-text="ideaBody()"></span>
                </span>
                <x-nq::button variant="ghost" size="icon-sm" data-another-idea aria-label="{{ \Nasaq\Nasaq::t('Another idea', 'فكرة أخرى') }}" title="{{ \Nasaq\Nasaq::t('Another idea', 'فكرة أخرى') }}" x-on:click="anotherIdea()">
                    <x-lucide-refresh-cw aria-hidden="true" />
                </x-nq::button>
            </div>

            <p class="text-body-sm text-muted-foreground" x-show="taskTitle()" x-text="nextText()"></p>

            <div class="flex flex-col gap-2 sm:flex-row">
                @if ($postpone)
                    <x-nq::button variant="secondary" size="lg" data-postpone x-on:click="postpone()"><span x-text="postponeLabel()"></span></x-nq::button>
                @endif
                <x-nq::button variant="ghost" size="lg" data-skip-break x-on:click="askSkip()">
                    <x-lucide-skip-forward aria-hidden="true" class="rtl:-scale-x-100" />
                    {{ \Nasaq\Nasaq::t('Skip break', 'تخطَّ الاستراحة') }}
                </x-nq::button>
            </div>
        </div>
    </div>
</template>
