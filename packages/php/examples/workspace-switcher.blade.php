<div class="w-64" x-data="{ workspace: '3x1' }">
    <x-nq::workspace-switcher x-model="workspace" :workspaces="[
        ['id' => '3x1', 'name' => '3x1', 'description' => 'Pro · 12 members'],
        ['id' => 'personal', 'name' => 'Fady Mondy', 'description' => 'Personal'],
    ]" value="3x1" create />
</div>
