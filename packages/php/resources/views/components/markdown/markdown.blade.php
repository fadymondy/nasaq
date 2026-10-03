{{-- <x-nq::markdown :source="$text" />   <x-nq::markdown>## Release{{ "\n" }}- Faster **search**</x-nq::markdown>
     Renders GitHub-flavoured Markdown (tables, task lists, strikethrough, autolinks) in Nasaq typography, on the server. Raw HTML in the
     source is dropped and unsafe URLs such as javascript: are removed, so it is safe for model or user text. Every block has dir="auto",
     so an Arabic paragraph between English ones orients itself. Fenced code is an <x-nq::code-block> (always left-to-right).
     source: the Markdown text (or put it in the slot). --}}
@props(['source' => null])
@php
    $md = $source ?? (string) $slot;
    // A slot is usually indented inside the template: drop the common leading whitespace.
    if ($source === null) {
        $md = preg_replace('/^\h*\R/', '', $md);
        preg_match_all('/^(\h*)\S/m', $md, $m);
        $indent = $m[1] ? min(array_map('strlen', $m[1])) : 0;
        $md = trim($indent ? preg_replace('/^\h{0,'.$indent.'}/m', '', $md) : $md);
    }
    $html = \Illuminate\Support\Str::markdown((string) $md, ['html_input' => 'strip', 'allow_unsafe_links' => false]);

    $cn = fn (...$classes) => \Nasaq\Cn::merge(...$classes);
    $attr = fn (string $name, ?string $value) => $value === null ? '' : ' '.$name.'="'.e($value).'"';
    $align = function (DOMElement $el): ?string {
        $a = $el->getAttribute('align') ?: (preg_match('/text-align:\s*(left|right|center)/', $el->getAttribute('style'), $mm) ? $mm[1] : '');

        return ['left' => 'text-start', 'right' => 'text-end', 'center' => 'text-center'][$a] ?? null;
    };
    $roles = [
        'h1' => ['h1', 'text-h1 text-foreground'], 'h2' => ['h2', 'text-h2 text-foreground'], 'h3' => ['h3', 'text-h3 text-foreground'],
        'h4' => ['h4', 'text-h3 text-foreground'], 'h5' => ['h5', 'text-h3 text-foreground'], 'h6' => ['h6', 'text-h3 text-foreground'],
    ];
    $render = null;
    $children = function (DOMNode $node) use (&$render): string {
        $out = '';
        foreach ($node->childNodes as $child) {
            $out .= $render($child);
        }

        return $out;
    };
    $render = function (DOMNode $n) use (&$render, &$children, $cn, $attr, $align, $roles): string {
        if ($n instanceof DOMText) {
            return e($n->textContent);
        }
        if (! $n instanceof DOMElement) {
            return '';
        }
        $tag = strtolower($n->tagName);
        $inner = $children($n);
        if (isset($roles[$tag])) {
            return '<'.$tag.' data-slot="text" dir="auto" class="'.e($cn($roles[$tag][1], 'mt-2 text-start first:mt-0')).'">'.$inner.'</'.$tag.'>';
        }

        return match ($tag) {
            'p' => '<p data-slot="text" dir="auto" class="'.e($cn('text-body text-nq-fg-body', 'text-start')).'">'.$inner.'</p>',
            'ul', 'ol' => '<'.$tag.' dir="auto"'.($tag === 'ol' && $n->hasAttribute('start') ? $attr('start', $n->getAttribute('start')) : '')
                .' class="'.e(($tag === 'ul' ? 'list-disc' : 'list-decimal').' space-y-1 ps-6 text-body text-nq-fg-body marker:text-muted-foreground').'">'.$inner.'</'.$tag.'>',
            'li' => (function () use ($n, $inner, $cn) {
                $task = $n->firstChild instanceof DOMElement && $n->firstChild->tagName === 'input';

                return '<li dir="auto" class="'.e($cn('text-start [&.task-list-item]:list-none [&.task-list-item]:-ms-6', $task ? 'task-list-item' : '')).'">'.$inner.'</li>';
            })(),
            'input' => '<input type="checkbox" disabled'.($n->hasAttribute('checked') ? ' checked' : '').' class="me-2 align-middle accent-[var(--nq-accent)]">',
            'a' => (function () use ($n, $inner) {
                $href = $n->hasAttribute('href') ? $n->getAttribute('href') : null;
                $external = $href !== null && preg_match('#^https?://#i', $href);

                return '<a'.($href !== null ? ' href="'.e($href).'"' : '').($external ? ' target="_blank" rel="noopener noreferrer"' : '')
                    .' class="rounded-[2px] text-foreground underline decoration-nq-line-strong underline-offset-4 outline-none hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">'.$inner.'</a>';
            })(),
            'blockquote' => '<blockquote dir="auto" class="border-s-2 border-nq-line-strong ps-4 text-start text-muted-foreground">'.$inner.'</blockquote>',
            'hr' => '<hr class="border-0 border-t border-border">',
            'strong' => '<strong class="font-semibold text-foreground">'.$inner.'</strong>',
            'em', 'del', 'br' => $tag === 'br' ? '<br>' : '<'.$tag.'>'.$inner.'</'.$tag.'>',
            'img' => '<img src="'.e($n->getAttribute('src')).'" alt="'.e($n->getAttribute('alt')).'"'.($n->hasAttribute('title') ? $attr('title', $n->getAttribute('title')) : '')
                .' loading="lazy" class="h-auto max-w-full rounded-card border border-border">',
            // A fenced block arrives as <pre><code class="language-x">: render it as the CodeBlock component.
            'pre' => (function () use ($n, $inner) {
                $code = $n->firstChild instanceof DOMElement ? $n->firstChild : null;
                if (! $code) {
                    return '<pre>'.$inner.'</pre>';
                }
                preg_match('/language-([\w+-]+)/', $code->getAttribute('class'), $lm);

                return \Illuminate\Support\Facades\Blade::render('<x-nq::code-block :code="$code" :language="$language" />', ['code' => $code->textContent, 'language' => $lm[1] ?? 'text']);
            })(),
            // Fenced code is consumed by `pre`; a `code` that reaches here is inline.
            'code' => '<code data-slot="inline-code" dir="ltr" class="rounded-[4px] border border-border bg-secondary px-1 py-0.5 font-mono text-[0.9em] text-foreground [unicode-bidi:isolate]">'.$inner.'</code>',
            'table' => '<div data-slot="table-container" role="region" tabindex="0" class="relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">'
                .'<table data-slot="table" data-density="default" dir="auto" class="w-full caption-bottom border-collapse text-body-sm">'.$inner.'</table></div>',
            'thead' => '<thead data-slot="table-header" class="[&_tr]:border-b [&_tr]:hover:bg-transparent [&_tr]:even:bg-transparent">'.$inner.'</thead>',
            'tbody' => '<tbody data-slot="table-body" class="[&_tr:last-child]:border-0">'.$inner.'</tbody>',
            'tr' => '<tr data-slot="table-row" class="border-b border-border transition-colors duration-150 ease-nq hover:bg-nq-hover data-[state=selected]:bg-nq-selected">'.$inner.'</tr>',
            'th' => '<th data-slot="table-head" scope="col" dir="auto" class="'.e($cn('h-row text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground px-4 py-3', 'text-start', $align($n))).'">'.$inner.'</th>',
            'td' => '<td data-slot="table-cell" dir="auto" class="'.e($cn('h-row align-middle whitespace-nowrap px-4 py-3', 'h-auto whitespace-normal py-2 text-start', $align($n))).'">'.$inner.'</td>',
            default => $inner,
        };
    };
    $doc = new DOMDocument;
    $previous = libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="utf-8" ?><body>'.$html.'</body>', LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);
    $body = $doc->getElementsByTagName('body')->item(0);
    $content = $body ? $children($body) : '';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'markdown') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3 text-body text-nq-fg-body') }}>{!! $content !!}</div>
