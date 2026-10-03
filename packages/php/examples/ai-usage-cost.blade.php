<div class="flex w-full max-w-4xl flex-col gap-8">
    <x-nq::ai-usage-cost
        :markup="0.2"
        :previous-total="30"
        :days="[
            ['date' => '2026-09-26', 'billed' => 8.2, 'unbilled' => 0],
            ['date' => '2026-09-27', 'billed' => 12.4, 'unbilled' => 0],
            ['date' => '2026-09-28', 'billed' => 3.1, 'unbilled' => 5.6],
            ['date' => '2026-09-29', 'billed' => 0, 'unbilled' => 9.1],
        ]"
        :by-model="[
            ['id' => 'opus', 'label' => 'Opus 5.5', 'tokensIn' => 2400000, 'tokensOut' => 310000, 'cost' => 21.5, 'previous' => 18.2],
            ['id' => 'sonnet', 'label' => 'Sonnet 5.5', 'tokensIn' => 5100000, 'tokensOut' => 720000, 'cost' => 12.9, 'previous' => 14.1],
            ['id' => 'haiku', 'label' => 'Haiku 4.5', 'tokensIn' => 3800000, 'tokensOut' => 410000, 'cost' => 3.4],
        ]" />
    <x-nq::ai-usage-cost.token-meter :tokens-in="182000" :tokens-out="24000" :cached="120000" :cost="1.42" :budget="2" class="max-w-md" />
</div>
