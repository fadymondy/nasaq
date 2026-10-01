{{-- <x-nq::profile-card :person="['id' => 'u1', 'name' => 'Sara Nasser', 'handle' => 'sara', 'role' => 'Design lead', 'presence' => 'online', 'timeZone' => 'Asia/Riyadh', 'teams' => ['Design']]" message view-profile />
     A person's account card: avatar with presence, name, role, custom status, local time (and how far it is from yours), teams and quick actions.
     person: id, name, handle, email, avatar, role, presence (online | away | busy | offline), statusText, timeZone (IANA), teams, location.
     viewer-time-zone: your own zone (default the app's). now: freeze the moment the time is read at (a date string, a Unix time or a DateTime; default now).
     message, mention, view-profile: each adds its button; it dispatches a bubbling "nq-message", "nq-mention" or "nq-view-profile" event with { id: person-id }.
     The default slot adds content under the details. labels: array overriding the built-in words. The time is rendered on the server; reload to refresh it. --}}
@include('nasaq::components.profile-card._profile')
@props(['person', 'viewerTimeZone' => null, 'now' => null, 'message' => false, 'mention' => false, 'viewProfile' => false, 'labels' => []])
@php
    $t = nq_profile_t($labels);
    $presence = $person['presence'] ?? null;
    $at = nq_profile_moment($now);
    $zone = nq_profile_zone($person['timeZone'] ?? null);
    $yours = nq_profile_zone($viewerTimeZone) ?? new \DateTimeZone(date_default_timezone_get());
    $time = $zone ? nq_profile_time($zone, $at) : '';
    $diff = $zone ? nq_profile_offset($zone, $yours, $at) : null;
    $night = $zone ? nq_profile_night($zone, $at) : false;
    $teams = array_values($person['teams'] ?? []);
    $actions = $message || $mention || $viewProfile;
    $id = (string) ($person["id"] ?? "");
    $go = fn (string $event) => '$dispatch(`nq-'.$event.'`, { id: $el.dataset.id })';
    $goMessage = $go('message');
    $goMention = $go('mention');
    $goProfile = $go('view-profile');
@endphp
<div data-slot="profile-card" @if ($presence) data-presence="{{ $presence }}" @endif {{ $attributes->cn('flex min-w-0 flex-col gap-3 text-start') }}>
    <div class="flex items-start gap-3">
        <x-nq::profile-card.presence-avatar :person="$person" size="lg" />
        <div class="flex min-w-0 flex-1 flex-col">
            <p class="truncate text-label text-foreground">{{ $person['name'] }}</p>
            @if (! empty($person['handle']))<bdi dir="ltr" class="truncate text-caption text-muted-foreground">{{ '@'.$person['handle'] }}</bdi>@endif
            @if (! empty($person['role']))<p class="truncate text-caption text-muted-foreground">{{ $person['role'] }}</p>@endif
        </div>
    </div>

    <dl class="m-0 flex flex-col gap-1.5 text-caption text-muted-foreground">
        @if ($presence)
            <div class="flex items-center gap-2">
                <dt class="sr-only">{{ $t[$presence] }}</dt>
                <dd class="m-0 flex min-w-0 items-center gap-2">
                    <x-nq::profile-card.presence-dot :presence="$presence" decorative />
                    <span class="truncate text-foreground">{{ $person['statusText'] ?? $t[$presence] }}</span>
                </dd>
            </div>
        @endif
        @if ($zone && $time !== '' && $diff !== null)
            <div class="flex items-baseline gap-2">
                <dt class="sr-only">{{ $t['localTime'] }}</dt>
                <dd class="m-0 flex min-w-0 flex-wrap items-baseline gap-x-2">
                    <span dir="ltr" class="text-foreground tabular-nums">{{ $time }}</span>
                    <span>{{ $night ? nq_profile_offset_text($t, $diff).' · '.$t['night'] : nq_profile_offset_text($t, $diff) }}</span>
                </dd>
            </div>
        @endif
        @if (count($teams))
            <div class="flex items-center gap-2">
                <dt class="sr-only">{{ count($teams) > 1 ? $t['teams'] : $t['team'] }}</dt>
                <dd class="m-0 flex min-w-0 items-center gap-2">
                    <x-lucide-users aria-hidden="true" class="size-3.5 shrink-0" />
                    <span class="truncate">{{ implode(' · ', $teams) }}</span>
                </dd>
            </div>
        @endif
        @if (! empty($person['email']))
            <div>
                <dt class="sr-only">{{ $t['email'] }}</dt>
                <dd class="m-0 truncate"><bdi dir="ltr">{{ $person['email'] }}</bdi></dd>
            </div>
        @endif
    </dl>

    {{ $slot }}

    @if ($actions)
        <div data-slot="profile-card-actions" class="flex flex-wrap gap-2">
            @if ($message)
                <x-nq::button size="sm" variant="primary" :data-id="$id" :x-on:click="$goMessage">
                    <x-lucide-message-square aria-hidden="true" />
                    {{ $t['message'] }}
                </x-nq::button>
            @endif
            @if ($mention)
                <x-nq::button size="sm" :data-id="$id" :x-on:click="$goMention">
                    <x-lucide-at-sign aria-hidden="true" />
                    {{ $t['mention'] }}
                </x-nq::button>
            @endif
            @if ($viewProfile)
                <x-nq::button size="sm" variant="ghost" :data-id="$id" :x-on:click="$goProfile">
                    <x-lucide-user-round aria-hidden="true" />
                    {{ $t['viewProfile'] }}
                </x-nq::button>
            @endif
        </div>
    @endif
</div>
