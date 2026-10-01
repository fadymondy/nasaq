{{-- <x-nq::carousel.next />: sits at the inline-end edge; the chevron mirrors in RTL. Custom content replaces the chevron. --}}
@aware(['locale' => null])
@php($t = fn (string $en, string $ar) => ($locale ? str_starts_with($locale, 'ar') : \Nasaq\Nasaq::rtl()) ? $ar : $en)
<x-nq::button variant="secondary" size="icon" x-bind="next"
    aria-label="{{ $t('Next slide', 'الشريحة التالية') }}"
    {{ $attributes->merge(['data-slot' => 'carousel-next'])->cn('absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-card/90 shadow-floating backdrop-blur-sm data-disabled:opacity-0 end-3') }}>
    @if ($slot->isEmpty())<x-nq::icon name="chevron-right" :directional="true" />@else{{ $slot }}@endif
</x-nq::button>
