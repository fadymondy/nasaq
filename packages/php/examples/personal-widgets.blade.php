<div class="grid max-w-3xl gap-4 sm:grid-cols-2">
    <x-nq::personal-widgets.availability-badge status="open" note="from November" />
    <x-nq::personal-widgets.local-clock time-zone="Asia/Riyadh" viewer-time-zone="UTC" city="Riyadh" :now="'2026-09-29T09:00:00Z'" :working-hours="['start' => 9, 'end' => 17, 'days' => [0, 1, 2, 3, 4]]" />
    <x-nq::personal-widgets.stats-widget :stats="[['label' => 'Projects', 'value' => 42], ['label' => 'Stars', 'value' => 12400, 'compact' => true, 'suffix' => '+']]" />
    <x-nq::personal-widgets.weather-widget city="Riyadh" :temperature="38" condition="clear" :high="41" :low="27" />
    <x-nq::personal-widgets.now-widget :items="[['label' => 'Building', 'text' => 'A design system'], ['label' => 'Reading', 'text' => 'Refactoring UI', 'href' => 'https://example.com']]" updated="2026-09-20" />
    <x-nq::personal-widgets.skills-widget :skills="[['name' => 'TypeScript', 'group' => 'Languages', 'level' => 5], ['name' => 'Go', 'group' => 'Languages', 'level' => 3], ['name' => 'Figma', 'level' => 4]]" />
    <x-nq::personal-widgets.social-links layout="list" :links="[['kind' => 'github', 'label' => 'GitHub', 'href' => 'https://github.com/fadymondy', 'handle' => '@fadymondy'], ['kind' => 'email', 'label' => 'Email', 'href' => 'mailto:hi@example.com']]" />
</div>
