<div class="flex h-96 w-full max-w-xl flex-col rounded-surface border border-border">
    <x-nq::chat class="flex-1">
        <x-nq::chat.message side="assistant" name="Assistant" :time="now()->subMinutes(2)" text="Hi! How can I help?" />
        <x-nq::chat.message side="user" name="You" :time="now()->subMinute()" status="sent" text="Show me this month's spend." />
        <x-nq::chat.message side="assistant" name="Assistant" format="markdown" streaming text="Spend is **$38** so far" />
    </x-nq::chat>
    <div class="p-3 pt-0">
        <x-nq::chat.composer />
    </div>
</div>
