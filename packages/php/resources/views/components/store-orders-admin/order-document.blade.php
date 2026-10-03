{{-- <x-nq::store-orders-admin.order-document kind="invoice" :order="$order" :seller="['name' => 'Bean & Leaf', 'lines' => ['12 Nile St', 'Cairo'], 'taxId' => '123-456-789']" :refunds="$refunds" footer="Returns within 14 days." />
     One printable sheet: an invoice (prices, totals, refunds, tax number) or a packing slip (what goes in the box, no prices). The order number is also a barcode.
     kind: invoice | packing-slip. order: the CommerceOrder array (see orders-list). seller: name, lines[], email, phone, taxId, logo. refunds: [['amount' => 500]].
     currency: USD, or SAR in Arabic. footer: printed under the totals. labels: override any built-in string by key. Static markup, no Alpine needed except the barcode. --}}
@include('nasaq::components.store-orders-admin._strings')
@props(['kind' => 'invoice', 'order', 'seller', 'refunds' => [], 'currency' => null, 'footer' => null, 'labels' => []])
@php
    $t = nq_store_admin_t($labels);
    $currency ??= \Nasaq\Nasaq::currency();
    $invoice = $kind === 'invoice';
    $money = fn ($minor, $neg = false) => nq_store_admin_money((int) $minor, $currency, $neg);
    $clamp = fn ($v, $lo, $hi) => max($lo, min($hi, $v));
    $fulfilled = fn ($l) => $clamp((int) ($l['fulfilled'] ?? 0), 0, $l['quantity']);
    $refundedQty = fn ($l) => $clamp((int) ($l['refunded'] ?? 0), 0, $l['quantity']);
    $returned = fn ($l) => $clamp((int) ($l['returned'] ?? 0), 0, $l['quantity']);
    $cancelled = fn ($l) => $clamp(min($refundedQty($l) - $returned($l), $l['quantity'] - $fulfilled($l)), 0, $l['quantity']);
    $outstanding = fn ($l) => max(0, $l['quantity'] - $fulfilled($l) - $cancelled($l));
    $packQty = fn ($l) => $outstanding($l) + $fulfilled($l);
    $rows = array_values(array_filter($order['lines'], fn ($l) => $invoice || $packQty($l) > 0));
    $totals = $order['totals'];
    $refundedTotal = array_sum(array_map(fn ($r) => (int) ($r['amount'] ?? 0), $refunds));
    $unpaid = in_array($order['payment'], ['pending', 'failed', 'authorized'], true);
    $paid = $unpaid ? 0 : $totals['total'];
    $net = max(0, $paid - $refundedTotal);
    $due = $unpaid ? $totals['total'] : 0;
    $title = ($invoice ? $t['invoice'] : $t['packingSlip']).' '.$order['number'];
    $address = $order['shippingAddress'] ?? null;
    $billing = $order['billingAddress'] ?? $address;
    $block = function (string $heading, ?array $a) {
        $h = '<div class="flex min-w-0 flex-col gap-0.5 text-body-sm"><h3 class="text-caption font-semibold uppercase tracking-wide text-muted-foreground">'.e($heading).'</h3>';
        if ($a) {
            $h .= '<address class="flex flex-col not-italic text-foreground"><span class="font-medium">'.e($a['name'] ?? '').'</span><span>'.e($a['line1'] ?? '').'</span>';
            if (! empty($a['line2'])) {
                $h .= '<span>'.e($a['line2']).'</span>';
            }
            $h .= '<span>'.e(implode(', ', array_filter([$a['region'] ?? null, $a['city'] ?? null]))).'</span>';
            if (! empty($a['postalCode'])) {
                $h .= '<bdi dir="ltr" class="text-start">'.e($a['postalCode']).'</bdi>';
            }
            if (! empty($a['phone'])) {
                $h .= '<bdi dir="ltr" class="text-start">'.e($a['phone']).'</bdi>';
            }
            $h .= '</address>';
        } else {
            $h .= '<span class="text-muted-foreground">-</span>';
        }

        return new \Illuminate\Support\HtmlString($h.'</div>');
    };
    $m = 'tabular-nums [unicode-bidi:isolate]';
@endphp
<article data-slot="{{ $attributes->get('data-slot', 'store-order-document') }}" data-kind="{{ $kind }}" aria-label="{{ $title }}"
    {{ $attributes->except('data-slot')->cn('nq-print-sheet mx-auto flex w-full max-w-[52rem] flex-col gap-6 rounded-card border border-border bg-card p-8 text-foreground') }}>
    <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex min-w-0 flex-col gap-1">
            @if (! empty($seller['logo']))
                <img src="{{ $seller['logo'] }}" alt="" class="mb-1 h-10 w-auto self-start" />
            @endif
            <span class="text-h3 font-semibold">{{ $seller['name'] }}</span>
            @foreach ($seller['lines'] ?? [] as $line)
                <span class="text-body-sm text-muted-foreground">{{ $line }}</span>
            @endforeach
            @if (! empty($seller['email']))
                <span dir="ltr" class="text-start text-body-sm text-muted-foreground">{{ $seller['email'] }}</span>
            @endif
            @if (! empty($seller['phone']))
                <span dir="ltr" class="text-start text-body-sm text-muted-foreground">{{ $seller['phone'] }}</span>
            @endif
            @if ($invoice && ! empty($seller['taxId']))
                <span class="text-body-sm text-muted-foreground">{{ $t['taxId'] }}: <bdi dir="ltr">{{ $seller['taxId'] }}</bdi></span>
            @endif
        </div>
        <div class="flex flex-col items-end gap-1 text-end">
            <h2 class="text-h2 font-semibold">{{ $invoice ? $t['invoice'] : $t['packingSlip'] }}</h2>
            <span class="text-body-sm">{{ $t['order'] }} <bdi>{{ $order['number'] }}</bdi></span>
            <span class="text-body-sm text-muted-foreground"><x-nq::numeric.date-time :value="$order['placedAt']" date-style="long" /></span>
            <x-nq::barcode :value="str_replace('#', '', $order['number'])" :height="36" :bar-width="1.5" :margin="0" :show-value="false" aria-label="{{ $t['order'].' '.$order['number'] }}" />
        </div>
    </header>

    <div class="grid gap-4 sm:grid-cols-2">
        {{ $block($t['shipTo'], $address) }}
        @if ($invoice)
            {{ $block($t['billTo'], $billing) }}
        @else
            <div class="flex flex-col gap-0.5 text-body-sm">
                <h3 class="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{{ $t['shipment'] }}</h3>
                <span>{{ $order['shippingMethod']['label'] ?? '-' }}</span>
                @if (! empty($order['tracking']))
                    <bdi dir="ltr" class="text-start">{{ $order['tracking']['carrier'] }} {{ $order['tracking']['number'] }}</bdi>
                @endif
            </div>
        @endif
    </div>

    <table class="w-full border-collapse text-body-sm">
        <thead>
            <tr class="border-b border-border text-start text-caption uppercase tracking-wide text-muted-foreground">
                @unless ($invoice)
                    <th scope="col" class="w-8 py-2 text-start font-medium"><span class="sr-only">{{ $t['packed'] }}</span></th>
                @endunless
                <th scope="col" class="py-2 text-start font-medium">{{ $t['item'] }}</th>
                <th scope="col" class="py-2 text-end font-medium">{{ $invoice ? $t['quantity'] : $t['toPack'] }}</th>
                @if ($invoice)
                    <th scope="col" class="py-2 text-end font-medium">{{ $t['unitPrice'] }}</th>
                    <th scope="col" class="py-2 text-end font-medium">{{ $t['total'] }}</th>
                @endif
            </tr>
        </thead>
        <tbody>
            @foreach ($rows as $line)
                <tr class="border-b border-border align-top">
                    @unless ($invoice)
                        <td class="py-2"><span aria-hidden="true" class="inline-block size-4 rounded-sm border border-border"></span></td>
                    @endunless
                    <td class="py-2 pe-2">
                        <span class="font-medium">{{ $line['name'] }}</span>
                        @if (! empty($line['variantLabel']))
                            <span class="block text-caption text-muted-foreground">{{ $line['variantLabel'] }}</span>
                        @endif
                        @if (! empty($line['variantId']))
                            <span dir="ltr" class="block text-start text-caption text-muted-foreground">{{ $line['variantId'] }}</span>
                        @endif
                    </td>
                    <td class="py-2 text-end"><span class="{{ $m }}">{{ $invoice ? $line['quantity'] : $packQty($line) }}</span></td>
                    @if ($invoice)
                        <td class="py-2 text-end"><span class="{{ $m }}">{{ $money($line['unitPrice']) }}</span></td>
                        <td class="py-2 text-end"><span class="{{ $m }}">{{ $money($line['unitPrice'] * $line['quantity']) }}</span></td>
                    @endif
                </tr>
            @endforeach
        </tbody>
    </table>

    @if ($invoice)
        <dl class="m-0 ms-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-body-sm">
            <dt class="text-muted-foreground">{{ $t['subtotal'] }}</dt>
            <dd class="m-0 text-end"><span class="{{ $m }}">{{ $money($totals['subtotal']) }}</span></dd>
            @if ($totals['discount'] > 0)
                <dt class="text-muted-foreground">{{ $t['discount'] }}</dt>
                <dd class="m-0 text-end"><span class="{{ $m }}">{{ $money($totals['discount'], true) }}</span></dd>
            @endif
            <dt class="text-muted-foreground">{{ $t['shipping'] }}</dt>
            <dd class="m-0 text-end">@if ($totals['shipping'] > 0)<span class="{{ $m }}">{{ $money($totals['shipping']) }}</span>@else{{ $t['free'] }}@endif</dd>
            @if ($totals['tax'] > 0)
                <dt class="text-muted-foreground">{{ $t['tax'] }}</dt>
                <dd class="m-0 text-end"><span class="{{ $m }}">{{ $money($totals['tax']) }}</span></dd>
            @endif
            <dt class="border-t border-border pt-1 font-semibold">{{ $t['total'] }}</dt>
            <dd class="m-0 border-t border-border pt-1 text-end font-semibold"><span class="{{ $m }}">{{ $money($totals['total']) }}</span></dd>
            @if ($refundedTotal > 0)
                <dt class="text-muted-foreground">{{ $t['refunded'] }}</dt>
                <dd class="m-0 text-end"><span class="{{ $m }}">{{ $money($refundedTotal, true) }}</span></dd>
                <dt class="font-semibold">{{ $t['netPaid'] }}</dt>
                <dd class="m-0 text-end font-semibold"><span class="{{ $m }}">{{ $money($net) }}</span></dd>
            @endif
            @if ($due > 0)
                <dt class="font-semibold">{{ $t['due'] }}</dt>
                <dd class="m-0 text-end font-semibold"><span class="{{ $m }}">{{ $money($due) }}</span></dd>
            @endif
        </dl>
    @else
        <p class="text-body-sm text-muted-foreground">{{ $t['slipNote'] }}</p>
    @endif
    @if ($footer)
        <p class="border-t border-border pt-3 text-caption text-muted-foreground">{{ $footer }}</p>
    @endif
</article>
