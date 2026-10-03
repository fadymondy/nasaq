{{-- <x-nq::store-merch.countdown :ends-at="now()->addHours(5)->getTimestamp() * 1000" />
     A ticking deadline readout (days, hours, minutes, seconds). Screen readers get the time left once a minute, not every second.
     When the time is up it shows a plain "ended" message and fires nq-expire once.
     ends-at: epoch milliseconds (or a DateTimeInterface / date string). now: fixed epoch ms for stories (the readout then does not tick).
     server-clock: count against the server's clock instead of the visitor's (default false; a cached page would otherwise run late).
     labels: array of string overrides (keys as the React kit).
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-merch._strings')
@props(['endsAt', 'now' => null, 'serverClock' => false, 'labels' => null])
@php
    $end = $endsAt instanceof \DateTimeInterface ? $endsAt->getTimestamp() * 1000 : (is_numeric($endsAt) ? (float) $endsAt : strtotime((string) $endsAt) * 1000);
    $clock = $now !== null ? (float) $now : nq_merch_now();
    $parts = nq_merch_parts($end, $clock);
    $config = ['endsAt' => $end, 'now' => $now !== null ? (float) $now : null, 'serverNow' => $serverClock ? $clock : null, 'labels' => [
        'timeLeft' => nq_merch_t('timeLeft', ['time' => '{time}'], $labels),
        'days' => nq_merch_t('days', [], $labels), 'hours' => nq_merch_t('hours', [], $labels), 'minutes' => nq_merch_t('minutes', [], $labels),
    ]];
@endphp
<span class="contents" x-data="nqStoreCountdown(@js($config))">
    @include('nasaq::components.store-merch._readout')
    <span x-show="done" @if (! $parts['done']) style="display: none" @endif {{ $attributes->cn('text-body-sm text-muted-foreground') }}>{{ nq_merch_t('dealEnded', [], $labels) }}</span>
</span>
