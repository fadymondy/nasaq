{{-- <x-nq::install-prompt.push-opt-in permission="granted" :subscribed="true" :devices="[['id' => 'd1', 'name' => 'Pixel 9', 'kind' => 'phone', 'current' => true]]" />
     The per-device push opt-in. Until the browser has allowed notifications it shows the soft ask (desktop-notification.permission-prompt). Once allowed it shows one switch for this device
     and the list of the person's other subscribed devices, each removable, so a phone can be on while a laptop is off.
     permission: default | granted | denied | unsupported (the browser's, from Notification.permission). subscribed: whether this device is subscribed to push.
     devices: id, name, kind (phone | tablet | computer), lastSeen (date), current. remove: show the remove buttons (default true). testable: show "Send a test" while subscribed.
     requires-install: the iPhone / iPad note. settings: show "Open settings" when blocked. labels: array overriding the words.
     Events (bubbling, cancelable, wallet style): nq-push-subscribe { subscribed, resolve, reject, waitUntil } when the switch flips (an error puts the switch back and shows the message);
     nq-push-remove { id, resolve, reject, waitUntil }; nq-push-test. Window event nq-push-state { permission, subscribed } updates it from outside.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.install-prompt._words')
@props(['permission' => 'default', 'subscribed' => false, 'devices' => [], 'remove' => true, 'testable' => false, 'requiresInstall' => false, 'settings' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_ip_words($locale, $labels);
    $granted = $permission === 'granted';
    $subscribed = (bool) $subscribed;
    $id = 'nq-push-'.substr(md5(json_encode([$locale, $permission])), 0, 8);
    $icons = ['phone' => 'smartphone', 'tablet' => 'tablet', 'computer' => 'laptop'];
    $config = ['permission' => $permission, 'subscribed' => $subscribed, 'devices' => array_map(fn ($d) => ['id' => $d['id'], 'current' => (bool) ($d['current'] ?? false)], $devices)];
    $hide = fn (bool $cond) => $cond ? 'display: none' : '';
@endphp
<section data-slot="push-opt-in" aria-labelledby="{{ $id }}" x-data="nqPushOptIn(@js($config))" x-on:nq-permission="onPermission($event)"
    {{ $attributes->cn('flex w-full max-w-xl flex-col gap-4 rounded-card border border-border bg-card p-4') }}>
    <header class="flex flex-col gap-1">
        <h2 id="{{ $id }}" class="text-h3">{{ $t['pushTitle'] }}</h2>
        <p class="text-body-sm text-muted-foreground">{{ $t['pushDescription'] }}</p>
    </header>
    @if ($requiresInstall)
        <x-nq::alert tone="info">{{ $t['pushNeedsInstall'] }}</x-nq::alert>
    @endif
    <div x-show="! granted()" style="{{ $hide($granted) }}">
        <x-nq::desktop-notification.permission-prompt class="max-w-none" :permission="$permission" :settings="$settings" :labels="$labels" :locale="$locale" />
    </div>
    <div class="flex flex-col gap-4" x-show="granted()" style="{{ $hide(! $granted) }}">
        <div class="flex items-center justify-between gap-4 rounded-control border border-border p-3">
            <div class="flex min-w-0 flex-col">
                <span id="{{ $id }}-switch" class="text-label">{{ $t['pushSwitch'] }}</span>
                <span class="text-caption text-muted-foreground" aria-live="polite" x-text="subscribed ? @js($t['pushOn']) : @js($t['pushOff'])">{{ $subscribed ? $t['pushOn'] : $t['pushOff'] }}</span>
            </div>
            <x-nq::switch :checked="$subscribed" x-model="subscribed" aria-labelledby="{{ $id }}-switch" x-bind:data-saving="saving ? '' : null" />
        </div>
        <x-nq::alert tone="danger" x-show="error" style="display: none"><span x-text="error"></span></x-nq::alert>
        @if ($testable)
            <div x-show="subscribed" style="{{ $hide(! $subscribed) }}">
                <x-nq::button variant="secondary" size="sm" x-on:click="test()">{{ $t['test'] }}</x-nq::button>
            </div>
        @endif
        <div class="flex flex-col gap-2">
            <h3 class="text-label">{{ $t['devices'] }}</h3>
            @if (count($devices))
                <ul class="flex flex-col divide-y divide-border rounded-control border border-border">
                    @foreach ($devices as $d)
                        <li class="flex items-center gap-3 p-3" x-show="! gone.includes('{{ addslashes($d['id']) }}')">
                            <x-dynamic-component :component="'lucide-'.($icons[$d['kind'] ?? 'computer'] ?? 'laptop')" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                            <div class="flex min-w-0 flex-1 flex-col">
                                <span class="flex items-center gap-2 text-body-sm">
                                    <span dir="auto" class="truncate">{{ $d['name'] }}</span>
                                    @if ($d['current'] ?? false)
                                        <x-nq::badge variant="info">{{ $t['thisDevice'] }}</x-nq::badge>
                                    @endif
                                </span>
                                @if (isset($d['lastSeen']))
                                    <span class="text-caption text-muted-foreground">
                                        {{ $t['lastSeen'] }} <x-nq::numeric.date-time :value="$d['lastSeen']" relative :locale="$locale" />
                                    </span>
                                @endif
                            </div>
                            @if ($remove && ! ($d['current'] ?? false))
                                <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ nq_ip_fill($t['remove'], ['name' => $d['name']]) }}" x-on:click="remove('{{ addslashes($d['id']) }}')"
                                    x-bind:disabled="removing === '{{ addslashes($d['id']) }}'" x-bind:aria-busy="removing === '{{ addslashes($d['id']) }}' ? 'true' : null">
                                    <x-lucide-trash-2 aria-hidden="true" />
                                </x-nq::button>
                            @endif
                        </li>
                    @endforeach
                </ul>
            @endif
            <p class="text-body-sm text-muted-foreground" x-show="visibleDevices() === 0" style="{{ $hide(count($devices) > 0) }}">{{ $t['noDevices'] }}</p>
        </div>
    </div>
</section>
