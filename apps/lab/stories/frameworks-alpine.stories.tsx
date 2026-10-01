import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlpineDemo, source } from "./_frameworks";

// Alpine.js with the Nasaq plugin: what a Livewire, FilamentPHP or TomatoPHP page writes. The same .nq-* classes;
// Alpine adds state (x-data="nqTabs", "nqMenu", "nqDialog") and the $nq store (toast, money, theme, locale).
const meta = {
  title: "Frameworks/Alpine",
  tags: ["!autodocs"],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const story = (html: string): Story => ({ render: () => <AlpineDemo html={html} />, parameters: source(html) });

export const LiveForm = story(`
<form class="nq-card" style="max-width:28rem" x-data="{ qty: 2, price: 49, gift: false }"
      @submit.prevent="$nq.toast({ title: 'Order placed', tone: 'success' })">
  <div class="nq-card-header">
    <h3 class="nq-card-title">Checkout</h3>
    <p class="nq-card-description">The total updates as you type.</p>
  </div>
  <div class="nq-card-content" style="display:grid;gap:1rem">
    <div class="nq-field">
      <label class="nq-field-label" for="qty">Quantity</label>
      <input class="nq-input" id="qty" type="number" min="1" x-model.number="qty">
    </div>
    <label class="nq-choice"><input type="checkbox" class="nq-switch" role="switch" x-model="gift"> <span>Gift wrap (+5)</span></label>
    <p class="nq-h3">Total: <span x-nq-money="qty * price + (gift ? 5 : 0)"></span></p>
  </div>
  <div class="nq-card-footer"><button class="nq-button" data-variant="primary" type="submit">Place order</button></div>
</form>`);

export const Tabs = story(`
<div x-data="nqTabs('overview')" style="max-width:32rem">
  <div class="nq-tabs-list" role="tablist" aria-label="Order">
    <button x-bind="tab('overview')">Overview</button>
    <button x-bind="tab('items')">Items</button>
    <button x-bind="tab('history')">History</button>
  </div>
  <div x-bind="panel('overview')">Paid on 12 Sep, shipped next day.</div>
  <div x-bind="panel('items')">3 items.</div>
  <div x-bind="panel('history')">No changes.</div>
</div>`);

export const Menu = story(`
<div x-data="nqMenu" style="display:inline-block">
  <button class="nq-button" x-bind="trigger">Actions</button>
  <div x-bind="menu" aria-label="Order actions">
    <button x-bind="item" @click="$nq.toast('Opened')">Open</button>
    <button x-bind="item" @click="$nq.toast('Archived')">Archive</button>
    <div class="nq-menu-separator" role="separator"></div>
    <button x-bind="item" data-variant="danger" @click="$nq.toast({ title: 'Deleted', tone: 'danger' })">Delete</button>
  </div>
</div>`);

export const Dialog = story(`
<div x-data="nqDialog">
  <button class="nq-button" data-variant="primary" @click="show()">Invite people</button>
  <dialog class="nq-dialog" aria-labelledby="invite-title">
    <div class="nq-dialog-header">
      <h2 class="nq-dialog-title" id="invite-title">Invite people</h2>
      <p class="nq-dialog-description">They get an email with a link to join.</p>
    </div>
    <div class="nq-field"><label class="nq-field-label" for="invite-email">Email</label><input class="nq-input" id="invite-email" type="email"></div>
    <div class="nq-dialog-footer">
      <button class="nq-button" @click="close()">Cancel</button>
      <button class="nq-button" data-variant="primary" @click="close(); $nq.toast({ title: 'Invite sent', tone: 'success' })">Send invite</button>
    </div>
  </dialog>
</div>`);

export const StoreAndLocale = story(`
<div class="nq-card" style="max-width:28rem">
  <div class="nq-card-content" style="display:grid;gap:.75rem">
    <p class="nq-body">Locale <strong x-text="$nq.locale"></strong> · direction <strong x-text="$nq.dir"></strong> · theme <strong x-text="$nq.theme"></strong></p>
    <p class="nq-h3" x-nq-money="1499"></p>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap">
      <button class="nq-button" @click="$nq.setLocale($nq.locale === 'ar' ? 'en' : 'ar')">Toggle Arabic</button>
      <button class="nq-button" @click="$nq.toggleTheme()">Toggle theme</button>
      <button class="nq-button" @click="$nq.toast({ title: $nq.money(25), description: 'Charged to the card on file.' })">Charge</button>
    </div>
    <p class="nq-caption">Livewire: <code>$this->dispatch('nq-toast', title: 'Saved', tone: 'success')</code></p>
  </div>
</div>`);
