@php
    $families = [['id' => 'caffeine', 'name' => 'Caffeine', 'nameAr' => 'الكافيين'], ['id' => 'dairy', 'name' => 'Dairy', 'nameAr' => 'الألبان']];
    $items = [
        ['id' => 'tea', 'kind' => 'drink', 'name' => 'Green tea', 'nameAr' => 'شاي أخضر', 'verdict' => 'safe', 'verdictSource' => 'you', 'pinned' => true],
        ['id' => 'coffee', 'kind' => 'drink', 'name' => 'Espresso', 'nameAr' => 'إسبرسو', 'verdict' => 'trigger', 'verdictSource' => 'clinician', 'triggerFamilies' => ['caffeine'], 'note' => 'Not after noon.'],
        ['id' => 'yogurt', 'kind' => 'food', 'name' => 'Yogurt', 'verdict' => 'unreviewed', 'verdictSource' => 'none'],
    ];
    $pinned = [
        ['id' => 'water', 'name' => 'Water', 'nameAr' => 'ماء', 'icon' => 'glass-water'],
        ['id' => 'coffee', 'name' => 'Espresso', 'nameAr' => 'إسبرسو', 'icon' => 'coffee'],
    ];
    $flagged = [['id' => 'f1', 'at' => '2026-09-29T08:30:00Z', 'label' => 'Espresso', 'reason' => 'Logged after the cut-off time.', 'area' => 'Caffeine']];
@endphp
<div class="flex flex-col gap-8">
    <x-nq::health-trackers.cup-tracker :filled="7" :total="12" unit-label="250 ml" />
    <x-nq::health-trackers.quick-log-strip :items="$pinned" unpin />
    <x-nq::health-trackers.food-catalogue :items="$items" :families="$families" pin edit delete add />
    <x-nq::health-trackers.food-item-builder :families="$families" />
    <x-nq::health-trackers.flagged-entries :entries="$flagged" />
</div>
