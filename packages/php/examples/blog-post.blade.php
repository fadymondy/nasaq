@php
    $body = <<<'MD'
Calm interfaces start with fewer decisions per screen.

## Why calm

Every extra control asks the reader to decide something.

> [!TIP]
> Remove one thing before you add one.

## How to start

- Pick one primary action.
- Move the rest behind a menu.

### Check the result

Read it aloud. If you stumble, simplify.
MD;
    $summary = ['slug' => 'calm-interfaces', 'title' => 'Calm interfaces', 'excerpt' => 'Fewer decisions per screen, and why it works.', 'category' => 'Design', 'tags' => ['ux', 'design'], 'date' => '2026-04-02',
        'author' => ['name' => 'Sara Ali', 'role' => 'Design lead', 'bio' => 'Sara writes about interfaces that stay out of the way.']];
    $post = $summary + ['body' => $body];
    $posts = [
        $summary,
        ['slug' => 'rtl', 'title' => 'Right to left, properly', 'excerpt' => 'Logical properties instead of mirrored copies.', 'category' => 'Design', 'tags' => ['ux'], 'date' => '2026-03-12', 'readingMinutes' => 7],
        ['slug' => 'forms', 'title' => 'Forms that explain themselves', 'excerpt' => 'Inline errors, helpful hints, no surprises.', 'category' => 'Product', 'tags' => ['forms'], 'date' => '2026-02-20', 'readingMinutes' => 4],
    ];
@endphp
<x-nq::blog-post :post="$post" :posts="$posts" url="https://example.com/blog/calm-interfaces" post-href="/blog/{slug}">
    <x-slot:comments><p class="text-body-sm text-muted-foreground">No comments yet.</p></x-slot:comments>
</x-nq::blog-post>
