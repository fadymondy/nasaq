{{-- The launcher only draws the button: open your own report dialog from its click. The parts around it follow. --}}
<div class="flex flex-col gap-6">
    <div class="relative h-40">
        <x-nq::feedback-reporter shape="pill" position="bottom-end" placement="absolute" x-on:click="$dispatch('nq-report-open')" />
    </div>

    <x-nq::feedback-reporter.hub
        page="/checkout"
        :can-open="true"
        :issues="[
            ['id' => 'a', 'title' => 'Cannot pay by card', 'status' => 'open', 'votes' => 4, 'author' => 'Sara', 'createdAt' => '2025-01-01T10:00:00Z'],
            ['id' => 'b', 'title' => 'Page is slow', 'status' => 'in-progress', 'votes' => 1, 'voted' => true],
            ['id' => 'c', 'title' => 'Typo in the footer', 'status' => 'resolved', 'votes' => 0],
        ]"
        x-on:nq-feedback-vote="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 50)))" />

    <x-nq::feedback-reporter.configurator shape="pill" position="bottom-end" label="Feedback" />

    <x-nq::feedback-reporter.shake-sheet setting />
</div>
