{{-- <x-nq::error-tracking.diagnostics :diagnostics="['screenshot' => '/shot.png', 'console' => [['at' => '2026-09-30T08:11:00Z', 'level' => 'error', 'message' => 'boom']], 'network' => [['at' => '…', 'method' => 'POST', 'url' => '/api/pay', 'status' => 500, 'duration' => 1400]]]" />
     The screenshot, console output and network requests captured with an error, in three tabs. The network tab has an All / Failed only switch (4xx, 5xx and requests with no answer).
     diagnostics: ['screenshot' (image URL), 'console' => [['at', 'level' => log|info|warn|error, 'message']], 'network' => [['at', 'method', 'url', 'status', 'duration' (ms)]]]. labels: override any string. locale: en or ar (default the app's).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['diagnostics' => [], 'labels' => [], 'locale' => null])
@include('nasaq::components.error-tracking._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_et_words($locale, (array) $labels);
    $d = (array) $diagnostics;
    $console = array_values(array_map(fn ($c) => (array) $c, (array) ($d['console'] ?? [])));
    $net = array_values(array_map(fn ($r) => (array) $r, (array) ($d['network'] ?? [])));
    $first = ! empty($d['screenshot']) ? 'screenshot' : ($console ? 'console' : 'network');
    $count = fn ($n) => '<bdi class="text-caption tabular-nums opacity-70">'.nq_et_num($n, $locale).'</bdi>';
@endphp
<x-nq::tabs :data-slot="$attributes->get('data-slot', 'diagnostics-viewer')" :default-value="$first" {{ $attributes->except('data-slot')->merge(['class' => 'gap-3']) }}>
    <x-nq::tabs.list>
        <x-nq::tabs.tab value="screenshot">{{ $t['screenshot'] }}</x-nq::tabs.tab>
        <x-nq::tabs.tab value="console">{{ $t['console'] }} {!! $count(count($console)) !!}</x-nq::tabs.tab>
        <x-nq::tabs.tab value="network">{{ $t['network'] }} {!! $count(count($net)) !!}</x-nq::tabs.tab>
        <x-nq::tabs.indicator />
    </x-nq::tabs.list>
    <x-nq::tabs.panel value="screenshot">
        @if (! empty($d['screenshot']))
            <figure class="overflow-hidden rounded-card border border-border bg-muted">
                <img src="{{ $d['screenshot'] }}" alt="{{ $t['screenshotAlt'] }}" class="block h-auto w-full" />
            </figure>
        @else
            <p class="text-body-sm text-muted-foreground">{{ $t['noScreenshot'] }}</p>
        @endif
    </x-nq::tabs.panel>
    <x-nq::tabs.panel value="console">
        @if ($console)
            <ul dir="ltr" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card font-mono text-code">
                @foreach ($console as $c)
                    <li data-level="{{ $c['level'] }}" class="flex items-start gap-3 px-3 py-1.5">
                        <span class="shrink-0 tabular-nums text-muted-foreground"><time datetime="{{ \Carbon\CarbonImmutable::parse($c['at'])->toIso8601String() }}" class="[unicode-bidi:isolate]">{{ nq_et_clock($c['at'], $locale) }}</time></span>
                        <x-nq::badge :variant="$c['level'] === 'error' ? 'danger' : ($c['level'] === 'warn' ? 'warning' : 'neutral')" class="shrink-0">{{ $c['level'] }}</x-nq::badge>
                        <span class="min-w-0 whitespace-pre-wrap break-words text-foreground">{{ $c['message'] }}</span>
                    </li>
                @endforeach
            </ul>
        @else
            <p class="text-body-sm text-muted-foreground">{{ $t['noConsole'] }}</p>
        @endif
    </x-nq::tabs.panel>
    <x-nq::tabs.panel value="network" class="flex flex-col gap-2">
        @if ($net)
            <div class="flex flex-col gap-2" x-data="{ failedOnly: false }">
                <div class="flex gap-2">
                    <x-nq::button size="sm" variant="secondary" class="aria-pressed:bg-primary! aria-pressed:text-primary-foreground!" x-bind:aria-pressed="failedOnly ? 'false' : 'true'" x-on:click="failedOnly = false">{{ $t['allRequests'] }}</x-nq::button>
                    <x-nq::button size="sm" variant="secondary" class="aria-pressed:bg-primary! aria-pressed:text-primary-foreground!" x-bind:aria-pressed="failedOnly ? 'true' : 'false'" x-on:click="failedOnly = true">{{ $t['failedOnly'] }}</x-nq::button>
                </div>
                <x-nq::table :label="$t['network']">
                    <x-nq::table.header>
                        <x-nq::table.row>
                            <x-nq::table.head>{{ $t['method'] }}</x-nq::table.head>
                            <x-nq::table.head>{{ $t['url'] }}</x-nq::table.head>
                            <x-nq::table.head>{{ $t['status'] }}</x-nq::table.head>
                            <x-nq::table.head class="text-end">{{ $t['duration'] }}</x-nq::table.head>
                        </x-nq::table.row>
                    </x-nq::table.header>
                    <x-nq::table.body>
                        @foreach ($net as $r)
                            @php $tone = nq_et_http_tone($r['status'] ?? null); @endphp
                            <x-nq::table.row x-show="failedOnly ? {{ in_array($tone, ['danger', 'warning'], true) ? 'true' : 'false' }} : true">
                                <x-nq::table.cell><bdi dir="ltr" class="font-mono text-code">{{ $r['method'] }}</bdi></x-nq::table.cell>
                                <x-nq::table.cell class="max-w-72 truncate"><bdi dir="ltr" class="font-mono text-code" title="{{ $r['url'] }}">{{ $r['url'] }}</bdi></x-nq::table.cell>
                                <x-nq::table.cell><x-nq::badge :variant="$tone"><bdi>{{ ! empty($r['status']) ? $r['status'] : '—' }}</bdi></x-nq::badge></x-nq::table.cell>
                                <x-nq::table.cell class="text-end tabular-nums"><bdi>{{ isset($r['duration']) ? nq_et_duration($r['duration']) : '—' }}</bdi></x-nq::table.cell>
                            </x-nq::table.row>
                        @endforeach
                    </x-nq::table.body>
                </x-nq::table>
            </div>
        @else
            <p class="text-body-sm text-muted-foreground">{{ $t['noNetwork'] }}</p>
        @endif
    </x-nq::tabs.panel>
</x-nq::tabs>
