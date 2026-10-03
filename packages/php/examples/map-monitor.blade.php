<x-nq::map-monitor
    :regions="[
        ['id' => 'ksa', 'label' => 'Saudi Arabia', 'labelAr' => 'السعودية', 'center' => ['lat' => 23.9, 'lng' => 45.1], 'zoom' => 5],
        ['id' => 'riyadh', 'label' => 'Riyadh', 'labelAr' => 'الرياض', 'center' => ['lat' => 24.71, 'lng' => 46.67], 'zoom' => 10],
    ]"
    :alerts="[
        ['id' => 'a1', 'lat' => 24.71, 'lng' => 46.68, 'title' => 'Road closed', 'titleAr' => 'طريق مغلق', 'severity' => 'critical', 'at' => now()->subHour(), 'detail' => 'King Fahd Rd', 'detailAr' => 'طريق الملك فهد'],
        ['id' => 'a2', 'lat' => 24.77, 'lng' => 46.74, 'title' => 'Power outage', 'titleAr' => 'انقطاع الكهرباء', 'severity' => 'high', 'at' => now()->subHours(5)],
        ['id' => 'a3', 'lat' => 21.54, 'lng' => 39.17, 'title' => 'Delayed shipment', 'titleAr' => 'شحنة متأخرة', 'severity' => 'low', 'at' => now()->subHours(72)],
    ]"
    default-range="7d"
    class="max-w-5xl" />
