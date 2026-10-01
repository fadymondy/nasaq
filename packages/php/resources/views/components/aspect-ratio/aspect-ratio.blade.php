{{-- <x-nq::aspect-ratio :ratio="16 / 9" class="rounded-card"><img src="/cover.jpg" alt="" /></x-nq::aspect-ratio>
     ratio: width over height (16 / 9, 4 / 3, 1). Direct img, video and iframe children fill the box. --}}
@props(['ratio' => 16 / 9])
@php $style = 'aspect-ratio: '.$ratio.($attributes->get('style') ? '; '.$attributes->get('style') : ''); @endphp
<div data-slot="aspect-ratio" style="{{ $style }}"
    {{ $attributes->except('style')->cn([
        'relative w-full overflow-hidden',
        '[&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:size-full [&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>img]:object-cover [&>video]:absolute [&>video]:inset-0 [&>video]:size-full [&>video]:object-cover',
    ]) }}>{{ $slot }}</div>
