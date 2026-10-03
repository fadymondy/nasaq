{{-- <x-nq::idle-lock :timeout-seconds="600" :warning-seconds="30" x-on:nq-idle-lock-change="$event.detail.locked ? audit($event.detail.reason) : null">
         <x-slot:lock-screen> <x-nq::lock-screen … x-on:nq-lock-unlock="…then unlock()" /> </x-slot:lock-screen>
         the app
     </x-nq::idle-lock>
     Locks the app after a period of inactivity. A "Still there?" countdown shows first, then the lock-screen slot covers the app, which stays mounted but
     inert and hidden from assistive tech. The timer is a courtesy: expire the session on the server as well.
     timeout-seconds: idle seconds before the lock (300). warning-seconds: seconds before the lock that the warning shows (30; 0 skips it). locked: start locked (state isLocked)
     (x-modelable as isLocked, so x-model / wire:model lock it on demand). disabled: pause the timer. unmount-when-locked: remove the app from the DOM while locked.
     labels: override title, description ({time}), remaining, stay, lockNow.
     Inside the component (the app and the lock-screen slot) these Alpine members are in scope: lock(), unlock(), stay(), isLocked.
     Event on the root: nq-idle-lock-change { locked, reason: idle | manual }. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['timeoutSeconds' => 300, 'warningSeconds' => 30, 'locked' => false, 'disabled' => false, 'unmountWhenLocked' => false, 'lockScreen' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'title' => $t::t('Still there?', 'هل ما زلت هنا؟'),
        'description' => $t::t('You have been inactive, so the app will lock in {time} to protect your data.', 'لم تكن نشطًا، لذلك سيُقفل التطبيق بعد {time} لحماية بياناتك.'),
        'remaining' => $t::t('Time left', 'الوقت المتبقي'),
        'stay' => $t::t('Stay signed in', 'ابقَ متصلًا'),
        'lockNow' => $t::t('Lock now', 'اقفل الآن'),
    ], (array) $labels);
    $uid = 'nq-idle-'.\Illuminate\Support\Str::random(6);
    $config = ['timeoutSeconds' => (int) $timeoutSeconds, 'warningSeconds' => (int) $warningSeconds, 'locked' => (bool) $locked, 'disabled' => (bool) $disabled, 'description' => $l['description']];
    $fade = 'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
    $has = fn ($s) => $s && ! $s->isEmpty();
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'idle-lock') }}" x-data="nqIdleLock({!! \Illuminate\Support\Js::from($config) !!})" x-modelable="isLocked"
    x-bind:data-locked="isLocked ? '' : null" {{ $attributes->except('data-slot')->cn('contents') }}>
    @if ($unmountWhenLocked)
        <template x-if="! isLocked">
            <div data-slot="idle-lock-app" class="contents">{{ $slot }}</div>
        </template>
    @else
        <div data-slot="idle-lock-app" class="contents" x-bind:inert="isLocked ? '' : null" x-bind:aria-hidden="isLocked ? 'true' : null">{{ $slot }}</div>
    @endif

    <template x-teleport="body">
        <div data-slot="idle-warning-portal">
            <div data-slot="alert-dialog-backdrop" x-nq-presence="warning" class="fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60 {{ $fade }}"></div>
            <div data-slot="idle-warning" role="alertdialog" aria-modal="true" tabindex="-1" aria-labelledby="{{ $uid }}-title" aria-describedby="{{ $uid }}-description"
                x-nq-presence="warning" x-trap.noscroll="warning"
                class="{{ \Nasaq\Cn::merge('fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-md gap-4 rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none max-h-[calc(100dvh-2rem)] overflow-y-auto '.$fade) }}">
                <div data-slot="alert-dialog-header" class="flex flex-col gap-1.5 text-start">
                    <h2 data-slot="alert-dialog-title" id="{{ $uid }}-title" class="text-h3 text-foreground flex items-center gap-2">
                        <x-lucide-timer-reset aria-hidden="true" class="size-5 text-nq-warning-text" />
                        {{ $l['title'] }}
                    </h2>
                    <p data-slot="alert-dialog-description" id="{{ $uid }}-description" class="text-body-sm text-muted-foreground" x-text="description">{{ str_replace('{time}', '0:'.str_pad((string) min((int) $warningSeconds, 59), 2, '0', STR_PAD_LEFT), $l['description']) }}</p>
                </div>
                <div class="flex flex-col gap-2">
                    <p dir="ltr" role="timer" x-bind:aria-live="live" aria-label="{{ $l['remaining'] }}" class="text-center text-h2 text-foreground tabular-nums" x-text="clock"></p>
                    <x-nq::progress :value="100" tone="warning" size="sm" aria-label="{{ $l['remaining'] }}" value-expr="percent" />
                </div>
                <div data-slot="alert-dialog-footer" class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <x-nq::button variant="secondary" x-on:click="lock()"><x-lucide-lock-keyhole aria-hidden="true" />{{ $l['lockNow'] }}</x-nq::button>
                    <x-nq::button variant="primary" autofocus x-on:click="stay()">{{ $l['stay'] }}</x-nq::button>
                </div>
            </div>
        </div>
    </template>

    @if ($has($lockScreen))
        <template x-if="isLocked">
            <div data-slot="idle-lock-screen" class="fixed inset-0 z-[60] overflow-y-auto bg-background">{{ $lockScreen }}</div>
        </template>
    @endif
</div>
