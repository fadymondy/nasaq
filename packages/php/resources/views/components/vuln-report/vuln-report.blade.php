{{-- <x-nq::vuln-report :findings="$findings" :history="$history" :last-scan-at="now()" scannable />
     Latest scan at a glance: counts per severity, the worst findings with the fixed version, and the last scans as stacked bars with the trend.
     findings: array of ['id' => 'CVE-2024-12345', 'severity' => critical|high|medium|low, 'cvss', 'title', 'package', 'installedVersion', 'fixedVersion'].
     counts: overrides the counts counted from findings. history: array of ['id', 'at', 'counts'], oldest first. last-scan-at: date, timestamp or string.
     top-limit: findings listed (5). scanning: spins the Scan now button. scannable: shows Scan now, which dispatches a bubbling "nq-scan" (set scanning
     once you handle it). openable: makes each id a button dispatching "nq-open-finding" with { id } (both need the Alpine runtime).
     labels: array overriding the built-in words. locale overrides the app's. --}}
@include('nasaq::components.vuln-report._logic')
@props(['findings' => [], 'counts' => null, 'history' => [], 'lastScanAt' => null, 'topLimit' => 5, 'scanning' => false, 'scannable' => false, 'openable' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_vr_words($locale, $labels);
    $c = $counts ?? nq_vr_count($findings);
    $total = nq_vr_total($c);
    $top = nq_vr_top($findings, $topLimit);
    $delta = nq_vr_trend($history);
    $peak = max(1, ...array_map(fn ($h) => nq_vr_total($h['counts'] ?? []), $history ?: [['counts' => []]]));
    $hasScan = $lastScanAt !== null || count($history) > 0 || count($findings) > 0;
    $tone = nq_vr_tone($c);
    $uid = 'vuln-'.\Illuminate\Support\Str::random(6);
    $sevVariant = ['critical' => 'danger', 'high' => 'danger', 'medium' => 'warning', 'low' => 'neutral'];
    $sevBar = ['critical' => 'bg-nq-danger', 'high' => 'bg-nq-danger/60', 'medium' => 'bg-nq-warning', 'low' => 'bg-muted-foreground/40'];
@endphp
<div data-slot="vuln-report" data-risk="{{ $tone }}" {{ $attributes->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full') }}>
    <x-nq::card.header>
        <div class="flex flex-wrap items-center justify-between gap-2">
            <x-nq::card.title as="h3" class="flex items-center gap-2">
                <x-lucide-scan-search aria-hidden="true" class="size-4 text-muted-foreground" />
                {{ $t['title'] }}
            </x-nq::card.title>
            @if ($scannable)
                <x-nq::button size="sm" variant="secondary" :loading="$scanning" x-on:click="$dispatch('nq-scan')">{{ $scanning ? $t['scanning'] : $t['scanNow'] }}</x-nq::button>
            @endif
        </div>
        <x-nq::card.description>
            {{ $t['description'] }}
            @if ($lastScanAt)
                {{ $t['scannedAt'] }} <x-nq::numeric.date-time :value="$lastScanAt" relative :locale="$locale" />.
            @endif
        </x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="grid gap-6">
        @if (! $hasScan)
            <x-nq::states.empty :title="$t['noScan']" :description="$t['noScanBody']" />
        @else
            <div class="flex flex-wrap items-center gap-3">
                <p class="text-body-sm text-muted-foreground">
                    {{ $t['total'] }}: <span class="text-h3 font-semibold text-foreground tabular-nums"><x-nq::numeric :value="$total" :locale="$locale" /></span>
                </p>
                @if ($delta !== null)
                    <x-nq::badge :variant="$delta < 0 ? 'success' : ($delta > 0 ? 'danger' : 'neutral')">
                        @if ($delta < 0)
                            <x-lucide-arrow-down-right aria-hidden="true" />
                        @elseif ($delta > 0)
                            <x-lucide-arrow-up-right aria-hidden="true" />
                        @else
                            <x-lucide-minus aria-hidden="true" />
                        @endif
                        {{ $delta < 0 ? nq_vr_fill($t['better'], ['n' => -$delta]) : ($delta > 0 ? nq_vr_fill($t['worse'], ['n' => $delta]) : $t['same']) }}
                    </x-nq::badge>
                @endif
            </div>
            <x-nq::vuln-report.severity-tiles :counts="$c" :labels="$labels" :locale="$locale" />

            <section aria-labelledby="{{ $uid }}-top" class="grid gap-2">
                <h4 id="{{ $uid }}-top" class="text-label text-foreground">{{ $t['top'] }}</h4>
                @if ($total === 0)
                    <p class="rounded-control border border-dashed border-border p-4 text-body-sm text-muted-foreground">{{ $t['clean'] }}. {{ $t['cleanBody'] }}</p>
                @elseif (count($top) === 0)
                    <p class="text-body-sm text-muted-foreground">{{ $t['topEmpty'] }}</p>
                @else
                    <ul class="divide-y divide-border rounded-control border border-border">
                        @foreach ($top as $f)
                            <li data-slot="vuln-finding" class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                                <x-nq::badge :variant="$sevVariant[$f['severity']]">{{ $t['severity'][$f['severity']] }}</x-nq::badge>
                                <div class="grid min-w-0 flex-1 gap-0.5">
                                    @if ($openable)
                                        <button type="button" class="w-fit text-start font-mono text-body-sm text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring" x-on:click="$dispatch('nq-open-finding', @js(['id' => $f['id'], 'package' => $f['package']]))">
                                            <bdi dir="ltr">{{ $f['id'] }}</bdi>
                                        </button>
                                    @else
                                        <bdi dir="ltr" class="font-mono text-body-sm text-foreground">{{ $f['id'] }}</bdi>
                                    @endif
                                    @if (! empty($f['title']))
                                        <span class="truncate text-caption text-muted-foreground" dir="auto">{{ $f['title'] }}</span>
                                    @endif
                                </div>
                                <span class="text-body-sm text-muted-foreground">
                                    <bdi dir="ltr" class="font-mono">{{ $f['package'] }}{{ ! empty($f['installedVersion']) ? '@'.$f['installedVersion'] : '' }}</bdi>
                                    →
                                    @if (! empty($f['fixedVersion']))
                                        <bdi dir="ltr" class="font-mono text-nq-success">{{ $f['fixedVersion'] }}</bdi>
                                    @else
                                        <span>{{ $t['noFix'] }}</span>
                                    @endif
                                </span>
                                @if (isset($f['cvss']))
                                    <span class="text-caption text-muted-foreground tabular-nums">
                                        {{ $t['cvss'] }} <bdi dir="ltr">{{ number_format((float) $f['cvss'], 1, '.', '') }}</bdi>
                                    </span>
                                @endif
                                @if (nq_vr_is_cve($f['id']))
                                    <x-nq::copy-button :value="$f['id']" :label="nq_vr_fill($t['copyCve'], ['id' => $f['id']])" size="icon-sm" variant="ghost" />
                                @endif
                            </li>
                        @endforeach
                    </ul>
                @endif
            </section>

            @if (count($history) > 0)
                <section aria-labelledby="{{ $uid }}-history" class="grid gap-2">
                    <h4 id="{{ $uid }}-history" class="text-label text-foreground">{{ $t['history'] }}</h4>
                    <ol class="flex h-24 items-end gap-1.5">
                        @foreach ($history as $h)
                            @php
                                $n = nq_vr_total($h['counts'] ?? []);
                                $name = nq_vr_fill($t['historyLabel'], ['d' => nq_vr_date($h['at'], $locale), 'n' => $n]);
                            @endphp
                            <li class="flex h-full min-w-2 flex-1 flex-col-reverse overflow-hidden rounded-t-[2px]" style="height: {{ max(4, ($n / $peak) * 100) }}%" role="img" aria-label="{{ $name }}" title="{{ $name }}">
                                @foreach (array_reverse(nq_vr_severities()) as $s)
                                    @if (($h['counts'][$s] ?? 0) > 0)
                                        <span class="{{ $sevBar[$s] }}" style="flex-grow: {{ $h['counts'][$s] }}"></span>
                                    @endif
                                @endforeach
                            </li>
                        @endforeach
                    </ol>
                </section>
            @endif
        @endif
    </x-nq::card.content>
</div>
