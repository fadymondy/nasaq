@php
    $locations = [
        ['id' => 'l1', 'name' => 'Riyadh clinic', 'address' => 'King Fahd Rd', 'city' => 'Riyadh'],
        ['id' => 'l2', 'name' => 'Jeddah clinic', 'address' => 'Tahlia St', 'city' => 'Jeddah'],
    ];
    $services = [
        ['id' => 's1', 'name' => 'Dental check-up', 'durationMinutes' => 30, 'price' => 60, 'category' => 'Dental'],
        ['id' => 's2', 'name' => 'Skin consultation', 'durationMinutes' => 45, 'price' => 90, 'category' => 'Skin'],
    ];
    $providers = [
        ['id' => 'p1', 'name' => 'Dr. Omar Nasser', 'specialty' => 'Dentist', 'rating' => 4.9, 'reviews' => 212],
        ['id' => 'p2', 'name' => 'Dr. Huda Salem', 'specialty' => 'Dermatologist', 'rating' => 4.7, 'reviews' => 96, 'serviceIds' => ['s2']],
    ];
    // The next three days, hourly from 09:00 to 13:00.
    $slots = [];
    foreach ([1, 2, 3] as $d) {
        foreach ([9, 10, 11, 12, 13] as $h) {
            $slots[] = ['start' => now()->addDays($d)->setTime($h, 0)->format('Y-m-d\TH:i'), 'state' => 'available'];
        }
    }
@endphp
<x-nq::booking-flow :locations="$locations" :services="$services" :providers="$providers" :slots="$slots" />
