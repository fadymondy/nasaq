@php
    $posts = [
        ['slug' => 'tokens', 'title' => 'Design tokens, one source', 'excerpt' => 'How one token file feeds React, Vue and Blade.', 'category' => 'Design', 'tags' => ['tokens', 'css'], 'date' => '2026-04-02', 'readingMinutes' => 5, 'featured' => true],
        ['slug' => 'rtl', 'title' => 'Right to left, properly', 'excerpt' => 'Logical properties instead of mirrored copies.', 'category' => 'Engineering', 'tags' => ['rtl', 'css'], 'date' => '2026-03-12', 'readingMinutes' => 7],
        ['slug' => 'forms', 'title' => 'Forms that explain themselves', 'excerpt' => 'Inline errors, helpful hints, no surprises.', 'category' => 'Product', 'tags' => ['forms'], 'date' => '2026-02-20', 'readingMinutes' => 4],
        ['slug' => 'motion', 'title' => 'Motion with restraint', 'excerpt' => 'Short, purposeful, and off under reduced motion.', 'category' => 'Design', 'tags' => ['motion'], 'date' => '2026-02-01', 'readingMinutes' => 3],
        ['slug' => 'tables', 'title' => 'Tables people can read', 'excerpt' => 'Density, alignment and sticky headers.', 'category' => 'Engineering', 'tags' => ['tables', 'css'], 'date' => '2026-01-18', 'readingMinutes' => 6],
    ];
@endphp
<x-nq::blog-index title="Blog" description="Notes on design and engineering." :posts="$posts" post-href="/blog/{slug}" :page-size="3" />
