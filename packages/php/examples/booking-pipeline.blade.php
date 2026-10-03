<div class="flex flex-col gap-4">
    <x-nq::booking-pipeline.status-badge status="confirmed" />
    <x-nq::booking-pipeline status="confirmed" advance by="You" :history="[
        ['status' => 'requested', 'at' => now()->subHours(3)->toIso8601String(), 'by' => 'Sara'],
        ['status' => 'confirmed', 'at' => now()->subHours(2)->toIso8601String(), 'by' => 'Khaled'],
    ]" />
</div>
