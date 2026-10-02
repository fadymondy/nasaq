{{-- <x-nq::personal-widgets.availability-badge status="open" note="from November" />
     "Available for work" with a status dot. status: open | limited | closed. note: extra text after it (or use the slot).
     labels: ['open' => …, 'limited' => …, 'closed' => …]. The text carries the meaning; the dot is decoration. --}}
@props(['status' => 'open', 'note' => null, 'labels' => []])
@php
    $status = in_array($status, ['open', 'limited', 'closed'], true) ? $status : 'open';
    $t = array_merge(
        \Nasaq\Nasaq::rtl()
            ? ['open' => 'متاح للعمل', 'limited' => 'توفّر محدود', 'closed' => 'لا أستقبل أعمالًا جديدة']
            : ['open' => 'Available for work', 'limited' => 'Limited availability', 'closed' => 'Not taking new work'],
        (array) $labels,
    );
    $variant = ['open' => 'border-nq-success/40 bg-nq-success-soft text-nq-success-text', 'limited' => 'border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text', 'closed' => 'border-border bg-secondary text-foreground'][$status];
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'availability-badge') }}" data-status="{{ $status }}"
    {{ $attributes->except('data-slot')->cn('inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-2 text-body-sm font-medium [&_svg]:size-3 '.$variant) }}>
    <span aria-hidden="true" class="size-1.5 rounded-full bg-current {{ $status === 'open' ? 'motion-safe:animate-pulse' : '' }}"></span>
    {{ $t[$status] }}
    @if ($note !== null || $slot->isNotEmpty())<span class="font-normal opacity-80">{{ $slot->isNotEmpty() ? $slot : $note }}</span>@endif
</span>
