@php
    $me = ['id' => 'u1', 'name' => 'Sara Ali'];
    $omar = ['id' => 'u2', 'name' => 'Omar Nasser', 'kind' => 'agent'];
    $comments = [
        ['id' => 'c1', 'author' => $me, 'body' => 'Can you check the **Q3 numbers**, @Omar Nasser?', 'createdAt' => '2026-09-29T09:01:00Z', 'mentions' => [['id' => 'u2', 'name' => 'Omar Nasser']]],
        ['id' => 'c2', 'author' => $omar, 'body' => 'On it. Totals look right.', 'createdAt' => '2026-09-29T09:05:00Z', 'parentId' => 'c1', 'editedAt' => '2026-09-29T09:07:00Z'],
        ['id' => 'c3', 'author' => $omar, 'body' => 'Pricing note waiting for review.', 'createdAt' => '2026-09-29T09:09:00Z', 'pending' => true],
    ];
    $people = [['id' => 'u2', 'name' => 'Omar Nasser'], ['id' => 'u3', 'name' => 'Lina Haddad']];
@endphp
<div class="w-full max-w-xl">
    <x-nq::comment-thread :comments="$comments" :current-user="$me" :suggestions="$people" post edit delete />
</div>
