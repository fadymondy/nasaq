{{-- <x-nq::hr-attendance :punches="$punches" :shift="['start' => '09:00', 'end' => '17:00']" :types="$types" :requests="$requests" :runs="$runs">
       <x-nq::hr-attendance.marker /> <x-nq::hr-attendance.balances can-request /> <x-nq::hr-attendance.request-list can-decide /> <x-nq::hr-attendance.payroll-runs can-approve can-mark-paid />
       <x-nq::hr-attendance.request-dialog />
     </x-nq::hr-attendance>
     The HR scope: today's punches, the leave types and requests and the payroll runs. The parts share the state, so a punch, a decision or a new request shows up everywhere.
     punches: [{id?, kind: in | out | break-start | break-end, at (epoch ms, an ISO string or a date), place?}]. shift: {start: "09:00", end: "17:00", graceMinutes?}. place, breaks (default true), now (epoch ms; fixes the clock, default the real one).
     types: [{id, name, days, limited?, accrual?: upfront | monthly, carryOverMax?, ...}]. requests: [{id, employee?, typeId, start, end, halfStart?, halfEnd?, status: pending | approved | rejected | cancelled, reason?, note?}].
     runs: [{id, period: "2026-09", status: draft | approved | paid, payDate?, lines: [{id, employee, basic, allowances?, additions?, deductions?, workedDays?, workingDays?}]}]. Money is integer minor units, dates are "YYYY-MM-DD".
     mode: manager | self (the request list). employee: whose requests the balances and the request dialog count (default every request). year, as-of, carried-over, calendar: as the React component. currency: default USD, SAR in Arabic.
     labels: overrides by dotted key, e.g. ['problems.range' => '...', 'statuses.pending' => '...', 'runStatuses.paid' => '...'].
     Events from the root (they run before the change: call event.detail.fail("message") to veto it, or event.detail.wait(promise)): hr-punch, hr-leave-decide, hr-leave-withdraw, hr-leave-request, hr-payroll-approve,
     hr-payroll-paid; then hr-punches-change, hr-requests-change, hr-runs-change (the whole list, to persist it). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['punches' => [], 'shift' => null, 'place' => null, 'breaks' => true, 'now' => null, 'types' => [], 'requests' => [], 'year' => null, 'asOf' => null, 'carriedOver' => [], 'calendar' => [], 'mode' => 'manager', 'employee' => null, 'runs' => [], 'currency' => null, 'labels' => []])
@php
    $punchList = array_values(array_map(function ($p) {
        $p = (array) $p;
        if ($p['at'] instanceof \DateTimeInterface) {
            $p['at'] = $p['at']->getTimestamp() * 1000;
        }
        return $p;
    }, (array) $punches));
    $js = array_filter([
        'punches' => $punchList,
        'shift' => $shift,
        'place' => $place,
        'breaks' => $breaks ? null : false,
        'now' => $now,
        'types' => array_values((array) $types),
        'requests' => array_values((array) $requests),
        'year' => $year,
        'asOf' => $asOf,
        'carriedOver' => (object) (array) $carriedOver,
        'calendar' => (object) (array) $calendar,
        'mode' => $mode !== 'manager' ? $mode : null,
        'employee' => $employee,
        'runs' => array_values((array) $runs),
        'currency' => $currency,
        'labels' => (object) (array) $labels,
    ], fn ($v) => $v !== null);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'hr-attendance-root') }}" x-data="nqHrAttendance({{ \Illuminate\Support\Js::from((object) $js) }})" {{ $attributes->except('data-slot')->cn('flex flex-col gap-6') }}>
    {{ $slot }}
</div>
