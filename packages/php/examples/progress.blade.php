<x-nq::progress :value="64" label="Uploading files" />

<div class="mt-6 flex flex-col gap-3" x-data="{ pct: 30 }">
    <x-nq::progress id="live-progress" :value="30" value-expr="pct" label="Live upload" />
    <x-nq::progress id="model-progress" :value="30" x-model="pct" label="Same value, x-model" />
    <div class="flex gap-2">
        <x-nq::button id="live-more" size="sm" x-on:click="pct = Math.min(100, pct + 35)">Add 35%</x-nq::button>
        <x-nq::button id="live-wait" size="sm" variant="outline" x-on:click="pct = null">Indeterminate</x-nq::button>
    </div>
</div>
