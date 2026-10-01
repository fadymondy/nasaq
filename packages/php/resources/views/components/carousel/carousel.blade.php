{{-- <x-nq::carousel label="Gallery" class="max-w-xl"> content > item, previous, next, dots </x-nq::carousel>
     A swipeable slide carousel on native CSS scroll-snap; arrows, dots and swipes follow the reading direction.
     loop: wrap at the ends   align: start | center | end   autoplay: true (5000 ms) or an interval in ms; off under reduced motion
     label: accessible name   locale / dir: override the app locale for isolated demos.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['loop' => false, 'align' => 'start', 'autoplay' => false, 'label' => null, 'locale' => null, 'dir' => null])
@php
    $ar = $locale ? str_starts_with($locale, 'ar') : \Nasaq\Nasaq::rtl();
    $t = fn (string $en, string $arabic) => $ar ? $arabic : $en;
    $dir ??= in_array(strtolower(explode('-', str_replace('_', '-', $locale ?? ''))[0]), ['ar', 'he', 'fa', 'ur'], true) ? 'rtl' : ($locale ? 'ltr' : (\Nasaq\Nasaq::rtl() ? 'rtl' : 'ltr'));
    $options = [
        'loop' => (bool) $loop,
        'align' => $align,
        'autoplay' => $autoplay === true ? 5000 : (int) $autoplay,
        'rtl' => $dir === 'rtl',
        'labels' => [
            'previous' => $t('Previous slide', 'الشريحة السابقة'),
            'next' => $t('Next slide', 'الشريحة التالية'),
            'slides' => $t('Choose slide', 'اختيار الشريحة'),
            'goTo' => $t('Go to slide {n}', 'الانتقال إلى الشريحة {n}'),
            'slide' => $t('Slide {n} of {total}', 'الشريحة {n} من {total}'),
            'pause' => $t('Pause autoplay', 'إيقاف التشغيل التلقائي'),
            'play' => $t('Start autoplay', 'بدء التشغيل التلقائي'),
        ],
    ];
@endphp
<div role="region" aria-roledescription="carousel" aria-label="{{ $label ?? $t('Carousel', 'شريط الشرائح') }}" dir="{{ $dir }}" lang="{{ $locale ?? app()->getLocale() }}" tabindex="0"
    data-slot="carousel" x-data="nqCarousel({!! \Illuminate\Support\Js::from($options) !!})" x-bind="root"
    {{ $attributes->cn('relative rounded-card outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus') }}>
    {{ $slot }}
    {{-- Live region: only while autoplay is off, so a rotating carousel does not chatter. --}}
    <div class="sr-only" aria-atomic="true" x-bind="live"></div>
</div>
