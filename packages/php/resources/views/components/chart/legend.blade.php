{{-- <x-nq::chart.legend :config="$config" :payload="[['dataKey' => 'revenue', 'color' => 'var(--color-revenue)']]" />
     Legend row: a colour key and the series label from config. payload: items with dataKey (or value) and color (or payload.fill). --}}
@props(['config' => [], 'payload' => []])
@if (count($payload))
    <ul data-slot="{{ $attributes->get('data-slot', 'chart-legend') }}" {{ $attributes->except('data-slot')->cn('flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3 text-caption') }}>
        @foreach ($payload as $item)
            @php
                $key = (string) ($item['dataKey'] ?? $item['value'] ?? '');
                $series = $config[$key] ?? $config[(string) ($item['value'] ?? '')] ?? null;
                $color = $item['payload']['fill'] ?? $item['color'] ?? null;
            @endphp
            <li class="flex items-center gap-1.5 text-muted-foreground">
                <span aria-hidden="true" class="size-2.5 shrink-0 rounded-[2px]" @if ($color) style="background-color: {{ $color }}" @endif></span>
                {{ $series['label'] ?? ($item['value'] ?? '') }}
            </li>
        @endforeach
    </ul>
@endif
