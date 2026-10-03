<div x-data="{ count: 0 }">
    <x-nq::field>
        <x-nq::field.label>Comment</x-nq::field.label>
        <x-nq::mention-textarea rows="4" placeholder="Type @ to mention someone"
            :suggestions="[['id' => 'u1', 'name' => 'Sara Ali', 'description' => 'Design lead'], ['id' => 'u2', 'name' => 'Omar Nasser', 'description' => 'Engineer']]"
            @nq-mentions-change="count = $event.detail.mentions.length" />
        <output x-text="count + ' mentioned'">0 mentioned</output>
    </x-nq::field>
</div>
