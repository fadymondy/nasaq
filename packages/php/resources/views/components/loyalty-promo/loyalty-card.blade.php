{{-- <x-nq::loyalty-promo.loyalty-card name="Sara" :balance="1840" :tiers="$tiers" member-code="NSQ-4821" :rewards="$rewards" can-redeem @nq-loyalty-redeem="$event.detail.waitUntil(redeem($event.detail.reward))" />
     A customer's loyalty status: points balance, tier with progress to the next, points about to expire, a scannable member code (QR) and rewards to redeem.
     name, balance (spendable points), lifetime-points (decides the tier, default balance), tiers: [['id', 'name', 'minPoints', 'perk'?]], lots: [['points', 'expiresOn' (YYYY-MM-DD)?]]
     (the soonest lapse inside expiry-warning-days, default 30, is called out), as-of (YYYY-MM-DD, default today), member-since (date), member-code (shown as a QR code),
     rewards: [['id', 'title', 'description'?, 'cost']] (null hides the section), can-redeem: show an enabled Redeem button, loading: skeleton, labels: override any built-in string by key, locale.
     Redeeming fires "nq-loyalty-redeem" on the root with detail { reward, waitUntil(promise), resolve(), reject(message) }: the button stays busy until it settles and a rejection shows its message.
     The reward art is the gift icon. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.loyalty-promo._logic')
@props(['name', 'balance' => 0, 'lifetimePoints' => null, 'tiers' => null, 'lots' => null, 'expiryWarningDays' => 30, 'asOf' => null, 'memberSince' => null, 'memberCode' => null, 'rewards' => null, 'canRedeem' => false, 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_loyalty_words($locale, (array) $labels);
    $num = fn ($v) => nq_loyalty_num($v, $locale);
    $state = $tiers ? nq_loyalty_tier($lifetimePoints ?? $balance, array_values($tiers)) : null;
    $soon = $lots !== null ? nq_loyalty_expiring(array_values($lots), $asOf ?? \Carbon\Carbon::now()->toDateString(), (int) $expiryWarningDays) : null;
    $id = 'nq-loyalty-'.substr(md5($name.$balance), 0, 8);
    $shell = 'flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground';
@endphp
@if ($loading)
    <div data-slot="{{ $attributes->get('data-slot', 'loyalty-card') }}" aria-busy="true" {{ $attributes->except('data-slot')->cn($shell.' p-4') }}>
        <x-nq::states.skeleton class="h-5 w-1/3" />
        <x-nq::states.skeleton class="h-10 w-1/2" />
        <x-nq::states.skeleton class="h-2 w-full" />
    </div>
@else
    <div data-slot="{{ $attributes->get('data-slot', 'loyalty-card') }}" aria-labelledby="{{ $id }}" x-data="nqLoyaltyCard(@js(['rewards' => array_values($rewards ?? [])]))" {{ $attributes->except('data-slot')->cn($shell.' px-0') }}>
        <x-nq::card.header class="items-start">
            <div class="flex min-w-0 flex-col gap-0.5">
                <x-nq::card.title as="h2" id="{{ $id }}">{{ $name }}</x-nq::card.title>
                @if ($memberSince)
                    <p class="text-caption text-muted-foreground">{{ nq_loyalty_say($t['memberSince'], '') }}<x-nq::numeric.date-time :value="$memberSince" date-style="medium" :locale="$locale" /></p>
                @endif
            </div>
            @if ($state && $state['tier'])
                <x-nq::badge variant="brand"><x-lucide-award aria-hidden="true" />{{ $state['tier']['name'] }}</x-nq::badge>
            @endif
        </x-nq::card.header>
        <x-nq::card.content class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div class="flex min-w-0 flex-col gap-3">
                <p class="flex flex-col">
                    <span class="text-caption text-muted-foreground">{{ $t['pointsBalance'] }}</span>
                    <span class="flex items-baseline gap-1.5">
                        <span class="text-display font-semibold tabular-nums text-foreground">{{ $num($balance) }}</span>
                        <span class="text-body-sm text-muted-foreground">{{ $t['points'] }}</span>
                    </span>
                </p>
                @if ($state)
                    <div class="flex flex-col gap-1.5">
                        <x-nq::progress size="md" :value="$state['progress']" :show-value="false" aria-label="{{ $t['tier'] }}" />
                        <p class="text-caption text-muted-foreground">{{ $state['next'] ? nq_loyalty_say($t['toNext'], $num($state['toNext']), $state['next']['name']) : $t['topTier'] }}</p>
                        @if (! empty($state['tier']['perk']))<p class="text-caption text-foreground">{{ $state['tier']['perk'] }}</p>@endif
                    </div>
                @endif
                @if ($soon && $soon['points'] > 0 && $soon['on'])
                    <p role="status" class="rounded-card bg-nq-warning-soft px-3 py-2 text-body-sm text-nq-warning-text">{{ nq_loyalty_say($t['expiring'], $num($soon['points']), '') }}<x-nq::numeric.date-time :value="$soon['on']" date-style="medium" :locale="$locale" /></p>
                @endif
            </div>
            @if ($memberCode)
                <div class="flex flex-col items-center gap-1.5">
                    <x-nq::qr-code :value="$memberCode" :size="112" :label="$t['memberCode'].': '.$memberCode" />
                    <bdi dir="ltr" class="font-mono text-caption text-muted-foreground">{{ $memberCode }}</bdi>
                </div>
            @endif
        </x-nq::card.content>
        @if ($rewards !== null)
            <x-nq::card.content class="flex flex-col gap-2">
                <h3 class="text-label text-foreground">{{ $t['rewards'] }}</h3>
                @if (count($rewards) === 0)
                    <p class="text-body-sm text-muted-foreground">{{ $t['noRewards'] }}</p>
                @else
                    <div class="grid gap-3 sm:grid-cols-2">
                        @foreach ($rewards as $r)
                            <div data-reward-id="{{ $r['id'] }}" class="contents" x-on:nq-claim="redeem($event, '{{ $r['id'] }}')">
                                <x-nq::gamification.reward-card :title="$r['title']" :description="$r['description'] ?? null" :cost="$r['cost']" :balance="$balance" :claimable="(bool) $canRedeem" :locale="$locale" :labels="['claim' => $t['claim']]" />
                            </div>
                        @endforeach
                    </div>
                @endif
            </x-nq::card.content>
        @endif
    </div>
@endif
