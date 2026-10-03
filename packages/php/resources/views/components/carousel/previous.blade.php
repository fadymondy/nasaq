{{-- <x-nq::carousel.previous />: sits at the inline-start edge; the chevron mirrors in RTL. Custom content replaces the chevron. --}}
@aware(['locale' => null])
@php($t = fn (string $en, string $ar) => ($locale ? str_starts_with($locale, 'ar') : \Nasaq\Nasaq::rtl()) ? $ar : $en)
<x-nq::button variant="secondary" size="icon" :disabled="true" x-bind="previous"
    aria-label="{{ $t('Previous slide', 'الشريحة السابقة') }}"
    {{ $attributes->merge(['data-slot' => 'carousel-previous'])->cn('absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-card/90 shadow-floating backdrop-blur-sm data-disabled:opacity-0 start-3') }}>
    @if ($slot->isEmpty())<x-nq::icon name="chevron-left" :directional="true" />@else{{ $slot }}@endif
</x-nq::button>
