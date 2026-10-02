@php \Carbon\Carbon::setTestNow('2026-09-27 10:05:00'); /* fixed clock so this example renders the same every time; drop it in your app */ @endphp
<x-nq::timeline>
    <x-nq::timeline.item :actor="['name' => 'Sara Alharbi']" title="Assigned MH-142 to Khaled" :time="now()->subMinutes(5)" />
    <x-nq::timeline.item title="Pull request #48 opened" description="Post-login redirect" time="2026-09-27T10:00:00Z">
        <x-slot:icon><x-lucide-git-pull-request /></x-slot:icon>
    </x-nq::timeline.item>
</x-nq::timeline>
@php \Carbon\Carbon::setTestNow(); @endphp

<div class="mt-6" x-data="{ events: [{ title: 'Order placed', time: '2026-09-27T09:00:00Z' }], add() { this.events = [{ title: 'Packed', description: 'Box 2 of 2', time: '2026-09-27T10:00:00Z', actor: { name: 'Khaled Nasser' } }].concat(this.events) } }">
    <x-nq::timeline id="live-timeline" items-expr="events">
        <x-nq::timeline.item title="Order placed" time="2026-09-27T09:00:00Z" />
    </x-nq::timeline>
    <x-nq::button id="live-add" size="sm" class="mt-3" x-on:click="add()">Add an event</x-nq::button>
</div>
