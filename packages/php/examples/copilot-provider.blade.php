<div class="relative flex h-96 w-full flex-col gap-3">
    <x-nq::copilot-provider id="cp-root" greeting="Hi! Ask me anything.">
        <div class="flex items-start gap-2">
            <x-nq::copilot-provider.launcher id="cp-launcher" />
            <x-nq::copilot-provider.launcher id="cp-icon" look="icon" />
            <x-nq::button id="cp-ask" variant="ghost" size="sm" x-on:click="open({ message: `Summarise this order`, autoSend: true })">Ask about this order</x-nq::button>
        </div>
        <ul id="cp-log" class="flex flex-col gap-1 text-body-sm">
            <template x-for="m in messages.filter(m => ! m.hidden)" x-bind:key="m.id">
                <li x-bind:data-role="m.role" x-text="m.text"></li>
            </template>
        </ul>
        <p id="cp-status" class="text-caption text-muted-foreground" x-text="isOpen ? (streaming ? `Answering` : `Open`) : `Closed`"></p>
    </x-nq::copilot-provider>
</div>
