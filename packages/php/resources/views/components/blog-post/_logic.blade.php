{{-- Internal: the words and pure helpers of the blog post, ported from blog-post.tsx and blog-index/blog-model.ts (table of contents,
     reading time, related and adjacent posts, callouts, anchored headings). Included with @include('nasaq::components.blog-post._logic');
     every function is defined once. --}}
@php
    if (! function_exists('nq_bp_words')) {
        /** The post's own words for a locale, with the host's overrides on top. */
        function nq_bp_words(?string $locale = null, array $override = []): array
        {
            $en = [
                'back' => 'All articles', 'onThisPage' => 'On this page', 'progress' => 'Reading progress', 'share' => 'Share', 'shareTitle' => 'Share this article',
                'tags' => 'Tags', 'aboutAuthor' => 'About the author', 'related' => 'Keep reading', 'relatedHint' => 'More on the same topics.',
                'previous' => 'Older article', 'next' => 'Newer article', 'comments' => 'Comments', 'permalink' => 'Link to this section', 'updated' => 'Updated',
                'minRead' => '{n} min read',
                'note' => 'Note', 'tip' => 'Tip', 'important' => 'Important', 'warning' => 'Warning', 'caution' => 'Caution',
            ];
            $ar = [
                'back' => 'كل المقالات', 'onThisPage' => 'في هذه الصفحة', 'progress' => 'تقدّم القراءة', 'share' => 'مشاركة', 'shareTitle' => 'شارك هذا المقال',
                'tags' => 'الوسوم', 'aboutAuthor' => 'عن الكاتب', 'related' => 'واصل القراءة', 'relatedHint' => 'المزيد في المواضيع نفسها.',
                'previous' => 'مقال أقدم', 'next' => 'مقال أحدث', 'comments' => 'التعليقات', 'permalink' => 'رابط هذا القسم', 'updated' => 'حُدّث',
                'minRead' => '{n} د للقراءة',
                'note' => 'ملاحظة', 'tip' => 'نصيحة', 'important' => 'مهم', 'warning' => 'تنبيه', 'caution' => 'تحذير',
            ];

            return array_merge(\Nasaq\Nasaq::rtl($locale) ? $ar : $en, $override);
        }

        /** URL-safe id for a heading. Keeps letters and digits of any script (Arabic included), turns spaces into "-". */
        function nq_bp_slug(string $text): string
        {
            if (class_exists(\Normalizer::class)) {
                $text = \Normalizer::normalize($text, \Normalizer::FORM_KD) ?: $text;
            }
            $text = preg_replace('/[\x{0300}-\x{036F}\x{064B}-\x{065F}\x{0670}\x{0640}]/u', '', $text);
            $text = mb_strtolower($text);
            $text = preg_replace('/[^\p{L}\p{N}\s-]+/u', '', $text);
            $text = trim($text);
            $text = trim(preg_replace('/[\s_-]+/u', '-', $text), '-');

            return $text !== '' ? $text : 'section';
        }

        /** Text of a Markdown line without its inline syntax: links, images, emphasis, code ticks, HTML. */
        function nq_bp_strip(string $text): string
        {
            $text = preg_replace('/!\[([^\]]*)\]\([^)]*\)/', '$1', $text);
            $text = preg_replace('/\[([^\]]+)\]\([^)]*\)/', '$1', $text);
            $text = preg_replace('/<[^>]+>/', '', $text);
            $text = preg_replace('/[`*_~]+/', '', $text);
            $text = preg_replace('/\s+#+\s*$/', '', $text);

            return trim($text);
        }

        /** Headings of a Markdown body: ATX only, fenced code skipped, unique ids ("setup", "setup-2"). Items: id, text, level, line. */
        function nq_bp_toc(string $markdown, int $min = 2, int $max = 3): array
        {
            $items = [];
            $seen = [];
            $fence = null;
            foreach (preg_split('/\r?\n/', $markdown) as $i => $line) {
                $f = preg_match('/^\s{0,3}(`{3,}|~{3,})/', $line, $fm) ? $fm[1] : null;
                if ($fence) {
                    if ($f && $f[0] === $fence[0] && strlen($f) >= strlen($fence)) {
                        $fence = null;
                    }

                    continue;
                }
                if ($f) {
                    $fence = $f;

                    continue;
                }
                if (! preg_match('/^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*$/', $line, $m)) {
                    continue;
                }
                $level = strlen($m[1]);
                if ($level < $min || $level > $max) {
                    continue;
                }
                $text = nq_bp_strip($m[2]);
                if ($text === '') {
                    continue;
                }
                $base = nq_bp_slug($text);
                $seen[$base] = ($seen[$base] ?? 0) + 1;
                $items[] = ['id' => $seen[$base] === 1 ? $base : $base.'-'.$seen[$base], 'text' => $text, 'level' => $level, 'line' => $i + 1];
            }

            return $items;
        }

        /** Whole minutes to read a Markdown body: prose in full, fenced code at half, 12 seconds an image, 220 words a minute, at least 1. */
        function nq_bp_minutes(string $markdown, int $wpm = 220): int
        {
            $prose = [];
            $code = [];
            $fence = null;
            foreach (preg_split('/\r?\n/', $markdown) as $line) {
                $f = preg_match('/^\s{0,3}(`{3,}|~{3,})/', $line, $fm) ? $fm[1] : null;
                if ($fence) {
                    if ($f && $f[0] === $fence[0] && strlen($f) >= strlen($fence)) {
                        $fence = null;
                    } else {
                        $code[] = $line;
                    }

                    continue;
                }
                if ($f) {
                    $fence = $f;

                    continue;
                }
                $prose[] = $line;
            }
            $text = implode("\n", $prose);
            $images = preg_match_all('/!\[[^\]]*\]\([^)]*\)/', $text);
            $words = fn (string $s) => preg_match_all('/[\p{L}\p{N}]+/u', $s);
            $minutes = ($words(nq_bp_strip($text)) + $words(implode("\n", $code)) / 2) / $wpm + ($images * 12) / 60;

            return max(1, (int) ceil($minutes));
        }

        /** A post's date as a timestamp. */
        function nq_bp_time(array $post): int
        {
            $d = $post['date'] ?? 0;

            return (int) (is_numeric($d) ? $d : ($d instanceof \DateTimeInterface ? $d->getTimestamp() : strtotime((string) $d)));
        }

        /** Related posts: same category counts 3, each shared tag 2. Highest score first, newer wins ties. Posts scoring 0 are left out. */
        function nq_bp_related(array $post, array $all, int $limit = 3): array
        {
            $scored = [];
            foreach ($all as $p) {
                $p = (array) $p;
                if (($p['slug'] ?? null) === $post['slug']) {
                    continue;
                }
                $score = (($p['category'] ?? null) === ($post['category'] ?? null) ? 3 : 0) + count(array_intersect($p['tags'] ?? [], $post['tags'] ?? [])) * 2;
                if ($score > 0) {
                    $scored[] = [$score, nq_bp_time($p), $p];
                }
            }
            usort($scored, fn ($a, $b) => $b[0] <=> $a[0] ?: $b[1] <=> $a[1]);

            return array_map(fn ($x) => $x[2], array_slice($scored, 0, $limit));
        }

        /** The next older and next newer post by date: [older, newer], either may be null. */
        function nq_bp_adjacent(array $post, array $all): array
        {
            $sorted = array_values(array_map(fn ($p) => (array) $p, $all));
            usort($sorted, fn ($a, $b) => nq_bp_time($b) <=> nq_bp_time($a));
            foreach ($sorted as $i => $p) {
                if ($p['slug'] === $post['slug']) {
                    return [$sorted[$i + 1] ?? null, $sorted[$i - 1] ?? null];
                }
            }

            return [null, null];
        }

        /** Index of the `</blockquote>` that closes the one opened just before $from, or false. */
        function nq_bp_close_quote(string $html, int $from): int|false
        {
            $depth = 1;
            $pos = $from;
            while (preg_match('#<(/?)blockquote\b#', $html, $m, PREG_OFFSET_CAPTURE, $pos)) {
                $depth += $m[1][0] === '/' ? -1 : 1;
                if ($depth === 0) {
                    return $m[0][1];
                }
                $pos = $m[0][1] + 1;
            }

            return false;
        }
    }
@endphp
