{{-- <x-nq::typing-terminal title="~/my-shop" :steps="[['cmd' => 'npm i', 'out' => ['installed']]]" />
     A terminal that types commands and prints their output, step by step, for hero sections and docs. The server renders the finished
     transcript (crawlers, no-JS and reduced motion get all of it); the Alpine runtime then replays it. Always left-to-right.
     steps: [['cmd' => 'npm i', 'out' => ['line', "\e[32m✓\e[0m ANSI colours work"]]]. title ("Terminal"), prompt ("❯"), type-ms (28), line-ms (110),
     loop (false: stops with a Replay button), height (320, px), play (true; false shows the full transcript).
     Slot `end`: shown under the transcript when the playback ends. Event "complete" bubbles from the host; set "nq-typing-play" { play } to start later.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['steps' => [], 'title' => null, 'prompt' => '❯', 'typeMs' => 28, 'lineMs' => 110, 'loop' => false, 'height' => 320, 'play' => true])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $steps = array_values(array_map(fn ($s) => ['cmd' => (string) $s['cmd'], 'out' => array_values($s['out'] ?? [])], $steps));
    $plain = fn (string $s) => preg_replace('/\e\[[0-9;:]*[A-Za-z]/', '', $s);
    $transcript = $plain(implode("\n", array_map(fn ($s) => implode("\n", [$prompt.' '.$s['cmd'], ...$s['out']]), $steps)));
    $config = ['steps' => $steps, 'prompt' => $prompt, 'typeMs' => (int) $typeMs, 'lineMs' => (int) $lineMs, 'loop' => (bool) $loop, 'play' => (bool) $play];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'typing-terminal') }}" dir="ltr" x-data="nqTypingTerminal(@js($config))" x-bind:data-playing="playing ? '' : null"
    {{ $attributes->except('data-slot')->cn('relative flex min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start') }}>
    <div data-slot="typing-terminal-header" class="flex h-row shrink-0 items-center gap-2 border-b border-border ps-3 pe-1.5">
        <span aria-hidden="true" class="flex gap-1.5">
            <span class="size-2.5 rounded-full bg-border"></span>
            <span class="size-2.5 rounded-full bg-border"></span>
            <span class="size-2.5 rounded-full bg-border"></span>
        </span>
        <span class="min-w-0 flex-1 truncate font-mono text-caption text-muted-foreground">{{ $title ?? $t('Terminal', 'الطرفية') }}</span>
        <x-nq::button type="button" variant="ghost" size="sm" style="display: none" x-show="showReplay" x-on:click="replay()">
            <x-lucide-rotate-ccw aria-hidden="true" />
            {{ $t('Replay', 'إعادة التشغيل') }}
        </x-nq::button>
    </div>
    <pre class="sr-only" aria-label="{{ $t('Terminal session', 'جلسة الطرفية') }}">{{ $transcript }}</pre>
    <div x-ref="body" data-slot="typing-terminal-body" style="height: {{ (int) $height }}px" class="min-h-0 overflow-auto px-4 py-3 font-mono text-code leading-relaxed">
        <div aria-hidden="true">
            <div x-ref="ssr">
                @foreach ($steps as $step)
                    <div data-kind="command" class="whitespace-pre-wrap break-words"><span class="text-primary">{{ $prompt }} </span><span class="text-foreground">{{ $step['cmd'] }}</span></div>
                    @foreach ($step['out'] as $line)
                        <div data-kind="output" class="whitespace-pre-wrap break-words text-muted-foreground">@foreach (explode("\n", $plain($line)) as $row)<span class="block min-h-[1lh]">{{ $row }}</span>@endforeach</div>
                    @endforeach
                @endforeach
            </div>
            <template x-for="row in rows" :key="row.key">
                <div x-bind:data-kind="row.kind" class="whitespace-pre-wrap break-words" x-bind:class="row.kind === 'output' ? 'text-muted-foreground' : ''">
                    <span x-show="row.kind === 'command'" class="text-primary" x-text="prompt + ' '"></span>
                    <span x-show="row.kind === 'command'" class="text-foreground" x-text="row.cmd"></span>
                    <span x-show="row.typing" style="display: none" aria-hidden="true" class="ms-0.5 inline-block h-[1.1em] w-[0.55em] translate-y-[0.15em] animate-pulse bg-primary"></span>
                    <template x-for="(spans, r) in row.rows" :key="r">
                        <span class="block min-h-[1lh]">
                            <template x-for="(s, j) in spans" :key="j">
                                <span x-bind:style="spanStyle(s.style)" x-bind:class="spanClass(s.style)" x-text="s.text"></span>
                            </template>
                        </span>
                    </template>
                </div>
            </template>
        </div>
        @isset($end)
            <div data-slot="typing-terminal-end" x-show="progress.end" class="mt-4 border-t border-border pt-4 font-sans">{{ $end }}</div>
        @endisset
    </div>
</div>
