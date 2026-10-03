{{-- Your handlers save, then you re-render with the updated lists. Resolve { error: "…" } to show why it failed. --}}
<x-nq::status-label-manager
    :statuses="[
        ['id' => 's1', 'name' => 'To do', 'hue' => 'gray', 'stage' => 'todo', 'usage' => 12],
        ['id' => 's4', 'name' => 'Ready', 'hue' => 'teal', 'stage' => 'todo', 'usage' => 0],
        ['id' => 's2', 'name' => 'In progress', 'hue' => 'blue', 'stage' => 'active', 'usage' => 4],
        ['id' => 's3', 'name' => 'Shipped', 'hue' => 'green', 'stage' => 'done', 'usage' => 31],
    ]"
    :labels="[['id' => 'l1', 'name' => 'Design', 'hue' => 'violet', 'usage' => 3]]"
    x-on:nq-save-status="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 100)))"
    x-on:nq-delete-status="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 100)))"
    x-on:nq-reorder-statuses="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 100)))"
    x-on:nq-save-label="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 100)))"
    x-on:nq-delete-label="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 100)))" />
