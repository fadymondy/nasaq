<div class="flex flex-col gap-4">
    <x-nq::usage-meter label="Seats" :used="46" :limit="50" unit="seats" />
    <x-nq::usage-meter label="Storage" :used="12" :limit="null" unit="GB" />
    <x-nq::usage-meter label="AI spend" kind="money" currency="USD" :used="182" :limit="200" />
</div>
