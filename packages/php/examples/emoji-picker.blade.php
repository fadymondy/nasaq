<div x-data="{ text: '' }" class="flex items-center gap-2">
    <input x-model="text" aria-label="Message" class="h-control rounded-control border border-input bg-card px-3 text-body-sm" />
    <x-nq::emoji-picker x-on:emoji-select="text += $event.detail.emoji" />
</div>
