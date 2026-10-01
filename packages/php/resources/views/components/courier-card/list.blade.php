{{-- <x-nq::courier-card.list :couriers="[['id' => 'c1', 'name' => 'Omar Haddad', 'nameAr' => 'عمر حداد', 'status' => 'available', 'vehicle' => 'motorbike', 'distanceMeters' => 850]]" selected-id="c1" selectable />
     A vertical list of courier cards with one selected (selected-id). Pass the couriers already sorted (nearest first, offline last).
     Each courier is an array with the card props in camelCase plus an id. selectable makes the cards buttons;
     pressing one dispatches "nq-select" with { id } so the page (Alpine, Livewire) can update selected-id. --}}
@props(['couriers', 'selectedId' => null, 'selectable' => false, 'locale' => null, 'labels' => []])
@php
    $locale ??= app()->getLocale();
    $label = $attributes->get('aria-label') ?? ($labels['couriers'] ?? (str_starts_with($locale, 'ar') ? 'السائقون' : 'Couriers'));
@endphp
<ul role="list" data-slot="courier-list" aria-label="{{ $label }}" {{ $attributes->except('aria-label')->cn('flex flex-col gap-2') }}>
    @foreach ($couriers as $courier)
        <li>
            <x-nq::courier-card
                :name="$courier['name']"
                :name-ar="$courier['nameAr'] ?? null"
                :avatar-src="$courier['avatarSrc'] ?? null"
                :status="$courier['status']"
                :vehicle="$courier['vehicle'] ?? null"
                :vehicle-detail="$courier['vehicleDetail'] ?? null"
                :distance-meters="$courier['distanceMeters'] ?? null"
                :eta-seconds="$courier['etaSeconds'] ?? null"
                :cash-float-minor="$courier['cashFloatMinor'] ?? null"
                :active-orders="$courier['activeOrders'] ?? null"
                :currency="$courier['currency'] ?? null"
                :compact="$courier['compact'] ?? false"
                :courier-id="$courier['id']"
                :selected="$selectedId !== null && (string) $selectedId === (string) $courier['id']"
                :selectable="$selectable"
                :locale="$locale"
                :labels="$labels"
            />
        </li>
    @endforeach
</ul>
