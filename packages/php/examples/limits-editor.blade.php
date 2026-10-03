<x-nq::limits-editor
    :resources="[
        ['key' => 'seats', 'label' => \Nasaq\Nasaq::t('Seats', 'المقاعد'), 'unit' => \Nasaq\Nasaq::t('seats', 'مقعد')],
        ['key' => 'storage', 'label' => \Nasaq\Nasaq::t('Storage', 'التخزين'), 'unit' => 'GB'],
    ]"
    :value="['seats' => ['mode' => 'limit', 'value' => 25], 'storage' => ['mode' => 'inherit']]"
    :inherited="['storage' => 100]"
    name="limits"
    saveable
    class="max-w-3xl"
/>
