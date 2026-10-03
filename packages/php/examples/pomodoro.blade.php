<x-nq::pomodoro :config="['focusMs' => 20000, 'shortBreakMs' => 10000]" :completed="2" :tasks="[['id' => 't1', 'title' => 'Write the release notes'], ['id' => 't2', 'title' => 'Review the booking flow']]" task-id="t1">
    <x-nq::pomodoro.break-lock-screen postpone />
</x-nq::pomodoro>
