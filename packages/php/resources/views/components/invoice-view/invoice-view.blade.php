{{-- <x-nq::invoice-view :invoice="$invoice" download pay />
     An invoice as a document: parties, dates, line items, totals, payments and notes, with a status chip and an action bar (download, print, pay).
     Printing produces only the sheet, black on white, with rows kept whole.
     invoice: array with number, status (draft | open | paid | overdue | void | refunded), issueDate, dueDate?, currency? (USD, or SAR in Arabic, when omitted),
       from / to (name, address[], email, phone, taxId, logo URL), lines (id, description, details?, quantity, unitPrice, taxRate?), discount?, taxRate?,
       payments? (id, date, method, amount), notes?, terms?. Totals are computed here in PHP (nq_invoice_compute).
     download: show the "Download PDF" button. pay: show "Pay now" while the invoice is open or overdue. hide-actions: no action bar. labels: array overriding the words.
     Slots: logo (instead of from.logo), actions (extra buttons in the action bar).
     Because a Blade prop cannot be a callback, the buttons dispatch bubbling, cancelable events from the root:
       nq-invoice-download  detail { resolve(result?), reject(message), waitUntil(promise) }  (the button shows busy until it settles; an error is shown in the bar)
       nq-invoice-print     detail {}  (window.print() runs unless you call preventDefault())
       nq-invoice-pay       detail {}
     Livewire: @nq-invoice-download="$event.detail.waitUntil($wire.downloadPdf())". Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.invoice-view._invoice')
@props(['invoice', 'download' => false, 'pay' => false, 'hideActions' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_invoice_strings($locale, $labels);
    $currency = strtoupper($invoice['currency'] ?? \Nasaq\Nasaq::currency($locale));
    $status = $invoice['status'];
    $totals = nq_invoice_compute($invoice);
    $payable = ($status === 'open' || $status === 'overdue') && $totals['due'] > 0;
    $titleId = 'nq-invoice-'.preg_replace('/[^A-Za-z0-9_-]/', '-', (string) $invoice['number']);
    $parties = [['party' => $invoice['from'], 'label' => $t['from']], ['party' => $invoice['to'], 'label' => $t['billTo']]];
    $sums = [['label' => $t['subtotal'], 'value' => $totals['subtotal'], 'strong' => false]];
    if ($totals['discount'] > 0) {
        $sums[] = ['label' => $t['discount'], 'value' => -$totals['discount'], 'strong' => false];
    }
    if ($totals['tax'] > 0) {
        $sums[] = ['label' => $t['tax'], 'value' => $totals['tax'], 'strong' => false];
    }
    $sums[] = ['label' => $t['total'], 'value' => $totals['total'], 'strong' => true];
    if ($totals['paid'] > 0) {
        $sums[] = ['label' => $t['paid'], 'value' => -$totals['paid'], 'strong' => false];
    }
    if ($status !== 'draft') {
        $sums[] = ['label' => $t['amountDue'], 'value' => $totals['due'], 'strong' => true];
    }
    $config = ['failed' => $t['downloadFailed']];
    $hasLogo = isset($logo) && ! $logo->isEmpty() || ! empty($invoice['from']['logo']);
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'invoice-view') }}" data-status="{{ $status }}" aria-labelledby="{{ $titleId }}" x-data="nqInvoiceView(@js($config))" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    {{-- On paper only the sheet prints: everything else is hidden, the sheet moves to the top, colours are forced to black on white. --}}
    <style>@verbatim
@media print {
  @page { margin: 14mm; }
  body * { visibility: hidden !important; }
  [data-slot="invoice-sheet"], [data-slot="invoice-sheet"] * { visibility: visible !important; }
  [data-slot="invoice-sheet"] {
    position: absolute !important; inset-block-start: 0; inset-inline: 0; width: 100% !important; max-width: none !important;
    margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
    background: white !important; color: black !important; color-scheme: light;
    --foreground: black; --muted-foreground: oklch(0.4 0 0); --border: oklch(0.82 0 0); --card: white; --nq-surface: white;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  [data-slot="invoice-sheet"] tr, [data-slot="invoice-sheet"] [data-keep-together] { break-inside: avoid; }
  [data-slot="invoice-sheet"] thead { display: table-header-group; }
}
@endverbatim</style>
    @unless ($hideActions)
        <div role="toolbar" aria-label="{{ $t['actions'] }}" data-slot="invoice-actions" class="flex flex-wrap items-center justify-end gap-2 print:hidden">
            <p x-show="error" x-text="error" role="alert" style="display: none" class="me-auto text-body-sm text-nq-danger-text"></p>
            @isset($actions){{ $actions }}@endisset
            @if ($download)
                <x-nq::button x-bind:disabled="busy" x-bind:aria-busy="busy" x-on:click="download()">
                    <x-nq::spinner x-show="busy" style="display: none" />
                    <x-lucide-download aria-hidden="true" x-show="!busy" />
                    {{ $t['download'] }}
                </x-nq::button>
            @endif
            <x-nq::button x-on:click="print()">
                <x-lucide-printer aria-hidden="true" />
                {{ $t['print'] }}
            </x-nq::button>
            @if ($pay && $payable)
                <x-nq::button variant="primary" x-on:click="pay()">{{ $t['pay'] }}</x-nq::button>
            @endif
        </div>
    @endunless

    <article data-slot="invoice-sheet" class="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-card border border-border bg-card p-6 text-card-foreground @container sm:p-10">
        <header class="flex flex-wrap items-start justify-between gap-4">
            <div class="flex min-w-0 flex-col gap-2">
                @if ($hasLogo)
                    <div class="h-9 [&_img]:h-full [&_svg]:h-full">
                        @if (isset($logo) && ! $logo->isEmpty()){{ $logo }}@else<img src="{{ $invoice['from']['logo'] }}" alt="{{ $invoice['from']['name'] }}" />@endif
                    </div>
                @endif
                <h1 id="{{ $titleId }}" class="text-h1 text-foreground">{{ $t['invoice'] }}</h1>
                <p class="text-body-sm text-muted-foreground">
                    {{ $t['number'] }} <bdi dir="ltr" class="font-mono text-foreground">{{ $invoice['number'] }}</bdi>
                </p>
            </div>
            <x-nq::invoice-view.status-badge :status="$status" :labels="$labels" :locale="$locale" class="h-6 px-2" />
        </header>

        <dl class="grid grid-cols-2 gap-4 text-body-sm sm:grid-cols-3">
            <div>
                <dt class="text-caption text-muted-foreground">{{ $t['issued'] }}</dt>
                <dd class="text-foreground"><x-nq::numeric.date-time :value="$invoice['issueDate']" :locale="$locale" /></dd>
            </div>
            @if (! empty($invoice['dueDate']))
                <div>
                    <dt class="text-caption text-muted-foreground">{{ $t['due'] }}</dt>
                    <dd class="{{ $status === 'overdue' ? 'text-nq-danger-text' : 'text-foreground' }}"><x-nq::numeric.date-time :value="$invoice['dueDate']" :locale="$locale" /></dd>
                </div>
            @endif
            <div>
                <dt class="text-caption text-muted-foreground">{{ $t['currency'] }}</dt>
                <dd class="text-foreground"><bdi dir="ltr">{{ $currency }}</bdi></dd>
            </div>
        </dl>

        <div class="grid gap-6 sm:grid-cols-2" data-keep-together>
            @foreach ($parties as $p)
                <div class="flex min-w-0 flex-col gap-1 text-body-sm">
                    <p class="text-caption font-medium uppercase tracking-wide text-muted-foreground">{{ $p['label'] }}</p>
                    <p class="text-label text-foreground">{{ $p['party']['name'] }}</p>
                    @foreach ($p['party']['address'] ?? [] as $line)
                        <p class="text-muted-foreground">{{ $line }}</p>
                    @endforeach
                    @if (! empty($p['party']['email']))
                        <bdi dir="ltr" class="text-start text-muted-foreground">{{ $p['party']['email'] }}</bdi>
                    @endif
                    @if (! empty($p['party']['phone']))
                        <bdi dir="ltr" class="text-start text-muted-foreground">{{ $p['party']['phone'] }}</bdi>
                    @endif
                    @if (! empty($p['party']['taxId']))
                        <p class="text-muted-foreground">{{ $t['taxId'] }}: <bdi dir="ltr">{{ $p['party']['taxId'] }}</bdi></p>
                    @endif
                </div>
            @endforeach
        </div>

        <div class="overflow-x-auto">
            <table class="w-full border-collapse text-body-sm">
                <thead>
                    <tr class="border-b border-border text-caption text-muted-foreground">
                        <th scope="col" class="pb-2 pe-3 text-start font-medium">{{ $t['description'] }}</th>
                        <th scope="col" class="px-3 pb-2 text-end font-medium">{{ $t['quantity'] }}</th>
                        <th scope="col" class="px-3 pb-2 text-end font-medium">{{ $t['unitPrice'] }}</th>
                        <th scope="col" class="ps-3 pb-2 text-end font-medium">{{ $t['amount'] }}</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($invoice['lines'] as $line)
                        <tr class="border-b border-border align-top">
                            <td class="py-3 pe-3">
                                <p class="text-foreground">{{ $line['description'] }}</p>
                                @if (! empty($line['details']))
                                    <p class="text-caption text-muted-foreground">{{ $line['details'] }}</p>
                                @endif
                            </td>
                            <td class="px-3 py-3 text-end text-foreground"><x-nq::numeric :value="$line['quantity']" :locale="$locale" /></td>
                            <td class="px-3 py-3 text-end text-foreground"><x-nq::numeric :value="$line['unitPrice']" style="currency" :currency="$currency" :locale="$locale" /></td>
                            <td class="ps-3 py-3 text-end text-foreground"><x-nq::numeric :value="$line['quantity'] * $line['unitPrice']" style="currency" :currency="$currency" :locale="$locale" /></td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <dl data-keep-together class="ms-auto flex w-full max-w-72 flex-col gap-2">
            @foreach ($sums as $row)
                <div class="{{ $row['strong'] ? 'flex justify-between gap-6 border-t border-border pt-2 text-label text-foreground' : 'flex justify-between gap-6 text-body-sm text-muted-foreground' }}">
                    <dt>{{ $row['label'] }}</dt>
                    <dd class="{{ $row['strong'] ? '' : 'text-foreground' }}"><x-nq::numeric :value="$row['value']" style="currency" :currency="$currency" :locale="$locale" /></dd>
                </div>
            @endforeach
        </dl>

        @if (! empty($invoice['payments']))
            <section data-keep-together aria-label="{{ $t['payments'] }}" class="flex flex-col gap-2">
                <h2 class="text-label text-foreground">{{ $t['payments'] }}</h2>
                <table class="w-full border-collapse text-body-sm">
                    <thead class="sr-only">
                        <tr>
                            <th scope="col">{{ $t['date'] }}</th>
                            <th scope="col">{{ $t['method'] }}</th>
                            <th scope="col">{{ $t['amount'] }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($invoice['payments'] as $p)
                            <tr class="border-b border-border">
                                <td class="py-2 pe-3 text-muted-foreground"><x-nq::numeric.date-time :value="$p['date']" :locale="$locale" /></td>
                                <td class="px-3 py-2 text-foreground">{{ $p['method'] }}</td>
                                <td class="ps-3 py-2 text-end text-foreground"><x-nq::numeric :value="$p['amount']" style="currency" :currency="$currency" :locale="$locale" /></td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </section>
        @endif

        @if (! empty($invoice['notes']) || ! empty($invoice['terms']))
            <footer data-keep-together class="grid gap-4 border-t border-border pt-6 text-body-sm sm:grid-cols-2">
                @if (! empty($invoice['notes']))
                    <div>
                        <h2 class="text-label text-foreground">{{ $t['notes'] }}</h2>
                        <p class="text-muted-foreground">{{ $invoice['notes'] }}</p>
                    </div>
                @endif
                @if (! empty($invoice['terms']))
                    <div>
                        <h2 class="text-label text-foreground">{{ $t['terms'] }}</h2>
                        <p class="text-muted-foreground">{{ $invoice['terms'] }}</p>
                    </div>
                @endif
            </footer>
        @endif
    </article>
</section>
