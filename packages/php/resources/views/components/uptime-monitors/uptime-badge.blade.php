{{-- <x-nq::uptime-monitors.uptime-badge :percent="99.96" period="30d" />
     The uptime figure as a badge, coloured by how healthy it is: green at 99.9 and above, amber at 99 and above, red below, neutral when there is no data (null).
     The figure is truncated, never rounded up (99.996 shows 99.99%). period: shown after the figure, like "30d". Static: no Alpine needed. --}}
@props(['percent' => null, 'period' => null])
@php
    $p = $percent === null || ! is_numeric($percent) ? null : max(0.0, min(100.0, (float) $percent));
    $cut = $p === null ? null : floor($p * 100 + 1e-9) / 100;
    $figure = $cut === null ? '–' : ($cut == 100 ? '100%' : number_format($cut, 2, '.', '').'%');
    // The badge's classes, copied from badge.blade.php, so data-slot can be uptime-badge.
    $tone = $p === null ? 'border-border bg-secondary text-foreground'
        : ($p >= 99.9 ? 'border-nq-success/40 bg-nq-success-soft text-nq-success-text'
        : ($p >= 99 ? 'border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text' : 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text'));
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'uptime-badge') }}"
    {{ $attributes->except('data-slot')->cn('inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3', $tone) }}>
    <bdi dir="ltr" class="tabular-nums">{{ $figure }}</bdi>
    @if ($period)
        <span class="font-normal opacity-80">{{ $period }}</span>
    @endif
</span>
