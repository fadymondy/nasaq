{{-- <x-nq::blog-post.post-body :markdown="$post['body']" />
     The article text: Markdown in Nasaq typography (the same as <x-nq::markdown>) with anchored h2 to h4 headings (ids match nq_bp_toc), code blocks,
     tables and `> [!NOTE]` callouts. Raw HTML in the source is dropped. scroll-offset: px headings keep from the top when scrolled to (96). --}}
@props(['markdown' => '', 'scrollOffset' => 96])
@include('nasaq::components.blog-post._logic')
@php
    $words = nq_bp_words();
    $html = \Illuminate\Support\Facades\Blade::render('<x-nq::markdown :source="$source" data-slot="post-body" class="gap-5 text-[1.0625rem] leading-relaxed" />', ['source' => (string) $markdown]);

    // Headings: ids from the table of contents, in source order, and a permalink that shows on hover.
    $toc = nq_bp_toc((string) $markdown, 1, 6);
    $at = 0;
    $link = \Illuminate\Support\Facades\Blade::render('<x-lucide-link-2 class="size-4" aria-hidden="true" />');
    $norm = fn (string $s) => trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($s), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
    $html = preg_replace_callback('#<(h[2-4]) data-slot="text" dir="auto" class="([^"]*)">(.*?)</\1>#su', function ($m) use (&$at, $toc, $norm, $words, $link, $scrollOffset) {
        $text = $norm($m[3]);
        for ($i = $at; $i < count($toc); $i++) {
            if ($toc[$i]['text'] === $text) {
                $at = $i + 1;
                $id = e($toc[$i]['id']);

                return '<'.$m[1].' id="'.$id.'" data-slot="text" dir="auto" style="scroll-margin-top: '.(int) $scrollOffset.'px" class="'.e(\Nasaq\Cn::merge(html_entity_decode($m[2]), 'group/heading mt-4 text-start first:mt-0')).'">'.$m[3]
                    .'<a href="#'.$id.'" aria-label="'.e($words['permalink']).'" class="ms-2 inline-flex align-middle text-muted-foreground opacity-0 outline-none transition-opacity duration-150 group-hover/heading:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-nq-focus">'.$link.'</a></'.$m[1].'>';
            }
        }

        return $m[0];
    }, $html);

    // Callouts: a blockquote whose first line is [!KIND] becomes <x-nq::blog-post.callout>.
    $pos = 0;
    while (preg_match('#(<blockquote dir="auto" class="[^"]*">)\s*(<p data-slot="text"[^>]*>)\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:[ \t]*(?:<br>|\r?\n))?\s*#i', $html, $m, PREG_OFFSET_CAPTURE, $pos)) {
        $start = $m[0][1];
        $afterMarker = $start + strlen($m[0][0]);
        $close = nq_bp_close_quote($html, $start + strlen($m[1][0]));
        if ($close === false) {
            break;
        }
        $rest = substr($html, $afterMarker, $close - $afterMarker);
        $inner = str_starts_with($rest, '</p>') ? ltrim(substr($rest, 4)) : $m[2][0].$rest;
        $callout = \Illuminate\Support\Facades\Blade::render('<x-nq::blog-post.callout :kind="$kind">{!! $inner !!}</x-nq::blog-post.callout>', ['kind' => strtolower($m[3][0]), 'inner' => $inner]);
        $html = substr($html, 0, $start).$callout.substr($html, $close + strlen('</blockquote>'));
        $pos = $start + strlen($callout);
    }
@endphp
{!! $html !!}
