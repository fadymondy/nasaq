@php
    $messages = [
        ['id' => 'u1', 'role' => 'user', 'text' => 'What is overdue?', 'at' => '2026-09-29 08:58:00'],
        ['id' => 'a1', 'role' => 'assistant', 'at' => '2026-09-29 08:58:05', 'text' => 'Two tasks are overdue: **Send the invoice** and **Review the contract**.'],
    ];
@endphp
<div class="relative h-[32rem] w-full">
    <x-nq::copilot-dock id="dock-open" :messages="$messages" :starters="['Summarise my week']" placement="absolute" :open="true" persist-key="nq-dock-side" stoppable regenerate />
</div>
<div class="relative h-24 w-full">
    <x-nq::copilot-dock id="dock-closed" :messages="[]" placement="absolute" />
</div>
<div class="relative h-24 w-full">
    <x-nq::copilot-dock id="dock-bar" :messages="[]" placement="absolute" collapsed-bar />
</div>
