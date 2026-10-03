{{-- <x-nq::dispatch-offer :pickup="['name' => 'Al-Quds Bakery']" :dropoff="['name' => 'Sara Odeh']" :fee-minor="1500" :expires-in="30" @nq-dispatch-offer-accept="accept()" @nq-dispatch-offer-decline="decline()" />
     An incoming job offer for a courier: a countdown ring, the pickup and drop-off, the fee and any cash to collect, Accept and Decline.
     The remaining time is also text; screen readers hear it only at the start and in the last ten seconds. When time runs out Accept is disabled.
     pickup, dropoff: ['name', 'nameAr', 'address', 'addressAr']. fee-minor: what the courier earns, in minor units (USD, SAR in Arabic when currency is omitted).
     cash-to-collect-minor (hidden when 0), distance-meters, eta-seconds, order-count (more than one shows a multi-order count).
     expires-in: seconds from page load until the offer lapses (use it in markup rendered ahead of time); expires-at: epoch milliseconds. Without either, or with mode="dispatcher", there is no countdown.
     window-seconds (30): the full window, for the ring. mode: courier | dispatcher (no countdown, "Driver earns", Cancel and "Offer to driver").
     labels: ['title' => …, 'pickup' => …, 'dropoff' => …, 'fee' => …, 'cash' => …, 'distance' => …, 'eta' => …, 'accept' => …, 'decline' => …, 'expired' => …, 'seconds' => …, 'dispatcherTitle' => …, 'dispatcherFee' => …, 'offerToDriver' => …, 'cancel' => …, 'stops' => 'N orders'].
     The default slot renders extra content under the route. Events (bubbling): nq-dispatch-offer-accept, nq-dispatch-offer-decline (also Cancel), nq-dispatch-offer-offer, nq-dispatch-offer-expire (once). Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.courier-card._delivery')
@props([
    'pickup', 'dropoff', 'feeMinor', 'cashToCollectMinor' => null, 'currency' => null, 'distanceMeters' => null, 'etaSeconds' => null, 'orderCount' => null,
    'expiresAt' => null, 'expiresIn' => null, 'mode' => 'courier', 'windowSeconds' => 30, 'locale' => null, 'labels' => [],
])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $currency ??= nq_delivery_currency($locale);
    $t = array_merge($ar ? [
        'title' => 'عرض توصيل جديد', 'pickup' => 'الاستلام', 'dropoff' => 'التسليم', 'fee' => 'ربحك', 'cash' => 'المبلغ المطلوب تحصيله', 'distance' => 'الرحلة', 'eta' => 'إلى الاستلام',
        'accept' => 'قبول', 'decline' => 'رفض', 'expired' => 'انتهى العرض', 'seconds' => 'ث', 'dispatcherTitle' => 'عرض على سائق', 'dispatcherFee' => 'يربح السائق',
        'offerToDriver' => 'عرض على السائق', 'cancel' => 'إلغاء',
    ] : [
        'title' => 'New delivery offer', 'pickup' => 'Pick up', 'dropoff' => 'Drop off', 'fee' => 'You earn', 'cash' => 'Cash to collect', 'distance' => 'Trip', 'eta' => 'To pickup',
        'accept' => 'Accept', 'decline' => 'Decline', 'expired' => 'Offer expired', 'seconds' => 's', 'dispatcherTitle' => 'Offer to a driver', 'dispatcherFee' => 'Driver earns',
        'offerToDriver' => 'Offer to driver', 'cancel' => 'Cancel',
    ], (array) $labels);
    $stops = fn (int $n): string => $labels['stops'] ?? ($ar
        ? ($n === 1 ? 'طلب واحد' : ($n === 2 ? 'طلبان' : ($n <= 10 ? $n.' طلبات' : $n.' طلبًا')))
        : ($n === 1 ? '1 order' : $n.' orders'));
    $secondsLeft = fn (int $n): string => $ar
        ? ($n === 1 ? 'بقيت ثانية واحدة للرد' : ($n === 2 ? 'بقيت ثانيتان للرد' : ($n <= 10 ? 'بقيت '.$n.' ثوانٍ للرد' : 'بقيت '.$n.' ثانية للرد')))
        : ($n === 1 ? '1 second left to answer' : $n.' seconds left to answer');
    $dispatcher = $mode === 'dispatcher';
    $timed = ! $dispatcher && ($expiresAt !== null || $expiresIn !== null);
    $left = $timed
        ? max(0, $expiresIn !== null ? (int) ceil($expiresIn) : (int) ceil(($expiresAt - now()->getTimestampMs()) / 1000))
        : $windowSeconds;
    $expired = $timed && $left === 0;
    $fraction = $timed ? ($windowSeconds <= 0 ? 0 : min(1, max(0, $left / $windowSeconds))) : 1;
    $tone = $expired ? 'neutral' : ($left <= 5 ? 'danger' : ($left <= $windowSeconds / 4 ? 'warning' : 'primary'));
    $ringTone = $tone === 'danger' ? 'warning' : $tone;
    $announce = $timed && ! $expired && ($left <= 10 || $left >= $windowSeconds - 1) ? $secondsLeft($left) : '';
    $strokes = ['primary' => 'stroke-primary', 'warning' => 'stroke-nq-warning', 'neutral' => 'stroke-muted-foreground'];
    $texts = ['primary' => 'text-primary', 'warning' => 'text-nq-warning-text', 'neutral' => 'text-muted-foreground'];
    $size = 64;
    $thickness = 6;
    $radius = ($size - $thickness) / 2;
    $circumference = 2 * M_PI * $radius;
    $pick = fn (?string $en, ?string $arabic): string => (string) ($ar ? ($arabic ?: $en) : ($en ?: $arabic));
    $places = [['kind' => 'pickup', 'place' => (array) $pickup, 'icon' => 'store'], ['kind' => 'dropoff', 'place' => (array) $dropoff, 'icon' => 'map-pin']];
    $options = array_filter([
        'expiresAt' => $expiresAt, 'expiresIn' => $expiresIn, 'windowSeconds' => $windowSeconds, 'mode' => $mode, 'locale' => str_replace('_', '-', $locale),
        'labels' => ['title' => $t['title'], 'dispatcherTitle' => $t['dispatcherTitle'], 'expired' => $t['expired']],
    ], fn ($v) => $v !== null);
    $title = $expired ? $t['expired'] : ($dispatcher ? $t['dispatcherTitle'] : $t['title']);
    $acceptClass = 'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent font-sans transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--nq-action)_88%,var(--nq-fg))] h-[calc(var(--nq-control)+8px)] px-5 text-body';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'dispatch-offer') }}" data-mode="{{ $mode }}" aria-label="{{ $dispatcher ? $t['dispatcherTitle'] : $t['title'] }}" x-data="nqDispatchOffer({!! \Illuminate\Support\Js::from($options) !!})"
    @if ($timed) x-bind:data-expired="expired ? '' : null" @if ($expired) data-expired @endif x-bind:class="{ 'opacity-80': expired }" @endif
    {{ $attributes->except('data-slot')->cn(['flex flex-col gap-4 rounded-card border border-border bg-card p-4 shadow-md sm:p-5', 'opacity-80' => $expired]) }}>
    <header class="flex items-center gap-4">
        @if ($timed)
            <div data-slot="timer-ring" aria-hidden="true" x-bind:data-tone="ringTone" data-tone="{{ $ringTone }}" class="relative inline-flex shrink-0 items-center justify-center" style="width: {{ $size }}px; height: {{ $size }}px; max-width: 100%">
                <svg aria-hidden="true" viewBox="0 0 {{ $size }} {{ $size }}" class="absolute inset-0 size-full -rotate-90">
                    <circle cx="{{ $size / 2 }}" cy="{{ $size / 2 }}" r="{{ $radius }}" fill="none" stroke-width="{{ $thickness }}" class="stroke-nq-line" />
                    <circle data-slot="timer-ring-arc" cx="{{ $size / 2 }}" cy="{{ $size / 2 }}" r="{{ $radius }}" fill="none" stroke-width="{{ $thickness }}" stroke-linecap="round"
                        stroke-dasharray="{{ $circumference }}" x-bind:stroke-dashoffset="dashoffset" stroke-dashoffset="{{ $circumference * (1 - $fraction) }}"
                        x-bind:class="{ 'stroke-primary': ringTone === 'primary', 'stroke-nq-warning': ringTone === 'warning', 'stroke-muted-foreground': ringTone === 'neutral', 'opacity-0': fraction <= 0 }"
                        class="{{ $strokes[$ringTone] }} transition-[stroke-dashoffset,stroke] duration-500 ease-linear motion-reduce:transition-none{{ $fraction <= 0 ? ' opacity-0' : '' }}" />
                </svg>
                <div class="relative flex flex-col items-center justify-center gap-1 text-center">
                    <span x-bind:class="{ 'text-primary': ringTone === 'primary', 'text-nq-warning-text': ringTone === 'warning', 'text-muted-foreground': ringTone === 'neutral' }"
                        class="text-label tabular-nums {{ $texts[$ringTone] }}">
                        <bdi x-text="left">{{ $left }}</bdi>
                        <span class="text-caption">{{ $t['seconds'] }}</span>
                    </span>
                </div>
            </div>
        @else
            <span aria-hidden="true" class="flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-foreground [&_svg]:size-5">
                <x-lucide-package />
            </span>
        @endif
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 class="text-h3 text-foreground" x-text="title">{{ $title }}</h2>
            <div class="flex flex-wrap items-center gap-x-3 text-body-sm text-muted-foreground">
                @if ($orderCount && $orderCount > 1)
                    <span class="inline-flex items-center gap-1">
                        <x-lucide-package aria-hidden="true" class="size-3.5" />
                        {{ $stops($orderCount) }}
                    </span>
                @endif
                @if ($distanceMeters !== null)
                    <span>{{ $t['distance'] }} <bdi class="tabular-nums">{{ nq_delivery_distance($distanceMeters, $locale) }}</bdi></span>
                @endif
                @if ($etaSeconds !== null)
                    <span>{{ $t['eta'] }} <bdi class="tabular-nums">{{ nq_delivery_duration($etaSeconds, $locale) }}</bdi></span>
                @endif
            </div>
        </div>
        <div class="flex flex-col items-end">
            <span class="text-caption text-muted-foreground">{{ $dispatcher ? $t['dispatcherFee'] : $t['fee'] }}</span>
            <bdi data-slot="offer-fee" class="text-h3 tabular-nums text-foreground">{{ nq_delivery_money($feeMinor, $currency, $locale) }}</bdi>
        </div>
    </header>

    <span role="status" aria-live="polite" class="sr-only" x-text="announce">{{ $announce }}</span>

    <ol role="list" class="flex flex-col gap-3">
        @foreach ($places as $s)
            @php $address = $pick($s['place']['address'] ?? null, $s['place']['addressAr'] ?? null); @endphp
            <li data-stop="{{ $s['kind'] }}" class="flex items-start gap-3">
                <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-foreground [&_svg]:size-4">
                    <x-dynamic-component :component="'lucide-'.$s['icon']" aria-hidden="true" />
                </span>
                <div class="flex min-w-0 flex-1 flex-col">
                    <span class="text-caption text-muted-foreground">{{ $s['kind'] === 'pickup' ? $t['pickup'] : $t['dropoff'] }}</span>
                    <bdi dir="auto" class="truncate text-label text-foreground">{{ $pick($s['place']['name'] ?? null, $s['place']['nameAr'] ?? null) }}</bdi>
                    @if ($address !== '')
                        <bdi dir="auto" class="text-body-sm text-muted-foreground">{{ $address }}</bdi>
                    @endif
                </div>
            </li>
        @endforeach
    </ol>

    @if ($cashToCollectMinor)
        <p data-slot="offer-cash" class="flex items-center gap-2 rounded-control border border-nq-warning/40 bg-nq-warning-soft px-3 py-2 text-body-sm text-nq-warning-text">
            <x-lucide-hand-coins aria-hidden="true" class="size-4 shrink-0" />
            <span>{{ $t['cash'] }}</span>
            <bdi class="ms-auto font-medium tabular-nums">{{ nq_delivery_money($cashToCollectMinor, $currency, $locale) }}</bdi>
        </p>
    @endif

    {{ $slot }}

    <footer class="grid grid-cols-2 gap-2">
        <x-nq::button type="button" variant="secondary" size="lg" x-on:click="decline()">
            <x-lucide-x aria-hidden="true" />
            {{ $dispatcher ? $t['cancel'] : $t['decline'] }}
        </x-nq::button>
        @if ($dispatcher)
            <x-nq::button type="button" variant="primary" size="lg" x-on:click="offer()">
                <x-lucide-send aria-hidden="true" />
                {{ $t['offerToDriver'] }}
            </x-nq::button>
        @elseif ($timed)
            {{-- Written out like <x-nq::button variant="primary" size="lg">: the button component prints disabled before the attributes, and Alpine ignores a bound attribute that follows a static one. --}}
            <button data-slot="button" type="button" x-bind:disabled="expired ? '' : null" x-bind:data-disabled="expired ? '' : null" @if ($expired) disabled data-disabled @endif x-on:click="accept()" class="{{ $acceptClass }}">
                <x-lucide-check aria-hidden="true" />
                {{ $t['accept'] }}
            </button>
        @else
            <x-nq::button type="button" variant="primary" size="lg" x-on:click="accept()">
                <x-lucide-check aria-hidden="true" />
                {{ $t['accept'] }}
            </x-nq::button>
        @endif
    </footer>
</section>
