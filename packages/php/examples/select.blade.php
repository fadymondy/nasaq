<div class="flex flex-col gap-1.5">
    <span class="text-label text-foreground">Type</span>
    <x-nq::select name="type" value="bug">
        <x-nq::select.trigger>
            <x-nq::select.value />
        </x-nq::select.trigger>
        <x-nq::select.content>
            <x-nq::select.item value="bug">Bug</x-nq::select.item>
            <x-nq::select.item value="feature">Feature request</x-nq::select.item>
            <x-nq::select.item value="question">Question</x-nq::select.item>
        </x-nq::select.content>
    </x-nq::select>
</div>
