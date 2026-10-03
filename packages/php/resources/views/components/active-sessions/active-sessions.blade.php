{{-- <x-nq::active-sessions :sessions="$sessions" x-on:nq-session-revoke="$event.detail.waitUntil(revoke($event.detail.id))" x-on:nq-session-revoke-others="$event.detail.waitUntil(revokeOthers())" />
     The devices signed in to an account, the current one first and marked, with sign out per device and for every other device.
     It only draws the list; you end the sessions on the server.
     sessions: [['id' => 'a', 'device' => 'Chrome on macOS', 'kind' => 'desktop' (desktop | mobile | tablet | other), 'ip' => '41.33.12.9',
       'location' => 'Cairo, Egypt', 'lastActiveAt' => $date (DateTime, timestamp or string), 'current' => true]].
     revocable: show "Sign out" on every other session (default true); revocable-others: show "Sign out other devices" while there are others (default true).
     Signing out is yours: listen for nq-session-revoke ({ id }) and nq-session-revoke-others on it and call event.detail.waitUntil(promise).
     Resolve { error: "…" } or reject to keep the confirmation open and show the message; anything else closes it and hides the signed-out rows.
     With Livewire: x-on:nq-session-revoke="$event.detail.waitUntil($wire.revoke($event.detail.id))".
     labels: an array overriding any built-in string (title, description, list, current, lastActive, signOut, signOutTitle, signOutBody, signOutOthers,
     signOutOthersTitle, signOutOthersBody, emptyTitle, emptyBody, unknownDevice, cancel, failed).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['sessions' => [], 'revocable' => true, 'revocableOthers' => true, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'title' => $t::t('Active sessions', 'الجلسات النشطة'),
        'description' => $t::t('Devices signed in to your account. Sign out any you do not recognise.', 'الأجهزة المسجّل دخولها إلى حسابك. سجّل الخروج من أي جهاز لا تعرفه.'),
        'list' => $t::t('Signed-in devices', 'الأجهزة المسجّل دخولها'),
        'current' => $t::t('This device', 'هذا الجهاز'),
        'lastActive' => $t::t('Active', 'نشط'),
        'signOut' => $t::t('Sign out', 'تسجيل الخروج'),
        'signOutTitle' => $t::t('Sign out this device?', 'تسجيل الخروج من هذا الجهاز؟'),
        'signOutBody' => $t::t('It will need the password to sign in again.', 'سيحتاج إلى كلمة المرور لتسجيل الدخول مرة أخرى.'),
        'signOutOthers' => $t::t('Sign out other devices', 'تسجيل الخروج من الأجهزة الأخرى'),
        'signOutOthersTitle' => $t::t('Sign out every other device?', 'تسجيل الخروج من كل الأجهزة الأخرى؟'),
        'signOutOthersBody' => $t::t('Only this device stays signed in.', 'سيبقى هذا الجهاز فقط مسجّل الدخول.'),
        'emptyTitle' => $t::t('No other sessions', 'لا توجد جلسات أخرى'),
        'emptyBody' => $t::t('You are signed in on this device only.', 'أنت مسجّل الدخول على هذا الجهاز فقط.'),
        'unknownDevice' => $t::t('Unknown device', 'جهاز غير معروف'),
        'cancel' => $t::t('Cancel', 'إلغاء'),
        'failed' => $t::t('Could not sign out. Try again.', 'تعذّر تسجيل الخروج. حاول مرة أخرى.'),
    ], (array) $labels);
    $sorted = collect($sessions)->map(fn ($s) => (array) $s)->sortByDesc(fn ($s) => (int) ! empty($s['current']))->values();
    $others = $sorted->reject(fn ($s) => ! empty($s['current']))->pluck('id')->values()->all();
    $icons = ['desktop' => 'laptop', 'mobile' => 'smartphone', 'tablet' => 'tablet', 'other' => 'monitor-smartphone'];
@endphp
<div data-slot="active-sessions" x-data="nqActiveSessions(@js(['others' => $others, 'failed' => $l['failed']]))"
    {{ $attributes->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full max-w-2xl') }}>
    <x-nq::card.header>
        <x-nq::card.title as="h2">{{ $l['title'] }}</x-nq::card.title>
        <x-nq::card.description>{{ $l['description'] }}</x-nq::card.description>
        @if ($revocableOthers && count($others) > 0)
            <x-nq::card.action x-show="hasOthers">
                <x-nq::alert-dialog>
                    <x-nq::alert-dialog.trigger variant="secondary" size="sm">
                        <span class="inline-flex items-center gap-2"><x-lucide-log-out aria-hidden="true" /> {{ $l['signOutOthers'] }}</span>
                    </x-nq::alert-dialog.trigger>
                    <x-nq::alert-dialog.content>
                        <x-nq::alert-dialog.header>
                            <x-nq::alert-dialog.title>{{ $l['signOutOthersTitle'] }}</x-nq::alert-dialog.title>
                            <x-nq::alert-dialog.description>{{ $l['signOutOthersBody'] }}</x-nq::alert-dialog.description>
                        </x-nq::alert-dialog.header>
                        <x-nq::alert-dialog.footer>
                            <x-nq::alert-dialog.cancel x-bind:disabled="busy !== null">{{ $l['cancel'] }}</x-nq::alert-dialog.cancel>
                            <x-nq::button variant="danger" x-on:click="revokeOthers().then((ok) => ok && close())" x-bind:disabled="busy !== null"
                                x-bind:data-disabled="busy !== null ? '' : null" x-bind:aria-busy="busy === '*' ? 'true' : null">
                                <template x-if="busy === '*'"><x-nq::spinner /></template>
                                {{ $l['signOutOthers'] }}
                            </x-nq::button>
                        </x-nq::alert-dialog.footer>
                    </x-nq::alert-dialog.content>
                </x-nq::alert-dialog>
            </x-nq::card.action>
        @endif
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <x-nq::alert tone="danger" x-show="error" style="display: none"><span x-text="error"></span></x-nq::alert>
        @if ($sorted->isNotEmpty())
            <ul aria-label="{{ $l['list'] }}" class="overflow-hidden rounded-card border border-border">
                @foreach ($sorted as $s)
                    @php
                        $current = ! empty($s['current']);
                        $device = $s['device'] ?? $l['unknownDevice'];
                    @endphp
                    <li data-slot="session-row" @if ($current) data-current @endif @unless ($current) x-show="! gone.includes(@js($s['id']))" @endunless
                        class="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0">
                        <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
                            <x-dynamic-component :component="'lucide-'.($icons[$s['kind'] ?? 'other'] ?? $icons['other'])" aria-hidden="true" />
                        </span>
                        <div class="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
                            <p class="flex items-center gap-2 text-label text-foreground">
                                <span class="truncate" title="{{ $device }}">{{ $device }}</span>
                                @if ($current)<x-nq::badge variant="success">{{ $l['current'] }}</x-nq::badge>@endif
                            </p>
                            <p class="flex flex-wrap gap-x-2 text-caption text-muted-foreground">
                                @if (! empty($s['location']))<span>{{ $s['location'] }}</span>@endif
                                @if (! empty($s['ip']))<span dir="ltr" class="font-mono">{{ $s['ip'] }}</span>@endif
                                <span>{{ $l['lastActive'] }} <x-nq::numeric.date-time :value="$s['lastActiveAt']" relative /></span>
                            </p>
                        </div>
                        @if ($revocable && ! $current)
                            <div class="contents" x-data="{ sid: @js($s['id']) }"><x-nq::alert-dialog>
                                <x-nq::alert-dialog.trigger variant="ghost" size="sm">{{ $l['signOut'] }}<span class="sr-only">: {{ $device }}</span></x-nq::alert-dialog.trigger>
                                <x-nq::alert-dialog.content>
                                    <x-nq::alert-dialog.header>
                                        <x-nq::alert-dialog.title>{{ $l['signOutTitle'] }}</x-nq::alert-dialog.title>
                                        <x-nq::alert-dialog.description>{{ $l['signOutBody'] }}</x-nq::alert-dialog.description>
                                    </x-nq::alert-dialog.header>
                                    <x-nq::alert-dialog.footer>
                                        <x-nq::alert-dialog.cancel x-bind:disabled="busy !== null">{{ $l['cancel'] }}</x-nq::alert-dialog.cancel>
                                        <x-nq::button variant="danger" x-on:click="revoke(sid).then((ok) => ok && close())" x-bind:disabled="busy !== null"
                                            x-bind:data-disabled="busy !== null ? '' : null" x-bind:aria-busy="busy === sid ? 'true' : null">
                                            <template x-if="busy === sid"><x-nq::spinner /></template>
                                            {{ $l['signOut'] }}
                                        </x-nq::button>
                                    </x-nq::alert-dialog.footer>
                                </x-nq::alert-dialog.content>
                            </x-nq::alert-dialog></div>
                        @endif
                    </li>
                @endforeach
            </ul>
        @else
            <x-nq::states icon="monitor-smartphone" :title="$l['emptyTitle']" :description="$l['emptyBody']" />
        @endif
    </x-nq::card.content>
</div>
