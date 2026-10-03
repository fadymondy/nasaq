{{-- <x-nq::app-update.release-manager :releases="$releases" :min-supported-build="240" :usage="[['build' => 230, 'users' => 1200]]" @nq-release-min-build="$event.detail.waitUntil($wire.setMin($event.detail.build))" />
     The admin view of releases: the list with channel, rollout and status, publish and roll back per row, and the minimum supported build that drives app-update.forced-gate.
     Raising the minimum warns how many people it will block. A Blade prop cannot be an async callback, so changes leave through events (bubbling, cancelable):
       nq-release-min-build  detail { build, resolve(result?), reject(message), waitUntil(promise) }
       nq-release-publish    detail { id, resolve, reject, waitUntil }
       nq-release-rollback   detail { id, resolve, reject, waitUntil }
     Nothing handling an event: it counts as done. detail.resolve({ error: "Nope" }) / detail.reject("Nope") / a rejected waitUntil promise shows the error (min build) or just stops the spinner (rows).
     releases: id, version, build, date, channel (stable|beta), status (draft|live|rolled-back), rollout (0..100). min-supported-build: the current minimum. usage: [build, users] to warn before raising it.
     publish / rollback (default true): show the row buttons. labels: array overriding the words. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.app-update._words')
@props(['releases' => [], 'minSupportedBuild', 'usage' => [], 'publish' => true, 'rollback' => true, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_au_words($locale, $labels);
    $releases = array_values($releases);
    $latest = $releases ? max(array_map(fn ($r) => (int) $r['build'], $releases)) : 0;
    $inputId = 'nq-rm-'.substr(md5(json_encode([$minSupportedBuild, $latest, $locale])), 0, 8);
    $config = ['min' => (int) $minSupportedBuild, 'latest' => $latest, 'usage' => array_values($usage), 'locale' => $locale, 't' => array_intersect_key($t, array_flip(['blocked', 'invalid', 'tooHigh', 'minBuildHint', 'saved']))];
    $badges = ['live' => ['success', $t['live']], 'draft' => ['neutral', $t['draft']]];
@endphp
<section data-slot="release-manager" x-data="nqReleaseManager(@js($config))" {{ $attributes->cn('flex w-full flex-col gap-5 rounded-card border border-border bg-card p-4') }}>
    <header class="flex flex-col gap-1">
        <h2 class="text-h3">{{ $t['managerTitle'] }}</h2>
        <p class="text-body-sm text-muted-foreground">{{ $t['managerDescription'] }}</p>
    </header>
    <div class="flex flex-col gap-2">
        <label for="{{ $inputId }}" class="text-label">{{ $t['minBuild'] }}</label>
        <div class="flex items-start gap-2">
            <x-nq::field.input id="{{ $inputId }}" ltr inputmode="numeric" class="w-32" x-model="draft" x-bind:aria-invalid="problem() ? 'true' : null" />
            <x-nq::button variant="primary" x-on:click="save()" :disabled="true" x-bind:disabled="cannotSave()" x-bind:data-disabled="cannotSave() ? '' : null" x-bind:aria-busy="saving ? 'true' : null">
                <x-nq::spinner x-show="saving" style="display: none" />{{ $t['save'] }}
            </x-nq::button>
        </div>
        <p class="text-caption text-muted-foreground" x-bind:class="{ 'text-nq-danger-text': problem(), 'text-muted-foreground': ! problem() }" x-text="hint()">{{ $t['minBuildHint'] }}</p>
        <x-nq::alert tone="warning" icon="wrench" x-show="blocked() > 0 && changed()" style="display: none"><span x-text="blockedText()"></span></x-nq::alert>
        <p role="status" class="text-caption text-nq-success-text" x-show="notice" x-text="notice" style="display: none"></p>
    </div>
    <x-nq::table :label="$t['releasesLabel']">
        <x-nq::table.header>
            <x-nq::table.row>
                <x-nq::table.head>{{ $t['version'] }}</x-nq::table.head>
                <x-nq::table.head>{{ $t['build'] }}</x-nq::table.head>
                <x-nq::table.head>{{ $t['channel'] }}</x-nq::table.head>
                <x-nq::table.head>{{ $t['released'] }}</x-nq::table.head>
                <x-nq::table.head>{{ $t['rollout'] }}</x-nq::table.head>
                <x-nq::table.head>{{ $t['status'] }}</x-nq::table.head>
                <x-nq::table.head class="text-end">{{ $t['actions'] }}</x-nq::table.head>
            </x-nq::table.row>
        </x-nq::table.header>
        <x-nq::table.body>
            @forelse ($releases as $r)
                @php
                    $key = addslashes((string) $r['id']);
                    [$statusVariant, $statusLabel] = $badges[$r['status']] ?? ['warning', $t['rolledBack']];
                @endphp
                <x-nq::table.row>
                    <x-nq::table.cell dir="ltr" class="text-start font-mono">{{ $r['version'] }}</x-nq::table.cell>
                    <x-nq::table.cell dir="ltr" class="text-start font-mono">
                        {{ $r['build'] }}
                        <x-nq::badge variant="outline" class="ms-2" x-show="min === {{ (int) $r['build'] }}" :style="(int) $r['build'] !== (int) $minSupportedBuild ? 'display: none' : null">{{ $t['minTag'] }}</x-nq::badge>
                    </x-nq::table.cell>
                    <x-nq::table.cell>
                        @if (($r['channel'] ?? 'stable') === 'beta')
                            <x-nq::badge variant="warning">{{ $t['beta'] }}</x-nq::badge>
                        @else
                            <x-nq::badge variant="neutral">{{ $t['stable'] }}</x-nq::badge>
                        @endif
                    </x-nq::table.cell>
                    <x-nq::table.cell>
                        @if (isset($r['date']))
                            <x-nq::numeric.date-time :value="$r['date']" date-style="medium" :locale="$locale" />
                        @endif
                    </x-nq::table.cell>
                    <x-nq::table.cell dir="ltr" class="text-start tabular-nums">{{ isset($r['rollout']) ? $r['rollout'].'%' : '—' }}</x-nq::table.cell>
                    <x-nq::table.cell><x-nq::badge :variant="$statusVariant">{{ $statusLabel }}</x-nq::badge></x-nq::table.cell>
                    <x-nq::table.cell class="text-end">
                        @if ($r['status'] === 'live' && $rollback)
                            <x-nq::button size="sm" variant="ghost" x-on:click="act('rb-{{ $key }}', 'nq-release-rollback', '{{ $key }}')" x-bind:disabled="pending === 'rb-{{ $key }}'" x-bind:data-disabled="pending === 'rb-{{ $key }}' ? '' : null" x-bind:aria-busy="pending === 'rb-{{ $key }}' ? 'true' : null">
                                <x-nq::spinner x-show="pending === 'rb-{{ $key }}'" style="display: none" />{{ $t['rollback'] }}
                            </x-nq::button>
                        @endif
                        @if ($r['status'] !== 'live' && $publish)
                            <x-nq::button size="sm" variant="secondary" x-on:click="act('pub-{{ $key }}', 'nq-release-publish', '{{ $key }}')" x-bind:disabled="pending === 'pub-{{ $key }}'" x-bind:data-disabled="pending === 'pub-{{ $key }}' ? '' : null" x-bind:aria-busy="pending === 'pub-{{ $key }}' ? 'true' : null">
                                <x-nq::spinner x-show="pending === 'pub-{{ $key }}'" style="display: none" />{{ $t['publish'] }}
                            </x-nq::button>
                        @endif
                    </x-nq::table.cell>
                </x-nq::table.row>
            @empty
                <x-nq::table.row>
                    <x-nq::table.cell colspan="7" class="py-6 text-center text-muted-foreground">{{ $t['empty'] }}</x-nq::table.cell>
                </x-nq::table.row>
            @endforelse
        </x-nq::table.body>
    </x-nq::table>
</section>
