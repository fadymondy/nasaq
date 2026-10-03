@php
    $commits = [
        ['id' => '4f2a91c0e7b3d58a1c6f9e20b4d7a3c815e6f902', 'message' => "fix(auth): keep the redirect after sign-in\n\nThe return path was dropped when the session refreshed.", 'author' => ['login' => 'sara-alharbi'], 'date' => '2026-09-29T07:40:00Z', 'branch' => 'main', 'checks' => 'success', 'href' => 'https://github.com/acme/storefront/commit/4f2a91c'],
        ['id' => '9c1d77e2a40b6f3158d2c9e7a1b04f6d3e85a7c1', 'message' => 'feat(cart): add a gift note field', 'author' => ['login' => 'khaled-n'], 'date' => '2026-09-28T16:05:00Z', 'branch' => 'feat/gift-note', 'checks' => 'pending'],
    ];
    $runs = [
        ['id' => 'run-412', 'name' => 'CI', 'number' => 412, 'status' => 'failure', 'branch' => 'main', 'sha' => '4f2a91c0e7b3d58a1c6f9e20b4d7a3c815e6f902', 'event' => 'push', 'actor' => ['login' => 'sara-alharbi'], 'startedAt' => '2026-09-29T07:41:00Z', 'durationMs' => 184000, 'href' => 'https://github.com/acme/storefront/actions/runs/412'],
        ['id' => 'run-411', 'name' => 'CI', 'number' => 411, 'status' => 'success', 'branch' => 'main', 'event' => 'push', 'startedAt' => '2026-09-28T16:06:00Z', 'durationMs' => 171000],
    ];
@endphp
<x-nq::github-activity :repo="['owner' => 'acme', 'name' => 'storefront', 'href' => 'https://github.com/acme/storefront']" :commits="$commits" :runs="$runs" can-rerun
    x-on:rerun="$event.detail.wait(Promise.resolve())" />
