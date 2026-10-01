import type { Meta, StoryObj } from "@storybook/react-vite";
import { ref } from "vue";
import { VueDemo, source } from "./_frameworks";

// Vue 3 with @fadymondy/nasaq/vue: `app.use(Nasaq)` registers every Nq* component. The template below is the
// real source of each story.
const meta = {
  title: "Frameworks/Vue",
  tags: ["!autodocs"],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const story = (template: string, setup?: () => Record<string, unknown>, script = ""): Story => ({
  render: () => <VueDemo template={template} setup={setup} />,
  parameters: source(`${script ? `<script setup lang="ts">\n${script.trim()}\n</script>\n\n` : ""}<template>${template}</template>`, "vue"),
});

export const Buttons = story(`
  <div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center">
    <NqButton variant="primary">Save</NqButton>
    <NqButton>Cancel</NqButton>
    <NqButton variant="ghost">Skip</NqButton>
    <NqButton variant="danger">Delete</NqButton>
    <NqButton variant="primary" loading>Saving</NqButton>
    <NqBadge variant="success">Paid</NqBadge>
    <NqBadge tag="teal">New</NqBadge>
  </div>
`);

const formSetup = () => ({ name: ref("Layla Haddad"), email: ref("layla@"), plan: ref("team"), receipts: ref(true) });
export const Form = story(
  `
  <NqCard style="max-width:28rem">
    <NqCardHeader>
      <NqCardTitle>Profile</NqCardTitle>
      <NqCardDescription>Shown on invoices and receipts.</NqCardDescription>
    </NqCardHeader>
    <NqCardContent style="display:grid;gap:1rem">
      <NqField label="Name"><NqInput v-model="name" /></NqField>
      <NqField label="Email" :error="email.includes('.') ? undefined : 'Enter a full email address.'">
        <NqInput v-model="email" type="email" />
      </NqField>
      <NqField label="Plan">
        <NqSelect v-model="plan" :options="[{ value: 'starter', label: 'Starter' }, { value: 'team', label: 'Team' }]" />
      </NqField>
      <NqSwitch v-model="receipts" label="Send receipts" />
    </NqCardContent>
    <NqCardFooter><NqButton variant="primary">Save</NqButton></NqCardFooter>
  </NqCard>
`,
  formSetup,
  `
import { ref } from "vue";
const name = ref("Layla Haddad");
const email = ref("layla@");
const plan = ref("team");
const receipts = ref(true);
`,
);

const tableSetup = () => ({
  columns: [
    { key: "id", label: "Order" },
    { key: "customer", label: "Customer" },
    { key: "status", label: "Status" },
    { key: "total", label: "Total", numeric: true },
  ],
  rows: [
    { id: "#1042", customer: "Omar Said", status: "Paid", total: 1280 },
    { id: "#1041", customer: "Sara Ali", status: "Pending", total: 86.5 },
  ],
  page: ref(1),
});
export const TableAndMoney = story(
  `
  <NqTable :columns="columns" :rows="rows" caption="Recent orders">
    <template #cell-status="{ row }"><NqBadge :variant="row.status === 'Paid' ? 'success' : 'warning'">{{ row.status }}</NqBadge></template>
    <template #cell-total="{ row }"><NqMoney :amount="row.total" /></template>
  </NqTable>
  <NqPagination v-model="page" :page-count="5" style="margin-top:1rem" />
`,
  tableSetup,
  `
import { ref } from "vue";
const columns = [
  { key: "id", label: "Order" },
  { key: "customer", label: "Customer" },
  { key: "status", label: "Status" },
  { key: "total", label: "Total", numeric: true },
];
const rows = [
  { id: "#1042", customer: "Omar Said", status: "Paid", total: 1280 },
  { id: "#1041", customer: "Sara Ali", status: "Pending", total: 86.5 },
];
const page = ref(1);
`,
);

const overlaySetup = () => ({
  open: ref(false),
  items: [
    { label: "Edit" },
    { label: "Duplicate" },
    { label: "Delete", variant: "danger" },
  ],
});
export const Overlays = story(
  `
  <div style="display:flex;flex-wrap:wrap;gap:.5rem">
    <NqButton variant="primary" @click="open = true">Invite people</NqButton>
    <NqMenu :items="items" label="Row actions">
      <template #trigger><NqButton>Actions</NqButton></template>
    </NqMenu>
    <NqTooltip content="Archive"><NqButton size="icon" aria-label="Archive">⌫</NqButton></NqTooltip>
  </div>
  <NqDialog v-model:open="open" title="Invite people" description="They get an email with a link to join.">
    <NqField label="Email"><NqInput type="email" /></NqField>
    <template #footer>
      <NqButton @click="open = false">Cancel</NqButton>
      <NqButton variant="primary" @click="open = false">Send invite</NqButton>
    </template>
  </NqDialog>
`,
  overlaySetup,
  `
import { ref } from "vue";
const open = ref(false);
const items = [{ label: "Edit" }, { label: "Duplicate" }, { label: "Delete", variant: "danger" }];
`,
);

export const Tabs = story(`
  <NqTabs default-value="overview" style="max-width:32rem">
    <NqTabsList label="Order">
      <NqTabsTrigger value="overview">Overview</NqTabsTrigger>
      <NqTabsTrigger value="items">Items</NqTabsTrigger>
    </NqTabsList>
    <NqTabsPanel value="overview">Paid on 12 Sep, shipped next day.</NqTabsPanel>
    <NqTabsPanel value="items">3 items.</NqTabsPanel>
  </NqTabs>
  <div style="max-width:32rem;margin-top:1.5rem">
    <NqAccordionItem title="Can I change plans later?" name="faq" open>Yes, any time.</NqAccordionItem>
    <NqAccordionItem title="Do you invoice in SAR?" name="faq">Yes, Arabic accounts default to SAR.</NqAccordionItem>
  </div>
`);
