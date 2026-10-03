@php
    $tiers = [
        ['id' => 'bronze', 'name' => 'Bronze', 'minPoints' => 0],
        ['id' => 'silver', 'name' => 'Silver', 'minPoints' => 1000],
        ['id' => 'gold', 'name' => 'Gold', 'minPoints' => 3000],
    ];
    $rewards = [
        ['id' => 'r1', 'title' => 'Free coffee', 'cost' => 500],
        ['id' => 'r2', 'title' => '10 off your next order', 'cost' => 1500],
    ];
    $entries = [
        ['id' => 'e1', 'date' => '2026-09-20T10:00:00', 'kind' => 'earn', 'points' => 120, 'note' => 'Order #1042', 'balanceAfter' => 1840],
        ['id' => 'e2', 'date' => '2026-09-10T10:00:00', 'kind' => 'redeem', 'points' => -500, 'note' => 'Free coffee', 'balanceAfter' => 1720],
    ];
    $visits = [
        ['id' => 'v1', 'date' => '2026-09-20T10:00:00', 'place' => 'Downtown', 'spend' => 4500, 'points' => 45, 'status' => 'completed'],
        ['id' => 'v2', 'date' => '2026-09-12T15:30:00', 'place' => 'Mall', 'spend' => 0, 'points' => 0, 'status' => 'no-show'],
    ];
    $promos = [
        ['id' => 'p1', 'code' => 'WELCOME10', 'type' => 'percent', 'value' => 1000, 'used' => 3, 'active' => true],
        ['id' => 'p2', 'code' => 'FLAT5', 'type' => 'fixed', 'value' => 500, 'used' => 0, 'active' => false],
    ];
    $rules = [['code' => 'WELCOME10', 'type' => 'percent', 'value' => 1000]];
@endphp
<div class="flex flex-col gap-6">
    <x-nq::loyalty-promo.loyalty-card name="Sara" :balance="1840" :tiers="$tiers" member-code="NSQ-4821" :rewards="$rewards" as-of="2026-09-29" />
    <x-nq::loyalty-promo.promo-code-field currency="USD" :promos="$rules" :context="['subtotal' => 5000, 'today' => '2026-09-29']" />
    <x-nq::loyalty-promo.points-history :entries="$entries" />
    <x-nq::loyalty-promo.visit-history :visits="$visits" currency="USD" :row-actions="[['id' => 'again', 'label' => 'Book again', 'icon' => 'repeat']]" />
    <x-nq::loyalty-promo.promo-code-manager :promos="$promos" currency="USD" today="2026-09-29" can-save can-set-active can-delete />
    <x-nq::loyalty-promo.loyalty-card locale="ar" name="سارة" :balance="1840" />
</div>
