@php
    $links = [
        ['id' => 'l1', 'sourceUrl' => 'https://www.designweekly.com/news/rtl-systems', 'targetUrl' => '/', 'anchor' => 'Nasaq design system', 'domainRating' => 71, 'spamScore' => 8, 'firstSeen' => '2026-09-27'],
        ['id' => 'l2', 'sourceUrl' => 'https://blog.arabicdev.net/tools', 'targetUrl' => '/components', 'anchor' => 'RTL components', 'domainRating' => 54, 'spamScore' => 12, 'firstSeen' => '2026-08-10'],
        ['id' => 'l3', 'sourceUrl' => 'https://old-directory.org/listing/42', 'targetUrl' => '/', 'anchor' => '', 'domainRating' => 33, 'spamScore' => 21, 'firstSeen' => '2026-07-01', 'lostAt' => '2026-09-20'],
        ['id' => 'l4', 'sourceUrl' => 'https://cheap-pills-casino.biz/links', 'targetUrl' => '/', 'anchor' => 'buy now', 'domainRating' => 4, 'spamScore' => 82, 'firstSeen' => '2026-08-01'],
        ['id' => 'l5', 'sourceUrl' => 'https://spammy-seo.example/farm', 'targetUrl' => '/pricing', 'anchor' => 'best seo', 'domainRating' => 6, 'spamScore' => 90, 'firstSeen' => '2026-07-15', 'disavowed' => true],
        ['id' => 'l6', 'sourceUrl' => 'https://forum.webdesign.dev/t/259', 'targetUrl' => '/docs', 'anchor' => 'docs', 'domainRating' => 62, 'spamScore' => 5, 'firstSeen' => '2026-09-25', 'followed' => false],
    ];
@endphp
<x-nq::backlink-monitor :links="$links" :now="'2026-09-29T09:00:00Z'"
    x-on:disavow="$event.detail.wait(Promise.resolve())"
    x-on:mark-safe="$event.detail.wait(Promise.resolve())" />
