{{-- Internal: the countdown readout, bound to the enclosing Alpine scope (nqStoreCountdown / nqStoreFlashDeals): done, showDays, d, h, m, s, label.
     Needs $parts (nq_merch_parts) and $labels (override array or null). Latin digits, always left to right. --}}
@php
    $pad = fn (int $n) => str_pad((string) $n, 2, '0', STR_PAD_LEFT);
    $box = 'inline-flex min-w-11 flex-col items-center rounded-control bg-foreground px-1.5 py-1 text-background';
@endphp
<div data-slot="store-countdown" role="timer" x-bind:aria-label="label" dir="ltr"
    x-show="!done" @if ($parts['done']) style="display: none" @endif class="inline-flex items-center gap-1.5">
    <span aria-hidden="true" x-show="showDays" @if ($parts['d'] <= 0) style="display: none" @endif class="{{ $box }}">
        <span class="text-label tabular-nums leading-none" x-text="d">{{ $parts['d'] }}</span>
        <span class="text-[10px] leading-tight opacity-80">{{ nq_merch_t('dayShort', [], $labels) }}</span>
    </span>
    <span aria-hidden="true" class="{{ $box }}">
        <span class="text-label tabular-nums leading-none" x-text="h">{{ $pad($parts['h']) }}</span>
        <span class="text-[10px] leading-tight opacity-80">{{ nq_merch_t('hourShort', [], $labels) }}</span>
    </span>
    <span aria-hidden="true" class="{{ $box }}">
        <span class="text-label tabular-nums leading-none" x-text="m">{{ $pad($parts['m']) }}</span>
        <span class="text-[10px] leading-tight opacity-80">{{ nq_merch_t('minuteShort', [], $labels) }}</span>
    </span>
    <span aria-hidden="true" class="{{ $box }}">
        <span class="text-label tabular-nums leading-none" x-text="s">{{ $pad($parts['s']) }}</span>
        <span class="text-[10px] leading-tight opacity-80">{{ nq_merch_t('secondShort', [], $labels) }}</span>
    </span>
</div>
