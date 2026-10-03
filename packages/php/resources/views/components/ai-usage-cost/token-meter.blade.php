{{-- <x-nq::ai-usage-cost.token-meter :tokens-in="182000" :tokens-out="24000" :cached="120000" :cost="1.42" :budget="2" />
     One run's tokens split into input, cached and output, with an optional spend meter against its budget (cost and budget both given; budget null is unlimited).
     cached is part of tokens-in. currency: ISO code (USD, or SAR in Arabic). labels: array overriding the built-in words. Static: no Alpine needed. --}}
@include('nasaq::components.ai-usage-cost._logic')
@props(['tokensIn' => 0, 'tokensOut' => 0, 'cached' => 0, 'cost' => null, 'budget' => false, 'currency' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_auc_words($locale, $labels);
    $split = nq_auc_split($tokensIn, $tokensOut, $cached);
    $n = fn ($v) => nq_auc_fmt($v, $locale);
    $parts = [
        ['key' => 'input', 'label' => $t['input'], 'value' => $tokensIn - min($cached, $tokensIn), 'share' => $split['input'], 'color' => 'var(--primary)'],
        ['key' => 'cached', 'label' => $t['cached'], 'value' => min($cached, $tokensIn), 'share' => $split['cached'], 'color' => 'var(--nq-info)'],
        ['key' => 'output', 'label' => $t['output'], 'value' => $tokensOut, 'share' => $split['output'], 'color' => 'var(--nq-warning)'],
    ];
    $summary = implode(', ', array_map(fn ($p) => $p['label'].' '.$n($p['value']), $parts));
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'token-cost-meter') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <div class="flex items-baseline justify-between gap-3 text-body-sm">
        <span class="text-label text-foreground">{{ $t['tokenSplit'] }}</span>
        <bdi class="text-muted-foreground tabular-nums">{{ sprintf($t['tokenTotal'], $n($tokensIn + $tokensOut)) }}</bdi>
    </div>
    <div role="img" aria-label="{{ $summary }}" class="flex h-2 overflow-hidden rounded-full bg-nq-surface-soft" dir="ltr">
        @foreach ($parts as $p)
            @if ($p['share'] > 0)<span class="h-full" style="width: {{ round($p['share'] * 100, 4) }}%; background: {{ $p['color'] }}"></span>@endif
        @endforeach
    </div>
    <ul class="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
        @foreach ($parts as $p)
            <li class="flex items-center gap-1.5">
                <span aria-hidden="true" class="size-2 rounded-full" style="background: {{ $p['color'] }}"></span>
                {{ $p['label'] }}
                <bdi class="text-foreground tabular-nums">{{ $n($p['value']) }}</bdi>
            </li>
        @endforeach
    </ul>
    @if ($budget !== false && $cost !== null)
        <x-nq::usage-meter :label="$t['budget']" :used="$cost" :limit="$budget" kind="money" :currency="$currency" size="sm" :locale="$locale" />
    @endif
</div>
