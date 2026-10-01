import type { Meta, StoryObj } from "@storybook/react-vite";
import { HtmlDemo, source } from "./_frameworks";

// Plain HTML with @fadymondy/nasaq/html.css and the vanilla script (or the CDN build). No React, no Tailwind.
const meta = {
  title: "Frameworks/HTML",
  tags: ["!autodocs"],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const story = (html: string): Story => ({ render: () => <HtmlDemo html={html} />, parameters: source(html) });

export const Buttons = story(`
<div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center">
  <button class="nq-button" data-variant="primary">Save</button>
  <button class="nq-button">Cancel</button>
  <button class="nq-button" data-variant="ghost">Skip</button>
  <button class="nq-button" data-variant="danger">Delete</button>
  <button class="nq-button" data-variant="link">Learn more</button>
  <button class="nq-button" data-variant="primary" aria-busy="true" disabled><span class="nq-spinner" aria-hidden="true"></span>Saving</button>
  <button class="nq-button" data-size="sm">Small</button>
  <button class="nq-button" data-size="lg">Large</button>
</div>`);

export const Badges = story(`
<div style="display:flex;flex-wrap:wrap;gap:.5rem">
  <span class="nq-badge">Draft</span>
  <span class="nq-badge" data-variant="outline">Outline</span>
  <span class="nq-badge" data-variant="brand">Brand</span>
  <span class="nq-badge" data-variant="success">Paid</span>
  <span class="nq-badge" data-variant="warning">Overdue</span>
  <span class="nq-badge" data-variant="danger">Failed</span>
  <span class="nq-badge" data-variant="info">Sent</span>
  <span class="nq-badge" data-tag="teal">New</span>
  <span class="nq-badge" data-tag="violet">Beta</span>
</div>`);

export const Form = story(`
<form class="nq-card" style="max-width:28rem" onsubmit="event.preventDefault(); Nasaq.toast({ title: 'Saved', tone: 'success' })">
  <div class="nq-card-header">
    <h3 class="nq-card-title">Profile</h3>
    <p class="nq-card-description">Shown on invoices and receipts.</p>
  </div>
  <div class="nq-card-content" style="display:grid;gap:1rem">
    <div class="nq-field">
      <label class="nq-field-label" for="name">Name</label>
      <input class="nq-input" id="name" value="Layla Haddad">
    </div>
    <div class="nq-field">
      <label class="nq-field-label" for="email">Email</label>
      <input class="nq-input" id="email" type="email" value="layla@" aria-invalid="true" aria-describedby="email-error">
      <p class="nq-field-error" id="email-error">Enter a full email address.</p>
    </div>
    <div class="nq-field">
      <label class="nq-field-label" for="plan">Plan</label>
      <select class="nq-select" id="plan"><option>Starter</option><option selected>Team</option></select>
    </div>
    <label class="nq-choice"><input type="checkbox" class="nq-checkbox" checked> <span>Send receipts</span></label>
    <label class="nq-choice"><input type="checkbox" class="nq-switch" role="switch"> <span>Weekly digest</span></label>
  </div>
  <div class="nq-card-footer"><button class="nq-button" data-variant="primary" type="submit">Save</button></div>
</form>`);

export const TableAndMoney = story(`
<div class="nq-table-wrap">
  <table class="nq-table">
    <caption class="nq-sr-only">Recent orders</caption>
    <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th data-numeric>Total</th></tr></thead>
    <tbody>
      <tr><td>#1042</td><td>Omar Said</td><td><span class="nq-badge" data-variant="success">Paid</span></td><td data-numeric><span data-nq-money="1280"></span></td></tr>
      <tr><td>#1041</td><td>Sara Ali</td><td><span class="nq-badge" data-variant="warning">Pending</span></td><td data-numeric><span data-nq-money="86.5"></span></td></tr>
      <tr><td>#1040</td><td>Nour Hamed</td><td><span class="nq-badge" data-variant="danger">Refunded</span></td><td data-numeric><span data-nq-money="14200" data-compact></span></td></tr>
    </tbody>
  </table>
</div>
<p class="nq-caption" style="margin-top:.75rem">Prices follow the page language: USD, or SAR in Arabic. Set data-currency to override.</p>`);

export const Overlays = story(`
<div style="display:flex;flex-wrap:wrap;gap:.5rem">
  <button class="nq-button" data-nq-open="invite">Invite people</button>

  <button class="nq-button" data-nq="menu" aria-controls="row-actions">Actions</button>
  <div class="nq-menu" id="row-actions" role="menu" hidden>
    <button class="nq-menu-item" role="menuitem">Edit</button>
    <button class="nq-menu-item" role="menuitem">Duplicate</button>
    <div class="nq-menu-separator" role="separator"></div>
    <button class="nq-menu-item" role="menuitem" data-variant="danger">Delete</button>
  </div>

  <button class="nq-button" data-size="icon" aria-label="Archive" data-nq-tooltip="Archive">⌫</button>
  <button class="nq-button" onclick="Nasaq.toast({ title: 'Invoice sent', description: 'Omar gets it by email.', tone: 'success' })">Toast</button>
</div>

<dialog id="invite" class="nq-dialog" data-nq="dialog" aria-labelledby="invite-title">
  <div class="nq-dialog-header">
    <h2 class="nq-dialog-title" id="invite-title">Invite people</h2>
    <p class="nq-dialog-description">They get an email with a link to join.</p>
  </div>
  <div class="nq-field"><label class="nq-field-label" for="invite-email">Email</label><input class="nq-input" id="invite-email" type="email"></div>
  <div class="nq-dialog-footer">
    <button class="nq-button" data-nq-close>Cancel</button>
    <button class="nq-button" data-variant="primary" data-nq-close="send">Send invite</button>
  </div>
  <button class="nq-dialog-close" data-nq-close aria-label="Close">×</button>
</dialog>`);

export const TabsAndAccordion = story(`
<div data-nq="tabs" style="max-width:32rem">
  <div class="nq-tabs-list" role="tablist" aria-label="Order">
    <button class="nq-tabs-trigger" role="tab" aria-controls="t-overview">Overview</button>
    <button class="nq-tabs-trigger" role="tab" aria-controls="t-items">Items</button>
    <button class="nq-tabs-trigger" role="tab" aria-controls="t-history">History</button>
  </div>
  <div class="nq-tabs-panel" role="tabpanel" id="t-overview">Paid on 12 Sep, shipped next day.</div>
  <div class="nq-tabs-panel" role="tabpanel" id="t-items" hidden>3 items.</div>
  <div class="nq-tabs-panel" role="tabpanel" id="t-history" hidden>No changes.</div>
</div>

<div data-nq="accordion" style="max-width:32rem;margin-top:1.5rem">
  <details class="nq-accordion" open><summary>Can I change plans later?</summary><div class="nq-accordion-content">Yes, any time. We prorate the difference.</div></details>
  <details class="nq-accordion"><summary>Do you invoice in SAR?</summary><div class="nq-accordion-content">Yes, Arabic accounts default to SAR.</div></details>
</div>`);

export const CardsAndStates = story(`
<div style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr))">
  <div class="nq-card">
    <div class="nq-card-header"><p class="nq-stat-label">Revenue</p></div>
    <div class="nq-card-content"><p class="nq-stat-value"><span data-nq-money="48250"></span></p>
      <div class="nq-progress" role="progressbar" aria-valuenow="64" aria-valuemin="0" aria-valuemax="100" aria-label="Goal" style="--value:64%"><span></span></div></div>
  </div>
  <div class="nq-alert" data-tone="warning" role="status">
    <div><p class="nq-alert-title">Payment overdue</p><div class="nq-alert-description">Invoice #1042 is 5 days late.</div></div>
  </div>
  <div class="nq-empty">
    <p class="nq-empty-title">No orders yet</p>
    <p class="nq-empty-description">Orders show up here once customers check out.</p>
    <button class="nq-button" data-variant="primary">Create order</button>
  </div>
  <div style="display:flex;gap:.5rem;align-items:center">
    <span class="nq-avatar"><span role="img" aria-label="Layla Haddad">LH</span></span>
    <span class="nq-skeleton" style="height:1rem;width:8rem"></span>
    <kbd class="nq-kbd">⌘K</kbd>
  </div>
</div>`);
