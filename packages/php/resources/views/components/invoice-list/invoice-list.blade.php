{{-- <x-nq::invoice-list :invoices="$invoices" :payments="$payments" currency="USD" open download pay />
     Invoices and payments as filterable tables with a status filter, search, sorting, paging and three summary tiles. Built on <x-nq::data-table> and <x-nq::stat-card>.
     invoices: [['id', 'number', 'customer'?, 'issueDate', 'dueDate'?, 'amount', 'status' => draft|open|paid|overdue|void|refunded]]. payments (adds a Payments tab):
     [['id', 'date', 'amount', 'status' => succeeded|pending|failed|refunded, 'method', 'invoiceNumber'?, 'reference'?]]. currency: ISO 4217 (USD, or SAR in Arabic).
     open: rows are clickable and the ⋯ menu gets "View invoice". download: the menu gets "Download". pay: the menu gets "Pay now" (shown on open and overdue rows only).
     show-summary (true), page-size (8), loading, error (true or a message), default-tab (invoices | payments), labels: array overriding any built-in text.
     Events on the root (bubbling): nq-invoice-open { invoice }, nq-invoice-pay { invoice },
     nq-invoice-download { invoice, resolve(), reject(message), waitUntil(promise) }: the row stays busy until it settles and a rejection shows its message in an alert.
     Not ported here: the per-row download button (the same action is in the row menu and the row's context menu). Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.invoice-view._invoice')
@props([
    'invoices' => [], 'payments' => null, 'currency' => null, 'open' => false, 'download' => false, 'pay' => false, 'showSummary' => true, 'pageSize' => 8,
    'loading' => false, 'error' => false, 'defaultTab' => 'invoices', 'labels' => [],
])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency());
    $en = [
        'invoices' => 'Invoices', 'payments' => 'Payments', 'tabs' => 'Billing history', 'number' => 'Invoice', 'customer' => 'Customer', 'issued' => 'Issued', 'due' => 'Due',
        'amount' => 'Amount', 'status' => 'Status', 'search' => 'Search invoices…', 'searchPayments' => 'Search payments…', 'view' => 'View invoice', 'download' => 'Download',
        'pay' => 'Pay now', 'outstanding' => 'Outstanding', 'overdueTotal' => 'Overdue', 'paidTotal' => 'Paid', 'emptyTitle' => 'No invoices yet',
        'emptyDescription' => 'Invoices appear here after your first billing date.', 'emptyPaymentsTitle' => 'No payments yet',
        'emptyPaymentsDescription' => 'Payments appear here once an invoice is paid.', 'date' => 'Date', 'invoiceRef' => 'Invoice', 'method' => 'Method', 'reference' => 'Reference',
        'succeeded' => 'Succeeded', 'pending' => 'Pending', 'failed' => 'Failed', 'refunded' => 'Refunded', 'label' => 'Invoices', 'labelPayments' => 'Payments',
        'downloadFailed' => 'The invoice could not be downloaded.', 'errorTitle' => "Couldn't load this list",
    ];
    $arabic = [
        'invoices' => 'الفواتير', 'payments' => 'المدفوعات', 'tabs' => 'سجل الفوترة', 'number' => 'الفاتورة', 'customer' => 'العميل', 'issued' => 'الإصدار', 'due' => 'الاستحقاق',
        'amount' => 'المبلغ', 'status' => 'الحالة', 'search' => 'ابحث في الفواتير…', 'searchPayments' => 'ابحث في المدفوعات…', 'view' => 'عرض الفاتورة', 'download' => 'تنزيل',
        'pay' => 'ادفع الآن', 'outstanding' => 'المستحق', 'overdueTotal' => 'المتأخر', 'paidTotal' => 'المدفوع', 'emptyTitle' => 'لا توجد فواتير بعد',
        'emptyDescription' => 'تظهر الفواتير هنا بعد أول موعد فوترة.', 'emptyPaymentsTitle' => 'لا توجد مدفوعات بعد',
        'emptyPaymentsDescription' => 'تظهر المدفوعات هنا عند سداد أي فاتورة.', 'date' => 'التاريخ', 'invoiceRef' => 'الفاتورة', 'method' => 'الطريقة', 'reference' => 'المرجع',
        'succeeded' => 'ناجحة', 'pending' => 'قيد المعالجة', 'failed' => 'فاشلة', 'refunded' => 'مستردة', 'label' => 'الفواتير', 'labelPayments' => 'المدفوعات',
        'downloadFailed' => 'تعذّر تنزيل الفاتورة.', 'errorTitle' => 'تعذّر تحميل هذه القائمة',
    ];
    $t = array_merge($ar ? $arabic : $en, (array) $labels);
    $base = nq_invoice_strings(app()->getLocale());
    $statusLabel = fn ($s) => $s === 'paid' ? $base['paidStatus'] : $base[$s];
    $list = array_values(array_map(fn ($r) => (array) $r, (array) $invoices));
    $paid = array_values(array_map(fn ($r) => (array) $r, (array) ($payments ?? [])));
    usort($list, fn ($a, $b) => strtotime((string) $b['issueDate']) <=> strtotime((string) $a['issueDate']));
    usort($paid, fn ($a, $b) => strtotime((string) $b['date']) <=> strtotime((string) $a['date']));
    $sum = fn (array $statuses) => array_sum(array_map(fn ($i) => in_array($i['status'], $statuses, true) ? $i['amount'] : 0, $list));
    $money = ['style' => 'currency', 'currency' => $code];
    $invoiceTone = ['draft' => 'neutral', 'open' => 'info', 'paid' => 'success', 'overdue' => 'danger', 'void' => 'neutral', 'refunded' => 'warning'];
    $paymentTone = ['succeeded' => 'success', 'pending' => 'warning', 'failed' => 'danger', 'refunded' => 'info'];
    $hasCustomer = count(array_filter($list, fn ($i) => ! empty($i['customer']))) > 0;
    $invoiceColumns = array_values(array_filter([
        ['id' => 'number', 'header' => $t['number'], 'type' => 'mono', 'sortable' => true, 'searchable' => true, 'hideable' => false],
        $hasCustomer ? ['id' => 'customer', 'header' => $t['customer'], 'sortable' => true, 'searchable' => true] : null,
        ['id' => 'issueDate', 'header' => $t['issued'], 'type' => 'date', 'sortable' => true],
        ['id' => 'dueDate', 'header' => $t['due'], 'type' => 'date', 'sortable' => true],
        ['id' => 'status', 'header' => $t['status'], 'type' => 'status', 'sortable' => true, 'filter' => true,
            'options' => array_map(fn ($s) => ['value' => $s, 'label' => $statusLabel($s), 'tone' => $invoiceTone[$s]], ['open', 'overdue', 'paid', 'draft', 'void', 'refunded'])],
        ['id' => 'amount', 'header' => $t['amount'], 'type' => 'currency', 'currency' => $code, 'align' => 'end', 'sortable' => true],
    ]));
    $paymentColumns = [
        ['id' => 'date', 'header' => $t['date'], 'type' => 'date', 'sortable' => true],
        ['id' => 'invoiceNumber', 'header' => $t['invoiceRef'], 'sortable' => true, 'searchable' => true],
        ['id' => 'method', 'header' => $t['method'], 'sortable' => true, 'searchable' => true],
        ['id' => 'reference', 'header' => $t['reference'], 'type' => 'mono', 'hidden' => true, 'searchable' => true],
        ['id' => 'status', 'header' => $t['status'], 'type' => 'status', 'sortable' => true, 'filter' => true,
            'options' => array_map(fn ($s) => ['value' => $s, 'label' => $t[$s], 'tone' => $paymentTone[$s]], ['succeeded', 'pending', 'failed', 'refunded'])],
        ['id' => 'amount', 'header' => $t['amount'], 'type' => 'currency', 'currency' => $code, 'align' => 'end', 'sortable' => true],
    ];
    $actions = array_values(array_filter([
        $open ? ['id' => 'view', 'label' => $t['view'], 'icon' => 'eye'] : null,
        $download ? ['id' => 'download', 'label' => $t['download'], 'icon' => 'download'] : null,
        $pay ? ['id' => 'pay', 'label' => $t['pay'], 'icon' => 'banknote', 'group' => 'pay', 'visibleWhen' => ['field' => 'status', 'in' => ['open', 'overdue']]] : null,
    ]));
    $errorText = $error ? (is_string($error) ? $error : $t['errorTitle']) : null;
    $config = ['downloadFailed' => $t['downloadFailed']];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'invoice-list') }}" x-data="nqInvoiceList({!! \Illuminate\Support\Js::from($config) !!})" x-on:nq-data-table-action="onAction($event)" {{ $attributes->except('data-slot')->cn('flex flex-col gap-6') }}>
    @if ($showSummary)
        <x-nq::stat-card.grid>
            <x-nq::stat-card :label="$t['outstanding']" :value="$sum(['open', 'overdue'])" :format="$money" :loading="$loading" />
            <x-nq::stat-card :label="$t['overdueTotal']" :value="$sum(['overdue'])" :format="$money" :loading="$loading" />
            <x-nq::stat-card :label="$t['paidTotal']" :value="$sum(['paid'])" :format="$money" :loading="$loading" />
        </x-nq::stat-card.grid>
    @endif

    @if ($payments !== null)
        <x-nq::tabs :default-value="$defaultTab">
            <x-nq::tabs.list variant="underline" :aria-label="$t['tabs']">
                <x-nq::tabs.tab value="invoices">{{ $t['invoices'] }}</x-nq::tabs.tab>
                <x-nq::tabs.tab value="payments">{{ $t['payments'] }}</x-nq::tabs.tab>
                <x-nq::tabs.indicator />
            </x-nq::tabs.list>
            <x-nq::tabs.panel value="invoices">
                <p role="alert" x-show="failed" x-text="failed" style="display: none" class="mb-3 flex items-center gap-2 text-body-sm text-nq-danger-text"></p>
                <x-nq::data-table :label="$t['label']" :columns="$invoiceColumns" :rows="$list" name-key="number" :page-size="$pageSize" :search="$t['search']" :row-actions="$actions"
                    :row-click="$open" :loading="$loading" :error="$errorText">
                    <x-slot:empty><x-nq::states.empty icon="receipt-text" :title="$t['emptyTitle']" :description="$t['emptyDescription']" class="border-0" /></x-slot:empty>
                </x-nq::data-table>
            </x-nq::tabs.panel>
            <x-nq::tabs.panel value="payments">
                <x-nq::data-table :label="$t['labelPayments']" :columns="$paymentColumns" :rows="$paid" name-key="id" :page-size="$pageSize" :search="$t['searchPayments']"
                    :loading="$loading" :error="$errorText">
                    <x-slot:empty><x-nq::states.empty icon="banknote" :title="$t['emptyPaymentsTitle']" :description="$t['emptyPaymentsDescription']" class="border-0" /></x-slot:empty>
                </x-nq::data-table>
            </x-nq::tabs.panel>
        </x-nq::tabs>
    @else
        <div class="flex flex-col gap-3">
            <p role="alert" x-show="failed" x-text="failed" style="display: none" class="flex items-center gap-2 text-body-sm text-nq-danger-text"></p>
            <x-nq::data-table :label="$t['label']" :columns="$invoiceColumns" :rows="$list" name-key="number" :page-size="$pageSize" :search="$t['search']" :row-actions="$actions"
                :row-click="$open" :loading="$loading" :error="$errorText">
                <x-slot:empty><x-nq::states.empty icon="receipt-text" :title="$t['emptyTitle']" :description="$t['emptyDescription']" class="border-0" /></x-slot:empty>
            </x-nq::data-table>
        </div>
    @endif
</div>
