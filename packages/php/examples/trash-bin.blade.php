@php
    $now = now()->setTime(9, 0)->toImmutable();
    $items = [
        ['id' => '1', 'name' => 'Q3 budget.xlsx', 'type' => 'doc', 'detail' => 'Finance / 2026', 'deletedAt' => $now->subDays(2)->toIso8601String(), 'deletedBy' => 'Huda Salem'],
        ['id' => '2', 'name' => 'Launch plan', 'type' => 'doc', 'detail' => 'Marketing', 'deletedAt' => $now->subDays(26)->toIso8601String(), 'deletedBy' => 'Omar Nasser'],
        ['id' => '3', 'name' => 'Old logo.png', 'type' => 'doc', 'deletedAt' => $now->subDays(12)->toIso8601String()],
    ];
@endphp
<x-nq::trash-bin :items="$items" :types="[['id' => 'doc', 'label' => 'Document', 'labelAr' => 'مستند', 'icon' => 'file-text']]" :retention-days="30" :now="$now->toIso8601String()" />
