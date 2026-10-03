@php
    $pages = [
        ['id' => 'p1', 'url' => 'https://nasaq.dev/', 'title' => 'Nasaq: the Arabic design system', 'indexStatus' => 'indexed', 'issues' => [['id' => 'i1', 'code' => 'og-image-missing', 'severity' => 'info']],
            'vitals' => ['LCP' => 1900, 'INP' => 120, 'CLS' => 0.04], 'lastCrawled' => '2026-09-29T06:00:00Z'],
        ['id' => 'p2', 'url' => 'https://nasaq.dev/pricing', 'title' => 'Pricing', 'indexStatus' => 'not-indexed', 'issues' => [
            ['id' => 'i2', 'code' => 'description-missing', 'severity' => 'warning'],
            ['id' => 'i3', 'code' => 'alt-missing', 'severity' => 'warning', 'detail' => '3 images have no alt text'],
        ], 'vitals' => ['LCP' => 3100, 'INP' => 240, 'CLS' => 0.08], 'lastCrawled' => '2026-09-28T09:00:00Z'],
        ['id' => 'p3', 'url' => 'https://nasaq.dev/draft', 'indexStatus' => 'blocked', 'issues' => [
            ['id' => 'i4', 'code' => 'title-missing', 'severity' => 'error'],
            ['id' => 'i5', 'code' => 'noindex', 'severity' => 'error'],
            ['id' => 'i6', 'code' => 'h1-missing', 'severity' => 'error'],
        ], 'lastCrawled' => '2026-09-25T09:00:00Z'],
    ];
@endphp
<div class="flex flex-col gap-6">
    <x-nq::seo-pages :pages="$pages" openable
        x-on:open-page="console.log($event.detail.url)"
        x-on:recrawl="$event.detail.wait(Promise.resolve())"
        x-on:request-indexing="$event.detail.wait(Promise.resolve())" />
    <x-nq::seo-pages.checklist :issues="$pages[1]['issues']" url="https://nasaq.dev/pricing"
        x-on:toggle-fixed="$event.detail.wait(Promise.resolve())" />
</div>
