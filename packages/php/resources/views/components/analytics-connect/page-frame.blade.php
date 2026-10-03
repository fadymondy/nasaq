{{-- <x-nq::analytics-connect.page-frame title="Search Console" description="nasaq.dev" :service="$service" :benefits="['Clicks and impressions']" refreshable :updated-at="$updatedAt"
         @nq-refresh="$event.detail.wait(reload())" @nq-disconnect="$event.detail.wait(revoke($event.detail.id))" @nq-connect="$event.detail.wait(startOAuth($event.detail.id, $event.detail.scopeIds))">
         <x-slot:actions>…period toggle…</x-slot:actions> the report </x-nq::analytics-connect.page-frame>
     The shell shared by the analytics pages: a heading with the connected source, period controls, refresh and disconnect, then the report (the slot).
     Without a connected source it shows analytics-connect instead. service: as in analytics-connect. benefits: bullets for the connect screen.
     actions slot: controls at the inline end of the header. error: replaces the report with an error state; retryable adds "Try again".
     refreshable adds Refresh; refreshing starts it busy. updated-at: DateTime, timestamp or string for "Updated 3 minutes ago".
     Events on the root, each with detail.wait(promise): nq-refresh {}, nq-retry {}, nq-disconnect { id } (asked first in a dialog); the connect screen's nq-connect / nq-select-account bubble through.
     labels: override refresh, updated, connected, disconnect, disconnectTitle ({name}), disconnectBody, connectedTo, errorTitle, retry. Needs the Alpine runtime. --}}
@props(['title', 'description' => null, 'service', 'benefits' => [], 'error' => null, 'retryable' => false, 'refreshable' => false, 'refreshing' => false, 'updatedAt' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $connected = ($service['status'] ?? 'disconnected') === 'connected';
    $s = array_merge([
        'refresh' => $t::t('Refresh', 'تحديث'),
        'updated' => $t::t('Updated', 'آخر تحديث'),
        'connected' => $t::t('Connected', 'مرتبط'),
        'disconnect' => $t::t('Disconnect', 'فك الربط'),
        'disconnectTitle' => $t::t('Disconnect {name}?', 'فك ربط {name}؟'),
        'disconnectBody' => $t::t('This page goes back to the connect screen. Nothing is deleted from your account.', 'تعود هذه الصفحة إلى شاشة الربط. لا يُحذف شيء من حسابك.'),
        'connectedTo' => $t::t('Connected to', 'مرتبط بـ'),
        'errorTitle' => $t::t('Could not load the report', 'تعذّر تحميل التقرير'),
        'retry' => $t::t('Try again', 'أعد المحاولة'),
    ], (array) $labels);
    $hasActions = isset($actions) && ! $actions->isEmpty();
    $connectedAs = $service['connectedAs'] ?? null;
    $init = ['id' => $service['id'], 'refreshing' => (bool) $refreshing];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'analytics-page') }}" data-connected="{{ $connected ? 'true' : 'false' }}" x-data="nqAnalyticsPage({!! \Illuminate\Support\Js::from($init) !!})"
    {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-6') }}>
    <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div class="flex min-w-0 flex-col gap-1">
            <h1 class="text-h1 text-foreground">{{ $title }}</h1>
            @if ($description)
                <p class="text-pretty text-body-sm text-muted-foreground">{{ $description }}</p>
            @endif
        </div>
        @if ($connected)
            <div class="flex flex-wrap items-center gap-2">
                @if ($hasActions){{ $actions }}@endif
                @if ($refreshable)
                    <x-nq::button type="button" size="sm" variant="secondary" x-on:click="refresh()" x-bind:aria-busy="refreshing ? 'true' : null" x-bind:disabled="refreshing">
                        <x-nq::spinner x-show="refreshing" :style="$refreshing ? '' : 'display: none'" />
                        <x-lucide-refresh-cw aria-hidden="true" x-show="! refreshing" :style="$refreshing ? 'display: none' : ''" />
                        {{ $s['refresh'] }}
                    </x-nq::button>
                @endif
                <x-nq::alert-dialog.confirm-button size="sm" variant="secondary" :title="str_replace('{name}', $service['name'], $s['disconnectTitle'])" :description="$s['disconnectBody']" :confirm-label="$s['disconnect']"
                    x-on:click="disconnect()">{{ $s['disconnect'] }}</x-nq::alert-dialog.confirm-button>
            </div>
        @endif
    </header>
    @if ($connected)
        @if ($updatedAt !== null || $connectedAs)
            <p class="-mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                <x-nq::status tone="success">{{ $s['connected'] }}</x-nq::status>
                @if ($connectedAs)
                    <span>{{ $s['connectedTo'] }} <bdi dir="ltr">{{ $connectedAs }}</bdi></span>
                @endif
                @if ($updatedAt !== null)
                    <span>{{ $s['updated'] }} <x-nq::numeric.date-time :value="$updatedAt" relative /></span>
                @endif
            </p>
        @endif
        @if ($error)
            <x-nq::states.error :title="$s['errorTitle']" :description="$error">
                @if ($retryable)
                    <x-slot:actions><x-nq::button type="button" size="sm" x-on:click="retry()">{{ $s['retry'] }}</x-nq::button></x-slot:actions>
                @endif
            </x-nq::states.error>
        @else
            {{ $slot }}
        @endif
    @else
        <x-nq::analytics-connect :service="$service" :benefits="$benefits" />
    @endif
</div>
