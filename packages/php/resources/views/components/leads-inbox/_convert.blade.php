{{-- Internal: the convert dialog of x-nq::leads-inbox. Runs in its Alpine scope (convert, submitConvert, convertValid). --}}
<x-nq::dialog x-model="convert.open">
    <x-nq::dialog.content data-slot="lead-convert-dialog">
        <x-nq::dialog.header>
            <x-nq::dialog.title>{{ $L['convert'] }}</x-nq::dialog.title>
            <x-nq::dialog.description>{{ $L['convertHint'] }}</x-nq::dialog.description>
        </x-nq::dialog.header>
        <form novalidate class="flex flex-col gap-4" x-on:submit.prevent="submitConvert()">
            <template x-if="convert.error"><x-nq::alert tone="danger"><span x-text="convert.error"></span></x-nq::alert></template>
            <label class="flex flex-col gap-1.5">
                <span class="text-label text-foreground">{{ $L['contactName'] }}</span>
                <x-nq::field.input x-model="convert.name" dir="auto" autocomplete="off" />
            </label>
            <div class="flex flex-col gap-2">
                <label class="flex items-center gap-2 text-body-sm"><x-nq::checkbox x-model="convert.withCompany" />{{ $L['createCompany'] }}</label>
                <div x-show="convert.withCompany" style="display: none"><x-nq::field.input x-model="convert.company" dir="auto" aria-label="{{ $L['companyName'] }}" autocomplete="off" /></div>
            </div>
            <div class="flex flex-col gap-2">
                <label class="flex items-center gap-2 text-body-sm"><x-nq::checkbox x-model="convert.withDeal" />{{ $L['createDeal'] }}</label>
                <div x-show="convert.withDeal" style="display: none"><x-nq::field.input x-model="convert.deal" dir="auto" aria-label="{{ $L['dealTitle'] }}" autocomplete="off" /></div>
            </div>
            <x-nq::dialog.footer>
                <x-nq::button type="button" variant="ghost" x-on:click="convert.open = false" x-bind:disabled="convert.pending ? '' : null">{{ $L['cancel'] }}</x-nq::button>
                <x-nq::button type="submit" variant="primary" data-action="convert-submit" x-bind:disabled="convertValid ? null : ''" x-bind:aria-busy="convert.pending ? 'true' : null">
                    <x-nq::spinner x-show="convert.pending" style="display: none" />
                    {{ $L['convertAction'] }}
                </x-nq::button>
            </x-nq::dialog.footer>
        </form>
    </x-nq::dialog.content>
</x-nq::dialog>
