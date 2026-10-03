{{-- <x-nq::terminal title="~/app" streaming :lines="[['kind' => 'command', 'text' => 'pnpm build'], 'compiled 214 modules']" />
     Terminal-style output: prompt lines, ANSI colours mapped to tokens, streaming with a follow-the-tail mode, copy, and an optional command input.
     Always left-to-right, also in Arabic pages; only the chrome is translated.
     lines: strings (output) or ['kind' => command|output|error|info|success, 'text' => '...'] (text may hold ANSI codes and newlines).
     title, prompt ("$"), streaming (live badge + cursor), follow (true), max-lines (2000), line-numbers, wrap, copyable (true), clearable, command (adds the input), height ("20rem").
     Append later: el.dispatchEvent(new CustomEvent('nq-terminal-write', { detail: { lines: [...] } })); end the stream with 'nq-terminal-state' { streaming: false }.
     Events: nq-terminal-command { command, wait(promise) }, nq-terminal-clear, nq-terminal-copy { text }. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['lines' => [], 'title' => null, 'prompt' => '$', 'streaming' => false, 'follow' => true, 'maxLines' => 2000, 'lineNumbers' => false, 'wrap' => false, 'copyable' => true, 'clearable' => false, 'command' => false, 'height' => '20rem'])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $strings = [
        'trimmedOne' => $t('1 earlier line hidden', 'أُخفي سطر سابق واحد'),
        'trimmedMany' => $t('{n} earlier lines hidden', 'أُخفيت {n} أسطر سابقة'),
    ];
    $config = ['lines' => array_values($lines), 'prompt' => $prompt, 'streaming' => (bool) $streaming, 'follow' => (bool) $follow, 'maxLines' => (int) $maxLines, 'wrap' => (bool) $wrap, 'strings' => $strings];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'terminal') }}" dir="ltr" x-data="nqTerminal(@js($config))" x-bind:data-streaming="streaming ? '' : null"
    {{ $attributes->except('data-slot')->cn('relative flex min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start') }}>
    <div data-slot="terminal-header" class="flex h-row shrink-0 items-center justify-between gap-2 border-b border-border ps-3 pe-1.5">
        <span class="flex min-w-0 items-center gap-2 font-mono text-caption text-muted-foreground">
            <span class="truncate">{{ $title ?? $t('Terminal', 'الطرفية') }}</span>
            <span x-show="streaming" @unless ($streaming) style="display: none" @endunless class="inline-flex shrink-0 items-center gap-1 font-sans text-nq-success-text">
                <x-nq::spinner class="size-3" />
                {{ $t('Streaming', 'جارٍ البث') }}
            </span>
        </span>
        <span class="flex shrink-0 items-center">
            <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t('Wrap lines', 'التفاف الأسطر') }}" class="data-active:bg-nq-selected"
                x-on:click="wrap = ! wrap" x-bind:aria-pressed="wrap ? 'true' : 'false'" x-bind:data-active="wrap ? '' : null">
                <x-nq::icon name="wrap-text" aria-hidden="true" />
            </x-nq::button>
            @if ($clearable)
                <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t('Clear', 'مسح') }}" x-on:click="clear()">
                    <x-nq::icon name="eraser" aria-hidden="true" />
                </x-nq::button>
            @endif
            @if ($copyable)
                <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t('Copy output', 'نسخ المخرجات') }}" class="data-copied:text-nq-success-text"
                    x-on:click="copy()" x-bind:data-copied="copied ? '' : null">
                    <x-nq::icon name="copy" aria-hidden="true" x-show="! copied" />
                    <x-nq::icon name="check" aria-hidden="true" x-show="copied" style="display: none" />
                </x-nq::button>
            @endif
        </span>
    </div>

    <div x-ref="output" data-slot="terminal-output" role="log" aria-label="{{ $t('Terminal output', 'مخرجات الطرفية') }}" aria-live="off" tabindex="0"
        style="height: {{ $height }}" x-on:scroll="onScroll()"
        class="min-h-0 overflow-auto py-2 font-mono text-code outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
        <div class="min-w-full" x-bind:class="wrap ? 'w-full' : 'w-max'">
            <p x-show="hidden > 0" style="display: none" class="px-3 pb-1 text-caption text-muted-foreground" x-text="trimmedText()"></p>
            <p x-show="empty" @if ($lines || $streaming) style="display: none" @endif class="px-3 text-muted-foreground">{{ $t('No output yet', 'لا توجد مخرجات بعد') }}</p>
            <template x-for="(row, i) in rows" :key="row.key">
                <div data-slot="terminal-row" x-bind:data-kind="row.kind" x-bind:class="rowClass(row)">
                    @if ($lineNumbers)
                        <span aria-hidden="true" class="me-3 inline-block shrink-0 select-none text-end text-muted-foreground tabular-nums" x-bind:style="{ minWidth: gutter + 'ch' }" x-text="hidden + i + 1"></span>
                    @endif
                    <span x-show="row.prompt" style="display: none" aria-hidden="true" class="me-2 shrink-0 select-none text-nq-accent-text" x-text="prompt"></span>
                    <span class="min-w-0">
                        <template x-for="(s, j) in row.spans" :key="j">
                            <span x-bind:style="spanStyle(s.style)" x-bind:class="spanClass(s.style)" x-text="s.text"></span>
                        </template>
                    </span>
                </div>
            </template>
            <div x-show="streaming" @unless ($streaming) style="display: none" @endunless class="flex min-h-[1lh] px-3" aria-hidden="true">
                <span class="inline-block h-[1lh] w-[0.6em] bg-nq-fg motion-safe:animate-pulse"></span>
            </div>
        </div>
    </div>

    <x-nq::button type="button" size="sm" variant="secondary" class="absolute end-3 shadow-sm" style="display: none; bottom: {{ $command ? '3.25rem' : '0.75rem' }}"
        x-show="showJump" x-on:click="jump()">
        <x-nq::icon name="arrow-down-to-line" aria-hidden="true" />
        {{ $t('Jump to latest', 'الانتقال إلى الأحدث') }}
    </x-nq::button>

    @if ($command)
        <form data-slot="terminal-input" x-on:submit.prevent="submit()" class="flex h-control shrink-0 items-center gap-2 border-t border-border px-3 font-mono text-code">
            <span aria-hidden="true" class="select-none text-nq-accent-text" x-text="prompt">{{ $prompt }}</span>
            <input x-ref="input" x-model="command" x-on:keydown="onKey($event)" x-bind:disabled="busy ? '' : null"
                x-bind:placeholder="busy ? '{{ $t('Running', 'قيد التنفيذ') }}' : null" aria-label="{{ $t('Command', 'أمر') }}"
                autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"
                class="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60">
        </form>
    @endif
</div>
