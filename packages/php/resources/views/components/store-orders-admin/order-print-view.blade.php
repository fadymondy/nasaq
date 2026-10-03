{{-- <x-nq::store-orders-admin.order-print-view :orders="$orders" :seller="['name' => 'Bean & Leaf']" kind="packing-slip" can-close />
     A preview of one or many documents with a Print button and an invoice / packing slip switch. The print CSS hides this toolbar and everything else on
     the page, and starts each order on its own page. orders: CommerceOrder arrays. seller: name, lines[], email, phone, taxId, logo.
     kind: invoice (default) | packing-slip. refunds: [orderId => [['amount' => 500]]]. currency: USD, or SAR in Arabic. footer: printed under each document.
     can-close: show the Back button (event nq-back from the root). labels: override any built-in string by key. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-orders-admin._strings')
@props(['orders' => [], 'kind' => 'invoice', 'seller', 'refunds' => [], 'currency' => null, 'footer' => null, 'canClose' => false, 'labels' => []])
@php
    $t = nq_store_admin_t($labels);
    $count = count($orders);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'store-order-print-view') }}" x-data="nqStoreOrderPrintView({{ \Illuminate\Support\Js::from(['kind' => $kind]) }})" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <style>
@page { size: A4; margin: 12mm; }
@media print {
  html, body { background: white !important; }
  body * { visibility: hidden !important; }
  .nq-print-root, .nq-print-root * { visibility: visible !important; }
  .nq-print-root { position: absolute; inset-block-start: 0; inset-inline-start: 0; width: 100%; margin: 0 !important; padding: 0 !important; }
  .nq-print-hide { display: none !important; }
  .nq-print-sheet { border: 0 !important; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; margin: 0 !important; color: black !important; background: white !important; break-after: page; page-break-after: always; }
  .nq-print-sheet:last-child { break-after: auto; page-break-after: auto; }
  .nq-print-sheet * { color: black !important; border-color: black !important; }
  .nq-print-sheet tr, .nq-print-sheet li { break-inside: avoid; }
}
    </style>
    <div class="nq-print-hide flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
            @if ($canClose)
                <x-nq::button type="button" variant="ghost" size="sm" x-on:click="back()">
                    <x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" />
                    {{ $t['back'] }}
                </x-nq::button>
            @endif
            <x-nq::toggle-group :default-value="[$kind]" aria-label="{{ $t['document'] }}" x-model="kind">
                <x-nq::toggle-group.toggle value="invoice">{{ $t['invoice'] }}</x-nq::toggle-group.toggle>
                <x-nq::toggle-group.toggle value="packing-slip">{{ $t['packingSlip'] }}</x-nq::toggle-group.toggle>
            </x-nq::toggle-group>
            <span class="text-body-sm text-muted-foreground">{{ $count === 1 ? $t['documentsCountOne'] : str_replace('{n}', (string) $count, $t['documentsCount']) }}</span>
        </div>
        <x-nq::button type="button" variant="primary" size="sm" x-on:click="print()">
            <x-lucide-printer aria-hidden="true" />
            {{ $t['print'] }}
        </x-nq::button>
    </div>
    <div class="nq-print-root flex flex-col gap-6">
        @foreach ($orders as $order)
            <x-nq::store-orders-admin.order-document kind="invoice" x-show="current === 'invoice'" :order="$order" :seller="$seller" :currency="$currency" :refunds="$refunds[$order['id']] ?? []" :footer="$footer" :labels="$labels" />
            <x-nq::store-orders-admin.order-document kind="packing-slip" x-show="current === 'packing-slip'" :order="$order" :seller="$seller" :currency="$currency" :refunds="$refunds[$order['id']] ?? []" :footer="$footer" :labels="$labels" />
        @endforeach
    </div>
</div>
