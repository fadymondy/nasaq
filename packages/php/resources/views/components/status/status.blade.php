{{-- <x-nq::status tone="success">Done</x-nq::status>
     tone: neutral | info | success | warning | danger. icon: a lucide icon name ("rocket") or an <x-slot:icon>.
     tinted colours the label as well as the icon. Inline status, no container. --}}
@props(['tone' => 'neutral', 'icon' => null, 'tinted' => false])
@php
    $toneIcon = ['neutral' => 'circle', 'info' => 'circle-dot', 'success' => 'circle-check', 'warning' => 'circle-alert', 'danger' => 'circle-x'];
    $toneText = [
        'neutral' => 'text-muted-foreground',
        'info' => 'text-nq-info-text',
        'success' => 'text-nq-success-text',
        'warning' => 'text-nq-warning-text',
        'danger' => 'text-nq-danger-text',
    ];
    $tone = array_key_exists($tone, $toneIcon) ? $tone : 'neutral';
    $iconClass = 'size-3.5 shrink-0 '.$toneText[$tone];
    $label = trim(strip_tags((string) $slot));
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'status') }}" data-tone="{{ $tone }}" {{ $attributes->except('data-slot')->cn(['inline-flex min-w-0 items-center gap-1.5 text-body-sm', $tinted ? $toneText[$tone] : 'text-foreground']) }}>
    @if (isset($icon) && $icon instanceof \Illuminate\View\ComponentSlot)
        <span aria-hidden="true" class="inline-flex {{ $iconClass }} [&_svg]:size-3.5">{{ $icon }}</span>
    @else
        <x-dynamic-component :component="'lucide-'.($icon ?: $toneIcon[$tone])" aria-hidden="true" :class="$iconClass" />
    @endif
    <span class="truncate" @if ($label !== '') title="{{ $label }}" @endif>{{ $slot }}</span>
</span>
