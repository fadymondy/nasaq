{{-- <x-nq::courier-card name="Omar Haddad" name-ar="عمر حداد" status="available" vehicle="motorbike" :distance-meters="850" :eta-seconds="240" :cash-float-minor="25000" />
     One courier: avatar with a status dot, name, vehicle, distance and ETA, cash float. Money is minor units (USD, SAR in Arabic).
     status: available | busy | offline   vehicle: bike | motorbike | car | van | walk   compact hides the detail lines.
     selectable makes the card a toggle button (aria-pressed); it dispatches a bubbling "nq-select" event with { id: courier-id }.
     <x-slot:actions> renders trailing actions outside the button. labels: array overriding the built-in words. --}}
@include('nasaq::components.courier-card._delivery')
@props([
    'name', 'nameAr' => null, 'avatarSrc' => null, 'status', 'vehicle' => null, 'vehicleDetail' => null,
    'distanceMeters' => null, 'etaSeconds' => null, 'cashFloatMinor' => null, 'activeOrders' => null,
    'currency' => null, 'selectable' => false, 'selected' => false, 'compact' => false,
    'locale' => null, 'labels' => [], 'courierId' => null, 'actions' => null,
])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $currency ??= nq_delivery_currency($locale);
    $t = array_merge($ar ? [
        'available' => 'متاح', 'busy' => 'مشغول', 'offline' => 'غير متصل', 'bike' => 'دراجة', 'motorbike' => 'دراجة نارية', 'car' => 'سيارة', 'van' => 'فان',
        'walk' => 'سيرًا على الأقدام', 'away' => 'بعيدًا', 'eta' => 'الوصول', 'float' => 'عهدة نقدية', 'selected' => 'محدد',
    ] : [
        'available' => 'Available', 'busy' => 'Busy', 'offline' => 'Offline', 'bike' => 'Bicycle', 'motorbike' => 'Motorbike', 'car' => 'Car', 'van' => 'Van',
        'walk' => 'On foot', 'away' => 'away', 'eta' => 'ETA', 'float' => 'Cash float', 'selected' => 'selected',
    ], $labels);
    $orders = fn (int $n): string => $labels['orders'] ?? ($ar
        ? ($n === 0 ? 'لا طلبات نشطة' : ($n === 1 ? 'طلب نشط واحد' : ($n === 2 ? 'طلبان نشطان' : ($n <= 10 ? $n.' طلبات نشطة' : $n.' طلبًا نشطًا'))))
        : ($n === 1 ? '1 active order' : $n.' active orders'));
    $shown = $ar ? ($nameAr ?: $name) : ($name ?: ($nameAr ?? ''));
    $dot = ['available' => 'bg-nq-success', 'busy' => 'bg-nq-warning', 'offline' => 'border-2 border-nq-line-strong bg-transparent'];
    $statusText = ['available' => 'text-nq-success-text', 'busy' => 'text-nq-warning-text', 'offline' => 'text-muted-foreground'];
    $vehicleIcons = ['bike' => 'bike', 'motorbike' => 'motorbike', 'car' => 'car', 'van' => 'truck', 'walk' => 'footprints'];
    $ariaLabel = implode(', ', array_filter([$shown, $t[$status], $selected ? $t['selected'] : '']));
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'courier-card') }}" data-status="{{ $status }}" @if ($selected) data-selected @endif
    {{-- ring-2 + ring-primary/30 are appended after the merge: Cn treats ring width and colour as one group. --}}
    {{ $attributes->except('data-slot')->cn([
        'flex items-center gap-2 rounded-card border border-border bg-card p-3 transition-colors duration-150 ease-nq',
        'border-primary' => $selected,
        'opacity-80' => $status === 'offline',
    ])->merge(['class' => $selected ? 'ring-2 ring-primary/30' : '']) }}>
    <{{ $selectable ? 'button' : 'div' }}
        @if ($selectable)
            type="button" aria-pressed="{{ $selected ? 'true' : 'false' }}" aria-label="{{ $ariaLabel }}"
            x-on:click="$dispatch('nq-select', { id: @js($courierId) })"
            class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-control text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
        @else
            class="flex min-w-0 flex-1 items-center gap-3"
        @endif
    >
        <span class="relative shrink-0">
            <x-nq::avatar :name="$shown" :src="$avatarSrc" size="lg" />
            <span data-slot="courier-dot" aria-hidden="true" class="absolute -bottom-0.5 -end-0.5 size-3 rounded-full ring-2 ring-card {{ $dot[$status] }}"></span>
        </span>
        <span class="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
            <span class="flex min-w-0 items-center gap-2">
                <bdi dir="auto" class="truncate text-label text-foreground">{{ $shown }}</bdi>
                <span data-slot="courier-status" class="{{ \Nasaq\Cn::merge('shrink-0 text-caption', $statusText[$status]) }}">{{ $t[$status] }}</span>
            </span>
            @if (! $compact)
                <span class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-body-sm text-muted-foreground">
                    @if ($vehicle)
                        <span class="inline-flex items-center gap-1">
                            <x-dynamic-component :component="'lucide-'.$vehicleIcons[$vehicle]" aria-hidden="true" class="size-3.5" />
                            <span>{{ $t[$vehicle] }}</span>
                            @if ($vehicleDetail)<bdi dir="auto">{{ $vehicleDetail }}</bdi>@endif
                        </span>
                    @endif
                    @if ($distanceMeters !== null)
                        <span><bdi class="tabular-nums">{{ nq_delivery_distance($distanceMeters, $locale) }}</bdi> {{ $t['away'] }}</span>
                    @endif
                    @if ($etaSeconds !== null)
                        <span>{{ $t['eta'] }} <bdi class="tabular-nums">{{ nq_delivery_duration($etaSeconds, $locale) }}</bdi></span>
                    @endif
                </span>
                @if ($cashFloatMinor !== null || $activeOrders !== null)
                    <span class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption text-muted-foreground">
                        @if ($cashFloatMinor !== null)
                            <span class="inline-flex items-center gap-1">
                                <x-lucide-hand-coins aria-hidden="true" class="size-3.5" />
                                <span>{{ $t['float'] }}</span>
                                <bdi class="tabular-nums text-foreground">{{ nq_delivery_money($cashFloatMinor, $currency, $locale) }}</bdi>
                            </span>
                        @endif
                        @if ($activeOrders !== null)
                            <span class="inline-flex items-center gap-1">
                                <x-lucide-package-check aria-hidden="true" class="size-3.5" />
                                {{ $orders($activeOrders) }}
                            </span>
                        @endif
                    </span>
                @endif
            @endif
        </span>
    </{{ $selectable ? 'button' : 'div' }}>
    @if ($actions && $actions->isNotEmpty())
        <div class="flex shrink-0 items-center gap-2">{{ $actions }}</div>
    @endif
</div>
