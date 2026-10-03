{{-- <x-nq::invoice-view.status-badge status="paid" />
     The invoice status as a chip with its own icon, so it never relies on colour alone.
     status: draft | open | paid | overdue | void | refunded. labels: array overriding the words. --}}
@include('nasaq::components.invoice-view._invoice')
@props(['status', 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_invoice_strings($locale, $labels);
    // Same classes as <x-nq::badge> for the matching variant; the slot is invoice-status.
    $variants = [
        'draft' => 'border-border bg-secondary text-foreground',
        'open' => 'border-nq-info/40 bg-nq-info-soft text-nq-info-text',
        'paid' => 'border-nq-success/40 bg-nq-success-soft text-nq-success-text',
        'overdue' => 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text',
        'void' => 'border-border text-muted-foreground',
        'refunded' => 'border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text',
    ];
    $icons = ['draft' => 'file-clock', 'open' => 'circle-dot', 'paid' => 'circle-check', 'overdue' => 'triangle-alert', 'void' => 'circle-x', 'refunded' => 'rotate-ccw'];
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'invoice-status') }}" data-status="{{ $status }}"
    {{ $attributes->except('data-slot')->cn(['inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3', $variants[$status] ?? $variants['draft']]) }}>
    <x-dynamic-component :component="'lucide-'.($icons[$status] ?? 'circle-dot')" aria-hidden="true" />
    {{ $status === 'paid' ? $t['paidStatus'] : $t[$status] }}
</span>
