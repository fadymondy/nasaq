@php
    $start = now()->addDays(5)->setTime(10, 0);
    $booking = [
        'id' => 'b1', 'code' => 'NQ-4821', 'status' => 'confirmed',
        'start' => $start->toIso8601String(), 'end' => $start->addMinutes(30)->toIso8601String(),
        'service' => 'Dental check-up', 'provider' => 'Dr. Omar Nasser', 'location' => 'Riyadh clinic',
        'patient' => 'Huda Salem', 'phone' => '+966 50 123 4567', 'price' => 60, 'payment' => 'visit',
    ];
    $slots = collect([9, 10, 11, 13, 14])->map(fn ($h) => ['start' => $start->setTime($h, 0)->format('Y-m-d\TH:i'), 'state' => $h === 10 ? 'full' : 'available'])->all();
@endphp
<div class="flex flex-col gap-6">
    <x-nq::booking-manage :booking="$booking" :policy="['cancelHours' => 24, 'lateFeePercent' => 50]" :slots="$slots" :now="now()->toIso8601String()" />
    <x-nq::booking-manage.ticket :booking="[...$booking, 'code' => 'NQ-9000', 'payment' => 'online', 'paid' => true, 'status' => 'done']" hide-calendar />
</div>
