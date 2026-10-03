@php
    $sections = [
        ['id' => 'news', 'title' => 'Morning news', 'badge' => 'Daily', 'prompt' => 'Summarise the top three headlines for our customers.', 'model' => 'fast', 'settings' => ['topic' => 'payments'], 'content' => 'Card payments grew 12% this quarter.'],
        ['id' => 'tips', 'title' => 'Tip of the day', 'prompt' => 'Write one practical tip for new merchants.', 'content' => 'Enable split payments to lift conversion.'],
        ['id' => 'alerts', 'title' => 'Alerts', 'badge' => 'Beta'],
    ];
    $models = [['value' => 'fast', 'label' => 'Fast'], ['value' => 'deep', 'label' => 'Deep reasoning']];
@endphp
<div x-data="{ on: false }" class="flex flex-col gap-3">
    <button type="button" class="self-start text-body-sm underline" x-on:click="on = !on" x-text="on ? 'Done' : 'Edit sections'"></button>
    <x-nq::section-board :sections="$sections" :models="$models" :columns="2" addable x-effect="editing = on" />
</div>
