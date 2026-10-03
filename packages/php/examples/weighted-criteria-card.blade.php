<div class="max-w-xl">
    <x-nq::weighted-criteria-card description="I will rank the three vendors with these." :criteria="[
        ['id' => 'price', 'label' => 'Price', 'weight' => 'high', 'enabled' => true],
        ['id' => 'support', 'label' => 'Support', 'description' => 'Arabic support, response time', 'weight' => 'medium', 'enabled' => true],
        ['id' => 'speed', 'label' => 'Delivery speed', 'weight' => 'low', 'enabled' => false],
    ]" />
</div>
