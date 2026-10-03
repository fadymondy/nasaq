<x-nq::field name="contact">
    <x-nq::field.label>Contact by</x-nq::field.label>
    <x-nq::field.description>We only use this for account notices.</x-nq::field.description>
    <x-nq::radio-group default-value="email" aria-label="Contact by">
        <label class="flex items-center gap-2 text-body-sm">
            <x-nq::radio-group.radio value="email" /> Email
        </label>
        <label class="flex items-center gap-2 text-body-sm">
            <x-nq::radio-group.radio value="sms" /> SMS
        </label>
    </x-nq::radio-group>
</x-nq::field>
