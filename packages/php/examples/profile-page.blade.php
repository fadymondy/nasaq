@php
    $profile = [
        'name' => 'Laylah Haddad',
        'handle' => '@laylah',
        'headline' => 'Product designer who ships design systems for Arabic and English products.',
        'joined' => '2024-03-12',
        'location' => 'Riyadh',
        'timeZone' => 'Asia/Riyadh',
        'availability' => 'limited',
        'availabilityNote' => 'from November',
        'email' => 'laylah@example.com',
        'about' => 'I design **calm, bilingual** interfaces and the systems behind them.',
        'links' => [
            ['kind' => 'github', 'label' => 'GitHub', 'href' => 'https://github.com/laylah'],
            ['kind' => 'website', 'label' => 'Website', 'href' => 'https://laylah.example.com'],
        ],
        'experience' => [
            ['id' => 'j1', 'role' => 'Lead designer', 'company' => 'Tamkeen', 'start' => '2022-01-01', 'summary' => 'Owns the design system.'],
            ['id' => 'j2', 'role' => 'Designer', 'company' => 'Studio Nour', 'start' => '2019-06-01', 'end' => '2021-12-31'],
        ],
        'skills' => [
            ['name' => 'Figma', 'group' => 'Design', 'level' => 5],
            ['name' => 'Vue', 'group' => 'Code', 'level' => 3],
        ],
        'projects' => [
            ['slug' => 'ledger', 'title' => 'Ledger', 'description' => 'A bilingual bookkeeping app.', 'category' => 'Product', 'featured' => true, 'points' => ['RTL first', 'Offline']],
            ['slug' => 'kit', 'title' => 'Open kit', 'description' => 'A small icon kit.', 'category' => 'Open source', 'tags' => ['svg']],
        ],
        'testimonials' => [['quote' => 'The calmest handoff I have had.', 'name' => 'Omar Nasser', 'role' => 'CTO, Tamkeen']],
    ];
@endphp
<x-nq::profile-page :profile="$profile" blog-href="/blog" post-href="/blog/{slug}" contact-button :now="'2026-09-30T00:00:00Z'" />
