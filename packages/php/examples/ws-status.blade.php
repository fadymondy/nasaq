<div class="flex flex-col items-start gap-3">
    <x-nq::ws-status state="connected" :latency-ms="42" />
    <x-nq::ws-status state="connecting" />
    <x-nq::ws-status state="offline" variant="inline" retryable />
    <x-nq::ws-status state="reconnecting" variant="banner" :attempt="2" retryable />
</div>
