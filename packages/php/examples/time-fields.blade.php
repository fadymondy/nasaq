<div class="flex max-w-sm flex-col gap-3">
    <x-nq::time-fields.time-field value="09:00" aria-label="Remind me at" />
    <x-nq::time-fields.time-zone-field value="Asia/Riyadh" />
    <x-nq::time-fields.time-span-field :value="['start' => '22:00', 'end' => '06:00']" allow-overnight />
    <x-nq::time-fields.time-zone-clock time-zone="Europe/London" reference="Asia/Riyadh" />
</div>
