{{-- <x-nq::business-reports.employee-kpi-dashboard measure="Billable hours" :employees="[['id' => 'e1', 'name' => 'Sara', 'role' => 'Designer', 'target' => 140, 'actual' => 152]]" :actions="[['id' => 'open', 'label' => 'Open profile', 'icon' => 'user']]" />
     One card per person: a ring for how much of the target is reached, the figures, a trend and a status word (Ahead, On track, Behind), with a team summary above. Cards fill the width and reflow to one column on a phone.
     employees: id, name, role, avatarSrc, target, actual, optional metrics ([['id', 'label', 'value', 'format']]), trend (actual per period, oldest first) and delta (a fraction). format: the figures' format (style, currency, compact, minFraction, maxFraction).
     measure: what the target measures ("Billable hours"), shown in the summary. on-track-at: fraction counted as on track (0.8).
     actions: the card menu, the same for every card ([['id' => 'open', 'label' => 'Open', 'icon' => 'user', 'danger' => false, 'group' => null, 'disabled' => false]]); it opens on right-click, long press, Shift+F10 or the ⋯ button
     and dispatches the bubbling "nq-employee-action" ({ action, id }). loading, labels: array overriding the built-in words. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.business-reports._logic')
@props(['employees' => [], 'format' => [], 'measure' => null, 'onTrackAt' => 0.8, 'actions' => [], 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_br_words($locale, $labels);
    $list = array_values($employees);
    $actions = array_values($actions);
    $target = array_sum(array_column($list, 'target'));
    $actual = array_sum(array_column($list, 'actual'));
    $rows = array_map(function ($e) use ($onTrackAt) {
        $f = nq_br_attainment($e['actual'], $e['target']);

        return ['e' => $e, 'fraction' => $f, 'status' => nq_br_status($f, (float) $onTrackAt)];
    }, $list);
    $ahead = count(array_filter($rows, fn ($r) => $r['status'] === 'ahead'));
    $behind = count(array_filter($rows, fn ($r) => $r['status'] === 'behind'));
    $pct = fn ($f) => nq_br_number($f, ['style' => 'percent', 'maxFraction' => 0], $locale);
    $num = fn ($v, $f = []) => nq_br_number($v, $f ?: $format, $locale);
    $tone = ['ahead' => 'success', 'on-track' => 'default', 'behind' => 'warning'];
    $variant = ['ahead' => 'success', 'on-track' => 'info', 'behind' => 'warning'];
    $cardClass = 'h-full w-full';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'employee-kpi-dashboard') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <x-nq::stat-card.grid>
        <x-nq::stat-card :label="$measure ? $t['kpiTeam'].': '.$measure : $t['kpiTeam']" :value="nq_br_attainment($actual, $target)" :format="['style' => 'percent', 'maxFraction' => 0]" :loading="$loading" :locale="$locale" />
        <x-nq::stat-card :label="$t['kpiAhead']" :value="$ahead" :loading="$loading" :locale="$locale" />
        <x-nq::stat-card :label="$t['kpiBehind']" :value="$behind" :loading="$loading" :locale="$locale" />
    </x-nq::stat-card.grid>
    @if (! $loading && ! $list)
        <p class="text-body text-muted-foreground">{{ $t['empty'] }}</p>
    @endif
    <div role="list" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        @foreach ($rows as ['e' => $e, 'fraction' => $fraction, 'status' => $status])
            <x-nq::context-menu>
                <x-nq::context-menu.trigger role="listitem" data-slot="kpi-employee" class="min-w-0">
                    <x-nq::card :class="$cardClass">
                        <x-nq::card.header class="flex flex-row items-center gap-3">
                            <x-nq::avatar :name="$e['name']" :src="$e['avatarSrc'] ?? null" size="lg" />
                            <div class="min-w-0 flex-1">
                                <x-nq::card.title class="truncate">{{ $e['name'] }}</x-nq::card.title>
                                @if (! empty($e['role']))<p class="truncate text-caption text-muted-foreground">{{ $e['role'] }}</p>@endif
                            </div>
                            @if ($actions)
                                <x-nq::button variant="ghost" size="icon-sm" :aria-label="sprintf($t['moreFor'], $e['name'])" x-on:click="show(true)">
                                    <x-lucide-ellipsis aria-hidden="true" />
                                </x-nq::button>
                            @endif
                        </x-nq::card.header>
                        <x-nq::card.content class="flex flex-col gap-3">
                            <div class="flex items-center gap-4">
                                <x-nq::chart-extras.progress-ring :value="min($fraction, 1) * 100" :tone="$tone[$status]" :size="84" :label="sprintf($t['attainment'], $e['name'], $pct($fraction))" :value-text="$pct($fraction)" :locale="$locale" />
                                <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                                    <x-nq::badge :variant="$variant[$status]" class="w-fit">
                                        @if ($status === 'behind')<x-lucide-triangle-alert aria-hidden="true" />@else<x-lucide-circle-check aria-hidden="true" />@endif
                                        {{ $t['kpiStatus'][$status] }}
                                    </x-nq::badge>
                                    <p class="text-body">
                                        <bdi data-slot="num" data-numeric class="tabular-nums">{{ $num($e['actual']) }}</bdi>
                                        <span class="text-muted-foreground"> / </span>
                                        <bdi data-slot="num" data-numeric class="tabular-nums">{{ $num($e['target']) }}</bdi>
                                    </p>
                                    @if (! empty($e['trend']))
                                        <x-nq::chart-extras.trend-cell :data="$e['trend']" variant="bar" :highlight="count($e['trend']) - 1" :delta="$e['delta'] ?? null" :chart-label="$t['trend'].': '.$e['name']" :locale="$locale" />
                                    @endif
                                </div>
                            </div>
                            @if (! empty($e['metrics']))
                                <dl class="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3 text-caption">
                                    @foreach ($e['metrics'] as $m)
                                        <div class="flex items-baseline justify-between gap-2">
                                            <dt class="truncate text-muted-foreground">{{ $m['label'] }}</dt>
                                            <dd class="font-medium"><bdi data-slot="num" data-numeric class="tabular-nums">{{ $num($m['value'], $m['format'] ?? []) }}</bdi></dd>
                                        </div>
                                    @endforeach
                                </dl>
                            @endif
                        </x-nq::card.content>
                    </x-nq::card>
                </x-nq::context-menu.trigger>
                @if ($actions)
                    <x-nq::context-menu.content class="min-w-44">
                        @foreach ($actions as $k => $a)
                            @if ($k > 0 && ($a['group'] ?? null) !== ($actions[$k - 1]['group'] ?? null))
                                <x-nq::context-menu.separator />
                            @endif
                            <x-nq::context-menu.item :variant="! empty($a['danger']) ? 'danger' : 'default'" :disabled="! empty($a['disabled'])"
                                x-on:click="$refs.trigger.dispatchEvent(new CustomEvent(`nq-employee-action`, { bubbles: true, detail: { action: `{{ $a['id'] }}`, id: `{{ $e['id'] }}` } }))">
                                @if (! empty($a['icon']))<x-dynamic-component :component="'lucide-'.$a['icon']" aria-hidden="true" />@endif
                                {{ $a['label'] }}
                            </x-nq::context-menu.item>
                        @endforeach
                    </x-nq::context-menu.content>
                @endif
            </x-nq::context-menu>
        @endforeach
    </div>
</section>
