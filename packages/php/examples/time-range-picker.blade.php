<div class="flex max-w-xl flex-col gap-6">
    <x-nq::time-range-picker time-zone="Asia/Riyadh" now="2026-09-29T09:00:00Z" comparison="previous" />
    <x-nq::time-range-picker :value="['kind' => 'week', 'start' => '2026-09-27']" time-zone="Asia/Riyadh" now="2026-09-29T09:00:00Z" :week-starts-on="0" :allow-custom="false" />
</div>
