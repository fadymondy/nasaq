<div class="max-w-3xl" x-data="{ max: 5 }">
    <x-nq::test-run-stream
        x-on:test-run-start="
            const on = $event.detail;
            const es = new EventSource(`/api/sources/blog/test-run?max=${max}`);
            on.signal.addEventListener(`abort`, () => es.close());
            es.addEventListener(`step`, (e) => on.step(JSON.parse(e.data)));
            es.addEventListener(`saved`, (e) => on.result(JSON.parse(e.data)));
            es.addEventListener(`complete`, () => { es.close(); on.done(); });
            es.addEventListener(`error`, () => { es.close(); on.fail(`The connection closed.`); });
        "
    >
        <x-slot:controls>
            <x-nq::field.input type="number" min="1" x-model="max" dir="ltr" class="w-20" aria-label="{{ \Nasaq\Nasaq::t('Maximum items', 'الحد الأقصى للعناصر') }}" />
        </x-slot:controls>
    </x-nq::test-run-stream>
</div>
