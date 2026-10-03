@php
    $items = [
        ['id' => '1', 'name' => 'Layla Hassan', 'role' => 'CTO', 'company' => 'Acme', 'quote' => 'We shipped our dashboard in a week instead of a month.', 'rating' => 5, 'date' => '2026-09-01', 'featured' => true],
        ['id' => '2', 'name' => 'Omar Khalil', 'role' => 'Designer', 'company' => 'Studio Nine', 'quote' => 'Arabic and English both just work, mirrored correctly.', 'rating' => 5, 'date' => '2026-08-14'],
        ['id' => '3', 'name' => 'Nora Adel', 'quote' => 'Solid components and clear docs.', 'rating' => 4, 'date' => '2026-07-02'],
    ];
@endphp
<div class="grid max-w-3xl gap-8">
    <x-nq::testimonials :items="$items" layout="wall" />
    <x-nq::testimonials.form
        x-on:nq-testimonial="$event.detail.waitUntil(fetch('/api/testimonials', { method: 'POST', body: JSON.stringify($event.detail.data) }))" />
</div>
