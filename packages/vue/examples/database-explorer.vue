<script setup lang="ts">
import { NqDatabaseExplorer, type DatabaseSchema, type QueryOutcome } from "@fadymondy/nasaq/vue";

const schemas: DatabaseSchema[] = [
  {
    name: "public",
    tables: [
      {
        name: "users",
        rowCount: 1280,
        columns: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "email", type: "varchar(120)" },
          { name: "plan", type: "text", nullable: true },
          { name: "created_at", type: "timestamptz" },
        ],
      },
      {
        name: "orders",
        rowCount: 5421,
        columns: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "user_id", type: "uuid", references: "users.id" },
          { name: "total", type: "numeric(10,2)" },
        ],
      },
      { name: "active_users", kind: "view", columns: [{ name: "id", type: "uuid" }] },
    ],
  },
];

// Your server runs the statement (read-only user, timeout, row cap) and returns rows or { error }.
const api = {
  async query(sql: string): Promise<QueryOutcome> {
    if (/drop\s/i.test(sql)) return { error: "permission denied" };
    return {
      columns: ["id", "email", "plan"],
      rows: [
        ["u_1", "layla@example.com", "pro"],
        ["u_2", "omar@example.com", null],
      ],
      durationMs: 12,
    };
  },
};
</script>

<template>
  <NqDatabaseExplorer :schemas="schemas" :on-run-query="api.query" />
</template>
