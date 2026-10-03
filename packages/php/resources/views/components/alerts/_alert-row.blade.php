{{-- Internal: one alert row. Included by _alerts-core with $a, $show, $panelId, $t, $js, $security, $actions, $canAcknowledge, $canResolve and $canReopen in scope. --}}
@php
    $badge = ['critical' => 'danger', 'high' => 'warning', 'medium' => 'info', 'low' => 'outline', 'info' => 'outline'][$a['severity']] ?? 'outline';
    $sevIcon = ['critical' => 'shield-alert', 'high' => 'triangle-alert', 'medium' => 'circle-alert', 'low' => 'bell', 'info' => 'bell'][$a['severity']] ?? 'bell';
    $tone = ['open' => 'danger', 'acknowledged' => 'warning', 'resolved' => 'success'][$a['status']] ?? 'neutral';
    $evIcon = ['created' => 'bell-ring', 'notified' => 'bell', 'acknowledged' => 'check', 'resolved' => 'check-check', 'reopened' => 'rotate-ccw', 'escalated' => 'triangle-alert', 'comment' => 'message-square'];
    $resolved = $a['status'] === 'resolved';
    $timeline = collect($a['timeline'] ?? [])->sortByDesc(fn ($e) => nq_alerts_ms($e['at']))->values()->all();
    $rowConfig = ['id' => (string) $a['id'], 'failed' => $t['failed']];
@endphp
<li data-slot="alert-row" data-severity="{{ $a['severity'] }}" data-status="{{ $a['status'] }}" data-alert-id="{{ $a['id'] }}"
    x-data="nqAlertRow(@js($rowConfig))" x-show="matches(alertId)" @unless ($show) style="display: none" x-cloak @endunless
    class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex flex-wrap items-center gap-2">
                <x-nq::badge :variant="$badge" :data-severity="$a['severity']">
                    <x-dynamic-component :component="'lucide-'.$sevIcon" aria-hidden="true" />
                    {{ $t['severity'][$a['severity']] }}
                </x-nq::badge>
                <x-nq::status :tone="$tone">{{ $t['status'][$a['status']] }}</x-nq::status>
                @if (($a['count'] ?? 0) > 1)
                    <span class="text-caption text-muted-foreground">{{ str_replace('{n}', (string) $a['count'], $t['firedTimes']) }}</span>
                @endif
            </div>
            <h3 class="text-label {{ $resolved ? 'text-muted-foreground' : 'text-foreground' }}">{{ $a['title'] }}</h3>
            <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                <span>{{ $t['source'] }}: <bdi dir="ltr" class="tabular-nums">{{ $a['source'] }}</bdi></span>
                <x-nq::numeric.date-time :value="nq_alerts_date($a['createdAt'])" relative />
                @foreach ($a['tags'] ?? [] as $tag)
                    <x-nq::badge variant="outline"><bdi dir="ltr" class="tabular-nums">{{ $tag }}</bdi></x-nq::badge>
                @endforeach
            </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            @if ($canAcknowledge && $a['status'] === 'open')
                <x-nq::button type="button" size="sm" variant="secondary" x-on:click="act('ack', 'nq-alert-acknowledge')" x-bind:disabled="busy !== null">
                    <x-nq::spinner x-show="busy === 'ack'" x-cloak style="display: none" />
                    <x-lucide-check x-show="busy !== 'ack'" aria-hidden="true" />
                    {{ $t['acknowledge'] }}
                </x-nq::button>
            @endif
            @if ($canResolve && ! $resolved)
                <x-nq::button type="button" size="sm" variant="primary" x-on:click="act('resolve', 'nq-alert-resolve')" x-bind:disabled="busy !== null">
                    <x-nq::spinner x-show="busy === 'resolve'" x-cloak style="display: none" />
                    <x-lucide-check-check x-show="busy !== 'resolve'" aria-hidden="true" />
                    {{ $t['resolve'] }}
                </x-nq::button>
            @endif
            @if ($canReopen && $resolved)
                <x-nq::button type="button" size="sm" variant="secondary" x-on:click="act('reopen', 'nq-alert-reopen')" x-bind:disabled="busy !== null">
                    <x-nq::spinner x-show="busy === 'reopen'" x-cloak style="display: none" />
                    <x-lucide-rotate-ccw x-show="busy !== 'reopen'" aria-hidden="true" class="rtl:-scale-x-100" />
                    {{ $t['reopen'] }}
                </x-nq::button>
            @endif
            <x-nq::button type="button" size="sm" variant="ghost" aria-controls="{{ $panelId }}" x-on:click="expanded = ! expanded" x-bind:aria-expanded="expanded">
                <span x-text="expanded ? @js($t['hideDetails']) : @js($t['details'])">{{ $t['details'] }}</span>
                <x-lucide-chevron-down aria-hidden="true" class="transition-transform motion-reduce:transition-none" x-bind:class="expanded && 'rotate-180'" />
            </x-nq::button>
        </div>
    </div>
    <div x-show="error" x-cloak style="display: none">
        <x-nq::alert tone="danger" dismissible x-model="errorOpen"><span x-text="error"></span></x-nq::alert>
    </div>
    <div id="{{ $panelId }}" x-show="expanded" x-cloak style="display: none" class="grid gap-5 border-t border-border pt-4 lg:grid-cols-2">
        <div class="flex min-w-0 flex-col gap-4">
            @if (! empty($a['description']))
                <p class="text-body-sm text-foreground">{{ $a['description'] }}</p>
            @endif
            @if ($security)
                <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
                    @if (! empty($a['category']))
                        <dt class="text-muted-foreground">{{ $t['category'] }}</dt>
                        <dd class="m-0 text-foreground">{{ $t['categories'][$a['category']] ?? $a['category'] }}</dd>
                    @endif
                    @if (! empty($a['ip']))
                        <dt class="text-muted-foreground">{{ $t['ip'] }}</dt>
                        <dd class="m-0 text-foreground"><bdi dir="ltr" class="tabular-nums">{{ $a['ip'] }}</bdi></dd>
                    @endif
                    @if (! empty($a['location']))
                        <dt class="text-muted-foreground">{{ $t['location'] }}</dt>
                        <dd class="m-0 text-foreground">{{ $a['location'] }}</dd>
                    @endif
                    @if (! empty($a['account']))
                        <dt class="text-muted-foreground">{{ $t['account'] }}</dt>
                        <dd class="m-0 text-foreground"><bdi dir="ltr" class="tabular-nums">{{ $a['account'] }}</bdi></dd>
                    @endif
                </dl>
                @if (! empty($a['recommendation']))
                    <x-nq::alert tone="info" :title="$t['recommendation']">{{ $a['recommendation'] }}</x-nq::alert>
                @endif
            @endif
            @if (count($actions) > 0 && ! $resolved)
                <div class="flex flex-wrap gap-2">
                    @foreach ($actions as $act)
                        <x-nq::button type="button" size="sm" :variant="$act['variant'] ?? 'secondary'" x-bind:disabled="busy !== null"
                            x-on:click="act({{ $js('action:'.$act['id']) }}, 'nq-alert-action', { action: {{ $js($act['id']) }} })">
                            <x-nq::spinner x-show="busy === {{ $js('action:'.$act['id']) }}" x-cloak style="display: none" />
                            {{ $act['label'] }}
                        </x-nq::button>
                    @endforeach
                </div>
            @endif
        </div>
        <div class="min-w-0">
            <h4 class="mb-3 text-label text-foreground">{{ $t['timeline'] }}</h4>
            @if (count($timeline) === 0)
                <p class="text-body-sm text-muted-foreground">{{ $t['noTimeline'] }}</p>
            @else
                <x-nq::timeline>
                    @foreach ($timeline as $e)
                        <x-nq::timeline.item :title="$t['events'][$e['type']] ?? $e['type']" :description="implode(' - ', array_filter([$e['actor'] ?? null, $e['note'] ?? null])) ?: null" :time="nq_alerts_date($e['at'])">
                            <x-slot:icon><x-dynamic-component :component="'lucide-'.($evIcon[$e['type']] ?? 'bell')" aria-hidden="true" /></x-slot:icon>
                        </x-nq::timeline.item>
                    @endforeach
                </x-nq::timeline>
            @endif
        </div>
    </div>
</li>
