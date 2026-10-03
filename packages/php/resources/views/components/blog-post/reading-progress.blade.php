{{-- <x-nq::blog-post.reading-progress />   A thin bar that fills as the reader scrolls through the article. Used inside <x-nq::blog-post>, whose
     Alpine scope (nqBlogPost) owns `progress`. Sticks to the top, fills from the inline start, role="progressbar". label: accessible name. --}}
@props(['label' => null])
@include('nasaq::components.blog-post._logic')
<div data-slot="{{ $attributes->get('data-slot', 'reading-progress') }}" role="progressbar" aria-label="{{ $label ?? nq_bp_words()['progress'] }}" aria-valuemin="0" aria-valuemax="100"
    aria-valuenow="0" x-bind:aria-valuenow="Math.round(progress * 100)" {{ $attributes->except('data-slot')->cn('sticky top-0 z-30 h-0.5 w-full') }}>
    <div class="h-full bg-primary" style="width: 0%" x-bind:style="{ width: progress * 100 + '%' }"></div>
</div>
