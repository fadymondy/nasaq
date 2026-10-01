{{-- <x-nq::blog-index.post-card :post="$post" href="/blog/the-slug" variant="featured" />
     One article in a list: cover, category, title (the whole card is the link), excerpt, date and reading time.
     post: slug, title, excerpt, category, date, cover, coverAlt, author { name, avatar }, readingMinutes.
     variant: default (cover above) | featured (cover beside a large title) | compact (no cover). href defaults to #slug. --}}
@props(['post', 'href' => null, 'variant' => 'default'])
@php
    $post = (array) $post;
    $author = (array) ($post['author'] ?? []);
    $hues = ['gray', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink'];
    $h = 5381;
    foreach (unpack('n*', mb_convert_encoding((string) $post['category'], 'UTF-16BE', 'UTF-8')) ?: [] as $unit) {
        $h = (($h << 5) + $h + $unit) & 0xFFFFFFFF;
    }
    $hue = $hues[1 + ($h % (count($hues) - 1))];
    $featured = $variant === 'featured';
    $compact = $variant === 'compact';
@endphp
<article data-slot="post-card" data-variant="{{ $variant }}"
    {{ $attributes->cn([
        'group/post relative flex min-w-0 gap-4',
        $featured ? '@3xl:grid @3xl:grid-cols-2 @3xl:items-center @3xl:gap-8 flex-col' : 'flex-col',
        $compact ? 'gap-2 rounded-card border border-border bg-card p-4 transition-colors duration-150 ease-nq hover:bg-nq-hover' : '',
    ]) }}>
    @unless ($compact)
        <x-nq::blog-index.post-cover :post="$post" class="transition-[border-color] duration-150 ease-nq group-hover/post:border-nq-line-strong {{ $featured ? '@3xl:aspect-[4/3]' : '' }}" />
    @endunless
    <div class="flex min-w-0 flex-col items-start gap-2 {{ $featured ? 'gap-3' : '' }}">
        <div class="flex flex-wrap items-center gap-2">
            @if ($featured)
                <x-nq::badge variant="accent">{{ \Nasaq\Nasaq::t('Featured', 'مقال مميز') }}</x-nq::badge>
            @endif
            <x-nq::badge variant="tag" :hue="$hue">{{ $post['category'] }}</x-nq::badge>
        </div>
        <h3 class="text-balance text-foreground {{ $featured ? 'text-h1' : 'text-h3' }}">
            <a href="{{ $href ?? '#'.$post['slug'] }}" dir="auto"
                class="rounded-[2px] outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-nq-focus">{{ $post['title'] }}</a>
        </h3>
        <p dir="auto" class="text-pretty text-muted-foreground {{ $featured ? 'text-body' : 'line-clamp-3 text-body-sm' }}">{{ $post['excerpt'] }}</p>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            @if (! empty($author['name']))
                <span class="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                    <x-nq::avatar :name="$author['name']" :src="$author['avatar'] ?? null" size="xs" />
                    <bdi>{{ $author['name'] }}</bdi>
                </span>
            @endif
            <x-nq::blog-index.post-meta :post="$post" />
        </div>
        @if ($featured)
            <span class="mt-1 inline-flex items-center gap-1 text-label text-foreground">
                {{ \Nasaq\Nasaq::t('Read article', 'اقرأ المقال') }}
                <x-lucide-arrow-right class="size-4 transition-transform duration-150 ease-nq group-hover/post:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/post:-translate-x-0.5" aria-hidden="true" />
            </span>
        @endif
    </div>
</article>
