@php
    $reviews = [
        ['id' => 'r1', 'author' => 'Sara', 'rating' => 5, 'title' => 'Worth it', 'body' => 'Great quality, arrived on time and fits perfectly.', 'date' => '2026-03-02', 'verified' => true, 'helpful' => 12, 'fit' => 'true', 'photos' => [['src' => 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', 'alt' => 'Front view']]],
        ['id' => 'r2', 'author' => 'Omar', 'rating' => 4, 'body' => 'Good value for the price, the strap could be softer.', 'date' => '2026-02-11', 'verified' => true, 'helpful' => 4, 'fit' => 'small', 'reply' => ['author' => 'Support', 'body' => 'Thanks Omar, we are improving the strap.', 'date' => '2026-02-12']],
        ['id' => 'r3', 'author' => 'Lina', 'rating' => 2, 'body' => 'Not what I expected from the photos, a little too small.', 'date' => '2026-01-20', 'helpful' => 1],
    ];
    $questions = [
        ['id' => 'q1', 'author' => 'Huda', 'question' => 'Is it machine washable?', 'date' => '2026-03-05', 'votes' => 3, 'answers' => [
            ['id' => 'a1', 'author' => 'Support', 'body' => 'Yes, on a gentle cycle at 30 degrees.', 'date' => '2026-03-06', 'seller' => true, 'votes' => 2],
        ]],
    ];
@endphp
{{-- Each listener may resolve { error } (or reject) to roll the action back and show a message. --}}
<div class="flex flex-col gap-10" x-data="{ api: { post: async (review) => undefined, vote: async (id, voted) => undefined, report: async (id, reason, note) => undefined, ask: async (text) => undefined } }">
    <x-nq::product-reviews :reviews="$reviews" can-submit can-report :form-props="['askFit' => true, 'askName' => true]"
        x-on:nq-review="$event.detail.waitUntil(api.post($event.detail.review))"
        x-on:nq-vote="$event.detail.waitUntil(api.vote($event.detail.id, $event.detail.voted))"
        x-on:nq-report="$event.detail.waitUntil(api.report($event.detail.id, $event.detail.reason, $event.detail.note))" />
    <x-nq::product-reviews.qa :questions="$questions" can-ask x-on:nq-ask="$event.detail.waitUntil(api.ask($event.detail.question))" />
</div>
