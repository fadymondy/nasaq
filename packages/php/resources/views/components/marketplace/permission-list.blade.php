{{-- <x-nq::marketplace.permission-list :permissions="[['id' => 'read', 'label' => 'Read projects', 'description' => '…', 'risk' => 'low']]" />
     What an extension asks to do, most sensitive first. Risk is spelled out, never colour alone. risk: low (default) | medium | high.
     labels: overrides for the built-in strings. --}}
@props(['permissions' => [], 'labels' => []])
@include('nasaq::components.marketplace._strings')
@php
    $t = nq_marketplace_labels((array) $labels);
    $rank = ['low' => 0, 'medium' => 1, 'high' => 2];
    $sorted = array_values((array) $permissions);
    usort($sorted, fn ($a, $b) => $rank[$b['risk'] ?? 'low'] <=> $rank[$a['risk'] ?? 'low']);
@endphp
@if (count($sorted) === 0)
    <p {{ $attributes->cn('text-body-sm text-muted-foreground') }}>{{ $t['noPermissions'] }}</p>
@else
    <ul data-slot="{{ $attributes->get('data-slot', 'permission-list') }}" {{ $attributes->except('data-slot')->cn('flex flex-col divide-y divide-border rounded-card border border-border bg-card') }}>
        @foreach ($sorted as $p)
            @php $risk = $p['risk'] ?? 'low'; @endphp
            <li data-risk="{{ $risk }}" class="flex items-start gap-3 px-3 py-2.5">
                @if ($risk === 'high')<x-lucide-shield-alert aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                @elseif ($risk === 'medium')<x-lucide-shield-check aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                @else<x-lucide-lock aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />@endif
                <div class="min-w-0 flex-1">
                    <p dir="auto" class="text-body-sm text-foreground">{{ $p['label'] }}</p>
                    @if (! empty($p['description']))<p dir="auto" class="text-caption text-muted-foreground">{{ $p['description'] }}</p>@endif
                </div>
                <x-nq::badge :variant="nq_marketplace_risk_tone($risk)" class="shrink-0">{{ $t['risk'][$risk] }}</x-nq::badge>
            </li>
        @endforeach
    </ul>
@endif
