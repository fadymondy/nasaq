{{-- <x-nq::carousel.dots />: one dot per scroll snap, drawn by Alpine. The current dot has aria-current="true". Place it under the content. --}}
@aware(['locale' => null])
@php($t = fn (string $en, string $ar) => ($locale ? str_starts_with($locale, 'ar') : \Nasaq\Nasaq::rtl()) ? $ar : $en)
<div role="group" aria-label="{{ $t('Choose slide', 'اختيار الشريحة') }}" data-slot="carousel-dots" x-bind="dots" style="display: none"
    {{ $attributes->cn('mt-3 flex items-center justify-center gap-1.5') }}>
    <template x-for="i in count" :key="i">
        <button type="button" x-bind="dot(i - 1)" class="relative h-2 rounded-full outline-none transition-[width,background-color] duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus after:absolute after:-inset-2 after:content-['']"></button>
    </template>
</div>
