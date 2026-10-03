<div x-data
    x-on:nq-save="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 400)))"
    x-on:nq-delete="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 400)))"
    x-on:nq-import="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 400)))">
    <x-nq::env-list
        :variables="[
            ['key' => 'DATABASE_URL', 'value' => 'postgres://app:s3cret@db.internal:5432/app', 'secret' => true],
            ['key' => 'VITE_API_URL', 'value' => 'https://api.example.com', 'secret' => false, 'description' => 'Public API origin'],
        ]" />
</div>
