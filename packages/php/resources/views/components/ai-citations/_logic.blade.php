{{-- Internal: the words and pure helpers of the AI citation parts, ported from ai-citations.tsx and ai-citations-logic.ts (markers, coverage, highlight,
     latency). Included with @include('nasaq::components.ai-citations._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_aic_words')) {
        /** The words of the citation parts for the locale, with the host's overrides on top. Templates use {n}, {title}, {cited}, {total}. */
        function nq_aic_words(array $override = []): array
        {
            $en = [
                'citation' => 'Source {n}: {title}', 'sources' => 'Sources', 'sourcesLabel' => 'Sources cited', 'evidence' => 'Evidence', 'showEvidence' => 'Show evidence',
                'hideEvidence' => 'Hide evidence', 'excerpt' => 'Excerpt from the source', 'noExcerpt' => 'No excerpt for this source', 'relevance' => 'Relevance',
                'openSource' => 'Open source', 'notCited' => 'Not cited', 'provenance' => 'How this answer was made', 'grounded' => 'Grounded in sources',
                'groundedOne' => 'Grounded in 1 source', 'groundedMany' => 'Grounded in {n} sources', 'ungrounded' => 'Not grounded, from model knowledge', 'model' => 'Model',
                'latency' => 'Response time', 'tokens' => 'Tokens', 'tokensIn' => 'in', 'tokensOut' => 'out', 'generatedAt' => 'Generated', 'retrieved' => 'Passages retrieved',
                'coverage' => '{cited} of {total} paragraphs cite a source.', 'partlyCited' => 'Some statements have no source. Check them before you rely on them.',
                'unitMs' => 'ms', 'unitS' => 's',
            ];
            $ar = [
                'citation' => 'المصدر {n}: {title}', 'sources' => 'المصادر', 'sourcesLabel' => 'المصادر المذكورة', 'evidence' => 'الأدلة', 'showEvidence' => 'عرض الأدلة',
                'hideEvidence' => 'إخفاء الأدلة', 'excerpt' => 'مقتطف من المصدر', 'noExcerpt' => 'لا يوجد مقتطف لهذا المصدر', 'relevance' => 'الصلة', 'openSource' => 'فتح المصدر',
                'notCited' => 'غير مذكور', 'provenance' => 'كيف أُعدّت هذه الإجابة', 'grounded' => 'مبنية على مصادر', 'groundedOne' => 'مبنية على مصدر واحد',
                'groundedMany' => 'مبنية على {n} مصادر', 'ungrounded' => 'غير مبنية على مصادر، من معرفة النموذج', 'model' => 'النموذج', 'latency' => 'زمن الاستجابة', 'tokens' => 'الرموز',
                'tokensIn' => 'دخل', 'tokensOut' => 'خرج', 'generatedAt' => 'وقت التوليد', 'retrieved' => 'المقاطع المسترجعة', 'coverage' => '{cited} من {total} فقرات تذكر مصدرًا.',
                'partlyCited' => 'بعض العبارات بلا مصدر. تحقق منها قبل الاعتماد عليها.', 'unitMs' => 'مللي ث', 'unitS' => 'ث',
            ];

            return array_merge(\Nasaq\Nasaq::rtl() ? $ar : $en, $override);
        }

        /** Replaces {name}-style placeholders. */
        function nq_aic_fill(string $template, array $values): string
        {
            foreach ($values as $k => $v) {
                $template = str_replace('{'.$k.'}', (string) $v, $template);
            }

            return $template;
        }

        /** "Grounded in 2 sources" (Arabic has the dual: two sources). */
        function nq_aic_grounded_in(array $t, int $n): string
        {
            if ($n === 1) {
                return $t['groundedOne'];
            }
            if ($n === 2 && \Nasaq\Nasaq::rtl()) {
                return 'مبنية على مصدرين';
            }

            return nq_aic_fill($t['groundedMany'], ['n' => $n]);
        }

        /** Numbers inside one marker body: "1", "1, 3", "2-4" (a range is capped at 12). Out-of-range numbers are dropped. */
        function nq_aic_marker_numbers(string $body, int $max): array
        {
            $out = [];
            foreach (explode(',', $body) as $part) {
                $part = trim($part);
                if (preg_match('/^(\d{1,3})\s*[-–]\s*(\d{1,3})$/u', $part, $m)) {
                    $a = (int) $m[1];
                    $b = (int) $m[2];
                    for ($n = $a; $n <= $b && $n < $a + 12; $n++) {
                        if ($n >= 1 && $n <= $max) {
                            $out[] = $n;
                        }
                    }

                    continue;
                }
                if (ctype_digit($part) && (int) $part >= 1 && (int) $part <= $max) {
                    $out[] = (int) $part;
                }
            }

            return $out;
        }

        /** Runs that may contain markers and runs that must stay literal (fenced and inline code): [[code?, text], ...]. */
        function nq_aic_split_code(string $text): array
        {
            $out = [];
            $last = 0;
            preg_match_all('/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/', $text, $found, PREG_OFFSET_CAPTURE);
            foreach ($found[0] as [$chunk, $at]) {
                if ($at > $last) {
                    $out[] = [false, substr($text, $last, $at - $last)];
                }
                $out[] = [true, $chunk];
                $last = $at + strlen($chunk);
            }
            if ($last < strlen($text)) {
                $out[] = [false, substr($text, $last)];
            }

            return $out;
        }

        function nq_aic_marker_pattern(): string
        {
            return '/\[(\d{1,3}(?:\s*[,–-]\s*\d{1,3})*)\](?![(:\[])/u';
        }

        /** `[1]`, `[1, 2]` and `[2-4]` become Markdown links to #nq-cite-N. Code stays untouched; numbers past $max stay plain text. */
        function nq_aic_link_citations(string $text, int $max): string
        {
            if ($max <= 0) {
                return $text;
            }
            $out = '';
            foreach (nq_aic_split_code($text) as [$code, $run]) {
                $out .= $code ? $run : preg_replace_callback(nq_aic_marker_pattern(), function ($m) use ($max) {
                    $nums = nq_aic_marker_numbers($m[1], $max);

                    return $nums === [] ? $m[0] : implode('', array_map(fn ($n) => "[$n](#nq-cite-$n)", $nums));
                }, $run);
            }

            return $out;
        }

        /** Source numbers the text cites, each once, in order of first use. */
        function nq_aic_cited_numbers(string $text, int $max): array
        {
            $seen = [];
            foreach (nq_aic_split_code($text) as [$code, $run]) {
                if ($code) {
                    continue;
                }
                preg_match_all(nq_aic_marker_pattern(), $run, $all, PREG_SET_ORDER);
                foreach ($all as $m) {
                    foreach (nq_aic_marker_numbers($m[1], $max) as $n) {
                        $seen[$n] = true;
                    }
                }
            }

            return array_keys($seen);
        }

        /** Paragraphs of prose and how many carry a citation: ['cited' => n, 'total' => n]. */
        function nq_aic_coverage(string $text, int $max): array
        {
            $paragraphs = [];
            foreach (nq_aic_split_code($text) as [$code, $run]) {
                if ($code) {
                    continue;
                }
                foreach (preg_split('/\n{2,}/', $run) as $p) {
                    $p = trim($p);
                    if ($p !== '' && ! str_starts_with($p, '#')) {
                        $paragraphs[] = $p;
                    }
                }
            }
            $cited = count(array_filter($paragraphs, fn ($p) => nq_aic_cited_numbers($p, $max) !== []));

            return ['cited' => $cited, 'total' => count($paragraphs)];
        }

        /** Cuts $text into runs, marking the ones that match any of $terms (case-insensitive): [['text' => ..., 'hit' => bool], ...]. Plain data, never HTML. */
        function nq_aic_split_highlight(string $text, $terms): array
        {
            $list = array_values(array_filter(array_map('trim', is_string($terms) ? [$terms] : (array) $terms), fn ($t) => $t !== ''));
            if ($list === [] || $text === '') {
                return [['text' => $text, 'hit' => false]];
            }
            usort($list, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));
            $re = '/('.implode('|', array_map(fn ($t) => preg_quote($t, '/'), $list)).')/iu';
            $out = [];
            foreach (preg_split($re, $text, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY) as $p) {
                $out[] = ['text' => $p, 'hit' => (bool) array_filter($list, fn ($t) => mb_strtolower($t) === mb_strtolower($p))];
            }

            return $out;
        }

        /** Latency as a value and a unit: 480 ms stays milliseconds, 1240 ms becomes 1.2 s. */
        function nq_aic_latency($ms): array
        {
            if (! is_numeric($ms) || $ms < 0) {
                return ['value' => 0, 'unit' => 'ms'];
            }

            return $ms < 1000 ? ['value' => (int) round($ms), 'unit' => 'ms'] : ['value' => round($ms / 100) / 10, 'unit' => 's'];
        }
    }
@endphp
