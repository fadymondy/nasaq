{{-- <x-nq::profile-page.writing :posts="$posts" all-href="/blog" :post-href="fn ($p) => '/blog/'.$p['slug']" :limit="3" />
     The latest articles as post cards with a link to the whole blog. post-href: a closure, or a template with {slug}. --}}
@props(['posts' => [], 'limit' => 3, 'postHref' => null, 'allHref' => null, 'locale' => null, 'labels' => []])
@include('nasaq::components.profile-page._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_pp_words($locale, (array) $labels);
    $posts = array_values(array_map(fn ($x) => (array) $x, (array) $posts));
    $hrefOf = function (array $p) use ($postHref) {
        if ($postHref instanceof \Closure) {
            return $postHref($p);
        }

        return is_string($postHref) ? str_replace('{slug}', $p['slug'], $postHref) : null;
    };
@endphp
<x-nq::profile-page.section :title="$t['writing']" :description="$t['writingHint']" :count="count($posts)" :locale="$locale" {{ $attributes }}>
    @if ($allHref)
        <x-slot:action><x-nq::button variant="link" :href="$allHref">{{ $t['allArticles'] }}<x-nq::icon name="arrow-right" directional /></x-nq::button></x-slot:action>
    @endif
    <div class="grid grid-cols-1 gap-x-6 gap-y-8 @2xl:grid-cols-2 @5xl:grid-cols-3">
        @foreach (array_slice($posts, 0, (int) $limit) as $p)
            <x-nq::blog-index.post-card :post="$p" :href="$hrefOf($p)" />
        @endforeach
    </div>
</x-nq::profile-page.section>
