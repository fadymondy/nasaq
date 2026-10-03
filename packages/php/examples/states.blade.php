<x-nq::states title="لا توجد مهام بعد" description="تظهر هنا المهام التي تنشئها أو تُسند إليك.">
    <x-slot:actions>
        <x-nq::button variant="primary">مهمة جديدة</x-nq::button>
    </x-slot:actions>
</x-nq::states>

<x-nq::states.loading shape="grid" :rows="4" :columns="2" caption="Fetching the last 30 days…" />

<x-nq::states.loading shape="timeline" :rows="3" />
