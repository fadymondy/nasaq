@php
    [$mvDir, $mvBy] = nq_gm_movement((int) $rank, isset($previousRank) ? (int) $previousRank : null);
    $mvText = $mvDir === 'up' ? nq_gm_say($t, 'movedUp', nq_gm_num($mvBy, $locale)) : ($mvDir === 'down' ? nq_gm_say($t, 'movedDown', nq_gm_num($mvBy, $locale)) : $t['same']);
@endphp
@if ($mvDir === 'new')
    <x-nq::badge variant="info">{{ $t['isNew'] }}</x-nq::badge>
@else
    <span data-movement="{{ $mvDir }}" class="inline-flex items-center gap-0.5 text-caption tabular-nums {{ $mvDir === 'up' ? 'text-nq-success-text' : ($mvDir === 'down' ? 'text-nq-danger-text' : 'text-muted-foreground') }}">
        @if ($mvDir === 'up')<x-lucide-arrow-up aria-hidden="true" class="size-3.5" />@elseif ($mvDir === 'down')<x-lucide-arrow-down aria-hidden="true" class="size-3.5" />@else<x-lucide-minus aria-hidden="true" class="size-3.5" />@endif
        @if ($mvDir !== 'same')<span aria-hidden="true">{{ nq_gm_num($mvBy, $locale) }}</span>@endif
        <span class="sr-only">{{ $mvText }}</span>
    </span>
@endif
