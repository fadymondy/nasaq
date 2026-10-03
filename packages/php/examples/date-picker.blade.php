<div class="flex max-w-sm flex-col gap-4">
    <x-nq::field>
        <x-nq::field.label>Start date</x-nq::field.label>
        <x-nq::date-picker min="2026-01-01" today="2026-09-15" />
        <x-nq::field.description>Work begins on this day.</x-nq::field.description>
    </x-nq::field>
    <x-nq::field>
        <x-nq::field.label>Period</x-nq::field.label>
        <x-nq::date-picker.range today="2026-09-15" />
    </x-nq::field>
    <x-nq::field>
        <x-nq::field.label>Meeting time</x-nq::field.label>
        <x-nq::date-picker.time value="14:30" :minute-step="15" locale="en" />
    </x-nq::field>
</div>
