@php
    $service = [
        'id' => 'ga',
        'name' => 'Google Analytics',
        'scopes' => [['id' => 'analytics.readonly', 'label' => 'See your Google Analytics reports', 'required' => true]],
        'status' => 'disconnected',
    ];
@endphp
<div class="flex flex-col gap-10" x-data
    x-on:nq-connect="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 400)))"
    x-on:nq-disconnect="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 400)))"
    x-on:nq-refresh="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 400)))">
    <x-nq::analytics-connect :service="$service" :benefits="['Users and sessions against the previous period', 'Sources and top pages']" />

    {{-- The page shell around a report: connected, with refresh and disconnect. --}}
    <x-nq::analytics-connect.page-frame title="Google Analytics" description="Nasaq blog" refreshable :updated-at="now()->subMinutes(5)"
        :service="['id' => 'ga', 'name' => 'Google Analytics', 'status' => 'connected', 'connectedAs' => 'fady@example.com', 'scopes' => $service['scopes']]">
        <x-slot:actions><x-nq::badge variant="outline">30 days</x-nq::badge></x-slot:actions>
        <p class="text-body-sm text-muted-foreground">The report goes here.</p>
    </x-nq::analytics-connect.page-frame>
</div>
