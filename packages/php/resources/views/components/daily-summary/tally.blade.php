{{-- <x-nq::daily-summary.tally label="Meals" total="4 meals" missing="Not synced" :rows="[['key' => 'safe', 'tone' => 'success', 'icon' => 'circle-check', 'label' => 'Safe', 'count' => 3]]"><x-slot:icon>...</x-slot:icon></x-nq::daily-summary.tally>
     A total split by kind. Each kind is a count with its own icon and word, so no kind depends on colour. Internal part of daily-summary. --}}
@props(['label' => null, 'total' => null, 'missing' => '', 'rows' => [], 'icon' => null, 'locale' => null])
@include('nasaq::components.engine-card._health')
@include('nasaq::components.daily-summary._logic')
@php $locale ??= app()->getLocale(); @endphp
<div data-slot="{{ $attributes->get('data-slot', 'daily-summary-tally') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3 rounded-card border border-border bg-card px-4 py-4 text-card-foreground') }}>
    <x-nq::daily-summary.tile :label="$label"><x-slot:icon>{{ $icon }}</x-slot:icon></x-nq::daily-summary.tile>
    <div class="text-h2 leading-tight text-foreground tabular-nums">@if ($total !== null){{ $total }}@else<span class="text-body-sm font-normal text-muted-foreground">{{ $missing }}</span>@endif</div>
    @if (count($rows) > 0)
        <ul class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-body-sm">
            @foreach ($rows as $row)
                <li>
                    <x-nq::status :tone="$row['tone']" :icon="$row['icon'] ?? null">{{ $row['label'] }} {!! nq_ds_measure($row['count'], 'level', $locale) !!}</x-nq::status>
                </li>
            @endforeach
        </ul>
    @endif
</div>
