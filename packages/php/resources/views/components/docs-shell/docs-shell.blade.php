{{-- <x-nq::docs-shell :nav="$nav" :page="$page" nav-href="/docs/{id}"> <x-slot:brand>Nasaq Docs</x-slot:brand> </x-nq::docs-shell>
     The documentation layout: a top bar, a tree sidebar (a drawer on phones) with a filter, the page with breadcrumb, title, "Copy page", callouts and an
     "On this page" rail that follows the reader, and previous/next links. It shows the page you pass; routing is yours.
     nav: [['id' => 'intro', 'title' => 'Introduction', 'badge' => 'New'], ['id' => 'guides', 'title' => 'Guides', 'children' => [...]]]. Sections have children and no page.
     page: id (the active item of the sidebar), title, description, markdown (## and ### headings make the rail; `> [!NOTE]` makes callouts), updated (ISO date), editHref.
     nav-href: a URL with {id} in it (/docs/{id}); the sidebar and the pager then go there. Without it they only fire nq-navigate ({ id }) from the root; call
     preventDefault() on it to handle navigation yourself.
     searchable: the filter box (true). copy-page: the "Copy page" button, the page as Markdown for pasting to an AI (true). scroll-offset: px headings keep from the top (96).
     labels: an array overriding the built-in texts by key (nav, menu, closeMenu, filter, clearFilter, noMatch, onThisPage, copyPage, copied, editPage, updated,
     previous, next, pager, crumbs, docs).
     Slots: brand (left of the top bar), actions (end of the top bar), sidebarHeader (above the tree), body (replaces the Markdown body).
     A tree badge shows as an info badge after the title. The filter works in the browser. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['nav' => [], 'page', 'navHref' => null, 'searchable' => true, 'copyPage' => true, 'scrollOffset' => 96, 'labels' => [], 'brand' => null, 'actions' => null, 'sidebarHeader' => null, 'body' => null])
@include('nasaq::components.blog-post._logic')
@include('nasaq::components.docs-shell._logic')
@php
    $w = nq_docs_words((array) $labels);
    $toc = nq_bp_toc((string) $page['markdown'], 2, 3);
    $trail = nq_docs_trail((array) $nav, (string) $page['id']);
    $pn = nq_docs_prev_next((array) $nav, (string) $page['id']);
    $href = fn (?array $node) => $node && $navHref ? str_replace('{id}', rawurlencode((string) $node['id']), $navHref) : null;
    $options = \Illuminate\Support\Js::from([
        'nav' => nq_docs_compact((array) $nav),
        'page' => (string) $page['id'],
        'ids' => array_column($toc, 'id'),
        'offset' => (int) $scrollOffset,
        'navHref' => $navHref,
        'noMatch' => $w['noMatch'],
    ])->toHtml();
    $hasHeader = $sidebarHeader && ! $sidebarHeader->isEmpty();
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'docs-shell') }}" x-data="nqDocsShell({!! $options !!})" {{ $attributes->except('data-slot')->cn('flex min-h-dvh flex-col bg-background text-foreground') }}>
    <header class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur sm:px-4">
        <x-nq::button variant="ghost" size="icon" class="lg:hidden" aria-label="{{ $w['menu'] }}" x-on:click="drawer = true"><x-lucide-menu aria-hidden="true" /></x-nq::button>
        <div class="flex min-w-0 items-center gap-2 font-semibold">{{ $brand }}</div>
        <div class="ms-auto flex items-center gap-1">{{ $actions }}</div>
    </header>

    <div class="mx-auto flex w-full max-w-[90rem] flex-1">
        <aside data-slot="docs-sidebar" class="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-e border-border p-3 lg:block">
            <x-nq::docs-shell.sidebar :nav="$nav" :active-id="$page['id']" :searchable="$searchable" :words="$w">{{ $sidebarHeader }}</x-nq::docs-shell.sidebar>
        </aside>

        <main class="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10">
            <article class="mx-auto flex max-w-[46rem] flex-col gap-6">
                @if (count($trail))
                    <x-nq::breadcrumb aria-label="{{ $w['crumbs'] }}">
                        <x-nq::breadcrumb.list>
                            <x-nq::breadcrumb.item>{{ $w['docs'] }}</x-nq::breadcrumb.item>
                            @foreach ($trail as $i => $node)
                                <x-nq::breadcrumb.separator />
                                <x-nq::breadcrumb.item>
                                    @if ($i === count($trail) - 1)
                                        <x-nq::breadcrumb.page>{{ $node['title'] }}</x-nq::breadcrumb.page>
                                    @else
                                        <span>{{ $node['title'] }}</span>
                                    @endif
                                </x-nq::breadcrumb.item>
                            @endforeach
                        </x-nq::breadcrumb.list>
                    </x-nq::breadcrumb>
                @endif

                <header class="flex flex-col gap-3">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <x-nq::text as="h1" variant="h1" dir="auto" class="min-w-0 text-start">{{ $page['title'] }}</x-nq::text>
                        @if ($copyPage)
                            <x-nq::copy-button :value="nq_docs_page_markdown($page)" :label="$w['copyPage']" :copied-label="$w['copied']" variant="secondary" size="sm" class="shrink-0">{{ $w['copyPage'] }}</x-nq::copy-button>
                        @endif
                    </div>
                    @if (! empty($page['description']))
                        <p dir="auto" class="text-body-lg text-muted-foreground">{{ $page['description'] }}</p>
                    @endif
                </header>

                @if (count($toc))
                    <details class="rounded-card border border-border px-3 py-2 xl:hidden">
                        <summary class="flex cursor-pointer list-none items-center gap-2 rounded-[2px] text-body-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                            <x-lucide-list-tree class="size-4 text-muted-foreground" aria-hidden="true" />
                            {{ $w['onThisPage'] }}
                        </summary>
                        <x-nq::blog-post.table-of-contents :items="$toc" :title="$w['onThisPage']" class="mt-2 [&>p]:sr-only" />
                    </details>
                @endif

                <div data-slot="docs-body" class="min-w-0">
                    @if ($body && ! $body->isEmpty())
                        {{ $body }}
                    @else
                        <x-nq::blog-post.post-body :markdown="$page['markdown']" :scroll-offset="$scrollOffset" />
                    @endif
                </div>

                @if (! empty($page['updated']) || ! empty($page['editHref']))
                    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-caption text-muted-foreground">
                        @if (! empty($page['updated']))
                            <span>{{ $w['updated'] }} <x-nq::numeric.date-time :value="$page['updated']" date-style="medium" /></span>
                        @else
                            <span></span>
                        @endif
                        @if (! empty($page['editHref']))
                            <a href="{{ $page['editHref'] }}" class="inline-flex items-center gap-1.5 rounded-[2px] outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                                <x-lucide-pencil class="size-3.5" aria-hidden="true" />
                                {{ $w['editPage'] }}
                            </a>
                        @endif
                    </div>
                @endif

                @if ($pn['prev'] || $pn['next'])
                    <nav aria-label="{{ $w['pager'] }}" class="grid gap-3 sm:grid-cols-2">
                        @if ($pn['prev'])
                            <x-nq::docs-shell.pager-link :node="$pn['prev']" :label="$w['previous']" direction="prev" :href="$href($pn['prev'])" />
                        @else
                            <span></span>
                        @endif
                        @if ($pn['next'])
                            <x-nq::docs-shell.pager-link :node="$pn['next']" :label="$w['next']" direction="next" :href="$href($pn['next'])" />
                        @endif
                    </nav>
                @endif
            </article>
        </main>

        <aside data-slot="docs-toc" class="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 overflow-y-auto p-4 xl:block">
            <x-nq::blog-post.table-of-contents :items="$toc" :title="$w['onThisPage']" />
        </aside>
    </div>

    <x-nq::sheet x-model="drawer">
        <x-nq::sheet.content side="start" :close-label="$w['closeMenu']" class="p-3">
            <x-nq::sheet.title class="sr-only">{{ $w['nav'] }}</x-nq::sheet.title>
            <x-nq::sheet.description class="sr-only">{{ $w['nav'] }}</x-nq::sheet.description>
            <div class="mt-8 min-h-0 flex-1 overflow-y-auto">
                <x-nq::docs-shell.sidebar :nav="$nav" :active-id="$page['id']" :searchable="$searchable" :words="$w">{{ $sidebarHeader }}</x-nq::docs-shell.sidebar>
            </div>
        </x-nq::sheet.content>
    </x-nq::sheet>
</div>
