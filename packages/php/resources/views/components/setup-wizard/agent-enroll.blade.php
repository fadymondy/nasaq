{{-- <x-nq::setup-wizard.agent-enroll command="curl -fsSL https://get.example.com | sh" status="waiting" :elapsed="0" x-on:nq:retry="check()" />
     The guided-connect step: the command, then a status panel that waits live for the agent to check in. Needs the Alpine runtime.
     status: waiting | connected | timeout | failed. agent: { name, host?, version?, system? }, once connected. elapsed: seconds spent waiting (shows a timer).
     error: the message when failed. hint: guidance under the command. retry: show "Check again" on timeout and failed (default: when an x-on:nq:retry listener is set).
     To keep it current from the page, call set({ status, agent, elapsed, error }) or dispatch window event nq-agent-status with that detail. Fires nq:retry. labels: override any string. --}}
@props(['command', 'status' => 'waiting', 'agent' => null, 'elapsed' => null, 'error' => null, 'hint' => null, 'retry' => null, 'labels' => []])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $S = [
        'waiting' => ['Waiting for your agent to connect', 'بانتظار اتصال الوكيل'],
        'waitingHint' => ['Run the command on the machine you want to connect. This page updates by itself.', 'شغّل الأمر على الجهاز الذي تريد ربطه. تتحدّث هذه الصفحة تلقائيًا.'],
        'connected' => ['Agent connected', 'تم اتصال الوكيل'],
        'timeout' => ['No agent has connected yet', 'لم يتصل أي وكيل بعد'],
        'timeoutHint' => ['Check that the command finished without errors and that the machine can reach us, then try again.', 'تأكد من انتهاء الأمر بلا أخطاء ومن أن الجهاز يصل إلينا، ثم حاول مرة أخرى.'],
        'failedEnroll' => ['The agent could not enroll', 'تعذّر تسجيل الوكيل'],
        'retry' => ['Check again', 'تحقق مرة أخرى'],
        'command' => ['Install command', 'أمر التثبيت'],
        'elapsed' => ['Waiting {time}', 'بانتظار منذ {time}'],
        'host' => ['Host', 'المضيف'],
        'version' => ['Version', 'الإصدار'],
        'system' => ['System', 'النظام'],
    ];
    $l = [];
    foreach ($S as $k => [$en, $arText]) {
        $l[$k] = $labels[$k] ?? ($ar ? $arText : $en);
    }
    $hasRetry = $retry ?? $attributes->hasAny(['x-on:nq:retry', '@nq:retry']);
    $info = ['status' => $status, 'agent' => $agent, 'elapsed' => $elapsed, 'error' => $error];
    $clock = fn (int $s): string => intdiv($s, 60).':'.str_pad((string) ($s % 60), 2, '0', STR_PAD_LEFT);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'agent-enroll-wait') }}" x-data="nqAgentEnrollWait({{ \Illuminate\Support\Js::from($info) }}, {{ \Illuminate\Support\Js::from($l['elapsed']) }})"
    x-bind:data-status="status" x-on:nq-agent-status.window="set($event.detail)" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <div class="flex flex-col gap-1.5">
        <span class="text-label text-foreground">{{ $l['command'] }}</span>
        <x-nq::copy-button.field :value="$command" :label="$l['command']" class="font-mono" />
        @if ($hint)<p class="text-caption text-muted-foreground">{{ $hint }}</p>@endif
    </div>
    <div aria-live="polite" data-slot="agent-enroll-status">
        <div role="status" x-show="status === 'waiting'" @style(['display: none' => $status !== 'waiting']) class="flex items-start gap-3 rounded-control border border-border bg-muted/50 p-4">
            <x-nq::spinner class="mt-0.5 size-5 text-muted-foreground" />
            <div class="flex flex-col gap-0.5">
                <p class="text-label text-foreground">{{ $l['waiting'] }}</p>
                <p class="text-body-sm text-muted-foreground">{{ $l['waitingHint'] }}</p>
                <p dir="ltr" class="text-caption text-muted-foreground tabular-nums" x-show="elapsed !== null" x-text="elapsedText()" @style(['display: none' => $elapsed === null])>{{ $elapsed === null ? '' : str_replace('{time}', $clock((int) $elapsed), $l['elapsed']) }}</p>
            </div>
        </div>
        <x-nq::alert tone="success" :title="$l['connected']" x-show="status === 'connected'" :style="($status !== 'connected') ? 'display: none' : null">
            <dl class="m-0 mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5" x-show="agent" @style(['display: none' => ! $agent])>
                <dt class="text-muted-foreground" x-text="agent ? agent.name : ''">{{ $agent['name'] ?? '' }}</dt>
                <dd class="m-0"></dd>
                <dt class="text-muted-foreground" x-show="agent && agent.host" @style(['display: none' => empty($agent['host'])])>{{ $l['host'] }}</dt>
                <dd dir="ltr" class="m-0 text-start font-mono" x-show="agent && agent.host" x-text="agent ? agent.host : ''" @style(['display: none' => empty($agent['host'])])>{{ $agent['host'] ?? '' }}</dd>
                <dt class="text-muted-foreground" x-show="agent && agent.system" @style(['display: none' => empty($agent['system'])])>{{ $l['system'] }}</dt>
                <dd dir="ltr" class="m-0 text-start" x-show="agent && agent.system" x-text="agent ? agent.system : ''" @style(['display: none' => empty($agent['system'])])>{{ $agent['system'] ?? '' }}</dd>
                <dt class="text-muted-foreground" x-show="agent && agent.version" @style(['display: none' => empty($agent['version'])])>{{ $l['version'] }}</dt>
                <dd dir="ltr" class="m-0 text-start font-mono" x-show="agent && agent.version" x-text="agent ? agent.version : ''" @style(['display: none' => empty($agent['version'])])>{{ $agent['version'] ?? '' }}</dd>
            </dl>
        </x-nq::alert>
        @if ($hasRetry)
            <x-nq::alert tone="warning" :title="$l['timeout']" x-show="status === 'timeout'" :style="($status !== 'timeout') ? 'display: none' : null">
                <x-slot:action><x-nq::button size="sm" variant="secondary" x-on:click="retry()"><x-lucide-refresh-cw aria-hidden="true" />{{ $l['retry'] }}</x-nq::button></x-slot:action>
                {{ $l['timeoutHint'] }}
            </x-nq::alert>
            <x-nq::alert tone="danger" :title="$l['failedEnroll']" x-show="status === 'failed'" :style="($status !== 'failed') ? 'display: none' : null">
                <x-slot:action><x-nq::button size="sm" variant="secondary" x-on:click="retry()"><x-lucide-refresh-cw aria-hidden="true" />{{ $l['retry'] }}</x-nq::button></x-slot:action>
                <span x-text="error ? error : {{ \Illuminate\Support\Js::from($l['timeoutHint']) }}">{{ $error ?: $l['timeoutHint'] }}</span>
            </x-nq::alert>
        @else
            <x-nq::alert tone="warning" :title="$l['timeout']" x-show="status === 'timeout'" :style="($status !== 'timeout') ? 'display: none' : null">{{ $l['timeoutHint'] }}</x-nq::alert>
            <x-nq::alert tone="danger" :title="$l['failedEnroll']" x-show="status === 'failed'" :style="($status !== 'failed') ? 'display: none' : null">
                <span x-text="error ? error : {{ \Illuminate\Support\Js::from($l['timeoutHint']) }}">{{ $error ?: $l['timeoutHint'] }}</span>
            </x-nq::alert>
        @endif
    </div>
</div>
