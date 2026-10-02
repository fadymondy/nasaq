{{-- <x-nq::code-block language="ts" filename="greet.ts" line-numbers :code="$source" />
     Syntax-highlighted code in a <figure>. The server renders the plain lines; a small built-in tokeniser colours them in the browser
     (no Shiki; set window.nasaqHighlight to plug another highlighter in). Code is always left-to-right, also in Arabic pages.
     code: the source (one trailing newline is dropped). language: ts tsx js jsx json bash sh css html md go php python py sql yaml yml (default text).
     filename: adds a header (and the region's accessible name). line-numbers. highlight-lines: "2-4,7" or [2, 3]. copyable (true). copy-label. label. pre-class: classes for the scrolling <pre>.
     code-expr="snippet": an Alpine expression that gives the code instead (re-read whenever it changes: text, line numbers, highlighting and the copy button follow;
     :code is still the server-rendered first paint). Keep it free of && < > and apostrophes when it is passed through another x-nq:: component's attributes.
     Needs the Alpine runtime (@nasaqScripts). Inline code in a sentence: <x-nq::code-block.inline-code>. --}}
@props(['code' => '', 'codeExpr' => null, 'language' => 'text', 'filename' => null, 'lineNumbers' => false, 'highlightLines' => null, 'copyable' => true, 'copyLabel' => null, 'label' => null, 'preClass' => null])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $source = preg_replace('/\n$/', '', (string) $code);
    $lines = explode("\n", $source);
    $marked = [];
    if (is_array($highlightLines)) {
        $marked = array_map('intval', $highlightLines);
    } elseif ($highlightLines) {
        foreach (explode(',', (string) $highlightLines) as $part) {
            $range = array_map('trim', explode('-', $part));
            if (! is_numeric($range[0])) {
                continue;
            }
            $end = isset($range[1]) && is_numeric($range[1]) ? (int) $range[1] : (int) $range[0];
            for ($n = (int) $range[0]; $n <= $end; $n++) {
                $marked[] = $n;
            }
        }
    }
    $config = ['code' => $source, 'language' => $language];
    if ($codeExpr !== null) {
        $config += ['marked' => array_values($marked), 'lineNumbers' => (bool) $lineNumbers];
    }
    $gutter = strlen((string) count($lines));
    $copy = $copyLabel ?? $t('Copy code', 'نسخ الشيفرة');
    $copied = $t('Code copied to clipboard', 'تم نسخ الشيفرة إلى الحافظة');
    $shikiVars = '[--shiki-foreground:var(--nq-fg)] [--shiki-background:transparent] [--shiki-token-comment:var(--nq-fg-muted)] [--shiki-token-keyword:var(--nq-accent-text)] [--shiki-token-string:var(--nq-success-text)] [--shiki-token-string-expression:var(--nq-success-text)] [--shiki-token-constant:var(--nq-warning-text)] [--shiki-token-function:var(--nq-info-text)] [--shiki-token-parameter:var(--nq-fg-body)] [--shiki-token-punctuation:var(--nq-fg-muted)] [--shiki-token-link:var(--nq-info-text)]';
@endphp
<figure data-slot="code-block" data-language="{{ $language }}" dir="ltr" x-data="nqCodeBlock({!! \Illuminate\Support\Js::from($config) !!})" x-bind:data-highlighted="highlighted ? '' : null"{!! $codeExpr !== null ? ' x-effect="setCode('.e($codeExpr).')"' : '' !!}
    {{ $attributes->cn('group/code relative m-0 overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start '.$shikiVars) }}>
    @if ($filename)
        <figcaption data-slot="code-block-header" class="flex h-row items-center justify-between gap-2 border-b border-border ps-3 pe-1.5 font-mono text-caption text-muted-foreground">
            <span class="truncate">{{ $filename }}</span>
            @if ($copyable)
                @isset($copyAction){{ $copyAction }}@else<x-nq::copy-button :value="$source" :value-expr="$codeExpr !== null ? 'code' : null" :label="$copy" :copied-label="$copied" />@endisset
            @endif
        </figcaption>
    @elseif ($copyable)
        <div class="absolute end-1.5 top-1.5 z-10 opacity-0 transition-opacity duration-150 ease-nq focus-within:opacity-100 group-hover/code:opacity-100 pointer-coarse:opacity-100">
            @isset($copyAction){{ $copyAction }}@else<x-nq::copy-button :value="$source" :value-expr="$codeExpr !== null ? 'code' : null" :label="$copy" :copied-label="$copied" />@endisset
        </div>
    @endif
    <pre data-slot="code-block-pre" role="region" tabindex="0" aria-label="{{ $label ?? $filename ?? $t('Code', 'شيفرة برمجية') }}"
        class="{{ \Illuminate\Support\Arr::toCssClasses(['m-0 overflow-auto bg-transparent py-3 font-mono text-code text-[var(--shiki-foreground)] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus', $preClass ?? '']) }}"><code class="block w-max min-w-full">@foreach ($lines as $i => $line)@php($n = $i + 1)@php($on = in_array($n, $marked, true))<span data-line="{{ $n }}" @if ($on) data-highlighted @endif class="{{ \Illuminate\Support\Arr::toCssClasses(['flex min-h-[1lh] border-s-2 border-transparent pe-4 whitespace-pre', 'ps-3' => ! $lineNumbers, 'border-nq-accent bg-nq-selected' => $on]) }}">@if ($lineNumbers)<span aria-hidden="true" class="inline-block shrink-0 select-none pe-4 ps-3 text-end text-muted-foreground tabular-nums" style="min-width: {{ $gutter + 3 }}ch">{{ $n }}</span>@endif<span data-code-line>{{ $line }}</span></span>@endforeach</code></pre>
</figure>
