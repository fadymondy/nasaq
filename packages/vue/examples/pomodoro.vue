<script setup lang="ts">
import { NqBreakLockScreen, NqPomodoroCard, usePomodoro } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const tasks = [
  { id: "t1", title: "Write the release notes", project: "Nasaq" },
  { id: "t2", title: "Review the booking flow" },
];
const task = ref<(typeof tasks)[number] | null>(tasks[0]!);
// Short durations so the break screen can be seen quickly.
const pomodoro = usePomodoro({ config: { focusMs: 20_000, shortBreakMs: 10_000 }, initialCompleted: 2 });
</script>

<template>
  <NqPomodoroCard :pomodoro="pomodoro" :tasks="tasks" :task="task" @task-change="task = $event" />
  <NqBreakLockScreen
    :open="pomodoro.onBreak.value"
    :phase="pomodoro.phase.value === 'longBreak' ? 'longBreak' : 'shortBreak'"
    :seconds="pomodoro.seconds.value"
    :fraction="pomodoro.fraction.value"
    :cycle="pomodoro.cycle.value"
    :cycles="pomodoro.cycles.value"
    :completed="pomodoro.completed.value"
    :next-task="task?.title"
    postpone
    @skip="pomodoro.skip()"
    @postponed="pomodoro.postpone($event * 60_000)"
  />
</template>
