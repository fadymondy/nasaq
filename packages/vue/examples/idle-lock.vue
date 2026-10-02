<script setup lang="ts">
import { NqIdleLock, NqLockScreen } from "@fadymondy/nasaq/vue";

const user = { name: "Nour Adel" };

// Your API call. Resolve { error } for a wrong password.
async function verify(secret: string): Promise<boolean> {
  const res = await fetch("/api/unlock", { method: "POST", body: JSON.stringify({ secret }) });
  return res.ok;
}
</script>

<template>
  <NqIdleLock :timeout-seconds="600" :warning-seconds="30">
    <p>The app</p>
    <template #lockScreen="{ unlock }">
      <NqLockScreen
        :user="user"
        :methods="['password']"
        :on-unlock="async (attempt) => ((await verify(attempt.secret)) ? unlock() : { error: 'Wrong password.' })"
      />
    </template>
  </NqIdleLock>
</template>
