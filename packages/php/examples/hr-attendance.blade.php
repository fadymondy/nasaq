@php
    $at = fn (string $time) => \Carbon\Carbon::parse('2026-09-29 '.$time, 'UTC');
@endphp
<x-nq::hr-attendance
    :punches="[
        ['id' => 'p1', 'kind' => 'in', 'at' => $at('09:05'), 'place' => 'Riyadh HQ'],
        ['id' => 'p2', 'kind' => 'break-start', 'at' => $at('12:00')],
        ['id' => 'p3', 'kind' => 'break-end', 'at' => $at('12:30')],
        ['id' => 'p4', 'kind' => 'out', 'at' => $at('17:00'), 'place' => 'Riyadh HQ'],
    ]"
    :shift="['start' => '09:00', 'end' => '17:00', 'graceMinutes' => 5]"
    place="Riyadh HQ"
    as-of="2026-09-29"
    employee="Sara Nasser"
    :types="[
        ['id' => 'annual', 'name' => 'Annual leave', 'annualDays' => 21, 'accrual' => 'monthly', 'carryOverMax' => 5],
        ['id' => 'sick', 'name' => 'Sick leave', 'annualDays' => 10],
        ['id' => 'unpaid', 'name' => 'Unpaid leave', 'annualDays' => 0, 'limited' => false],
    ]"
    :carried-over="['annual' => 3]"
    :calendar="['holidays' => ['2026-09-23']]"
    :requests="[
        ['id' => 'r1', 'employee' => 'Sara Nasser', 'typeId' => 'annual', 'start' => '2026-07-05', 'end' => '2026-07-09', 'status' => 'approved'],
        ['id' => 'r2', 'employee' => 'Sara Nasser', 'typeId' => 'annual', 'start' => '2026-10-11', 'end' => '2026-10-13', 'status' => 'pending', 'reason' => 'Family trip'],
        ['id' => 'r3', 'employee' => 'Omar Haddad', 'typeId' => 'sick', 'start' => '2026-09-14', 'end' => '2026-09-15', 'status' => 'approved'],
        ['id' => 'r4', 'employee' => 'Lina Aziz', 'typeId' => 'annual', 'start' => '2026-10-18', 'end' => '2026-10-22', 'status' => 'pending'],
    ]"
    :runs="[
        ['id' => 'run-aug', 'period' => '2026-08', 'status' => 'paid', 'payDate' => '2026-08-28', 'lines' => [
            ['id' => 'l1', 'employee' => 'Sara Nasser', 'basic' => 850000, 'allowances' => 100000, 'deductions' => 95000],
            ['id' => 'l2', 'employee' => 'Omar Haddad', 'basic' => 700000, 'allowances' => 80000, 'deductions' => 70000],
        ]],
        ['id' => 'run-sep', 'period' => '2026-09', 'status' => 'draft', 'payDate' => '2026-09-28', 'lines' => [
            ['id' => 'l3', 'employee' => 'Sara Nasser', 'basic' => 850000, 'allowances' => 100000, 'additions' => 25000, 'deductions' => 95000],
            ['id' => 'l4', 'employee' => 'Omar Haddad', 'basic' => 700000, 'allowances' => 80000, 'deductions' => 70000],
            ['id' => 'l5', 'employee' => 'Lina Aziz', 'basic' => 640000, 'allowances' => 60000, 'deductions' => 64000],
        ]],
    ]">
    <div class="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <x-nq::hr-attendance.marker />
        <x-nq::hr-attendance.balances can-request />
    </div>
    <x-nq::hr-attendance.request-list can-decide can-new />
    <x-nq::hr-attendance.payroll-runs can-approve can-mark-paid />
    <x-nq::hr-attendance.request-dialog />
</x-nq::hr-attendance>
