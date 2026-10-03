{{-- <x-nq::time-tracker :projects="[['id' => 'web', 'name' => 'Website', 'tasks' => [['id' => 'ui', 'name' => 'UI polish']]]]" :entries="$entries" log-on-stop>
       <x-nq::time-tracker.timer /> <x-nq::time-tracker.entries /> <x-nq::time-tracker.timesheet />
     </x-nq::time-tracker>
     The time tracker scope: the projects, the entries and the running timer. Put the parts you need inside it; they share the state, so a stopped
     timer or a new entry shows up in the list and the timesheet. Durations are whole seconds, dates are "YYYY-MM-DD".
     projects: [{id, name, tasks?: [{id, name}]}]. entries: [{id, date, seconds, projectId, taskId?, note?}]. running: {projectId, taskId?, note?, startedAt (epoch ms)} or null.
     view: week | day (the timesheet). date: any day inside the period shown (default today). week-starts-on: 0 Sunday ... 6 Saturday (Monday, or Saturday in Arabic).
     log-on-stop: add an entry to the list when the timer stops.
     Events from the root: time-start, time-stop, time-entry-add, time-entry-edit, time-entry-delete (they run before the change: call event.detail.fail("message") to veto it),
     then time-running-change, time-entries-change (all entries, to persist them) and time-date-change. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['projects' => [], 'entries' => [], 'running' => null, 'view' => 'week', 'date' => null, 'weekStartsOn' => null, 'logOnStop' => false])
@php
    $js = array_filter([
        'projects' => array_values($projects),
        'entries' => array_values($entries),
        'running' => $running,
        'view' => $view,
        'date' => $date,
        'weekStartsOn' => $weekStartsOn !== null ? (int) $weekStartsOn : null,
        'logOnStop' => (bool) $logOnStop ?: null,
    ], fn ($v) => $v !== null);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'time-tracker-root') }}" x-data="nqTimeTracker({{ \Illuminate\Support\Js::from((object) $js) }})" {{ $attributes->except('data-slot')->cn('flex flex-col gap-6') }}>
    {{ $slot }}
</div>
