/*
 * Demo data and stateful page shells for the account and admin order stories.
 * Built on _store-demo.ts. Money is integer minor units (EGP piasters). Names and figures are invented.
 */
import {
  type AbandonedCart,
  Button,
  type CommerceAddress,
  type CommerceOrder,
  type RefundRecord,
  type ReturnRequest,
  StoreAbandonedCarts,
  StoreAccountLayout,
  StoreAccountNav,
  StoreAccountOrder,
  type StoreAccountSection,
  StoreAddressBook,
  StoreOrderDetail,
  type StoreOrderDocumentKind,
  StoreOrderHistory,
  StoreOrderPrintView,
  StoreOrdersList,
  StoreRecentlyViewed,
  StoreReturnRequest,
  StoreReturnStatus,
  StoreWishlist,
  type WishlistItem,
  applyFulfilment,
  planFulfilment,
  planReturn,
  pushRecentlyViewed,
  removeRecent,
  removeWishlistItem,
  toggleNotify,
} from "@nasaq/web";
import { useMemo, useState } from "react";
import { useAr } from "./_s-demo";
import { STORE_CURRENCY, type StoreLocale, storeAddresses, storeOrders, storeProducts } from "./_store-demo";

export type OrdersDemoMode = "default" | "loading" | "empty" | "error";
export const ORDERS_NOW = new Date("2026-09-30T09:30:00Z");
export const TRACKING_TEMPLATE = "https://track.example.com/?n={number}";

/** Orders in mixed states: delivered, shipped, processing, paid, unpaid, cancelled, refunded, out for delivery, part shipped. */
export function ordersSeed(locale: StoreLocale): CommerceOrder[] {
  const ar = locale === "ar";
  return storeOrders(locale).map((o, n): CommerceOrder => {
    const shipped = ["shipped", "out-for-delivery", "delivered", "refunded"].includes(o.status);
    const lines = o.lines.map((l) => ({
      ...l,
      ...(shipped ? { fulfilled: l.quantity } : {}),
      ...(o.status === "refunded" ? { refunded: l.quantity } : {}),
    }));
    const extra =
      o.status === "delivered"
        ? [{ at: o.placedAt.replace(/T.*/, "T15:00:00Z"), kind: "delivered", label: ar ? "تم التسليم" : "Delivered" }]
        : [];
    return { ...o, lines, events: [...(o.events ?? []), ...extra], ...(n === 3 ? { payment: "cod" as const } : {}) };
  });
}

export function returnsSeed(orders: CommerceOrder[], locale: StoreLocale): ReturnRequest[] {
  const ar = locale === "ar";
  const o9 = orders[9]!;
  const o0 = orders[0]!;
  return [
    { id: "r1", number: "RMA-1001", orderId: o9.id, createdAt: "2026-09-25T10:00:00Z", status: "approved", lines: [{ lineId: o9.lines[0]!.id, quantity: 1 }], reason: "too-small", note: ar ? "المقاس أصغر من المتوقع" : "Runs small", refundMethod: "original", refundAmount: o9.lines[0]!.unitPrice },
    { id: "r2", number: "RMA-1002", orderId: o0.id, createdAt: "2026-09-29T08:00:00Z", status: "requested", lines: [{ lineId: o0.lines[0]!.id, quantity: 1 }], reason: "changed-mind", refundMethod: "store-credit", refundAmount: o0.lines[0]!.unitPrice },
  ];
}

export function wishlistSeed(locale: StoreLocale): WishlistItem[] {
  const p = storeProducts(locale);
  const first = (id: string, i = 0) => p.find((x) => x.id === id)!.variants[i]!;
  const soldOut = (id: string) => p.find((x) => x.id === id)!.variants.find((x) => x.stock === 0)!;
  return [
    { id: "w1", productId: "watch", variantId: first("watch").id, addedAt: "2026-09-20T10:00:00Z", priceWhenSaved: 299900 },
    { id: "w2", productId: "sneaker", variantId: soldOut("sneaker").id, addedAt: "2026-09-18T10:00:00Z", notify: true },
    { id: "w3", productId: "tee", variantId: first("tee", 4).id, addedAt: "2026-09-15T10:00:00Z" },
    { id: "w4", productId: "lamp", variantId: first("lamp").id, addedAt: "2026-09-10T10:00:00Z", notify: false },
    { id: "w5", productId: "cap", variantId: soldOut("cap").id, addedAt: "2026-09-09T10:00:00Z" },
  ];
}

export function abandonedSeed(locale: StoreLocale): AbandonedCart[] {
  const ar = locale === "ar";
  const p = storeProducts(locale);
  const line = (pid: string, quantity: number) => {
    const prod = p.find((x) => x.id === pid)!;
    const v = prod.variants.find((x) => (x.stock ?? 1) > 0) ?? prod.variants[0]!;
    return { id: `c-${pid}`, productId: pid, variantId: v.id, name: prod.name, unitPrice: v.price, quantity, ...(v.image ? { image: v.image } : {}) };
  };
  return [
    { id: "ab1", customer: { name: ar ? "منى عادل" : "Mona Adel", email: "mona@example.com" }, lines: [line("headphones", 1), line("cap", 1)], lastActivityAt: "2026-09-30T05:10:00Z", stage: "payment", emailsSent: 0 },
    { id: "ab2", customer: { name: ar ? "عمر ناصر" : "Omar Nasser", email: "omar@example.com" }, lines: [line("hoodie", 2)], lastActivityAt: "2026-09-29T14:00:00Z", stage: "checkout", emailsSent: 1, lastEmailAt: "2026-09-29T20:00:00Z" },
    { id: "ab3", customer: null, lines: [line("mug", 3)], lastActivityAt: "2026-09-28T09:00:00Z", stage: "cart", emailsSent: 0 },
    { id: "ab4", customer: { name: ar ? "ليلى حسن" : "Laila Hassan", email: "laila@example.com" }, lines: [line("watch", 1)], lastActivityAt: "2026-09-27T09:00:00Z", stage: "payment", emailsSent: 3, lastEmailAt: "2026-09-28T09:00:00Z" },
    { id: "ab5", customer: { name: ar ? "يوسف كمال" : "Youssef Kamal", email: "youssef@example.com" }, lines: [line("bottle", 2)], lastActivityAt: "2026-09-26T09:00:00Z", stage: "cart", emailsSent: 1, recoveredOrderId: "ord-1041" },
    { id: "ab6", customer: { name: ar ? "سارة أحمد" : "Sara Ahmed", email: "sara@example.com" }, lines: [line("perfume", 1)], lastActivityAt: "2026-09-30T09:10:00Z", stage: "cart", emailsSent: 0 },
  ];
}

const SELLER = (ar: boolean) => ({
  name: ar ? "متجر بيت" : "Bayt Store",
  lines: [ar ? "١٠ شارع الجمهورية، القاهرة" : "10 Gomhoria Street, Cairo"],
  email: "orders@bayt.example",
  phone: "+20 2 5555 0100",
  taxId: "123-456-789",
});

const shell = "min-h-dvh bg-background text-foreground";

/* ---------------------------------------------------------------- account */

export interface AccountView {
  section: StoreAccountSection;
  orderId?: string;
  returnFor?: string;
}

export function AccountPage({ start = { section: "orders" }, mode = "default" }: { start?: AccountView; mode?: OrdersDemoMode }) {
  const ar = useAr();
  const locale: StoreLocale = ar ? "ar" : "en";
  const products = useMemo(() => storeProducts(locale), [locale]);
  const [orders] = useState(() => ordersSeed(locale));
  const [requests, setRequests] = useState(() => returnsSeed(ordersSeed(locale), locale));
  const [wish, setWish] = useState(() => wishlistSeed(locale));
  const [addresses, setAddresses] = useState<CommerceAddress[]>(() => storeAddresses(locale));
  const [recent, setRecent] = useState<string[]>(["watch", "headphones", "mug", "plant", "bag", "lamp"]);
  const [view, setView] = useState<AccountView>(start);
  const [cart, setCart] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const loading = mode === "loading";
  const error = mode === "error";
  const empty = mode === "empty";
  const order = orders.find((o) => o.id === view.orderId);
  const say = (m: string) => setToast(m);

  let body;
  if (view.returnFor && order) {
    body = (
      <StoreReturnRequest
        order={order}
        currency={STORE_CURRENCY}
        requests={requests}
        now={ORDERS_NOW}
        onBack={() => setView({ section: "orders", orderId: order.id })}
        onSubmit={(s) => {
          const plan = planReturn(order, requests, { picks: s.lines, reason: s.reason, photos: s.photos.length, refundMethod: s.refundMethod, windowOpen: true });
          setRequests((r) => [
            { id: `r${r.length + 1}`, number: `RMA-${1001 + r.length}`, orderId: order.id, createdAt: ORDERS_NOW.toISOString(), status: "requested", lines: s.lines, reason: s.reason, ...(s.note ? { note: s.note } : {}), refundMethod: s.refundMethod, refundAmount: plan.refundAmount },
            ...r,
          ]);
          setView({ section: "returns" });
          say(ar ? "تم إرسال طلب الإرجاع" : "Return request sent");
        }}
      />
    );
  } else if (view.section === "orders" && order) {
    body = (
      <StoreAccountOrder
        order={order}
        currency={STORE_CURRENCY}
        requests={requests}
        products={products}
        trackingTemplate={TRACKING_TEMPLATE}
        now={ORDERS_NOW}
        onBack={() => setView({ section: "orders" })}
        onReorder={(_o, plan) => {
          setCart((c) => c + plan.add.length);
          say(ar ? "تمت الإضافة إلى السلة" : "Added to your cart");
        }}
        onReturn={(o) => setView({ section: "orders", orderId: o.id, returnFor: o.id })}
        onCancelReturn={(r) => setRequests((all) => all.map((x) => (x.id === r.id ? { ...x, status: "cancelled" } : x)))}
      />
    );
  } else if (view.section === "orders") {
    body = (
      <StoreOrderHistory
        orders={empty ? [] : orders}
        products={products}
        currency={STORE_CURRENCY}
        trackingTemplate={TRACKING_TEMPLATE}
        loading={loading}
        error={error}
        onRetry={() => undefined}
        onOpenOrder={(o) => setView({ section: "orders", orderId: o.id })}
        onReorder={(_o, plan) => setCart((c) => c + plan.add.length)}
        onOpenCart={() => say(ar ? "فتح السلة" : "Open cart")}
      />
    );
  } else if (view.section === "returns") {
    const list = empty ? [] : requests;
    body =
      list.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{ar ? "لا توجد طلبات إرجاع." : "No return requests yet."}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {list.map((r) => (
            <StoreReturnStatus
              key={r.id}
              request={r}
              order={orders.find((x) => x.id === r.orderId)!}
              currency={STORE_CURRENCY}
              onCancel={(x) => setRequests((all) => all.map((y) => (y.id === x.id ? { ...y, status: "cancelled" } : y)))}
            />
          ))}
        </div>
      );
  } else if (view.section === "wishlist") {
    body = (
      <StoreWishlist
        items={empty ? [] : wish}
        products={products}
        currency={STORE_CURRENCY}
        loading={loading}
        error={error}
        onRetry={() => undefined}
        onMoveToCart={(e) => {
          setWish((w) => removeWishlistItem(w, e.item.id));
          setCart((c) => c + 1);
          say(ar ? "تم النقل إلى السلة" : "Moved to cart");
        }}
        onToggleNotify={(i) => setWish((w) => toggleNotify(w, i.id))}
        onRemove={(i) => setWish((w) => removeWishlistItem(w, i.id))}
      />
    );
  } else if (view.section === "addresses") {
    body = <StoreAddressBook addresses={empty ? [] : addresses} loading={loading} error={error} onRetry={() => undefined} onChange={setAddresses} countries={["EG", "SA", "AE", "KW", "JO"]} />;
  } else {
    body = (
      <StoreRecentlyViewed
        ids={empty ? [] : recent}
        products={products}
        currency={STORE_CURRENCY}
        loading={loading}
        onOpenProduct={(p) => setRecent((r) => pushRecentlyViewed(r, p.id))}
        onRemove={(id) => setRecent((r) => removeRecent(r, id))}
        onClear={() => setRecent([])}
      />
    );
  }

  return (
    <div className={shell}>
      <StoreAccountLayout
        title={ar ? "حسابي" : "My account"}
        nav={<StoreAccountNav active={view.section} onNavigate={(s) => setView({ section: s })} counts={{ orders: orders.length, returns: requests.length, wishlist: wish.length, recent: recent.length }} />}
      >
        {cart > 0 ? <p className="mb-3 text-body-sm text-muted-foreground">{ar ? `إضافات السلة: ${cart}` : `Cart additions: ${cart}`}</p> : null}
        {toast ? (
          <p role="status" className="mb-3 flex items-center justify-between rounded-control bg-secondary px-3 py-2 text-body-sm">
            {toast}
            <Button size="sm" variant="ghost" onClick={() => setToast(null)}>
              {ar ? "إغلاق" : "Dismiss"}
            </Button>
          </p>
        ) : null}
        {body}
      </StoreAccountLayout>
    </div>
  );
}

/* ------------------------------------------------------------------ admin */

function useAdminState() {
  const ar = useAr();
  const locale: StoreLocale = ar ? "ar" : "en";
  const [orders, setOrders] = useState(() => ordersSeed(locale));
  const [refunds, setRefunds] = useState<Record<string, RefundRecord[]>>({});
  return { ar, locale, orders, setOrders, refunds, setRefunds };
}

export function AdminOrdersPage({ mode = "default", startTab = "orders" }: { mode?: OrdersDemoMode; startTab?: "orders" | "abandoned" }) {
  const { ar, locale, orders, setOrders, refunds } = useAdminState();
  const [tab, setTab] = useState<"orders" | "abandoned">(startTab);
  const [print, setPrint] = useState<{ orders: CommerceOrder[]; kind: StoreOrderDocumentKind } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const empty = mode === "empty";
  const carts = useMemo(() => (empty ? [] : abandonedSeed(locale)), [empty, locale]);

  if (print) {
    return (
      <div className={shell}>
        <StoreOrderPrintView orders={print.orders} kind={print.kind} currency={STORE_CURRENCY} seller={SELLER(ar)} refunds={(o) => refunds[o.id] ?? []} footer={ar ? "شكرًا لتسوقكم معنا." : "Thank you for shopping with us."} onClose={() => setPrint(null)} />
      </div>
    );
  }
  const opened = orders.find((o) => o.id === open);
  if (opened) {
    return (
      <div className={shell}>
        <div className="mx-auto max-w-6xl p-4">
          <Button variant="ghost" onClick={() => setOpen(null)}>
            {ar ? "رجوع إلى الطلبات" : "Back to orders"}
          </Button>
          <p className="text-body-sm text-muted-foreground">{opened.number}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="m-0 me-auto text-h2 font-semibold">{ar ? "الطلبات" : "Orders"}</h1>
          <Button size="sm" variant={tab === "orders" ? "secondary" : "ghost"} onClick={() => setTab("orders")}>
            {ar ? "الطلبات" : "Orders"}
          </Button>
          <Button size="sm" variant={tab === "abandoned" ? "secondary" : "ghost"} onClick={() => setTab("abandoned")}>
            {ar ? "السلات المتروكة" : "Abandoned carts"}
          </Button>
        </div>
        {note ? (
          <p role="status" className="rounded-control bg-secondary px-3 py-2 text-body-sm">
            {note}
          </p>
        ) : null}
        {tab === "orders" ? (
          <StoreOrdersList
            orders={empty ? [] : orders}
            currency={STORE_CURRENCY}
            loading={mode === "loading"}
            error={mode === "error"}
            onRetry={() => undefined}
            pageSize={8}
            onOpenOrder={(o) => setOpen(o.id)}
            onPrint={(picked, kind) => setPrint({ orders: picked, kind })}
            onExport={(picked) => setNote(ar ? `تم تصدير ${picked.length} طلب` : `Exported ${picked.length} orders`)}
            onMarkFulfilled={(picked) =>
              setOrders((all) =>
                all.map((o) => {
                  if (!picked.some((p) => p.id === o.id)) return o;
                  const picks = o.lines.map((l) => ({ lineId: l.id, quantity: l.quantity - (l.fulfilled ?? 0) })).filter((x) => x.quantity > 0);
                  return applyFulfilment(o, planFulfilment(o, { picks }), { at: ORDERS_NOW.toISOString(), by: ar ? "منى" : "Mona", label: ar ? "تم الشحن" : "Marked fulfilled" });
                }),
              )
            }
          />
        ) : (
          <StoreAbandonedCarts
            carts={carts}
            currency={STORE_CURRENCY}
            now={ORDERS_NOW}
            loading={mode === "loading"}
            error={mode === "error"}
            onRetry={() => undefined}
            onSendRecovery={(e) => setNote(ar ? `تم إرسال بريد الاسترداد (خصم ${e.discountPercent}٪)` : `Recovery email sent (${e.discountPercent}% off)`)}
          />
        )}
      </div>
    </div>
  );
}

/** One order in the admin. `orderIndex` picks a state: 8 is part shipped, 0 delivered, 4 cash on delivery, 5 cancelled. */
export function AdminOrderPage({ orderIndex = 8, mode = "default" }: { orderIndex?: number; mode?: OrdersDemoMode }) {
  const { ar, orders, setOrders, refunds, setRefunds } = useAdminState();
  const [print, setPrint] = useState<StoreOrderDocumentKind | null>(null);
  const order = orders[orderIndex]!;
  if (mode !== "default") {
    const text = mode === "loading" ? (ar ? "جارٍ التحميل…" : "Loading…") : mode === "error" ? (ar ? "تعذر تحميل الطلب." : "Could not load this order.") : ar ? "لا يوجد طلب." : "No order.";
    return (
      <div className={shell}>
        <p role={mode === "error" ? "alert" : "status"} className="mx-auto max-w-6xl p-4 text-body-sm text-muted-foreground">
          {text}
        </p>
      </div>
    );
  }
  if (print) {
    return (
      <div className={shell}>
        <StoreOrderPrintView orders={[order]} kind={print} currency={STORE_CURRENCY} seller={SELLER(ar)} refunds={(o) => refunds[o.id] ?? []} onClose={() => setPrint(null)} />
      </div>
    );
  }
  return (
    <div className={shell}>
      <div className="mx-auto max-w-6xl p-4">
        <StoreOrderDetail
          order={order}
          refunds={refunds[order.id] ?? []}
          currency={STORE_CURRENCY}
          actor={ar ? "منى" : "Mona"}
          trackingTemplate={TRACKING_TEMPLATE}
          now={() => ORDERS_NOW.toISOString()}
          onPrint={setPrint}
          onChange={(c) => {
            setOrders((all) => all.map((o) => (o.id === c.order.id ? c.order : o)));
            setRefunds((r) => ({ ...r, [c.order.id]: c.refunds }));
          }}
        />
      </div>
    </div>
  );
}
