@php
    $t = now()->getTimestamp() * 1000;
    $bookings = [
        ['id' => 'b1', 'code' => 'BK-7F3Q9K', 'phone' => '0100 123 4567', 'name' => 'Layla Hassan', 'startsAt' => $t + 10 * 60000],
        ['id' => 'b2', 'code' => 'BK-4M8TX2', 'phone' => '0111 222 3333', 'name' => 'Omar Nasser', 'startsAt' => $t + 25 * 60000],
        ['id' => 'b3', 'code' => 'BK-BBBBBB', 'phone' => '0122 000 1111', 'name' => 'Hadi Mansour', 'startsAt' => $t + 20 * 60000],
        ['id' => 'b4', 'code' => 'BK-CCCCCC', 'phone' => '0122 000 1111', 'name' => 'Hadi Jr', 'startsAt' => $t + 30 * 60000],
    ];
@endphp
{{-- A real page answers the event with a fetch to the server, which creates the queue entry:
     x-on:nq-check-in="$event.detail.promise = fetch('/check-in', { method: 'POST', body: JSON.stringify($event.detail) }).then((r) => r.json())" --}}
<x-nq::check-in-kiosk :bookings="$bookings" :now="$t"
    x-on:nq-check-in="$event.detail.promise = Promise.resolve({ entry: { ticket: 'A-021' }, position: 3, waitMinutes: 20 })" />
