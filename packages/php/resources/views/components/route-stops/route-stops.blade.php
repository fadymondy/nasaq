{{-- <x-nq::route-stops :stops="[['id' => 'p1', 'kind' => 'pickup', 'name' => 'Bakery'], ['id' => 'd1', 'kind' => 'dropoff', 'name' => 'Sara', 'cashMinor' => 10000]]" />
     A multi-stop trip: pickups and drop-offs, each done, current or pending, cash to collect per drop-off and a total still owed.
     Each stop: id, kind (pickup | dropoff), name, nameAr, address, addressAr, status (done | pending | failed | skipped, default pending),
     orderRef, cashMinor (minor units), eta (DateTime, timestamp or string), note, noteAr. The first pending stop is the next one.
     <x-slot:actions> renders under the current stop (every stop with actions-for-all). hide-summary drops the progress line.
     selectable makes each row a button that dispatches a bubbling "nq-select-stop" event with { id }. Money: USD, SAR in Arabic. --}}
@include('nasaq::components.courier-card._delivery')
@props(['stops', 'currency' => null, 'actionsForAll' => false, 'hideSummary' => false, 'selectable' => false, 'locale' => null, 'labels' => [], 'actions' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $currency ??= nq_delivery_currency($locale);
    $t = array_merge($ar ? [
        'stops' => 'محطات الرحلة', 'pickup' => 'استلام', 'dropoff' => 'تسليم', 'done' => 'تمّت', 'pending' => 'قيد الانتظار', 'failed' => 'فشلت',
        'skipped' => 'تم تخطيها', 'next' => 'المحطة التالية', 'cashPending' => 'نقد مطلوب تحصيله', 'cashCollected' => 'تم تحصيله', 'cash' => 'نقد', 'arrive' => 'الوصول',
    ] : [
        'stops' => 'Trip stops', 'pickup' => 'Pick up', 'dropoff' => 'Drop off', 'done' => 'Done', 'pending' => 'Pending', 'failed' => 'Failed',
        'skipped' => 'Skipped', 'next' => 'Next stop', 'cashPending' => 'Cash to collect', 'cashCollected' => 'Collected', 'cash' => 'Cash', 'arrive' => 'Arrive',
    ], $labels);
    $summary = nq_delivery_route_summary($stops);
    $progress = $labels['progress'] ?? ($ar ? "تمّت {$summary['done']} من {$summary['total']} محطات" : "{$summary['done']} of {$summary['total']} stops done");
    $pick = fn (?string $en, ?string $arabic): string => (string) ($ar ? ($arabic ?: $en) : ($en ?: $arabic));
    $time = function ($value) use ($locale): string {
        $date = $value instanceof \DateTimeInterface ? \Carbon\Carbon::instance($value) : (is_numeric($value) ? \Carbon\Carbon::createFromTimestamp($value) : \Carbon\Carbon::parse($value));
        if ($date->getTimezone()->getName() === 'Z') {
            $date = $date->setTimezone('UTC'); // "…Z" strings give a zone named "Z", which Intl rejects
        }
        if (! class_exists(\IntlDateFormatter::class)) {
            return $date->format('g:i A');
        }

        return (string) (new \IntlDateFormatter(str_starts_with($locale, 'ar') ? 'ar@numbers=latn' : str_replace('_', '-', $locale).'@numbers=latn', \IntlDateFormatter::NONE, \IntlDateFormatter::SHORT, $date->getTimezone()->getName()))->format($date);
    };
    $icons = ['done' => 'check', 'failed' => 'ban', 'skipped' => 'skip-forward'];
    $count = count($stops);
@endphp
<section data-slot="route-stops" aria-label="{{ $t['stops'] }}" {{ $attributes->cn('flex flex-col gap-3') }}>
    @if (! $hideSummary)
        <header data-slot="route-summary" class="flex flex-wrap items-center justify-between gap-2 text-body-sm">
            <span class="text-foreground">{{ $progress }}</span>
            <span class="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                @if ($summary['cashPending'] > 0)
                    <span class="inline-flex items-center gap-1">
                        <x-lucide-hand-coins aria-hidden="true" class="size-4" />
                        {{ $t['cashPending'] }}
                        <bdi data-slot="route-cash-pending" class="font-medium tabular-nums text-foreground">{{ nq_delivery_money($summary['cashPending'], $currency, $locale) }}</bdi>
                    </span>
                @endif
                @if ($summary['cashCollected'] > 0)
                    <span class="inline-flex items-center gap-1">
                        {{ $t['cashCollected'] }}
                        <bdi class="tabular-nums text-foreground">{{ nq_delivery_money($summary['cashCollected'], $currency, $locale) }}</bdi>
                    </span>
                @endif
            </span>
        </header>
    @endif

    <ol role="list" class="flex flex-col">
        @foreach ($stops as $i => $stop)
            @php
                $status = $stop['status'] ?? 'pending';
                $current = $stop['id'] === $summary['currentId'];
                $last = $i === $count - 1;
                $icon = $icons[$status] ?? ($current ? 'navigation' : ($stop['kind'] === 'pickup' ? 'store' : 'map-pin'));
                $address = $pick($stop['address'] ?? null, $stop['addressAr'] ?? null);
                $note = $pick($stop['note'] ?? null, $stop['noteAr'] ?? null);
                $showActions = $actions && $actions->isNotEmpty() && ($current || $actionsForAll);
            @endphp
            <li data-stop="{{ $stop['id'] }}" data-kind="{{ $stop['kind'] }}" data-status="{{ $status }}" @if ($current) data-current aria-current="step" @endif class="flex gap-3">
                <span class="flex flex-col items-center">
                    <span class="{{ \Illuminate\Support\Arr::toCssClasses(['flex size-8 shrink-0 items-center justify-center rounded-full border-2 [&_svg]:size-4',
                        'border-primary bg-primary text-primary-foreground' => $status === 'done',
                        'border-primary bg-card text-primary ring-4 ring-primary/20' => $current,
                        'border-nq-line-strong bg-card text-muted-foreground' => ! $current && $status === 'pending',
                        'border-nq-danger bg-nq-danger-soft text-nq-danger-text' => $status === 'failed',
                        'border-nq-line-strong bg-secondary text-muted-foreground' => $status === 'skipped',
                    ]) }}">
                        <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />
                    </span>
                    @if (! $last)
                        <span aria-hidden="true" class="{{ \Nasaq\Cn::merge('my-1 min-h-4 w-0.5 flex-1 rounded-full', $status === 'done' ? 'bg-primary' : 'bg-nq-line') }}"></span>
                    @endif
                </span>
                <div class="{{ \Nasaq\Cn::merge('flex min-w-0 flex-1 flex-col gap-2 pt-0.5', ! $last ? 'pb-4' : '') }}">
                    <{{ $selectable ? 'button' : 'div' }}
                        @if ($selectable)
                            type="button" x-on:click="$dispatch('nq-select-stop', { id: @js($stop['id']) })"
                            class="flex w-full cursor-pointer items-start gap-3 rounded-control text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
                        @else
                            class="flex items-start gap-3"
                        @endif
                    >
                        <span class="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
                            <span class="flex flex-wrap items-center gap-2">
                                <span class="text-caption text-muted-foreground">{{ $stop['kind'] === 'pickup' ? $t['pickup'] : $t['dropoff'] }}</span>
                                @if (! empty($stop['orderRef']))
                                    <bdi dir="ltr" class="text-caption tabular-nums text-muted-foreground">{{ $stop['orderRef'] }}</bdi>
                                @endif
                                @if ($current)
                                    <x-nq::badge variant="brand">{{ $t['next'] }}</x-nq::badge>
                                @elseif ($status !== 'pending')
                                    <x-nq::badge :variant="$status === 'done' ? 'success' : ($status === 'failed' ? 'danger' : 'neutral')">{{ $t[$status] }}</x-nq::badge>
                                @endif
                            </span>
                            <bdi dir="auto" class="{{ \Nasaq\Cn::merge('truncate text-label', $status === 'done' || $status === 'skipped' ? 'text-muted-foreground' : 'text-foreground') }}">{{ $pick($stop['name'] ?? null, $stop['nameAr'] ?? null) }}</bdi>
                            @if ($address !== '')
                                <bdi dir="auto" class="text-body-sm text-muted-foreground">{{ $address }}</bdi>
                            @endif
                            @if ($note !== '')
                                <bdi dir="auto" class="text-caption text-muted-foreground">{{ $note }}</bdi>
                            @endif
                            @if (isset($stop['eta']) && $status === 'pending')
                                <span class="text-caption text-muted-foreground">{{ $t['arrive'] }} <bdi class="tabular-nums">{{ $time($stop['eta']) }}</bdi></span>
                            @endif
                        </span>
                        @if (! empty($stop['cashMinor']))
                            <span data-slot="stop-cash" class="flex shrink-0 flex-col items-end">
                                <span class="text-caption text-muted-foreground">{{ $t['cash'] }}</span>
                                <bdi class="{{ \Nasaq\Cn::merge('text-label tabular-nums', $status === 'done' ? 'text-muted-foreground' : 'text-foreground') }}">{{ nq_delivery_money($stop['cashMinor'], $currency, $locale) }}</bdi>
                            </span>
                        @endif
                    </{{ $selectable ? 'button' : 'div' }}>
                    @if ($showActions)
                        <div class="flex flex-wrap gap-2">{{ $actions }}</div>
                    @endif
                </div>
            </li>
        @endforeach
    </ol>
</section>
