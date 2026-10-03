{{-- <x-nq::legal-page :document="$terms" :documents="[['id' => 'terms', 'title' => 'Terms', 'href' => '/terms'], ['id' => 'privacy', 'title' => 'Privacy', 'href' => '/privacy']]">
         <x-slot:footer>Questions? legal@example.com</x-slot:footer>
     </x-nq::legal-page>
     Terms, privacy and similar documents: a switcher between documents, the date it was updated, a draft notice, numbered sections with #anchors you
     can copy, and an "On this page" rail. The text is one readable column (about 68 characters). A link with a #section hash scrolls to its section on load.
     document: id, title, summary, updated (date), effective (date), version, draft (bool), sections [ { id?, title, body (Markdown) } ].
     documents: the site's documents ({ id, title, href? }); two or more show a switcher. An entry with href is a link, without it a button that fires
     nq:select-document ({ id }).   scroll-offset: px headings keep from the top (96).   labels: array overriding the built-in texts by key
     (documents, onThisPage, updated, effective, version, draftTitle, draft, copyLink, linkCopied).   Slot: footer.   Needs the Alpine runtime (@nasaqScripts). --}}
@props(['document', 'documents' => [], 'scrollOffset' => 96, 'labels' => []])
@include('nasaq::components.blog-post._logic')
@php
    $doc = (array) $document;
    $t = array_merge(
        \Nasaq\Nasaq::rtl() ? [
            'documents' => 'المستندات القانونية', 'onThisPage' => 'في هذه الصفحة', 'updated' => 'آخر تحديث', 'effective' => 'ساري من', 'version' => 'الإصدار {version}',
            'draftTitle' => 'مسودة', 'draft' => 'هذا المستند مسودة وليس ساريًا بعد.', 'copyLink' => 'انسخ رابط هذا القسم', 'linkCopied' => 'تم نسخ الرابط',
        ] : [
            'documents' => 'Legal documents', 'onThisPage' => 'On this page', 'updated' => 'Last updated', 'effective' => 'Effective', 'version' => 'Version {version}',
            'draftTitle' => 'Draft', 'draft' => 'This document is a draft and is not yet in force.', 'copyLink' => 'Copy link to this section', 'linkCopied' => 'Link copied',
        ],
        (array) $labels,
    );
    // Unique anchors: the section's own id, else a slug of its title, with "-2", "-3" added on repeats.
    $used = [];
    $sections = [];
    foreach (array_values((array) ($doc['sections'] ?? [])) as $i => $s) {
        $s = (array) $s;
        $base = trim((string) ($s['id'] ?? '')) ?: nq_bp_slug((string) $s['title']);
        $id = $base;
        for ($n = 2; isset($used[$id]); $n++) {
            $id = $base.'-'.$n;
        }
        $used[$id] = true;
        $sections[] = ['id' => $id, 'title' => $s['title'], 'body' => (string) ($s['body'] ?? ''), 'number' => $i + 1];
    }
    $items = array_map(fn ($s) => ['id' => $s['id'], 'text' => $s['title'], 'level' => 2, 'line' => $s['number']], $sections);
    $config = ['ids' => array_column($sections, 'id'), 'offset' => (int) $scrollOffset];
    $switcher = 'h-control-sm inline-flex items-center rounded-control px-3 text-body-sm outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus';
    $hasFooter = isset($footer) && ! $footer->isEmpty();
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'legal-page') }}" x-data="nqLegalPage(@js($config))" {{ $attributes->except('data-slot')->cn('mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:gap-12') }}>
    <div class="flex min-w-0 flex-1 flex-col gap-8">
        @if (count($documents) > 1)
            <nav aria-label="{{ $t['documents'] }}" class="flex flex-wrap gap-1 border-b border-border pb-3">
                @foreach ($documents as $d)
                    @php
                        $d = (array) $d;
                        $current = $d['id'] === $doc['id'];
                        $cls = $switcher.' '.($current ? 'bg-nq-selected font-medium text-foreground' : 'text-muted-foreground hover:bg-nq-hover hover:text-foreground');
                    @endphp
                    @if (! $current && ! empty($d['href']))
                        <a href="{{ $d['href'] }}" class="{{ $cls }}">{{ $d['title'] }}</a>
                    @else
                        <button type="button" @if ($current) aria-current="page" @else x-on:click="selectDocument({{ \Illuminate\Support\Js::from($d['id'])->toHtml() }})" @endif class="{{ $cls }}">{{ $d['title'] }}</button>
                    @endif
                @endforeach
            </nav>
        @endif

        <header class="flex max-w-[68ch] flex-col gap-3">
            <x-nq::text as="h1" variant="h1" dir="auto" class="text-start">{{ $doc['title'] }}</x-nq::text>
            @if (! empty($doc['summary']))
                <p dir="auto" class="text-body-lg text-muted-foreground">{{ $doc['summary'] }}</p>
            @endif
            <p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
                <span>{{ $t['updated'] }} <x-nq::numeric.date-time :value="$doc['updated']" date-style="long" /></span>
                @if (! empty($doc['effective']))
                    <span>{{ $t['effective'] }} <x-nq::numeric.date-time :value="$doc['effective']" date-style="long" /></span>
                @endif
                @if (! empty($doc['version']))
                    <bdi>{{ str_replace('{version}', (string) $doc['version'], $t['version']) }}</bdi>
                @endif
            </p>
            @if (! empty($doc['draft']))
                <x-nq::alert tone="warning" :title="$t['draftTitle']" icon="triangle-alert">{{ $t['draft'] }}</x-nq::alert>
            @endif
        </header>

        <div class="flex max-w-[68ch] flex-col gap-10">
            @foreach ($sections as $s)
                <section aria-labelledby="{{ $s['id'] }}-title" data-slot="legal-section" class="group/section flex flex-col gap-3">
                    <h2 id="{{ $s['id'] }}" style="scroll-margin-top: {{ (int) $scrollOffset }}px" class="flex items-baseline gap-3 text-start">
                        <span aria-hidden="true" class="text-h3 font-semibold tabular-nums text-muted-foreground">{{ $s['number'] }}.</span>
                        <x-nq::text as="span" variant="h2" dir="auto" id="{{ $s['id'] }}-title" class="min-w-0">{{ $s['title'] }}</x-nq::text>
                        <button type="button" aria-label="{{ $t['copyLink'] }}: {{ $s['title'] }}" x-on:click="copyLink({{ \Illuminate\Support\Js::from($s['id'])->toHtml() }})"
                            class="ms-1 inline-flex size-6 shrink-0 items-center justify-center self-center rounded-control text-muted-foreground opacity-0 outline-none transition-opacity duration-150 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-nq-focus group-hover/section:opacity-100 pointer-coarse:opacity-100">
                            <x-lucide-link-2 class="size-4" aria-hidden="true" x-show="copied !== {{ \Illuminate\Support\Js::from($s['id'])->toHtml() }}" />
                            <x-lucide-check class="size-4" aria-hidden="true" style="display: none" x-show="copied === {{ \Illuminate\Support\Js::from($s['id'])->toHtml() }}" />
                        </button>
                    </h2>
                    <x-nq::markdown :source="$s['body']" class="gap-4 text-body leading-relaxed" />
                </section>
            @endforeach
        </div>

        @if ($hasFooter)
            <div class="max-w-[68ch] border-t border-border pt-6 text-body-sm text-muted-foreground">{{ $footer }}</div>
        @endif
        <p role="status" class="sr-only" x-text="copied ? {{ \Illuminate\Support\Js::from($t['linkCopied'])->toHtml() }} : ''"></p>
    </div>

    <aside class="hidden w-56 shrink-0 lg:block">
        <div class="sticky top-20">
            <x-nq::blog-post.table-of-contents :items="$items" :title="$t['onThisPage']" />
        </div>
    </aside>
</div>
