{{-- <x-nq::delivery-tracker order-number="1042" status="on-the-way" :eta-seconds="540" :courier="['name' => 'Omar', 'nameAr' => 'عمر', 'phone' => '+970591234567']" />
     Customer-facing delivery progress: placed, assigned, picked-up, on-the-way, delivered; cancelled and failed show where it stopped.
     status: placed | assigned | picked-up | on-the-way | delivered | cancelled | failed   reached-before: last step reached before a stop (default placed).
     times: ['placed' => DateTime|timestamp|string, ...]. eta-seconds (live ETA) or eta-at (fixed promise). reason / reason-ar for a stop.
     courier: name, nameAr, avatarSrc, vehicle, phone (a phone renders a tel: link). call / message add buttons that dispatch bubbling
     "nq-call" / "nq-message" events. <x-slot:map> renders the live map under the steps. labels: array overriding the built-in words. --}}
@include('nasaq::components.courier-card._delivery')
@include('nasaq::components.delivery-tracker._progress')
@props([
    'status', 'reachedBefore' => 'placed', 'times' => [], 'orderNumber' => null, 'etaSeconds' => null, 'etaAt' => null, 'courier' => null,
    'call' => false, 'message' => false, 'reason' => null, 'reasonAr' => null, 'locale' => null, 'labels' => [], 'map' => null,
])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? [
        'title' => 'تتبّع الطلب', 'order' => 'الطلب', 'placed' => 'تم استلام الطلب', 'assigned' => 'تم تعيين السائق', 'picked-up' => 'تم استلام الطلب من المتجر',
        'on-the-way' => 'في الطريق إليك', 'delivered' => 'تم التوصيل', 'cancelled' => 'أُلغي الطلب', 'failed' => 'تعذّر التوصيل', 'arrivingIn' => 'يصل خلال',
        'eta' => 'الوصول المتوقع', 'courier' => 'سائقك', 'call' => 'اتصال', 'message' => 'رسالة', 'reason' => 'السبب', 'steps' => 'مراحل التوصيل',
        'done' => 'تم', 'current' => 'المرحلة الحالية', 'stopped' => 'توقف هنا', 'pending' => 'لم يحدث بعد',
    ] : [
        'title' => 'Order tracking', 'order' => 'Order', 'placed' => 'Order placed', 'assigned' => 'Courier assigned', 'picked-up' => 'Picked up',
        'on-the-way' => 'On the way', 'delivered' => 'Delivered', 'cancelled' => 'Order cancelled', 'failed' => 'Delivery failed', 'arrivingIn' => 'Arriving in',
        'eta' => 'Estimated arrival', 'courier' => 'Your courier', 'call' => 'Call', 'message' => 'Message', 'reason' => 'Reason', 'steps' => 'Delivery progress',
        'done' => 'done', 'current' => 'current step', 'stopped' => 'stopped here', 'pending' => 'not yet',
    ], $labels);
    $progress = nq_delivery_progress($status, $reachedBefore);
    $terminal = $progress['terminal'];
    $moving = $status === 'on-the-way' || $status === 'picked-up';
    $delivered = $status === 'delivered';
    $showCourier = $courier && ($status === 'assigned' || $moving);
    $stateWord = ['done' => $t['done'], 'current' => $t['current'], 'stopped' => $t['stopped'], 'upcoming' => $t['pending']];
    $headline = $terminal ? $t[$terminal] : $t[$status];
    $tone = $terminal ? 'danger' : ($delivered ? 'success' : 'brand');
    $courierName = $courier ? ($ar ? ($courier['nameAr'] ?? null) ?: $courier['name'] : $courier['name']) : '';
    $tel = ($courier['phone'] ?? null) ? 'tel:'.preg_replace('/[^\d+]/', '', $courier['phone']) : null;
    $lastIndex = count($progress['steps']) - 1;
    $icons = ['placed' => 'clipboard-list', 'assigned' => 'user-check', 'picked-up' => 'package-check', 'on-the-way' => 'bike', 'delivered' => 'check'];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'delivery-tracker') }}" data-status="{{ $status }}" aria-label="{{ $t['title'] }}"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card p-4 sm:p-5') }}>
    <header class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
            @if ($orderNumber)
                <span class="text-caption text-muted-foreground">{{ $t['order'] }} <bdi dir="ltr" class="tabular-nums">{{ $orderNumber }}</bdi></span>
            @endif
            <h2 class="text-h3 text-foreground">{{ $headline }}</h2>
        </div>
        <div class="flex flex-col items-end gap-1">
            <x-nq::badge :variant="$tone">{{ $headline }}</x-nq::badge>
            @if ($moving && $etaSeconds !== null)
                <span data-slot="delivery-eta" class="text-body-sm text-foreground">{{ $t['arrivingIn'] }} <bdi class="tabular-nums font-medium">{{ nq_delivery_duration($etaSeconds, $locale) }}</bdi></span>
            @elseif ($moving && $etaAt !== null)
                <span data-slot="delivery-eta" class="text-body-sm text-foreground">{{ $t['eta'] }} <bdi class="tabular-nums font-medium">{{ nq_delivery_time($etaAt, $locale) }}</bdi></span>
            @endif
        </div>
    </header>

    @if ($terminal)
        <div role="alert" data-slot="delivery-terminal" class="flex items-start gap-2 rounded-control border border-nq-danger/40 bg-nq-danger-soft p-3 text-body-sm text-nq-danger-text">
            @if ($terminal === 'cancelled')
                <x-lucide-ban aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
            @else
                <x-lucide-circle-alert aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
            @endif
            <div class="flex min-w-0 flex-col gap-0.5">
                <span class="font-medium">{{ $t[$terminal] }}</span>
                @if ($reason || $reasonAr)
                    <span>{{ $t['reason'] }}: <bdi dir="auto">{{ $ar ? ($reasonAr ?: $reason) : ($reason ?: $reasonAr) }}</bdi></span>
                @endif
            </div>
        </div>
    @endif

    <ol role="list" aria-label="{{ $t['steps'] }}" data-slot="delivery-steps" class="flex flex-col">
        @foreach ($progress['steps'] as $i => $step)
            @php
                $last = $i === $lastIndex;
                $next = $progress['steps'][$i + 1]['state'] ?? null;
                $when = isset($times[$step['key']]) ? nq_delivery_time($times[$step['key']], $locale) : null;
                $circle = match ($step['state']) {
                    'done' => 'border-primary bg-primary text-primary-foreground',
                    'current' => 'border-primary bg-card text-primary ring-4 ring-primary/20',
                    'upcoming' => 'border-nq-line-strong bg-card text-muted-foreground',
                    default => 'border-nq-danger bg-nq-danger-soft text-nq-danger-text',
                };
            @endphp
            <li data-step="{{ $step['key'] }}" data-state="{{ $step['state'] }}" @if ($step['state'] === 'current') aria-current="step" @endif class="flex gap-3">
                <span class="flex flex-col items-center">
                    <span class="flex size-8 shrink-0 items-center justify-center rounded-full border-2 [&_svg]:size-4 {{ $circle }}">
                        @if ($step['state'] === 'done')
                            <x-lucide-check aria-hidden="true" />
                        @elseif ($step['state'] === 'stopped')
                            <x-lucide-ban aria-hidden="true" />
                        @else
                            <x-dynamic-component :component="'lucide-'.$icons[$step['key']]" aria-hidden="true" />
                        @endif
                    </span>
                    @if (! $last)
                        <span aria-hidden="true" class="my-1 min-h-6 w-0.5 flex-1 rounded-full {{ ($next === 'done' || $next === 'current') && $step['state'] === 'done' ? 'bg-primary' : 'bg-nq-line' }}"></span>
                    @endif
                </span>
                <div class="flex min-w-0 flex-1 flex-col pt-1 {{ $last ? 'pb-0' : 'pb-4' }}">
                    <span class="text-label {{ $step['state'] === 'upcoming' ? 'text-muted-foreground' : 'text-foreground' }}">{{ $t[$step['key']] }}<span class="sr-only"> ({{ $stateWord[$step['state']] }})</span></span>
                    @if ($when)
                        <bdi class="text-caption tabular-nums text-muted-foreground">{{ $when }}</bdi>
                    @endif
                </div>
            </li>
        @endforeach
    </ol>

    @if ($showCourier)
        <div data-slot="delivery-courier" class="flex flex-wrap items-center gap-3 rounded-control border border-border bg-secondary p-3">
            <x-nq::avatar :name="$courierName" :src="$courier['avatarSrc'] ?? null" size="lg" />
            <div class="flex min-w-0 flex-1 flex-col">
                <span class="text-caption text-muted-foreground">{{ $t['courier'] }}</span>
                <bdi dir="auto" class="truncate text-label text-foreground">{{ $courierName }}</bdi>
                @if ($courier['vehicle'] ?? null)
                    <bdi dir="auto" class="truncate text-body-sm text-muted-foreground">{{ $courier['vehicle'] }}</bdi>
                @endif
            </div>
            <div class="flex items-center gap-2">
                @if ($message)
                    <x-nq::button type="button" variant="secondary" size="sm" x-on:click="$dispatch('nq-message')">
                        <x-lucide-message-circle aria-hidden="true" />
                        {{ $t['message'] }}
                    </x-nq::button>
                @endif
                @if ($call)
                    <x-nq::button type="button" variant="secondary" size="sm" x-on:click="$dispatch('nq-call')">
                        <x-lucide-phone aria-hidden="true" />
                        {{ $t['call'] }}
                    </x-nq::button>
                @elseif ($tel)
                    <x-nq::button :href="$tel" variant="secondary" size="sm">
                        <x-lucide-phone aria-hidden="true" />
                        {{ $t['call'] }}
                    </x-nq::button>
                @endif
            </div>
        </div>
    @endif

    @if ($map && $map->isNotEmpty())
        <div data-slot="delivery-map">{{ $map }}</div>
    @endif
</section>
