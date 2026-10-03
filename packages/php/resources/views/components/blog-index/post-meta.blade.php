{{-- <x-nq::blog-index.post-meta :post="$post" />   The meta line of a post: date and reading time (post: date, readingMinutes). --}}
@props(['post'])
@php
    $post = (array) $post;
    $minRead = \Nasaq\Nasaq::t('{n} min read', '{n} د للقراءة');
@endphp
<p {{ $attributes->cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground') }}>
    <x-nq::numeric.date-time :value="$post['date']" date-style="medium" />
    @if (! empty($post['readingMinutes']))
        <span class="inline-flex items-center gap-1">
            <x-lucide-clock class="size-3" aria-hidden="true" />
            {{ str_replace('{n}', (string) $post['readingMinutes'], $minRead) }}
        </span>
    @endif
</p>
