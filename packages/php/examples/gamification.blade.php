@php
    $achievements = [
        ['id' => 'first', 'title' => 'First order', 'description' => 'Place your first order.', 'icon' => 'rocket', 'rarity' => 'common', 'earnedAt' => '2026-09-12', 'xp' => 50],
        ['id' => 'streak', 'title' => 'Seven in a row', 'description' => 'Order seven days running.', 'icon' => 'zap', 'rarity' => 'rare', 'progress' => 4, 'goal' => 7, 'xp' => 200],
        ['id' => 'vip', 'title' => 'Big spender', 'description' => 'Spend 1,000 USD.', 'rarity' => 'epic', 'progress' => 0, 'goal' => 1000],
        ['id' => 'hidden', 'title' => 'Easter egg', 'description' => 'You found it.', 'rarity' => 'legendary', 'secret' => true],
    ];
    $entries = [
        ['id' => 'a', 'name' => 'Sara Ali', 'score' => 2400, 'previousRank' => 2],
        ['id' => 'b', 'name' => 'Omar Nasser', 'score' => 2250, 'previousRank' => 1],
        ['id' => 'c', 'name' => 'Lina Haddad', 'score' => 1900, 'previousRank' => 3],
        ['id' => 'd', 'name' => 'You Yourself', 'score' => 1200],
    ];
    $periods = [['id' => 'week', 'label' => 'This week'], ['id' => 'all', 'label' => 'All time']];
    $activeDays = ['2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-05'];
@endphp
<div class="flex flex-col gap-6">
    <x-nq::gamification.xp-progress :total-xp="260" />
    <x-nq::gamification.badge-grid :achievements="$achievements" selectable />
    <x-nq::gamification.achievement-card :achievement="$achievements[1]" />
    <x-nq::gamification.streak-card :active-days="$activeDays" today="2026-09-20" class="max-w-sm" />
    <x-nq::gamification.leaderboard :entries="$entries" you-id="d" :periods="$periods" unit="XP" :limit="3" />
    <x-nq::gamification.reward-card title="Free delivery" description="One order, on us." rarity="rare" :cost="500" :balance="620" claimable class="max-w-xs" />
    <x-nq::gamification.reward-card title="Gold mug" rarity="epic" :cost="900" :balance="620" claimable class="max-w-xs" />
    <x-nq::gamification.unlock-toast :achievement="$achievements[0]" :open="true" :floating="false" :duration="0" has-view />
</div>
