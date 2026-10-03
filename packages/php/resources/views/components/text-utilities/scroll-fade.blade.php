{{-- <x-nq::text-utilities.scroll-fade><span class="shrink-0 ...">Chip</span> ...</x-nq::text-utilities.scroll-fade>
     A horizontally scrolling row that fades out the edge that still has content behind it. The inline start comes from the layout direction, so in Arabic the first fade is on the right.
     The region takes keyboard focus while it scrolls. The fade is a mask, so it needs no background colour.
     fade-size: width of each fade in px (default 32). label: the region's accessible name. content-class styles the inner row.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['fadeSize' => 32, 'label' => null, 'contentClass' => null])
<div data-slot="{{ $attributes->get('data-slot', 'scroll-fade') }}" role="region" aria-label="{{ $label ?? \Nasaq\Nasaq::t('Scrollable content', 'محتوى قابل للتمرير') }}" x-data="nqScrollFade({{ (int) $fadeSize }})" x-bind="root"
    {{ $attributes->except('data-slot')->cn('overflow-x-auto overscroll-x-contain outline-none [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&::-webkit-scrollbar]:hidden') }}>
    <div class="{{ \Nasaq\Cn::merge('flex w-max min-w-full items-center gap-2', (string) $contentClass) }}">{{ $slot }}</div>
</div>
