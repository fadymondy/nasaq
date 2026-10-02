{{-- <x-nq::desktop-notification.permission-prompt dismissible testable />
     The soft ask that comes before the system's own dialog: explains why, waits while the system dialog is open, then confirms or explains how to unblock.
     It reads and requests Notification.permission itself. dismissible: show "Not now". testable: show "Send a test" once granted. settings: show "Open settings" when blocked.
     permission: default | granted | denied | unsupported, to render a fixed state (the prompt still follows the browser once it loads).
     Events (bubbling): nq-dismiss, nq-test, nq-open-settings, nq-permission {permission}. --}}
@props(['permission' => 'default', 'dismissible' => false, 'testable' => false, 'settings' => false, 'labels' => [], 'locale' => null])
@include('nasaq::components.desktop-notification._words')
@php
    $locale ??= app()->getLocale();
    $t = nq_dn_words($locale, $labels);
    $step = ['default' => 'ask', 'granted' => 'granted', 'denied' => 'denied', 'unsupported' => 'unsupported'][$permission] ?? 'ask';
    $copy = [
        'ask' => [$t['askTitle'], $t['askBody']],
        'asking' => [$t['waitingTitle'], $t['waitingBody']],
        'granted' => [$t['grantedTitle'], $t['grantedBody']],
        'denied' => [$t['deniedTitle'], $t['deniedBody']],
        'unsupported' => [$t['unsupportedTitle'], $t['unsupportedBody']],
    ];
    $titleId = 'nq-dn-perm-'.substr(md5(json_encode([$permission, $locale, $dismissible])), 0, 8);
    $icon = in_array($step, ['denied', 'unsupported'], true) ? 'off' : 'ring';
@endphp
<div role="group" aria-labelledby="{{ $titleId }}" data-slot="{{ $attributes->get('data-slot', 'desktop-notification-permission') }}" data-step="{{ $step }}"
    x-data="nqNotificationPermission(@js($permission), @js($copy))" x-effect="$el.setAttribute('data-step', step)"
    {{ $attributes->except('data-slot')->cn('flex w-full max-w-md flex-col gap-3 rounded-card border border-border bg-card p-4') }}>
    <div class="flex items-start gap-3">
        <span aria-hidden="true" class="grid size-9 shrink-0 place-items-center rounded-full {{ $step === 'denied' ? 'bg-nq-warning-soft' : 'bg-secondary' }}"
            x-bind:class="step === 'denied' ? 'bg-nq-warning-soft' : 'bg-secondary'">
            <x-lucide-bell-ring class="size-4" x-show="! off" style="{{ $icon === 'off' ? 'display: none' : '' }}" />
            <x-lucide-bell-off class="size-4" x-show="off" style="{{ $icon === 'ring' ? 'display: none' : '' }}" />
        </span>
        <div class="flex min-w-0 flex-col gap-1" aria-live="polite">
            <h3 id="{{ $titleId }}" class="text-label" x-text="copy[step][0]">{{ $copy[$step][0] }}</h3>
            <p class="text-body-sm text-muted-foreground" x-text="copy[step][1]">{{ $copy[$step][1] }}</p>
        </div>
    </div>
    <div class="flex flex-wrap justify-end gap-2">
        @if ($dismissible)
            <x-nq::button variant="ghost" x-show="step === 'ask' || step === 'asking'" x-on:click="dismiss()" x-bind:disabled="step === 'asking'" x-bind:data-disabled="step === 'asking' ? '' : null" :style="$step !== 'ask' ? 'display: none' : null">{{ $t['later'] }}</x-nq::button>
        @endif
        <x-nq::button variant="primary" x-show="step === 'ask' || step === 'asking'" x-on:click="request()" x-bind:aria-busy="step === 'asking' ? 'true' : null" :style="$step !== 'ask' ? 'display: none' : null"><x-nq::spinner x-show="step === 'asking'" style="display: none" />{{ $t['enable'] }}</x-nq::button>
        @if ($testable)
            <x-nq::button variant="secondary" x-show="step === 'granted'" x-on:click="test()" :style="$step !== 'granted' ? 'display: none' : null">{{ $t['test'] }}</x-nq::button>
        @endif
        @if ($settings)
            <x-nq::button variant="secondary" x-show="step === 'denied'" x-on:click="openSettings()" :style="$step !== 'denied' ? 'display: none' : null">{{ $t['openSettings'] }}</x-nq::button>
        @endif
    </div>
</div>
