{{-- <x-nq::booking-pipeline.status-badge status="checked_in" />
     A booking status chip: a distinct icon and the name, coloured by stage. status: requested | confirmed | checked_in | in_visit | done | no_show | cancelled.
     hide-icon: leave the icon out (it keeps the status readable without colour, so keep it unless you have a reason). No JavaScript needed. --}}
@props(['status' => 'requested', 'hideIcon' => false])
@php
    $names = [
        'requested' => ['Requested', 'مطلوب', 'warning', 'clock'],
        'confirmed' => ['Confirmed', 'مؤكد', 'neutral', 'calendar-check'],
        'checked_in' => ['Checked in', 'تم تسجيل الوصول', 'info', 'log-in'],
        'in_visit' => ['In visit', 'في الزيارة', 'brand', 'stethoscope'],
        'done' => ['Done', 'منتهي', 'success', 'check-check'],
        'no_show' => ['No-show', 'لم يحضر', 'danger', 'user-x'],
        'cancelled' => ['Cancelled', 'ملغى', 'outline', 'x-circle'],
    ];
    [$en, $ar, $variant, $icon] = $names[$status] ?? $names['requested'];
    $variants = [
        'neutral' => 'border-border bg-secondary text-foreground',
        'outline' => 'border-border text-muted-foreground',
        'brand' => 'border-nq-brand/40 bg-[color-mix(in_oklab,var(--nq-brand)_14%,transparent)] text-foreground',
        'success' => 'border-nq-success/40 bg-nq-success-soft text-nq-success-text',
        'warning' => 'border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text',
        'danger' => 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text',
        'info' => 'border-nq-info/40 bg-nq-info-soft text-nq-info-text',
    ];
@endphp
<span data-slot="booking-status-badge" data-status="{{ $status }}" {{ $attributes->cn(['inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3', $variants[$variant], 'gap-1']) }}>
    @unless ($hideIcon)<x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" class="size-3" />@endunless
    {{ \Nasaq\Nasaq::t($en, $ar) }}
</span>
