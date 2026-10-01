<x-nq::repeater class="w-96" :items="[['name' => 'Sara']]" create-item="{ name: '' }" row-title="item.name" :min="1" :max="5">
    <x-nq::field.input x-model="item.name" aria-label="Name" />
</x-nq::repeater>
