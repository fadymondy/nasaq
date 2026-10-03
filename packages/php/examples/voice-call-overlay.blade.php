<div class="flex max-w-2xl flex-col gap-6">
    <div id="vc-live" class="relative h-[32rem] w-full overflow-hidden rounded-lg border"
        x-data="{ callState: 'listening', callLevel: 0.4, callElapsed: 65, callMuted: false, callCaptions: [{ id: '1', role: 'user', text: 'Where is my order?' }, { id: '2', role: 'agent', text: 'It is out for delivery.' }], ended: 0 }"
        x-on:nq-voice-end="ended++; callState = `connecting`">
        <x-nq::voice-call-overlay id="vc-call" contained :agent="['name' => 'Nasaq assistant', 'subtitle' => 'Support', 'avatar' => 'N']" :elapsed="65" :level="0.4" :captions="[['id' => '1', 'role' => 'user', 'text' => 'Where is my order?'], ['id' => '2', 'role' => 'agent', 'text' => 'It is out for delivery.']]"
            state-expr="callState" level-expr="callLevel" elapsed-expr="callElapsed" captions-expr="callCaptions" x-model="callMuted" retry interrupt />
    </div>
    <x-nq::voice-call-overlay.visualizer id="vc-viz" state="speaking" :level="0.7" />
    <x-nq::voice-call-overlay.visualizer id="vc-viz-live" state="listening" :level="0.2" state-expr="`speaking`" level-expr="0.9" />
</div>
