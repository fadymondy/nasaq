@php
    $terms = [
        'id' => 'terms',
        'title' => 'Terms of service',
        'updated' => '2026-09-01',
        'sections' => [
            ['title' => 'Using the service', 'body' => 'You agree to use it lawfully.'],
            ['title' => 'Payments', 'body' => 'Fees are billed monthly.'],
        ],
    ];
@endphp
<x-nq::legal-page :document="$terms" />
