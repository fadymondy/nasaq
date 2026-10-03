@php
    $plans = [
        ['id' => 'free', 'name' => 'Free', 'description' => 'For trying things out', 'priceMonthly' => 0, 'seats' => 3, 'storageGb' => 1, 'features' => ['Community support'], 'visible' => true, 'subscribers' => 14],
        ['id' => 'team', 'name' => 'Team', 'description' => 'For growing teams', 'priceMonthly' => 29, 'seats' => 15, 'storageGb' => 50, 'features' => ['Priority support', 'Audit log'], 'visible' => true, 'subscribers' => 6, 'featured' => true],
        ['id' => 'scale', 'name' => 'Scale', 'description' => 'No limits', 'priceMonthly' => 99, 'seats' => null, 'storageGb' => null, 'features' => ['SSO'], 'visible' => false, 'subscribers' => 1],
    ];
    $workspaces = [
        ['id' => 'w1', 'name' => 'Acme Co', 'slug' => 'acme', 'owner' => ['name' => 'Sara Alharbi', 'email' => 'sara@acme.test'], 'planId' => 'team', 'status' => 'active', 'seatsUsed' => 12, 'createdAt' => '2026-03-02'],
        ['id' => 'w2', 'name' => 'Globex', 'slug' => 'globex', 'owner' => ['name' => 'Omar Nasser', 'email' => 'omar@globex.test'], 'planId' => 'free', 'status' => 'trial', 'seatsUsed' => 3, 'createdAt' => '2026-09-20', 'trialEndsAt' => '2026-10-04'],
        ['id' => 'w3', 'name' => 'Initech', 'slug' => 'initech', 'owner' => ['name' => 'Lina Haddad', 'email' => 'lina@initech.test'], 'planId' => 'scale', 'status' => 'suspended', 'seatsUsed' => 40, 'createdAt' => '2026-01-11'],
    ];
@endphp
<div class="flex flex-col gap-8">
    <x-nq::admin-tenants :workspaces="$workspaces" :plans="$plans" can-open />
    <x-nq::admin-tenants.plans :plans="$plans" editable />
</div>
