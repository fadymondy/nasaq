<div class="relative" x-data="{ loading: false, refresh() { this.loading = true; setTimeout(() => this.loading = false, 2000) } }">
    <x-nq::route-progress x-modelable="active" x-model="loading" :active="false" placement="absolute" />
    <x-nq::button x-on:click="refresh()">Refresh</x-nq::button>
</div>
