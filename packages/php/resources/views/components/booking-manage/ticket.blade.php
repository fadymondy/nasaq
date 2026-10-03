{{-- <x-nq::booking-manage.ticket :booking="['id' => 'b1', 'code' => 'NQ-4821', 'status' => 'confirmed', 'start' => '2030-01-05T10:00:00Z', 'end' => '2030-01-05T10:30:00Z', 'service' => 'Check-up', 'provider' => 'Dr. Omar', 'patient' => 'Huda', 'price' => 60, 'payment' => 'visit']" />
     The confirmed booking as a ticket: what, when, who and where, a QR code that the kiosk and reception can scan (it holds "booking:CODE"),
     the code in text, and add-to-calendar (a .ics download and a Google Calendar link, both made on the server).
     booking: ['id', 'code', 'status', 'start', 'end' (ISO strings), 'service', 'provider', 'location'?, 'address'?, 'patient', 'phone'?, 'price', 'currency'?, 'payment' (online|visit), 'paid'?].
     hide-calendar: leave the calendar buttons out. labels: override any string. The default slot adds actions to the footer.
     <x-slot:badge> replaces the status badge. calendar-show: an Alpine expression that shows or hides the calendar buttons (used by booking-manage).
     The QR needs the Alpine runtime (@nasaqScripts). --}}
@props(['booking', 'hideCalendar' => false, 'labels' => [], 'calendarShow' => null, 'badge' => null, 'locale' => null])
@include('nasaq::components.booking-manage._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_bm_words($locale, (array) $labels);
    $b = (array) $booking;
    $event = nq_bm_event($b);
    $ics = 'data:text/calendar;charset=utf-8,'.rawurlencode(nq_bm_ics($event, now()));
    $price = ($b['price'] ?? 0) > 0 ? \Nasaq\Nasaq::money($b['price'], $b['currency'] ?? null, $locale) : null;
    $payLabel = ($b['payment'] ?? 'visit') === 'visit' ? $t['payVisit'] : (! empty($b['paid']) ? $t['payOnline'] : $t['payOnlinePending']);
    $hasFooter = ! ($hideCalendar && $slot->isEmpty());
    $hasBadge = $badge && ! $badge->isEmpty();
@endphp
<x-nq::card data-slot="{{ $attributes->get('data-slot', 'booking-ticket') }}" :data-status="$attributes->has('x-bind:data-status') ? null : ($b['status'] ?? null)" {{ $attributes->except('data-slot')->cn('w-full') }}>
    <x-nq::card.header>
        <x-nq::card.title as="h3">{{ $b['service'] }}</x-nq::card.title>
        <x-nq::card.description>
            @if ($hasBadge)
                {{ $badge }}
            @else
                <x-nq::booking-pipeline.status-badge :status="$b['status'] ?? 'requested'" />
            @endif
        </x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="grid gap-5 sm:grid-cols-[1fr_auto]">
        <dl class="m-0 grid gap-3">
            <div class="flex items-start gap-3">
                <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><x-lucide-calendar-clock /></span>
                <div class="flex min-w-0 flex-col">
                    <dt class="text-caption text-muted-foreground">{{ $t['when'] }}</dt>
                    <dd class="m-0 text-body-sm text-foreground"><bdi>{{ nq_bm_format($b['start'], $locale, 'day') }}</bdi><br><bdi class="tabular-nums">{{ nq_bm_format($b['start'], $locale, 'time') }} – {{ nq_bm_format($b['end'], $locale, 'time') }}</bdi></dd>
                </div>
            </div>
            <div class="flex items-start gap-3">
                <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><x-lucide-stethoscope /></span>
                <div class="flex min-w-0 flex-col">
                    <dt class="text-caption text-muted-foreground">{{ $t['provider'] }}</dt>
                    <dd class="m-0 text-body-sm text-foreground">{{ $b['provider'] }}</dd>
                </div>
            </div>
            @if (! empty($b['location']))
                <div class="flex items-start gap-3">
                    <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><x-lucide-map-pin /></span>
                    <div class="flex min-w-0 flex-col">
                        <dt class="text-caption text-muted-foreground">{{ $t['where'] }}</dt>
                        <dd class="m-0 text-body-sm text-foreground">{{ $b['location'] }}@if (! empty($b['address']))<span class="block text-muted-foreground">{{ $b['address'] }}</span>@endif</dd>
                    </div>
                </div>
            @endif
            <div class="flex items-start gap-3">
                <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><x-lucide-user /></span>
                <div class="flex min-w-0 flex-col">
                    <dt class="text-caption text-muted-foreground">{{ $t['who'] }}</dt>
                    <dd class="m-0 text-body-sm text-foreground">{{ $b['patient'] }}</dd>
                </div>
            </div>
            @if (! empty($b['phone']))
                <div class="flex items-start gap-3">
                    <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><x-lucide-phone /></span>
                    <div class="flex min-w-0 flex-col">
                        <dt class="text-caption text-muted-foreground">{{ $t['phone'] }}</dt>
                        <dd class="m-0 text-body-sm text-foreground"><bdi dir="ltr">{{ $b['phone'] }}</bdi></dd>
                    </div>
                </div>
            @endif
            <div class="flex items-start gap-3">
                <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><x-lucide-wallet /></span>
                <div class="flex min-w-0 flex-col">
                    <dt class="text-caption text-muted-foreground">{{ $t['payment'] }}</dt>
                    <dd class="m-0 text-body-sm text-foreground">{{ $payLabel }}@if ($price) · <bdi>{{ $price }}</bdi>@endif</dd>
                </div>
            </div>
        </dl>
        <div class="flex flex-col items-center gap-2 rounded-card border border-nq-line p-3">
            <x-nq::qr-code :value="nq_bm_ticket_value($b['code'])" :size="132" :label="nq_bm_fill($t['qrLabel'], $b['code'])" />
            <div class="flex flex-col items-center">
                <span class="text-caption text-muted-foreground">{{ $t['code'] }}</span>
                <bdi dir="ltr" class="font-mono text-label tracking-wider">{{ $b['code'] }}</bdi>
            </div>
            <p class="max-w-40 text-center text-caption text-muted-foreground">{{ $t['scan'] }}</p>
        </div>
    </x-nq::card.content>
    @if ($hasFooter)
        <x-nq::card.footer class="flex-wrap">
            @unless ($hideCalendar)
                <span data-slot="booking-ticket-calendar" class="contents" @if ($calendarShow) x-show="{{ $calendarShow }}" @endif>
                    <x-nq::button variant="secondary" size="sm" :href="$ics" download="{{ $b['code'] }}.ics"><x-lucide-download aria-hidden="true" />{{ $t['downloadIcs'] }}</x-nq::button>
                    <x-nq::button variant="secondary" size="sm" :href="nq_bm_google_url($event)" target="_blank" rel="noreferrer"><x-lucide-calendar-plus aria-hidden="true" />{{ $t['google'] }}</x-nq::button>
                </span>
            @endunless
            {{ $slot }}
        </x-nq::card.footer>
    @endif
</x-nq::card>
