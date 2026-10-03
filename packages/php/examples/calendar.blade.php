<div class="flex flex-wrap gap-8">
    <x-nq::calendar value="2026-09-15" today="2026-09-15" locale="en-US" />
    <x-nq::calendar mode="range" :value="['from' => '2026-09-08', 'to' => '2026-09-12']" today="2026-09-15" locale="en-US" />
    <x-nq::calendar value="2026-09-15" today="2026-09-15" locale="ar" />
    <x-nq::calendar value="2026-09-12" today="2026-09-15" locale="en-US" min="2026-09-05" max="2026-09-25" :disabled="['2026-09-09']" :disabled-weekdays="[0]" />
</div>
