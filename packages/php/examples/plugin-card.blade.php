@php($now = \Carbon\Carbon::now())
<x-nq::plugin-card.grid>
    <x-nq::plugin-card
        :plugin="['id' => 'postgres', 'name' => 'Postgres', 'version' => '2.4.1', 'kind' => 'source', 'icon' => 'database', 'hue' => 'blue', 'enabled' => true, 'description' => 'Streams rows from a Postgres database into the workspace.', 'lastActiveAt' => $now->copy()->subMinutes(12), 'count' => 128430, 'countLabel' => 'records', 'series' => [4, 6, 5, 9, 12, 10, 14, 18]]"
        selectable selected detail-href="/admin/plugins/postgres" page-href="/plugins" />
    <x-nq::plugin-card
        :plugin="['id' => 'summarizer', 'name' => 'Summarizer', 'version' => '0.9.0', 'kind' => 'ai_provider', 'icon' => 'bot', 'hue' => 'violet', 'enabled' => false, 'description' => 'Condenses long threads into a short brief.', 'lastActiveAt' => $now->copy()->subHours(5)]"
        selectable detail-href="/admin/plugins/summarizer" />
    <x-nq::plugin-card :plugin="['id' => 'legacy-export', 'name' => 'Legacy export', 'kind' => 'tool', 'enabled' => true]" selectable />
</x-nq::plugin-card.grid>
