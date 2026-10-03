@php
    $leads = [
        [
            'id' => 'l1', 'name' => 'Sara Haddad', 'email' => 'sara@acme.example', 'company' => 'Acme Logistics', 'budget' => '$12,000', 'status' => 'new', 'receivedAt' => '2026-09-29T07:30:00Z', 'form' => 'Contact sales',
            'message' => 'We are looking for a delivery dashboard for 40 couriers. Can we book a demo this week?', 'score' => 82,
            'attribution' => ['utmSource' => 'google', 'utmMedium' => 'cpc', 'utmCampaign' => 'dispatch-q3', 'gclid' => 'Cj0KCQjw-demo', 'landingPage' => 'https://example.com/dispatch'],
        ],
        [
            'id' => 'l2', 'name' => 'Omar Nasser', 'email' => 'omar@example.com', 'status' => 'contacted', 'receivedAt' => '2026-09-28T12:00:00Z', 'form' => 'Newsletter', 'message' => 'Do you support Arabic invoices?',
            'attribution' => ['utmSource' => 'newsletter', 'utmMedium' => 'email', 'utmCampaign' => 'sept-digest'],
        ],
        ['id' => 'l3', 'name' => 'Lina Farouk', 'email' => 'lina@example.com', 'status' => 'qualified', 'receivedAt' => '2026-09-25T09:00:00Z', 'attribution' => ['referrer' => 'https://www.linkedin.com/feed']],
    ];
    $canned = [['id' => 'c1', 'shortcut' => 'demo', 'title' => 'Book a demo', 'body' => 'Hi {{name}}, thanks for reaching out. Pick a time for a demo that suits you.']];
@endphp
<x-nq::leads-inbox :leads="$leads" :canned="$canned"
    x-on:lead-status="$event.detail.wait(Promise.resolve())"
    x-on:lead-convert="$event.detail.wait(Promise.resolve())"
    x-on:lead-reply="$event.detail.wait(Promise.resolve())" />
