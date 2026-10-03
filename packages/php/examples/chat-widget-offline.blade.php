<div class="relative h-[34rem] w-full">
    <x-nq::chat-widget placement="absolute" open :online="false" :agent="['name' => 'Layla']" :unread="2" :messages="[['id' => 'm1', 'from' => 'agent', 'text' => 'We are back at 9:00.', 'at' => now()->subHour()]]" />
</div>
