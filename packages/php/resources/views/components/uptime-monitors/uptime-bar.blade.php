{{-- <x-nq::uptime-monitors.uptime-bar :checks="['up', 'up', 'degraded', 'down', 'none']" />
     A strip of thin segments, one per check, oldest first. It reads right to left in RTL. checks: up | degraded | down | none (no check). label: the spoken summary (default: how many of the checks were up).
     Static: no Alpine needed. --}}
@props(['checks' => [], 'label' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $list = array_values((array) $checks);
    $measured = array_filter($list, fn ($c) => $c !== 'none');
    $up = count(array_filter($measured, fn ($c) => $c !== 'down'));
    $total = count($measured);
    $names = ['up' => $t::t('Up', 'يعمل'), 'degraded' => $t::t('Slow', 'بطيء'), 'down' => $t::t('Down', 'متوقف'), 'none' => $t::t('No check', 'لا فحص')];
    $segment = ['up' => 'bg-nq-success', 'degraded' => 'bg-nq-warning', 'down' => 'bg-nq-danger', 'none' => 'bg-border'];
    $summary = $label ?? $t::t("{$up} of {$total} recent checks were up", "{$up} من {$total} فحوص حديثة كانت ناجحة");
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'uptime-bar') }}" role="img" aria-label="{{ $summary }}"
    {{ $attributes->except('data-slot')->cn('flex h-6 min-w-24 items-stretch gap-px') }}>
    @foreach ($list as $c)
        <span title="{{ $names[$c] ?? $names['none'] }}" class="min-w-px flex-1 rounded-[1px] {{ $segment[$c] ?? $segment['none'] }}"></span>
    @endforeach
</div>
