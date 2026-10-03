<script setup lang="ts">
import { NqInput, NqTestRunStream, type TestRunHandlers } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const slug = "news-feed";
const max = ref("5");

function run(on: TestRunHandlers, signal: AbortSignal) {
  const es = new EventSource(`/api/sources/${slug}/test-run?max=${max.value}`);
  signal.addEventListener("abort", () => es.close());
  es.addEventListener("step", (e) => on.step(JSON.parse((e as MessageEvent).data)));
  es.addEventListener("saved", (e) => on.result(JSON.parse((e as MessageEvent).data)));
  es.addEventListener("complete", () => {
    es.close();
    on.done();
  });
  es.addEventListener("error", () => {
    es.close();
    on.fail("The connection closed.");
  });
}
</script>

<template>
  <NqTestRunStream :run="run">
    <template #controls>
      <NqInput v-model="max" ltr type="number" min="1" class="w-20" />
    </template>
  </NqTestRunStream>
</template>
