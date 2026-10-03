{{-- <x-nq::cert-monitor.days-left-badge :days="12" host="app.example.com" />
     The days-left figure of a certificate as a badge: green above 30 days, amber at 30 or fewer, red at 7 or fewer or expired, neutral when unknown (null). Colour is backed by the text.
     days: whole days until expiry (negative once expired, null when the check failed). host: used in the spoken label. warn-days (30) and critical-days (7): the thresholds.
     data-status is valid | expiring | critical | expired | error. Static: no Alpine needed. --}}
@props(['days' => null, 'host' => '', 'warnDays' => 30, 'criticalDays' => 7])
@php
    $t = \Nasaq\Nasaq::class;
    $d = $days === null ? null : (int) $days;
    $status = $d === null ? 'error' : ($d < 0 ? 'expired' : ($d <= $criticalDays ? 'critical' : ($d <= $warnDays ? 'expiring' : 'valid')));
    // The badge's classes, copied from badge.blade.php, so data-slot can be days-left-badge.
    $tone = [
        'valid' => 'border-nq-success/40 bg-nq-success-soft text-nq-success-text',
        'expiring' => 'border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text',
        'critical' => 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text',
        'expired' => 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text',
        'error' => 'border-border bg-secondary text-foreground',
    ][$status];
    $n = $d === null ? 0 : abs($d);
    $label = $d === null ? $t::t('Unknown', 'غير معروف') : ($d < 0 ? $t::t("Expired {$n} d ago", "منتهية منذ {$n} ي") : ($d === 0 ? $t::t('Today', 'اليوم') : $t::t("{$d} d", "{$d} ي")));
    $aria = $d === null ? $t::t("{$host}: could not be checked", "{$host}: تعذّر الفحص") : ($d < 0 ? $t::t("{$host}: expired {$n} days ago", "{$host}: منتهية منذ {$n} يومًا") : $t::t("{$host}: {$d} days left", "{$host}: متبقٍ {$d} يومًا"));
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'days-left-badge') }}" data-status="{{ $status }}" aria-label="{{ $aria }}"
    {{ $attributes->except('data-slot')->cn([
        'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3',
        $tone,
    ]) }}>{{ $label }}</span>
