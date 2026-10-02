@php
    $day = fn (int $offset) => now()->addDays($offset)->format('Y-m-d');
@endphp
<x-nq::time-tracker log-on-stop
    :projects="[
        ['id' => 'web', 'name' => 'Website', 'tasks' => [['id' => 'ui', 'name' => 'UI polish'], ['id' => 'seo', 'name' => 'SEO fixes']]],
        ['id' => 'app', 'name' => 'Mobile app', 'tasks' => [['id' => 'auth', 'name' => 'Sign-in flow']]],
    ]"
    :entries="[
        ['id' => '1', 'date' => $day(0), 'seconds' => 5400, 'projectId' => 'web', 'taskId' => 'ui', 'note' => 'Header spacing'],
        ['id' => '2', 'date' => $day(0), 'seconds' => 2700, 'projectId' => 'app', 'taskId' => 'auth'],
        ['id' => '3', 'date' => $day(-1), 'seconds' => 10800, 'projectId' => 'web', 'taskId' => 'seo', 'note' => 'Sitemap and meta'],
    ]">
    <x-nq::time-tracker.timer />
    <x-nq::time-tracker.entries />
    <x-nq::time-tracker.timesheet />
</x-nq::time-tracker>
