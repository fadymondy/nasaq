<div class="flex w-80 flex-col gap-6">
    <div class="flex flex-col gap-1.5">
        <span class="text-label text-foreground">Country</span>
        <x-nq::combobox name="country" value="eg">
            <x-nq::combobox.input placeholder="Search a country…" aria-label="Country" />
            <x-nq::combobox.content>
                <x-nq::combobox.empty>No results</x-nq::combobox.empty>
                <x-nq::combobox.list>
                    <x-nq::combobox.item value="sa">Saudi Arabia</x-nq::combobox.item>
                    <x-nq::combobox.item value="eg">Egypt</x-nq::combobox.item>
                    <x-nq::combobox.item value="jo">Jordan</x-nq::combobox.item>
                </x-nq::combobox.list>
            </x-nq::combobox.content>
        </x-nq::combobox>
    </div>
    <div class="flex flex-col gap-1.5">
        <span class="text-label text-foreground">Markets</span>
        <x-nq::combobox name="markets" :value="['sa']" multiple>
            <x-nq::combobox.chips placeholder="Pick markets" aria-label="Markets" />
            <x-nq::combobox.content>
                <x-nq::combobox.empty>No results</x-nq::combobox.empty>
                <x-nq::combobox.list>
                    <x-nq::combobox.item value="sa">Saudi Arabia</x-nq::combobox.item>
                    <x-nq::combobox.item value="eg">Egypt</x-nq::combobox.item>
                    <x-nq::combobox.item value="jo">Jordan</x-nq::combobox.item>
                </x-nq::combobox.list>
            </x-nq::combobox.content>
        </x-nq::combobox>
    </div>
</div>
