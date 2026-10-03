{{-- The state-specific body of <x-nq::invite-accept> (the live Alpine scope). Internal: use invite-accept. --}}
@props(['content', 'rootSlot' => 'invite-accept', 'bag' => null])
@php
    extract($content);
    $icons = ['expired' => ['timer-off', 'text-nq-warning-text bg-nq-warning-soft'], 'wrong-account' => ['user-round-x', 'text-nq-warning-text bg-nq-warning-soft'],
        'already-accepted' => ['circle-check', 'text-nq-success-text bg-nq-success-soft'], 'revoked' => ['ban', 'text-nq-danger-text bg-nq-danger-soft']];
    $config = ['failed' => $l['failed']];
@endphp
<div data-slot="{{ $rootSlot }}" data-state="{{ $state }}" x-data="nqInviteAccept(@js($config))" {{ $bag }} class="flex flex-col gap-4">
    @if ($state !== 'valid')
        <span aria-hidden="true" class="mx-auto flex size-12 items-center justify-center rounded-full [&_svg]:size-6 {{ $icons[$state][1] }}">
            @switch($state)
                @case('expired') <x-lucide-timer-off /> @break
                @case('wrong-account') <x-lucide-user-round-x /> @break
                @case('already-accepted') <x-lucide-circle-check /> @break
                @default <x-lucide-ban />
            @endswitch
        </span>
    @endif
    <div data-slot="invite-workspace" class="flex items-center gap-3 rounded-card border border-border bg-background/60 p-3">
        <x-nq::avatar :name="$workspace['name'] ?? ''" :src="$workspace['logo'] ?? null" shape="square" size="lg" />
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="truncate text-label text-foreground">{{ $workspace['name'] ?? '' }}</span>
            @if (! empty($workspace['meta'])) <span class="truncate text-caption text-muted-foreground">{{ $workspace['meta'] }}</span> @endif
        </div>
        @if ($state === 'valid' && $role) <x-nq::badge variant="neutral">{{ $role }}</x-nq::badge> @endif
    </div>
    @if ($state === 'valid')
        <dl class="flex flex-col gap-1.5 text-body-sm">
            @if ($role)
                <div class="flex justify-between gap-3"><dt class="text-muted-foreground">{{ $l['invitedAs'] }}</dt><dd class="text-foreground">{{ $role }}</dd></div>
            @endif
            @if ($inviteEmail)
                <div class="flex justify-between gap-3"><dt class="text-muted-foreground">{{ $l['invitedEmail'] }}</dt><dd class="text-foreground"><bdi dir="ltr">{{ $inviteEmail }}</bdi></dd></div>
            @endif
            @if ($expiresAt)
                <div class="flex justify-between gap-3"><dt class="text-muted-foreground">{{ $l['expiresOn'] }}</dt><dd class="text-foreground"><x-nq::numeric.date-time :value="$expiresAt" date-style="medium" /></dd></div>
            @endif
        </dl>
        @if ($account)
            <div class="flex items-center gap-2.5 text-body-sm text-muted-foreground">
                <x-nq::avatar :name="$account['name'] ?? ''" :src="$account['avatar'] ?? null" size="sm" />
                <span class="min-w-0">{{ $l['signedInAs'] }} <bdi dir="ltr" class="text-foreground">{{ $account['email'] ?? '' }}</bdi></span>
            </div>
            <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                @if ($decline)
                    <x-nq::button variant="ghost" x-on:click="run('decline', 'nq-invite-decline')" x-bind:disabled="offDecline()" x-bind:data-disabled="offDecline() ? '' : null"
                        x-bind:aria-busy="doing === 'decline' ? 'true' : null">
                        <template x-if="doing === 'decline'"><x-nq::spinner /></template>
                        {{ $l['decline'] }}
                    </x-nq::button>
                @endif
                <x-nq::button variant="primary" x-on:click="run('accept', 'nq-invite-accept')" x-bind:disabled="offAccept()" x-bind:data-disabled="offAccept() ? '' : null"
                    x-bind:aria-busy="doing === 'accept' ? 'true' : null">
                    <template x-if="doing === 'accept'"><x-nq::spinner /></template>
                    {{ $l['accept'] }}
                </x-nq::button>
            </div>
        @else
            <div class="flex flex-col gap-2">
                @if ($signInHint) <p class="text-caption text-muted-foreground">{{ $signInHint }}</p> @endif
                <x-nq::invite-accept.action variant="primary" :to="$signIn" event="nq-invite-sign-in">{{ $l['signInToAccept'] }}</x-nq::invite-accept.action>
                @if ($signUp)
                    <x-nq::invite-accept.action variant="secondary" :to="$signUp" event="nq-invite-sign-up">{{ $l['createAccount'] }}</x-nq::invite-accept.action>
                @endif
            </div>
        @endif
    @elseif ($state === 'expired')
        <x-nq::alert tone="success" x-show="requested" style="display: none">{{ $l['requested'] }}</x-nq::alert>
        @if ($requestNew)
            <x-nq::button variant="primary" x-show="! requested" x-on:click="run('request', 'nq-invite-request-new', () => requested = true)" x-bind:disabled="doing === 'request'"
                x-bind:data-disabled="doing === 'request' ? '' : null" x-bind:aria-busy="doing === 'request' ? 'true' : null">
                <template x-if="doing === 'request'"><x-nq::spinner /></template>
                {{ $l['requestNew'] }}
            </x-nq::button>
        @endif
    @elseif ($state === 'wrong-account')
        <x-nq::button variant="primary" x-on:click="run('switch', 'nq-invite-switch-account')" x-bind:disabled="doing === 'switch'" x-bind:data-disabled="doing === 'switch' ? '' : null"
            x-bind:aria-busy="doing === 'switch' ? 'true' : null">
            <template x-if="doing === 'switch'"><x-nq::spinner /></template>
            {{ $l['switchAccount'] }}
        </x-nq::button>
    @elseif ($state === 'already-accepted')
        @if ($openWorkspace)
            <x-nq::invite-accept.action variant="primary" :to="$openWorkspace" event="nq-invite-open-workspace">{{ $openLabel }}</x-nq::invite-accept.action>
        @endif
    @else
        @if ($goHome)
            <x-nq::invite-accept.action variant="secondary" :to="$goHome" event="nq-invite-go-home">{{ $l['goHome'] }}</x-nq::invite-accept.action>
        @endif
    @endif
    <x-nq::alert tone="danger" role="alert" x-show="error" style="display: none"><span x-text="error"></span></x-nq::alert>
</div>
