{{-- <x-nq::product-mark.logo brand="zekra" :size="20" />
     Mark + typeset name as a UI label. Never exported as a lockup image. Latin: mono 500, +0.14em, uppercase, LTR. Arabic: the Arabic face, no tracking.
     arabic: show the Arabic name where the brand has one (default: the Arabic locale). The name scales with size (0.6x Latin, 0.7x Arabic). --}}
@props(['brand' => null, 'size' => 20, 'arabic' => null])
@php
    $names = [
        'nasaq' => ['NASAQ', 'نسق'], 'fadymondy' => ['FADY MONDY', null], 'mahaam' => ['MAHAAM', 'مهام'], 'zekra' => ['ZEKRA', 'ذكرة'],
        'moharrik' => ['MOHARRIK', 'محرّك'], 'seatfor' => ['SEATFOR', null], 'health-debug' => ['HEALTH DEBUG', 'شفرة التعافي الصحي'],
        'circlexo' => ['CIRCLEXO', 'سيركل إكس أو'], 'hosbah' => ['HOSBAH', 'حوسبة'], 'orchestra' => ['ORCHESTRA', 'اوركيسترا'], 'togo' => ['TOGO', null],
    ];
    $aliases = ['managy' => 'mahaam', 'cabrain' => 'zekra', 'claude-digital-twin' => 'moharrik', 'booki' => 'seatfor', 'cloudy' => 'hosbah', 'orchestra-mcp' => 'orchestra', 'fady-mondy' => 'fadymondy', 'togo-framework' => 'togo'];
    $key = $brand ?: (config('nasaq.brand') ?: 'nasaq');
    $key = isset($names[$key]) ? $key : ($aliases[$key] ?? 'nasaq');
    [$latin, $arabicName] = $names[$key];
    $useArabic = ($arabic ?? \Nasaq\Nasaq::rtl()) && $arabicName !== null;
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'product-logo') }}" {{ $attributes->except('data-slot')->cn('inline-flex items-center gap-2') }}>
    <x-nq::product-mark :brand="$key" :size="$size" title="" />
    @if ($useArabic)
        <span lang="ar" class="font-arabic font-medium tracking-normal text-foreground" style="font-size: {{ $size * 0.7 }}px">{{ $arabicName }}</span>
    @else
        <span dir="ltr" class="font-mono font-medium tracking-[0.14em] uppercase text-foreground" style="font-size: {{ $size * 0.6 }}px">{{ $latin }}</span>
    @endif
</span>
