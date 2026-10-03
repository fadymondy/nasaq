@php
    $accounts = [
        ['id' => 'assets', 'code' => '1000', 'name' => 'Assets', 'type' => 'asset'],
        ['id' => 'cash', 'code' => '1010', 'name' => 'Cash', 'type' => 'asset', 'parentId' => 'assets'],
        ['id' => 'bank', 'code' => '1020', 'name' => 'Bank', 'type' => 'asset', 'parentId' => 'assets'],
        ['id' => 'capital', 'code' => '3000', 'name' => 'Owner capital', 'type' => 'equity'],
        ['id' => 'sales', 'code' => '4000', 'name' => 'Sales', 'type' => 'revenue'],
        ['id' => 'rent', 'code' => '5000', 'name' => 'Rent', 'type' => 'expense'],
    ];
    $entries = [
        ['id' => 'e1', 'number' => 'JE-0007', 'date' => '2026-09-01', 'memo' => 'Opening capital', 'status' => 'posted', 'lines' => [
            ['accountId' => 'bank', 'debit' => 1000000, 'credit' => 0],
            ['accountId' => 'capital', 'debit' => 0, 'credit' => 1000000],
        ]],
        ['id' => 'e2', 'number' => 'JE-0008', 'date' => '2026-09-10', 'memo' => 'Cash sale', 'status' => 'posted', 'lines' => [
            ['accountId' => 'cash', 'debit' => 250000, 'credit' => 0],
            ['accountId' => 'sales', 'debit' => 0, 'credit' => 250000],
        ]],
    ];
@endphp
<div class="flex flex-col gap-6">
    <x-nq::accounting-ledger.journal-entry-editor :accounts="$accounts" currency="SAR" number="JE-0009" can-save-draft />
    <x-nq::accounting-ledger.trial-balance :accounts="$accounts" :entries="$entries" currency="SAR" can-select />
    <x-nq::accounting-ledger.chart-of-accounts :accounts="$accounts" :entries="$entries" currency="SAR" can-select can-add-child can-archive />
    <x-nq::accounting-ledger.account-statement :account="$accounts[1]" :entries="$entries" currency="SAR" />
</div>
