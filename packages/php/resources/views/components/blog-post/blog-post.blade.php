{{-- <x-nq::blog-post :post="$post" :posts="$posts" url="https://example.com/blog/the-slug" post-href="/blog/{slug}" back-href="/blog">
         <x-slot:comments>…</x-slot:comments>
     </x-nq::blog-post>
     An article page: cover, category, title, author byline with date and reading time, a reading progress bar, a sticky table of contents with
     scroll-spy, the Markdown body with code and callouts, tags, share, author card, previous/next and related posts.
     post: slug, title, excerpt, category, tags[], date, body (Markdown), and optionally cover, coverAlt, updated, readingMinutes,
     author { name, role, avatar, bio }.   posts: every post, to derive related and previous/next (ignored for the ones passed explicitly).
     related: posts.   previous: the next older post.   next: the next newer post.   url: absolute URL for sharing (default the current page).
     post-href: a URL with {slug} in it (default #{slug}).   tag-href: a URL with {tag} in it; without it tags are plain badges.   back-href: link to the archive.
     toc: the table of contents (true).   progress: the reading progress bar (true).   scroll-offset: px headings keep from the top (96).
     labels: an array overriding the built-in texts by key (back, onThisPage, progress, share, shareTitle, tags, aboutAuthor, related, relatedHint,
     previous, next, comments, permalink, updated, minRead).
     Slots: comments (below the article), actions (next to the share button).   Needs the Alpine runtime (@nasaqScripts). --}}
@props(['post', 'posts' => [], 'related' => null, 'previous' => null, 'next' => null, 'url' => null, 'postHref' => '#{slug}', 'tagHref' => null, 'backHref' => null,
    'toc' => true, 'progress' => true, 'scrollOffset' => 96, 'labels' => [], 'comments' => null, 'actions' => null])
@include('nasaq::components.blog-post._logic')
@php
    $post = (array) $post;
    $t = nq_bp_words(null, $labels);
    $author = ! empty($post['author']) ? (array) $post['author'] : null;
    $body = (string) ($post['body'] ?? '');
    $items = nq_bp_toc($body);
    $showToc = $toc && count($items) > 1;
    $minutes = $post['readingMinutes'] ?? nq_bp_minutes($body);
    $all = collect($posts)->map(fn ($p) => (array) $p)->all();
    $relatedPosts = $related !== null ? array_map(fn ($p) => (array) $p, (array) $related) : ($all ? nq_bp_related($post, $all) : []);
    [$olderAuto, $newerAuto] = $all ? nq_bp_adjacent($post, $all) : [null, null];
    $older = $previous !== null ? (array) $previous : $olderAuto;
    $newer = $next !== null ? (array) $next : $newerAuto;
    $link = fn (array $p) => str_replace('{slug}', rawurlencode($p['slug']), $postHref);
    $href = $url ?? request()->fullUrl();
    $hues = ['gray', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink'];
    $h = 5381;
    foreach (unpack('n*', mb_convert_encoding((string) $post['category'], 'UTF-16BE', 'UTF-8')) ?: [] as $unit) {
        $h = (($h << 5) + $h + $unit) & 0xFFFFFFFF;
    }
    $hue = $hues[1 + ($h % (count($hues) - 1))];
    $slug = $post['slug'];
    $hasComments = $comments && ! $comments->isEmpty();
    $config = ['ids' => array_column($items, 'id'), 'offset' => (int) $scrollOffset];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'blog-post') }}" x-data="nqBlogPost(@js($config))" {{ $attributes->except('data-slot')->cn('@container flex flex-col gap-8') }}>
    @if ($progress)
        <x-nq::blog-post.reading-progress :label="$t['progress']" class="-mb-8" />
    @endif

    <header class="mx-auto flex w-full max-w-3xl flex-col items-start gap-4">
        @if ($backHref)
            <a href="{{ $backHref }}" class="inline-flex items-center gap-1 rounded-[2px] text-body-sm text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                <x-lucide-arrow-left class="size-4 rtl:-scale-x-100" aria-hidden="true" />
                {{ $t['back'] }}
            </a>
        @endif
        <x-nq::badge variant="tag" :hue="$hue">{{ $post['category'] }}</x-nq::badge>
        <h1 dir="auto" class="text-balance text-display text-foreground">{{ $post['title'] }}</h1>
        <p dir="auto" class="text-pretty text-body text-muted-foreground">{{ $post['excerpt'] }}</p>
        <div class="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-border py-3">
            <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
                @if ($author)
                    <span class="inline-flex items-center gap-2">
                        <x-nq::avatar :name="$author['name']" :src="$author['avatar'] ?? null" size="md" />
                        <span class="flex flex-col leading-tight">
                            <bdi class="text-label text-foreground">{{ $author['name'] }}</bdi>
                            @if (! empty($author['role']))
                                <span class="text-caption text-muted-foreground">{{ $author['role'] }}</span>
                            @endif
                        </span>
                    </span>
                @endif
                <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                    <x-nq::numeric.date-time :value="$post['date']" date-style="long" />
                    <span class="inline-flex items-center gap-1">
                        <x-lucide-clock class="size-3" aria-hidden="true" />
                        {{ str_replace('{n}', (string) $minutes, $t['minRead']) }}
                    </span>
                    @if (! empty($post['updated']))
                        <span>{{ $t['updated'] }} <x-nq::numeric.date-time :value="$post['updated']" date-style="medium" /></span>
                    @endif
                </p>
            </div>
            <div class="flex items-center gap-2">
                {{ $actions }}
                <x-nq::share-action :url="$href" :title="$post['title']" :text="$post['excerpt']" :link-access="false">{{ $t['share'] }}</x-nq::share-action>
            </div>
        </div>
    </header>

    <x-nq::blog-index.post-cover :post="$post" ratio="aspect-[21/9]" class="mx-auto max-w-5xl" />

    <div class="mx-auto grid w-full max-w-5xl grid-cols-1 gap-x-12 gap-y-6 {{ $showToc ? '@4xl:grid-cols-[minmax(0,1fr)_14rem]' : '' }}">
        <div class="flex min-w-0 flex-col gap-8">
            @if ($showToc)
                <x-nq::collapsible x-model="tocOpen" class="@4xl:hidden">
                    <x-nq::collapsible.trigger variant="secondary" class="w-full justify-between">
                        {{ $t['onThisPage'] }}
                        <x-lucide-chevron-down class="transition-transform duration-200 ease-nq" x-bind:class="tocOpen && 'rotate-180'" aria-hidden="true" />
                    </x-nq::collapsible.trigger>
                    <x-nq::collapsible.panel>
                        <x-nq::blog-post.table-of-contents :items="$items" :title="$t['onThisPage']" class="pt-3" />
                    </x-nq::collapsible.panel>
                </x-nq::collapsible>
            @endif

            <article x-ref="article" class="flex min-w-0 max-w-[44rem] flex-col gap-10">
                <x-nq::blog-post.post-body :markdown="$body" :scroll-offset="$scrollOffset" />

                <div class="flex flex-col gap-4 border-t border-border pt-6">
                    @if (! empty($post['tags']))
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="text-label text-muted-foreground">{{ $t['tags'] }}</span>
                            @foreach ($post['tags'] as $tag)
                                @if ($tagHref)
                                    <a href="{{ str_replace('{tag}', rawurlencode($tag), $tagHref) }}" class="rounded-[4px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                                        <x-nq::badge variant="outline" class="hover:bg-nq-hover"><bdi>#{{ $tag }}</bdi></x-nq::badge>
                                    </a>
                                @else
                                    <x-nq::badge variant="outline"><bdi>#{{ $tag }}</bdi></x-nq::badge>
                                @endif
                            @endforeach
                        </div>
                    @endif
                    @if (! empty($author['bio']))
                        <x-nq::card class="flex-row items-start gap-3 p-4">
                            <x-nq::avatar :name="$author['name']" :src="$author['avatar'] ?? null" size="lg" />
                            <div class="flex min-w-0 flex-col gap-1">
                                <p class="eyebrow">{{ $t['aboutAuthor'] }}</p>
                                <p class="text-label text-foreground"><bdi>{{ $author['name'] }}</bdi></p>
                                <p dir="auto" class="text-body-sm text-muted-foreground">{{ $author['bio'] }}</p>
                            </div>
                        </x-nq::card>
                    @endif
                </div>
            </article>
        </div>

        @if ($showToc)
            <aside class="hidden @4xl:block">
                <div class="sticky flex max-h-[calc(100dvh-8rem)] flex-col overflow-y-auto" style="top: {{ (int) $scrollOffset }}px">
                    <x-nq::blog-post.table-of-contents :items="$items" :title="$t['onThisPage']" />
                </div>
            </aside>
        @endif
    </div>

    @if ($older || $newer)
        <nav aria-label="{{ $t['previous'] }} / {{ $t['next'] }}" class="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 @2xl:grid-cols-2">
            @if ($older)
                <a href="{{ $link($older) }}" data-slot="post-adjacent"
                    class="group/adj flex min-w-0 flex-col gap-1 rounded-card border border-border bg-card p-4 outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                    <span class="inline-flex items-center gap-1 text-caption text-muted-foreground">
                        <x-lucide-arrow-left class="size-3 rtl:-scale-x-100" aria-hidden="true" />
                        {{ $t['previous'] }}
                    </span>
                    <span dir="auto" class="text-balance text-label text-foreground">{{ $older['title'] }}</span>
                </a>
            @else
                <span></span>
            @endif
            @if ($newer)
                <a href="{{ $link($newer) }}" data-slot="post-adjacent"
                    class="group/adj flex min-w-0 flex-col gap-1 rounded-card border border-border bg-card p-4 outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus @2xl:text-end @2xl:items-end">
                    <span class="inline-flex items-center gap-1 text-caption text-muted-foreground">
                        {{ $t['next'] }}
                        <x-lucide-arrow-right class="size-3 rtl:-scale-x-100" aria-hidden="true" />
                    </span>
                    <span dir="auto" class="text-balance text-label text-foreground">{{ $newer['title'] }}</span>
                </a>
            @else
                <span></span>
            @endif
        </nav>
    @endif

    @if (count($relatedPosts))
        <section class="mx-auto flex w-full max-w-5xl flex-col gap-4" aria-labelledby="{{ $slug }}-related">
            <x-nq::section-header :heading-id="$slug.'-related'" :title="$t['related']" :description="$t['relatedHint']" />
            <div class="grid grid-cols-1 gap-x-6 gap-y-8 @2xl:grid-cols-2 @4xl:grid-cols-3">
                @foreach ($relatedPosts as $p)
                    <x-nq::blog-index.post-card :post="$p" :href="$link($p)" />
                @endforeach
            </div>
        </section>
    @endif

    @if ($hasComments)
        <section class="mx-auto flex w-full max-w-3xl flex-col gap-4" aria-labelledby="{{ $slug }}-comments">
            <x-nq::section-header :heading-id="$slug.'-comments'" :title="$t['comments']" />
            {{ $comments }}
        </section>
    @endif
</div>
