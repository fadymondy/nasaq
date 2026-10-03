{{-- <x-nq::blog-index title="Blog" description="Notes on design and engineering." :posts="$posts" post-href="/blog/{slug}" />
     The blog's archive page: a featured article, search, category and tag filters, a grid of post cards, and pagination.
     Every article is rendered by the server; the Alpine runtime (@nasaqScripts) filters and pages them in the browser.
     posts: arrays of slug, title, excerpt, category, tags[], date, and optionally cover, coverAlt, author { name, avatar }, readingMinutes, featured.
     post-href: a URL with {slug} in it (default #{slug}).   page-size: per page, not counting the featured one (6).
     show-featured: the featured article above the list on page 1 while no filter is active (true).   max-tags: how many tags to offer (8).
     actions slot: next to the heading (an RSS or subscribe button).   labels: an array overriding the built-in texts by key.
     Listen on the root for nq:filter { query, category, tag } and nq:page { page }. --}}
@props(['posts', 'title' => null, 'description' => null, 'pageSize' => 6, 'showFeatured' => true, 'postHref' => '#{slug}', 'maxTags' => 8, 'labels' => [], 'actions' => null])
@php
    $t = fn (string $key) => $labels[$key] ?? \Nasaq\Nasaq::t(...[
        'title' => ['Blog', 'المدونة'],
        'description' => ['Notes on design systems, product and engineering.', 'ملاحظات في أنظمة التصميم والمنتج والهندسة.'],
        'search' => ['Search articles', 'ابحث في المقالات'],
        'searchPlaceholder' => ['Search articles…', 'ابحث في المقالات…'],
        'clearSearch' => ['Clear search', 'مسح البحث'],
        'categories' => ['Categories', 'التصنيفات'],
        'tags' => ['Tags', 'الوسوم'],
        'all' => ['All', 'الكل'],
        'allTags' => ['Any tag', 'أي وسم'],
        'results' => ['{n} articles', '{n} مقالات'],
        'resultsOne' => ['1 article', 'مقال واحد'],
        'noResults' => ['No articles match', 'لا توجد مقالات مطابقة'],
        'noResultsHint' => ['Try a different word, or clear the filters.', 'جرّب كلمة أخرى، أو امسح عوامل التصفية.'],
        'clearFilters' => ['Clear filters', 'مسح عوامل التصفية'],
        'pagination' => ['Articles pages', 'صفحات المقالات'],
    ][$key]);
    $posts = collect($posts)->map(fn ($p) => (array) $p)->sortByDesc(fn ($p) => strtotime(is_string($p['date']) ? $p['date'] : (($p['date'] instanceof \DateTimeInterface) ? $p['date']->format('c') : '@'.$p['date'])))->values();
    $time = fn ($p) => strtotime(is_string($p['date']) ? $p['date'] : (($p['date'] instanceof \DateTimeInterface) ? $p['date']->format('c') : '@'.$p['date']));
    $featured = $showFeatured ? ($posts->first(fn ($p) => ! empty($p['featured'])) ?? $posts->first()) : null;
    $list = $featured ? $posts->reject(fn ($p) => $p['slug'] === $featured['slug'])->values() : $posts;
    $size = max(1, (int) $pageSize);
    $pageCount = max(1, (int) ceil($list->count() / $size));
    $firstPage = $list->take($size)->pluck('slug')->all();
    $count = fn (array $counts) => collect($counts)->map(fn ($n, $v) => ['value' => (string) $v, 'count' => $n])->sortByDesc('count')->values();
    $categories = $count($posts->countBy('category')->all());
    $tagList = $count($posts->flatMap(fn ($p) => array_unique($p['tags'] ?? []))->countBy()->all())->take($maxTags);
    $href = fn ($p) => str_replace('{slug}', rawurlencode($p['slug']), $postHref);
    $hide = 'display: none';
    $uid = 'nq-blog-'.substr(md5($posts->pluck('slug')->implode(',')), 0, 6);
    $config = [
        'pageSize' => $size,
        'showFeatured' => (bool) $showFeatured,
        'posts' => $posts->map(fn ($p) => [
            'slug' => $p['slug'],
            'category' => $p['category'],
            'tags' => array_values($p['tags'] ?? []),
            'time' => $time($p) * 1000,
            'featured' => ! empty($p['featured']),
            'hay' => implode(' ', [$p['title'], $p['excerpt'], $p['category'], implode(' ', $p['tags'] ?? []), $p['author']['name'] ?? '']),
        ])->all(),
        'labels' => ['results' => $t('results'), 'resultsOne' => $t('resultsOne')],
    ];
    $total = $posts->count();
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'blog-index') }}" aria-labelledby="{{ $uid }}-h" x-data="nqBlogIndex(@js($config))"
    {{ $attributes->except('data-slot')->cn('@container flex flex-col gap-8') }}>
    <x-nq::section-header as="h1" :heading-id="$uid.'-h'" :title="$title ?? $t('title')" :description="$description ?? $t('description')" :action="$actions" />

    @if ($featured)
        <div data-featured x-show="featuredShown">
            <x-nq::blog-index.post-card :post="$featured" :href="$href($featured)" variant="featured" />
        </div>
    @endif

    <div class="flex flex-col gap-3" role="search">
        <x-nq::input-group class="max-w-md">
            <x-nq::input-group.addon><x-lucide-search aria-hidden="true" /></x-nq::input-group.addon>
            <x-nq::input-group.input type="search" aria-label="{{ $t('search') }}" placeholder="{{ $t('searchPlaceholder') }}" x-model="query"
                class="[&::-webkit-search-cancel-button]:appearance-none" />
            <x-nq::input-group.addon align="end" x-show="query !== ''" style="{{ $hide }}">
                <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t('clearSearch') }}" x-on:click="query = ''"><x-lucide-x aria-hidden="true" /></x-nq::button>
            </x-nq::input-group.addon>
        </x-nq::input-group>
        @if ($categories->count() > 1)
            <x-nq::chip-group aria-label="{{ $t('categories') }}" default-value="" x-model="category">
                <x-nq::chip-group.chip value="">{{ $t('all') }}</x-nq::chip-group.chip>
                @foreach ($categories as $c)
                    <x-nq::chip-group.chip :value="$c['value']">{{ $c['value'] }} <span class="text-muted-foreground">{{ $c['count'] }}</span></x-nq::chip-group.chip>
                @endforeach
            </x-nq::chip-group>
        @endif
        @if ($tagList->isNotEmpty())
            <x-nq::chip-group aria-label="{{ $t('tags') }}" default-value="" x-model="tag">
                <x-nq::chip-group.chip value="">{{ $t('allTags') }}</x-nq::chip-group.chip>
                @foreach ($tagList as $tg)
                    <x-nq::chip-group.chip :value="$tg['value']"><bdi>#{{ $tg['value'] }}</bdi></x-nq::chip-group.chip>
                @endforeach
            </x-nq::chip-group>
        @endif
    </div>

    <div class="flex flex-col gap-4">
        <p role="status" aria-live="polite" class="text-body-sm text-muted-foreground" x-text="resultsText">{{ $total === 1 ? $t('resultsOne') : str_replace('{n}', (string) $total, $t('results')) }}</p>
        <div x-show="shownCount > 0" class="grid grid-cols-1 gap-x-6 gap-y-10 @2xl:grid-cols-2 @5xl:grid-cols-3" @if (! $list->count()) style="{{ $hide }}" @endif>
            @foreach ($posts as $p)
                <div data-post="{{ $p['slug'] }}" class="contents" x-show="visible[@js($p['slug'])]" @unless (in_array($p['slug'], $firstPage, true)) style="{{ $hide }}" @endunless>
                    <x-nq::blog-index.post-card :post="$p" :href="$href($p)" />
                </div>
            @endforeach
        </div>
        <x-nq::states :icon="'search'" :title="$t('noResults')" :description="$t('noResultsHint')" x-show="count === 0" style="{{ $hide }}">
            <x-slot:actions>
                <x-nq::button variant="secondary" x-on:click="clearFilters()">{{ $t('clearFilters') }}</x-nq::button>
            </x-slot:actions>
        </x-nq::states>
        <x-nq::pagination :page-count="$pageCount" :page="1" :label="$t('pagination')" class="mx-auto" x-model="pageNo" x-effect="pageCount = pageTotal"
            x-show="pageTotal > 1" :style="$pageCount <= 1 ? $hide : null" />
    </div>
</section>
