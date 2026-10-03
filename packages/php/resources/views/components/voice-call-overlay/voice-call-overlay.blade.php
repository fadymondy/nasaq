{{-- <x-nq::voice-call-overlay :agent="['name' => 'Nasaq assistant', 'subtitle' => 'Support']" state-expr="callState" level-expr="callLevel" elapsed-expr="callElapsed" x-model="callMuted" @nq-voice-end="hangUp()" />
     A full-screen voice call with an AI agent: who you are talking to, how long, a voice visualiser, what state the agent is in (listening, thinking, speaking), live captions, and mute, captions and
     hang-up controls. It holds no audio: you connect the call, feed state and level, and act on its events.
     agent: ['name' => ..., 'avatar' => emoji or image URL, 'subtitle' => ...]. state: connecting | listening (default) | thinking | speaking | error. level: 0 to 1, the loudness of the current speaker.
     muted: the microphone mute (x-modelable, so x-model / wire:model work). elapsed: seconds since the call was answered (omit to hide the timer). captions: [['id', 'role' => agent|user, 'text']];
     only the last caption-lines (3) show. show-captions: captions shown or hidden (true). error: text shown with the error state. retry: add a Reconnect button in the error state. interrupt: add an
     Interrupt button while the agent speaks. contained: render inside the nearest positioned parent instead of covering the window (for embedding and demos). labels: words (label, states[...], muted, mute,
     unmute, captionsOn, captionsOff, end, ending, retry, you, duration, level, captions, noCaptions, interrupt).
     Live values: state-expr, level-expr, elapsed-expr, captions-expr, error-expr are Alpine expressions re-read whenever they change; keep their names different from state, level, muted, elapsed, captions,
     error, showCaptions (the overlay owns those). Events, from the root: nq-voice-mute { muted }, nq-voice-captions { show }, nq-voice-end { wait(promise) } (call wait to show "Ending call" until it settles),
     nq-voice-retry, nq-voice-interrupt. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.voice-call-overlay._logic')
@props(['agent' => ['name' => ''], 'state' => 'listening', 'level' => 0, 'muted' => false, 'elapsed' => null, 'captions' => [], 'captionLines' => 3, 'showCaptions' => true, 'error' => null, 'retry' => false,
    'interrupt' => false, 'contained' => false, 'labels' => [], 'stateExpr' => null, 'levelExpr' => null, 'elapsedExpr' => null, 'captionsExpr' => null, 'errorExpr' => null])
@php
    $t = nq_voice_words($labels);
    $name = (string) ($agent['name'] ?? '');
    $avatar = $agent['avatar'] ?? null;
    $image = is_string($avatar) && (str_starts_with($avatar, 'http') || str_starts_with($avatar, '/') || str_starts_with($avatar, 'data:'));
    $lines = array_slice(array_values($captions), -max(0, (int) $captionLines));
    $muteBase = \Nasaq\Cn::merge('inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent font-sans text-label transition-colors duration-150 ease-nq',
        'min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0', 'size-control p-0', 'size-12 rounded-full');
    $on = 'bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--nq-action)_88%,var(--nq-fg))]';
    $off = 'border-border bg-card text-foreground hover:bg-nq-hover';
    $config = \Illuminate\Support\Js::from([
        'state' => $state, 'level' => (float) $level, 'muted' => (bool) $muted, 'elapsed' => $elapsed, 'captions' => array_values($captions), 'captionLines' => (int) $captionLines,
        'showCaptions' => (bool) $showCaptions, 'error' => $error, 'contained' => (bool) $contained, 'words' => $t,
    ])->toHtml();
    $parts = array_filter([
        $stateExpr !== null ? 'state: '.e($stateExpr) : null,
        $levelExpr !== null ? 'level: '.e($levelExpr) : null,
        $elapsedExpr !== null ? 'elapsed: '.e($elapsedExpr) : null,
        $captionsExpr !== null ? 'captions: '.e($captionsExpr) : null,
        $errorExpr !== null ? 'error: '.e($errorExpr) : null,
    ]);
    $statusText = $state === 'listening' && $muted ? $t['muted'] : ($t['states'][$state] ?? '');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'voice-call-overlay') }}" role="dialog" @unless ($contained) aria-modal="true" @endunless aria-label="{{ $t['label'] }}: {{ $name }}" tabindex="-1"
    x-data="nqVoiceCall({!! $config !!})" x-modelable="muted" x-bind:data-state="state"@if ($parts) x-effect="sync({ {!! implode(', ', $parts) !!} })"@endif
    {{ $attributes->except('data-slot')->cn(['z-50 flex flex-col bg-background text-foreground outline-none', $contained ? 'absolute inset-0' : 'fixed inset-0']) }}>
    <header class="flex items-center gap-3 px-5 py-4">
        <span aria-hidden="true" x-bind:class="state === `speaking` ? `border-nq-accent` : `border-border`"
            class="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary text-body">
            @if ($image)<img src="{{ $avatar }}" alt="" class="size-full object-cover" />@elseif ($avatar){{ $avatar }}@else<x-lucide-bot class="size-4" />@endif
        </span>
        <div class="min-w-0 flex-1">
            <p dir="auto" class="truncate text-label text-foreground">{{ $name }}</p>
            @if (! empty($agent['subtitle']))
                <p dir="auto" class="truncate text-caption text-muted-foreground">{{ $agent['subtitle'] }}</p>
            @endif
        </div>
        <span class="tabular-nums text-body-sm text-muted-foreground" aria-label="{{ $t['duration'] }}" x-show="elapsed !== null" @if ($elapsed === null && $elapsedExpr === null) style="display: none" @endif>
            <bdi dir="ltr" x-text="time()">{{ $elapsed !== null ? nq_voice_time($elapsed) : '' }}</bdi>
        </span>
    </header>

    <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6">
        <x-nq::voice-call-overlay.visualizer :state="$state" :level="$level" :muted="$muted" :labels="$labels" state-expr="state" level-expr="level" muted-expr="muted" class="w-full max-w-md" />
        <div role="status" aria-live="polite" class="flex min-h-14 flex-col items-center gap-2 text-center">
            <x-nq::ai-states.thinking x-show="state === `thinking`" :label="$t['states']['thinking']" :style="$state === 'thinking' ? '' : 'display: none'" />
            <span x-show="state === `connecting`" @if ($state !== 'connecting') style="display: none" @endif class="inline-flex items-center gap-2 text-body text-muted-foreground"><x-nq::spinner /> {{ $t['states']['connecting'] }}</span>
            <span x-show="state === `error`" @if ($state !== 'error') style="display: none" @endif class="inline-flex items-center gap-2 text-body text-nq-danger-text">
                <x-lucide-triangle-alert aria-hidden="true" class="size-4" /> <span x-text="error ?? words.states.error">{{ $error ?? $t['states']['error'] }}</span>
            </span>
            <span x-show="plain()" @if (! in_array($state, ['listening', 'speaking'], true)) style="display: none" @endif class="inline-flex items-center gap-2 text-body text-foreground">
                <span x-show="state === `listening` ? muted : false" @if (! ($state === 'listening' && $muted)) style="display: none" @endif class="inline-flex"><x-lucide-mic-off aria-hidden="true" class="size-4 text-muted-foreground" /></span>
                <span x-text="statusText()">{{ $statusText }}</span>
            </span>
            @if ($retry)
                <x-nq::button size="sm" x-show="state === `error`" x-on:click="retry()" :style="$state === 'error' ? '' : 'display: none'">{{ $t['retry'] }}</x-nq::button>
            @endif
            @if ($interrupt)
                <x-nq::button size="sm" variant="ghost" x-show="state === `speaking`" x-on:click="interrupt()" :style="$state === 'speaking' ? '' : 'display: none'">{{ $t['interrupt'] }}</x-nq::button>
            @endif
        </div>

        <div data-captions role="log" aria-label="{{ $t['captions'] }}" aria-live="off" x-show="showCaptions" x-effect="paintCaptions()" @unless ($showCaptions) style="display: none" @endunless
            class="flex min-h-24 w-full max-w-xl flex-col justify-end gap-1.5 text-center">
            @if (count($lines) === 0)
                <p class="text-body-sm text-muted-foreground">{{ $t['noCaptions'] }}</p>
            @else
                @foreach ($lines as $i => $line)
                    <p dir="auto" class="{{ \Nasaq\Cn::merge('text-body', ($line['role'] ?? 'agent') === 'agent' ? 'text-foreground' : 'text-muted-foreground', $i < count($lines) - 1 ? 'opacity-70' : '') }}">
                        @if (($line['role'] ?? 'agent') === 'user')<span class="me-1.5 text-caption text-muted-foreground">{{ $t['you'] }}</span>@endif
                        {{ $line['text'] ?? '' }}
                    </p>
                @endforeach
            @endif
        </div>
    </div>

    <footer class="flex items-center justify-center gap-3 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button type="button" data-slot="button" class="{{ $muteBase }}" x-bind:class="muted ? {{ \Illuminate\Support\Js::from($on) }} : {{ \Illuminate\Support\Js::from($off) }}" x-bind:aria-pressed="muted ? `true` : `false`"
            x-bind:aria-label="muteLabel()" x-bind:disabled="state === `connecting` ? true : null" x-on:click="toggleMute()">
            <span x-show="muted" @unless ($muted) style="display: none" @endunless class="inline-flex"><x-lucide-mic-off aria-hidden="true" /></span>
            <span x-show="! muted" @if ($muted) style="display: none" @endif class="inline-flex"><x-lucide-mic aria-hidden="true" /></span>
        </button>
        <button type="button" data-slot="button" class="{{ $muteBase }}" x-bind:class="showCaptions ? {{ \Illuminate\Support\Js::from($on) }} : {{ \Illuminate\Support\Js::from($off) }}"
            x-bind:aria-pressed="showCaptions ? `true` : `false`" x-bind:aria-label="captionsLabel()" x-on:click="toggleCaptions()">
            <x-lucide-captions aria-hidden="true" />
        </button>
        {{ $slot }}
        <x-nq::button variant="danger" size="icon" class="size-14 rounded-full" x-bind:aria-label="endLabel()" x-bind:aria-busy="ending ? `true` : null" x-bind:disabled="ending ? true : null" x-on:click="end()">
            <span x-show="! ending" class="inline-flex"><x-lucide-phone-off aria-hidden="true" /></span>
            <span x-show="ending" style="display: none" class="inline-flex"><x-nq::spinner /></span>
        </x-nq::button>
    </footer>
</div>
