{{-- <x-nq::store-order-timeline status="shipped" payment="paid" placed-at="2026-09-20T10:00:00Z" :events="$order->events" :tracking="['carrier' => 'Aramex', 'number' => 'AB123']" tracking-template="https://track.example.com/?n={number}" />
     The order timeline the customer account and the store admin share. variant: tracking (five steps with times and a carrier link, default) | activity (event log, newest first).
     status: pending | paid | processing | partially-fulfilled | fulfilled | shipped | out-for-delivery | delivered | cancelled | refunded | partially-refunded | returned
     payment: pending | authorized | paid | partially-refunded | refunded | failed | cod (cod relabels "paid" as "confirmed").
     events: [['at' => ISO time, 'kind' => 'placed', 'label' => 'Order placed', 'by' => ?, 'note' => ?], ...]. tracking: carrier, number, url?.
     activity + add-note shows the note composer; it dispatches a bubbling "nq-add-note" event with { note }. labels: array overriding the built-in words. --}}
@include('nasaq::components.store-order-timeline._model')
@props(['variant' => 'tracking', 'status', 'payment' => null, 'placedAt' => null, 'events' => [], 'tracking' => null, 'trackingTemplate' => null, 'addNote' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? [
        'tracking' => 'تقدّم الطلب', 'placed' => 'تم إنشاء الطلب', 'paid' => 'تأكيد الدفع', 'confirmed' => 'تأكيد الطلب', 'shipped' => 'تم الشحن',
        'out-for-delivery' => 'في الطريق إليك', 'delivered' => 'تم التسليم', 'done' => 'تمّ', 'current' => 'جارٍ الآن', 'upcoming' => 'التالي', 'skipped' => 'لم يحدث',
        'partlyShipped' => 'تم شحن جزء من هذا الطلب', 'cancelled' => 'تم إلغاء الطلب', 'refunded' => 'تم استرداد الطلب', 'returned' => 'تم إرجاع الطلب',
        'partially-refunded' => 'استرداد جزئي', 'trackShipment' => 'تتبّع الشحنة', 'carrier' => 'شركة الشحن', 'trackingNumber' => 'رقم التتبع', 'activity' => 'النشاط',
        'noActivity' => 'لم يحدث شيء لهذا الطلب بعد.', 'addNote' => 'أضف ملاحظة', 'notePlaceholder' => 'الملاحظات يراها فريقك فقط.', 'saveNote' => 'إضافة ملاحظة',
        'internal' => 'داخلية', 'by' => 'بواسطة', 'cod' => 'ادفع للمندوب عند الوصول',
    ] : [
        'tracking' => 'Order progress', 'placed' => 'Order placed', 'paid' => 'Payment confirmed', 'confirmed' => 'Order confirmed', 'shipped' => 'Shipped',
        'out-for-delivery' => 'Out for delivery', 'delivered' => 'Delivered', 'done' => 'Done', 'current' => 'In progress', 'upcoming' => 'Next', 'skipped' => 'Did not happen',
        'partlyShipped' => 'Part of this order has shipped', 'cancelled' => 'Order cancelled', 'refunded' => 'Order refunded', 'returned' => 'Order returned',
        'partially-refunded' => 'Partly refunded', 'trackShipment' => 'Track shipment', 'carrier' => 'Carrier', 'trackingNumber' => 'Tracking number', 'activity' => 'Activity',
        'noActivity' => 'Nothing has happened to this order yet.', 'addNote' => 'Add a note', 'notePlaceholder' => 'Only your team can see notes.', 'saveNote' => 'Add note',
        'internal' => 'Internal', 'by' => 'by', 'cod' => 'Pay the courier when it arrives',
    ], $labels);
@endphp
@if ($variant === 'activity')
    @php
        $sorted = nq_store_events_newest_first($events);
        $kindIcon = ['placed' => 'shopping-bag', 'payment' => 'circle-dollar-sign', 'shipment' => 'truck', 'delivery' => 'package-check', 'refund' => 'undo-2', 'cancel' => 'ban', 'note' => 'sticky-note', 'other' => 'check'];
    @endphp
    <section data-slot="store-order-timeline" data-variant="activity" aria-label="{{ $t['activity'] }}" {{ $attributes->cn('flex flex-col gap-4') }}>
        @if ($addNote)
            <form class="flex flex-col gap-2" x-data="nqStoreOrderTimeline" x-on:submit.prevent="submit()">
                <x-nq::field.textarea aria-label="{{ $t['addNote'] }}" placeholder="{{ $t['notePlaceholder'] }}" rows="2" x-model="note" />
                <x-nq::button type="submit" size="sm" variant="secondary" class="self-end" x-bind:disabled="! canSubmit" x-bind:data-disabled="! canSubmit">{{ $t['saveNote'] }}</x-nq::button>
            </form>
        @endif
        @if (count($sorted) === 0)
            <p class="text-body-sm text-muted-foreground">{{ $t['noActivity'] }}</p>
        @else
            <x-nq::timeline>
                @foreach ($sorted as $event)
                    <x-nq::timeline.item :time="$event['at']" :description="$event['note'] ?? (($event['by'] ?? null) ? $t['by'].' '.$event['by'] : null)">
                        <x-slot:icon><x-dynamic-component :component="'lucide-'.$kindIcon[nq_store_activity_kind($event['kind'])]" aria-hidden="true" /></x-slot:icon>
                        <x-slot:title>
                            <span class="inline-flex flex-wrap items-center gap-2">
                                {{ $event['label'] }}
                                @if ($event['kind'] === 'note')<x-nq::badge variant="neutral">{{ $t['internal'] }}</x-nq::badge>@endif
                            </span>
                        </x-slot:title>
                    </x-nq::timeline.item>
                @endforeach
            </x-nq::timeline>
        @endif
    </section>
@else
    @php
        $model = nq_store_tracking_model(['status' => $status, 'payment' => $payment, 'placedAt' => $placedAt, 'events' => $events, 'hasTracking' => (bool) $tracking]);
        $url = nq_store_tracking_url($tracking, $trackingTemplate);
        $cod = $payment === 'cod';
        $bar = ['done' => 'border-primary', 'current' => 'border-primary/50', 'upcoming' => 'border-border', 'skipped' => 'border-dashed border-border'];
        $stepIcon = ['placed' => 'shopping-bag', 'paid' => 'circle-dollar-sign', 'shipped' => 'package-open', 'out-for-delivery' => 'truck', 'delivered' => 'package-check'];
        // Carbon names the zone of "…Z" strings "Z", which IntlDateFormatter rejects: hand date-time a UTC date instead.
        $when = function (?string $at) {
            if (! $at) {
                return null;
            }
            $d = \Carbon\Carbon::parse($at);

            return $d->getTimezone()->getName() === 'Z' ? $d->setTimezone('UTC') : $d;
        };
    @endphp
    <section data-slot="store-order-timeline" data-variant="tracking" aria-label="{{ $t['tracking'] }}" {{ $attributes->cn('flex flex-col gap-4') }}>
        @if ($model['terminal'])
            <div class="flex flex-wrap items-center gap-2 rounded-card border border-border bg-secondary px-3 py-2 text-body-sm text-foreground">
                @if ($model['terminal']['kind'] === 'cancelled')
                    <x-lucide-ban aria-hidden="true" class="size-4 text-muted-foreground" />
                @else
                    <x-lucide-undo-2 aria-hidden="true" class="size-4 text-muted-foreground" />
                @endif
                <span class="font-medium">{{ $t[$model['terminal']['kind']] }}</span>
                @if ($model['terminal']['at'])
                    <x-nq::numeric.date-time :value="$when($model['terminal']['at'])" date-style="medium" class="text-muted-foreground" />
                @endif
            </div>
        @endif
        @if ($model['partial'])
            <x-nq::badge variant="info" class="w-fit">{{ $t['partlyShipped'] }}</x-nq::badge>
        @endif
        <ol class="m-0 grid list-none gap-3 p-0 sm:grid-cols-5" aria-label="{{ $t['tracking'] }}" data-percent="{{ $model['percent'] }}">
            @foreach ($model['steps'] as $step)
                @php $paidCod = $step['key'] === 'paid' && $cod; @endphp
                <li data-state="{{ $step['state'] }}" @if ($step['state'] === 'current') aria-current="step" @endif
                    class="{{ \Nasaq\Cn::merge('flex min-w-0 flex-col gap-1 border-s-4 ps-3 sm:border-s-0 sm:border-t-4 sm:ps-0 sm:pt-3', $bar[$step['state']]) }}">
                    <span class="{{ \Nasaq\Cn::merge('flex items-center gap-1.5 text-body-sm font-medium', in_array($step['state'], ['upcoming', 'skipped'], true) ? 'text-muted-foreground' : 'text-foreground') }}">
                        @if ($step['state'] === 'done')
                            <x-lucide-check aria-hidden="true" class="size-4 text-primary" />
                        @else
                            <x-dynamic-component :component="'lucide-'.($paidCod ? 'wallet' : $stepIcon[$step['key']])" aria-hidden="true" class="size-4" />
                        @endif
                        <span class="min-w-0">{{ $paidCod ? $t['confirmed'] : $t[$step['key']] }}</span>
                    </span>
                    <span class="text-caption text-muted-foreground">
                        @if ($step['at'])
                            <x-nq::numeric.date-time :value="$when($step['at'])" date-style="medium" time-style="short" />
                        @else
                            {{ $t[$step['state']] }}
                        @endif
                    </span>
                </li>
            @endforeach
        </ol>
        @if ($cod && $model['reached'] < 4 && ! $model['terminal'])
            <p class="text-body-sm text-muted-foreground">{{ $t['cod'] }}</p>
        @endif
        @if ($tracking)
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm">
                <span class="text-muted-foreground">{{ $t['carrier'] }}: <span class="text-foreground">{{ $tracking['carrier'] }}</span></span>
                <span class="text-muted-foreground">{{ $t['trackingNumber'] }}: <bdi dir="ltr" class="font-mono text-foreground">{{ $tracking['number'] }}</bdi></span>
                @if ($url)
                    <x-nq::button :href="$url" variant="secondary" size="sm" target="_blank" rel="noreferrer">
                        {{ $t['trackShipment'] }}
                        <x-lucide-external-link aria-hidden="true" class="rtl:-scale-x-100" />
                    </x-nq::button>
                @endif
            </div>
        @endif
    </section>
@endif
