@php
    $records = [
        [
            'id' => 'c1',
            'name' => 'Sara Alharbi',
            'values' => ['name' => 'Sara Alharbi', 'email' => 'sara@example.com', 'phone' => '+966 50 123 4567', 'company' => 'Nasaq', 'tags' => ['vip']],
            'createdAt' => now()->subMonths(6),
            'stats' => [['label' => 'Deals', 'value' => 2]],
            'identities' => [['channel' => 'email', 'value' => 'sara@example.com']],
            'consent' => ['email' => 'granted'],
        ],
        [
            'id' => 'c2',
            'name' => 'Sara Al-Harbi',
            'values' => ['name' => 'Sara Al-Harbi', 'email' => 'sara@example.com', 'phone' => '+966 55 987 6543', 'jobTitle' => 'Designer', 'tags' => ['lead', 'vip']],
            'createdAt' => now()->subMonth(),
            'stats' => [['label' => 'Deals', 'value' => 1], ['label' => 'Notes', 'value' => 4]],
            'identities' => [['channel' => 'whatsapp', 'value' => '+966559876543']],
            'consent' => ['email' => 'denied', 'whatsapp' => 'granted'],
        ],
    ];
@endphp
<div x-data x-on:nq-merge="$event.detail.waitUntil(new Promise((resolve) => setTimeout(resolve, 400)))">
    <x-nq::contact-merge :records="$records" cancellable />
</div>
