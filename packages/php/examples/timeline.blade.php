@php \Carbon\Carbon::setTestNow('2026-09-27 10:05:00'); /* fixed clock so this example renders the same every time; drop it in your app */ @endphp
<x-nq::timeline>
    <x-nq::timeline.item :actor="['name' => 'Sara Alharbi']" title="Assigned MH-142 to Khaled" :time="now()->subMinutes(5)" />
    <x-nq::timeline.item title="Pull request #48 opened" description="Post-login redirect" time="2026-09-27T10:00:00Z">
        <x-slot:icon><x-lucide-git-pull-request /></x-slot:icon>
    </x-nq::timeline.item>
</x-nq::timeline>
@php \Carbon\Carbon::setTestNow(); @endphp
