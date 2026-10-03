@php
    $customers = [
        ['value' => 'c1', 'label' => 'Acme Trading', 'description' => 'billing@acme.example'],
        ['value' => 'c2', 'label' => 'Nile Logistics', 'description' => 'ops@nile.example'],
        ['value' => 'c3', 'label' => 'Riyadh Foods', 'labelAr' => 'أغذية الرياض', 'description' => 'hello@riyadh.example'],
    ];
@endphp
<div class="flex w-80 flex-col gap-6">
    <x-nq::relation-picker name="customer_id" value="c2" label="Customer" :options="$customers" />
    <x-nq::relation-picker name="remote_id" label="Remote customer" search-url="/api/customers" resolve-url="/api/customers" create-url="/api/customers" :debounce="50" />
    <x-nq::relation-picker name="team_ids" label="Team" :multiple="true" :value="['c1', 'c3']" :options="$customers" />
</div>
