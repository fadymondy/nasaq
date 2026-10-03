<div class="flex flex-col gap-6">
    <x-nq::social-composer
        :accounts="[['id' => 'x1', 'platform' => 'x', 'name' => '@nasaq'], ['id' => 'ig1', 'platform' => 'instagram', 'name' => 'nasaq']]"
        :default-value="['body' => 'Nasaq 1.0 is out.', 'accountIds' => ['x1', 'ig1']]"
        :assist-actions="[['id' => 'shorten', 'label' => 'Shorten'], ['id' => 'tone', 'label' => 'Change tone']]"
        attach save-draft />
    <x-nq::social-composer.metrics-table
        :rows="[
            ['id' => 'p1', 'platform' => 'x', 'account' => '@nasaq', 'text' => 'Nasaq 1.0 is out.', 'status' => 'published', 'publishedAt' => '2026-09-20', 'impressions' => 12400, 'likes' => 310, 'replies' => 24, 'reposts' => 51],
            ['id' => 'p2', 'platform' => 'linkedin', 'account' => 'Nasaq Studio', 'text' => 'Launch week recap.', 'status' => 'queued'],
        ]"
        :row-actions="[['id' => 'open', 'label' => 'Open']]" />
</div>
