{{-- <x-nq::markdown-extras :source="$note" :tables="['downloadable' => true]" />
     Markdown plus what people expect when notes and docs hold real data: a leading --- frontmatter block becomes a properties table, tables sort when you click a header, filter as you type
     and download as CSV, and code blocks get a line-number toggle and a download button next to copy. Fence meta is read: ```ts title="app.ts" showLineNumbers {2,4-6}. Raw HTML in the source
     is dropped and unsafe URLs are removed, like <x-nq::markdown>. The parts also work on their own: <x-nq::markdown-extras.table>, <x-nq::markdown-extras.frontmatter>, <x-nq::markdown-extras.code-block>.
     source: the Markdown text (or put it in the slot). frontmatter: table (default) | hide. tables: false, or ['sortable', 'filterable', 'filterMinRows', 'downloadable' => ...]. code: false, or ['lineNumbers', 'download' => ...].
     labels: string overrides. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['source' => null, 'frontmatter' => 'table', 'tables' => [], 'code' => [], 'labels' => []])
@php
    $md = $source ?? (string) $slot;
    // A slot is usually indented inside the template: drop the common leading whitespace.
    if ($source === null) {
        $md = preg_replace('/^\h*\R/', '', $md);
        preg_match_all('/^(\h*)\S/m', $md, $m);
        $indent = $m[1] ? min(array_map('strlen', $m[1])) : 0;
        $md = trim($indent ? preg_replace('/^\h{0,'.$indent.'}/m', '', $md) : $md);
    }

    // A leading --- block of simple YAML (key: value, key: [a, b], - item lists) is the frontmatter; the rest is the body.
    $scalar = function (string $raw) {
        $v = trim($raw);
        if (strlen($v) >= 2 && (($v[0] === '"' && substr($v, -1) === '"') || ($v[0] === "'" && substr($v, -1) === "'"))) {
            return substr($v, 1, -1);
        }
        if ($v === 'true' || $v === 'false') {
            return $v === 'true';
        }

        return preg_match('/^-?\d+(\.\d+)?$/', $v) ? $v + 0 : $v;
    };
    $fm = [];
    $body = (string) $md;
    $text = preg_replace('/^\x{FEFF}/u', '', $body);
    if (preg_match('/^---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|$)/s', $text, $block)) {
        $listAt = null;
        foreach (preg_split('/\r?\n/', $block[1]) as $line) {
            if (trim($line) === '' || str_starts_with(trim($line), '#')) {
                continue;
            }
            if ($listAt !== null && (preg_match('/^\s+-\s+(.*)$/', $line, $item) || preg_match('/^-\s+(.*)$/', $line, $item))) {
                $fm[$listAt][1][] = (string) $scalar($item[1]);

                continue;
            }
            if (preg_match('/^\s/', $line) || ! preg_match('/^([^:#]+?):\s*(.*)$/', $line, $kv)) {
                continue;
            }
            $rest = trim($kv[2]);
            $listAt = null;
            if ($rest === '') {
                $fm[] = [trim($kv[1]), []];
                $listAt = array_key_last($fm);
            } elseif (str_starts_with($rest, '[') && str_ends_with($rest, ']')) {
                $fm[] = [trim($kv[1]), array_values(array_filter(array_map(fn ($s) => (string) $scalar($s), explode(',', substr($rest, 1, -1))), fn ($s) => $s !== ''))];
            } else {
                $fm[] = [trim($kv[1]), $scalar($rest)];
            }
        }
        // A key with no value and no list items is an empty string, not an empty list.
        $fm = array_map(fn ($p) => $p[1] === [] ? [$p[0], ''] : $p, $fm);
        $body = substr($text, strlen($block[0]));
    }

    $options = ['html_input' => 'strip', 'allow_unsafe_links' => false];
    $html = \Illuminate\Support\Str::markdown($body, $options);
    // The HTML renderer keeps only the language of a fence; the rest of the info string (title, showLineNumbers, {2,4-6}) is read from the syntax tree.
    $metas = [];
    foreach ((new \League\CommonMark\Parser\MarkdownParser((new \League\CommonMark\GithubFlavoredMarkdownConverter($options))->getEnvironment()))->parse($body)->iterator() as $node) {
        if ($node instanceof \League\CommonMark\Extension\CommonMark\Node\Block\FencedCode) {
            $metas[] = trim(preg_replace('/^\S+\s*/', '', trim((string) $node->getInfo())));
        } elseif ($node instanceof \League\CommonMark\Extension\CommonMark\Node\Block\IndentedCode) {
            $metas[] = '';
        }
    }
    $preAt = 0;
    $tablesOn = $tables !== false && $tables !== 'false';
    $codeOn = $code !== false && $code !== 'false';
    $tableOptions = $tablesOn ? array_intersect_key((array) $tables, array_flip(['sortable', 'filterable', 'filterMinRows', 'downloadable'])) : [];
    $fenceOptions = $codeOn ? (array) $code : [];

    $cn = fn (...$classes) => \Nasaq\Cn::merge(...array_map(fn ($c) => (string) $c, $classes));
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
    $render = function (DOMNode $n) use (&$render, &$children, &$preAt, $cn, $attr, $align, $roles, $metas, $tablesOn, $tableOptions, $codeOn, $fenceOptions, $labels): string {
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
            // A fenced block arrives as <pre><code class="language-x">: render it as the code block with a line-number toggle and a download button (its meta comes from the syntax tree).
            'pre' => (function () use ($n, $inner, &$preAt, $metas, $codeOn, $fenceOptions, $labels) {
                $info = (string) ($metas[$preAt++] ?? '');
                $codeEl = $n->firstChild instanceof DOMElement ? $n->firstChild : null;
                if (! $codeEl) {
                    return '<pre>'.$inner.'</pre>';
                }
                preg_match('/language-([\w+-]+)/', $codeEl->getAttribute('class'), $lm);
                $data = ['code' => $codeEl->textContent, 'language' => $lm[1] ?? 'text'];
                if (! $codeOn) {
                    return \Illuminate\Support\Facades\Blade::render('<x-nq::code-block :code="$code" :language="$language" />', $data);
                }
                $title = preg_match('/(?:title|filename|file)=(?:"([^"]*)"|\'([^\']*)\'|(\S+))/', $info, $tm) ? (($tm[1] ?? '') !== '' ? $tm[1] : ((($tm[2] ?? '') !== '') ? $tm[2] : ($tm[3] ?? ''))) : null;
                $highlight = preg_match('/\{([\d,\s-]+)\}/', $info, $hm) ? preg_replace('/\s+/', '', $hm[1]) : null;
                $numbers = preg_match('/\b(?:showLineNumbers|lineNumbers|linenos)\b/', $info) ? true : (bool) ($fenceOptions['lineNumbers'] ?? false);

                return \Illuminate\Support\Facades\Blade::render(
                    '<x-nq::markdown-extras.code-block :code="$code" :language="$language" :filename="$title" :highlight-lines="$highlight" :line-numbers="$numbers" :download="$download" :labels="$labels" />',
                    $data + ['title' => $title ?: null, 'highlight' => $highlight, 'numbers' => $numbers, 'download' => $fenceOptions['download'] ?? true, 'labels' => (array) $labels],
                );
            })(),
            // Fenced code is consumed by `pre`; a `code` that reaches here is inline.
            'code' => '<code data-slot="inline-code" dir="ltr" class="rounded-[4px] border border-border bg-secondary px-1 py-0.5 font-mono text-[0.9em] text-foreground [unicode-bidi:isolate]">'.$inner.'</code>',
            'table' => (function () use ($n, $inner, $children, $tablesOn, $tableOptions, $labels) {
                $head = [];
                $rows = [];
                if ($tablesOn) {
                    foreach ($n->childNodes as $section) {
                        foreach ($section instanceof DOMElement ? $section->childNodes : [] as $tr) {
                            if (! $tr instanceof DOMElement || $tr->tagName !== 'tr') {
                                continue;
                            }
                            $cells = array_values(array_filter(iterator_to_array($tr->childNodes), fn ($c) => $c instanceof DOMElement));
                            if ($section->tagName === 'thead') {
                                foreach ($cells as $c) {
                                    $a = $c->getAttribute('align') ?: (preg_match('/text-align:\s*(left|right|center)/', $c->getAttribute('style'), $mm) ? $mm[1] : '');
                                    $head[] = ['header' => new \Illuminate\Support\HtmlString($children($c)), 'text' => trim($c->textContent), 'align' => ['left' => 'start', 'right' => 'end', 'center' => 'center'][$a] ?? 'start'];
                                }
                            } else {
                                $rows[] = ['cells' => array_map(fn ($c) => new \Illuminate\Support\HtmlString($children($c)), $cells), 'texts' => array_map(fn ($c) => $c->textContent, $cells)];
                            }
                        }
                    }
                }
                if (! $head) {
                    return '<div data-slot="table-container" role="region" tabindex="0" class="relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">'
                .'<table data-slot="table" data-density="default" dir="auto" class="w-full caption-bottom border-collapse text-body-sm">'.$inner.'</table></div>';
                }

                return \Illuminate\Support\Facades\Blade::render(
                    '<x-nq::markdown-extras.table :columns="$columns" :rows="$rows" :labels="$labels" :sortable="$sortable" :filterable="$filterable" :filter-min-rows="$min" :downloadable="$downloadable" />',
                    ['columns' => $head, 'rows' => $rows, 'labels' => (array) $labels, 'sortable' => $tableOptions['sortable'] ?? true, 'filterable' => $tableOptions['filterable'] ?? 'auto', 'min' => $tableOptions['filterMinRows'] ?? 6, 'downloadable' => $tableOptions['downloadable'] ?? false],
                );
            })(),
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
    $root = $doc->getElementsByTagName('body')->item(0);
    $content = $root ? $children($root) : '';
    $showFrontmatter = $frontmatter !== 'hide' && $fm;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'rich-markdown') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    @if ($showFrontmatter)
        <x-nq::markdown-extras.frontmatter :data="$fm" :labels="$labels" />
    @endif
    <div data-slot="markdown" class="flex min-w-0 flex-col gap-3 text-body text-nq-fg-body">{!! $content !!}</div>
</div>
