<script setup lang="ts">
import { KeyRound, ShieldCheck, TriangleAlert } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqCodeBlock } from "../code-block";
import { NqCopyButton } from "../copy-button";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from "../table";
import { STRINGS, type ApiReferenceLabels } from "./strings";
import { accessVariant, type ApiTool } from "./types";

// One tool: name, scope and minimum role, the arguments table and example call and result.
interface Props {
  tool: ApiTool;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<ApiReferenceLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { labels: undefined });
const nasaq = useNasaq();
const t = computed<ApiReferenceLabels>(() => ({ ...STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const access = computed(() => props.tool.access ?? "read");
const args = computed(() => props.tool.args ?? []);
</script>

<template>
  <article data-slot="api-tool" :data-tool="props.tool.id" :class="cn('flex min-w-0 flex-col gap-5', props.class)">
    <header class="flex flex-col gap-2">
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <h2 class="min-w-0 break-all font-mono text-h3 text-foreground">
          <bdi dir="ltr">{{ props.tool.name }}</bdi>
        </h2>
        <NqCopyButton :value="props.tool.name" :label="t.copyName" size="icon-sm" variant="ghost" />
        <NqBadge v-if="props.tool.deprecated" variant="warning">
          <TriangleAlert aria-hidden="true" class="size-3" />
          {{ t.deprecated }}
        </NqBadge>
      </div>
      <p dir="auto" class="text-body text-foreground">{{ props.tool.description ?? props.tool.summary }}</p>
      <dl class="flex flex-wrap gap-x-6 gap-y-2 text-body-sm">
        <div class="flex items-center gap-2">
          <dt class="flex items-center gap-1 text-muted-foreground">
            <KeyRound aria-hidden="true" class="size-3.5" />
            {{ t.scope }}
          </dt>
          <dd>
            <NqBadge variant="outline">
              <bdi dir="ltr" class="font-mono">{{ props.tool.scope }}</bdi>
            </NqBadge>
          </dd>
        </div>
        <div class="flex items-center gap-2">
          <dt class="flex items-center gap-1 text-muted-foreground">
            <ShieldCheck aria-hidden="true" class="size-3.5" />
            {{ t.minRole }}
          </dt>
          <dd>
            <NqBadge variant="info">{{ props.tool.minRole }}</NqBadge>
          </dd>
        </div>
        <div class="flex items-center gap-2">
          <dt class="text-muted-foreground">{{ t.access }}</dt>
          <dd>
            <NqBadge :variant="accessVariant[access]">{{ t.accessLevels[access] }}</NqBadge>
          </dd>
        </div>
        <div v-if="props.tool.since" class="flex items-center gap-2 text-muted-foreground">
          <dt class="sr-only">{{ t.since("") }}</dt>
          <dd>{{ t.since(props.tool.since) }}</dd>
        </div>
      </dl>
    </header>

    <section class="flex flex-col gap-2" :aria-labelledby="`${props.tool.id}-args`">
      <h3 :id="`${props.tool.id}-args`" class="text-label text-foreground">{{ t.arguments }}</h3>
      <NqTable v-if="args.length" :label="t.arguments">
        <NqTableHeader>
          <NqTableRow>
            <NqTableHead>{{ t.name }}</NqTableHead>
            <NqTableHead>{{ t.type }}</NqTableHead>
            <NqTableHead>{{ t.description }}</NqTableHead>
          </NqTableRow>
        </NqTableHeader>
        <NqTableBody>
          <NqTableRow v-for="a in args" :key="a.name">
            <NqTableCell class="align-top">
              <div class="flex flex-col items-start gap-1">
                <bdi dir="ltr" class="font-mono text-code text-foreground">{{ a.name }}</bdi>
                <NqBadge :variant="a.required ? 'danger' : 'neutral'">{{ a.required ? t.required : t.optional }}</NqBadge>
              </div>
            </NqTableCell>
            <NqTableCell class="align-top">
              <bdi dir="ltr" class="font-mono text-code text-muted-foreground">{{ a.type }}</bdi>
            </NqTableCell>
            <NqTableCell class="min-w-56 align-top whitespace-normal">
              <p dir="auto" class="text-foreground">{{ a.description ?? "—" }}</p>
              <p v-if="a.values?.length" class="mt-1 flex flex-wrap items-center gap-1 text-caption text-muted-foreground">
                {{ t.values }}:
                <bdi v-for="v in a.values" :key="v" dir="ltr" class="rounded-control bg-muted px-1.5 py-0.5 font-mono text-code text-foreground">{{ v }}</bdi>
              </p>
              <p v-if="a.default !== undefined" class="mt-1 text-caption text-muted-foreground">
                {{ t.defaultValue }}:
                <bdi dir="ltr" class="font-mono text-code text-foreground">{{ a.default }}</bdi>
              </p>
            </NqTableCell>
          </NqTableRow>
        </NqTableBody>
      </NqTable>
      <p v-else class="text-body-sm text-muted-foreground">{{ t.noArguments }}</p>
      <p v-if="props.tool.returns" dir="auto" class="text-body-sm text-muted-foreground">
        <span class="text-foreground">{{ t.returns }}:</span> {{ props.tool.returns }}
      </p>
    </section>

    <section v-if="props.tool.examples?.length" class="flex flex-col gap-3" :aria-labelledby="`${props.tool.id}-ex`">
      <h3 :id="`${props.tool.id}-ex`" class="text-label text-foreground">{{ t.examples }}</h3>
      <div v-for="(ex, i) in props.tool.examples" :key="`${ex.title ?? ''}-${i}`" class="flex flex-col gap-2">
        <p v-if="ex.title" dir="auto" class="text-body-sm text-muted-foreground">{{ ex.title }}</p>
        <div class="grid min-w-0 gap-3 xl:grid-cols-2">
          <NqCodeBlock :code="ex.call" :language="ex.callLanguage ?? 'json'" :filename="t.call" pre-class-name="max-h-80" />
          <NqCodeBlock :code="ex.result" :language="ex.resultLanguage ?? 'json'" :filename="t.result" pre-class-name="max-h-80" />
        </div>
      </div>
    </section>
  </article>
</template>
