{{-- Internal part of <x-nq::ws-status>: the signal bars and the latency number. Needs the nqWsStatus scope around it. --}}
@props(['ms' => null, 'show' => false])
@php
    $quality = $ms === null ? 'good' : ($ms <= 150 ? 'good' : ($ms <= 400 ? 'fair' : 'poor'));
    $lit = $ms === null ? 0 : ['good' => 3, 'fair' => 2, 'poor' => 1][$quality];
    $tone = ['good' => 'bg-nq-success', 'fair' => 'bg-nq-warning', 'poor' => 'bg-nq-danger'][$quality];
    $text = $ms === null ? '-' : ($ms < 1000 ? round($ms).' ms' : preg_replace('/\.0$/', '', number_format($ms / 1000, 1, '.', '')).' s');
    $word = ['good' => ['Fast', 'سريع'], 'fair' => ['Fair', 'متوسط'], 'poor' => ['Slow', 'بطيء']][$quality];
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'ws-latency') }}" x-show="hasLatency()" x-cloak @unless ($show) style="display: none" @endunless
    :title="latencyTitle()" title="{{ \Nasaq\Nasaq::t('Latency', 'زمن الاستجابة') }}: {{ \Nasaq\Nasaq::t($word[0], $word[1]) }}"
    {{ $attributes->except('data-slot')->cn('inline-flex items-center gap-1.5') }}>
    <span aria-hidden="true" data-slot="ws-signal" class="inline-flex h-3 items-end gap-0.5">
        @foreach ([1, 2, 3] as $n)
            <span :class="barClass({{ $n }})" class="w-0.5 rounded-full {{ $n <= $lit ? $tone : 'bg-nq-line-strong' }}" style="height: {{ $n * 4 }}px"></span>
        @endforeach
    </span>
    <bdi dir="ltr" class="tabular-nums" x-text="latencyText()">{{ $text }}</bdi>
</span>
