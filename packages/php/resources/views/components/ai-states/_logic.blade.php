{{-- Internal: the words and pure helpers of the AI state parts, ported from ai-states.tsx and ai-states-logic.ts (levels, step states, half-written Markdown,
     shortcut keys, the copied summary). Included with @include('nasaq::components.ai-states._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_ai_words')) {
        /** The words of the AI parts for the locale, with the host's overrides on top. Templates use {label}. */
        function nq_ai_words(array $override = []): array
        {
            $en = [
                'ask' => 'Ask AI', 'generating' => 'Generating', 'moreActions' => 'More AI actions', 'actionsTitle' => 'AI actions', 'actionsPlaceholder' => 'What should AI do?',
                'recommended' => 'Recommended', 'allActions' => 'All actions', 'noActions' => 'No matching actions', 'navigate' => 'Navigate', 'run' => 'Run', 'close' => 'Close',
                'suggestions' => 'AI suggestions', 'dismiss' => 'Dismiss {label}', 'thinking' => 'Thinking', 'stepDone' => 'Done', 'stepActive' => 'In progress', 'stepPending' => 'Waiting',
                'ready' => 'Response ready', 'stop' => 'Stop', 'stopped' => 'Stopped', 'regenerate' => 'Regenerate', 'streaming' => 'Writing', 'failed' => 'Something went wrong',
                'aiGenerated' => 'AI generated', 'summary' => 'Summary', 'tldr' => 'TL;DR', 'keyPoints' => 'Key points', 'sources' => 'Sources', 'confidence' => 'Confidence',
                'high' => 'High', 'medium' => 'Medium', 'low' => 'Low', 'showFull' => 'Show full summary', 'hideFull' => 'Hide full summary', 'copy' => 'Copy summary',
                'good' => 'Good summary', 'bad' => 'Not helpful', 'thanks' => 'Thanks for the feedback', 'disclaimer' => 'AI can make mistakes. Check important details.', 'loading' => 'Summarizing',
            ];
            $ar = [
                'ask' => 'اسأل الذكاء الاصطناعي', 'generating' => 'جارٍ التوليد', 'moreActions' => 'المزيد من إجراءات الذكاء الاصطناعي', 'actionsTitle' => 'إجراءات الذكاء الاصطناعي',
                'actionsPlaceholder' => 'ماذا تريد أن ينفّذ الذكاء الاصطناعي؟', 'recommended' => 'موصى بها', 'allActions' => 'كل الإجراءات', 'noActions' => 'لا توجد إجراءات مطابقة',
                'navigate' => 'تنقّل', 'run' => 'تنفيذ', 'close' => 'إغلاق', 'suggestions' => 'اقتراحات الذكاء الاصطناعي', 'dismiss' => 'تجاهل {label}', 'thinking' => 'جارٍ التفكير',
                'stepDone' => 'تمّت', 'stepActive' => 'قيد التنفيذ', 'stepPending' => 'بالانتظار', 'ready' => 'الرد جاهز', 'stop' => 'إيقاف', 'stopped' => 'تم الإيقاف',
                'regenerate' => 'إعادة التوليد', 'streaming' => 'جارٍ الكتابة', 'failed' => 'حدث خطأ ما', 'aiGenerated' => 'مُولَّد بالذكاء الاصطناعي', 'summary' => 'الملخص',
                'tldr' => 'باختصار', 'keyPoints' => 'النقاط الرئيسية', 'sources' => 'المصادر', 'confidence' => 'درجة الثقة', 'high' => 'عالية', 'medium' => 'متوسطة', 'low' => 'منخفضة',
                'showFull' => 'عرض الملخص الكامل', 'hideFull' => 'إخفاء الملخص الكامل', 'copy' => 'نسخ الملخص', 'good' => 'ملخص جيد', 'bad' => 'غير مفيد', 'thanks' => 'شكرًا على ملاحظتك',
                'disclaimer' => 'قد يخطئ الذكاء الاصطناعي. تحقق من التفاصيل المهمة.', 'loading' => 'جارٍ التلخيص',
            ];

            return array_merge(\Nasaq\Nasaq::rtl() ? $ar : $en, $override);
        }

        /** Replaces {name}-style placeholders. */
        function nq_ai_fill(string $template, array $values): string
        {
            foreach ($values as $k => $v) {
                $template = str_replace('{'.$k.'}', (string) $v, $template);
            }

            return $template;
        }

        /** "high" | "medium" | "low" for a 0..1 score (NaN and out of range clamp). */
        function nq_ai_level($value): string
        {
            if (! is_numeric($value) || is_nan((float) $value)) {
                return 'low';
            }
            $v = min(1, max(0, (float) $value));

            return $v >= 0.8 ? 'high' : ($v >= 0.5 ? 'medium' : 'low');
        }

        /** A 0..1 score as a whole percentage. */
        function nq_ai_percent($value): int
        {
            return is_numeric($value) && ! is_nan((float) $value) ? (int) round(min(1, max(0, (float) $value)) * 100) : 0;
        }

        /** "done" | "active" | "pending" for step $index when step $current is running. */
        function nq_ai_step_state(int $index, int $current): string
        {
            return $index < $current ? 'done' : ($index === $current ? 'active' : 'pending');
        }

        /** A shortcut ("Mod Shift P") as the keys to draw, for a non-Apple platform: [['text' => 'Ctrl', 'key' => 'mod'], ['text' => 'Shift', 'key' => 'shift'], ['text' => 'P', 'key' => null]]. The Alpine nqAiKeys swaps the glyphs on Apple. */
        function nq_ai_keys(?string $shortcut): array
        {
            if (! $shortcut) {
                return [];
            }
            $names = ['mod' => ['Ctrl', 'mod'], 'cmd' => ['Ctrl', 'mod'], 'meta' => ['Ctrl', 'mod'], '⌘' => ['Ctrl', 'mod'], 'ctrl' => ['Ctrl', 'ctrl'], 'control' => ['Ctrl', 'ctrl'],
                'alt' => ['Alt', 'alt'], 'option' => ['Alt', 'alt'], 'shift' => ['Shift', 'shift']];
            $out = [];
            foreach (preg_split('/\s+/', trim($shortcut)) as $k) {
                $hit = $names[mb_strtolower($k)] ?? null;
                $out[] = $hit ? ['text' => $hit[0], 'key' => $hit[1]] : ['text' => mb_strlen($k) === 1 ? mb_strtoupper($k) : $k, 'key' => null];
            }

            return $out;
        }

        /** Makes a half-streamed Markdown string safe to render: closes an open code fence, repairs the last line (dangling bold, backtick, link, table row). */
        function nq_ai_partial_markdown(string $source): string
        {
            $lines = explode("\n", $source);
            $fence = null;
            foreach ($lines as $line) {
                if (! preg_match('/^ {0,3}(`{3,}|~{3,})/', $line, $m)) {
                    continue;
                }
                $marker = $m[1];
                if ($fence === null) {
                    $fence = $marker;
                } elseif ($marker[0] === $fence[0] && strlen($marker) >= strlen($fence) && trim($line) === $marker) {
                    $fence = null;
                }
            }
            if ($fence !== null) {
                return $source.(str_ends_with($source, "\n") ? '' : "\n").$fence;
            }
            $last = count($lines) - 1;
            $tail = $lines[$last];
            if (preg_match('/^\s*\|/', $tail) && ! preg_match('/\|\s*$/', $tail)) {
                array_pop($lines);

                return implode("\n", $lines);
            }
            $tail = preg_replace('/!?\[([^\]]*)\]\([^)]*$/', '$1', $tail);
            $tail = preg_replace('/!?\[([^\]]*)$/', '$1', $tail);
            $tail = preg_replace('/(^|\s)(\*\*|__|~~|\*|`)$/', '$1', $tail);
            $ticks = substr_count($tail, '`');
            if ($ticks % 2 === 1) {
                $tail .= '`';
            } elseif ($ticks === 0) {
                if (substr_count($tail, '**') % 2 === 1) {
                    $tail .= '**';
                }
                if (substr_count($tail, '~~') % 2 === 1) {
                    $tail .= '~~';
                }
                $single = substr_count(str_replace('**', '', $tail), '*');
                if ($single % 2 === 1 && ! preg_match('/^\s*\*\s/', $tail)) {
                    $tail .= '*';
                }
            }
            $lines[$last] = $tail;

            return implode("\n", $lines);
        }

        /** Plain text of a summary for the clipboard: TL;DR, then the key points as a list. */
        function nq_ai_summary_text(string $tldr, array $points = [], string $full = '', bool $includeFull = false): string
        {
            $parts = [trim($tldr)];
            if ($points) {
                $parts[] = implode("\n", array_map(fn ($p) => '- '.trim((string) $p), $points));
            }
            if ($includeFull && trim($full) !== '') {
                $parts[] = trim($full);
            }

            return implode("\n\n", array_filter($parts, fn ($p) => $p !== ''));
        }

        /** The caret on the last block of rendered Markdown, and on a plain paragraph (Tailwind needs the classes written out). */
        function nq_ai_caret(bool $markdown): string
        {
            $c = "after:ms-0.5 after:inline-block after:h-[1.05em] after:w-[2px] after:translate-y-[0.2em] after:rounded-[1px] after:bg-nq-accent after:content-[''] motion-safe:after:animate-pulse";
            if (! $markdown) {
                return $c;
            }

            return "[&_[data-slot=markdown]>:last-child]:after:ms-0.5 [&_[data-slot=markdown]>:last-child]:after:inline-block [&_[data-slot=markdown]>:last-child]:after:h-[1.05em] [&_[data-slot=markdown]>:last-child]:after:w-[2px] [&_[data-slot=markdown]>:last-child]:after:translate-y-[0.2em] [&_[data-slot=markdown]>:last-child]:after:rounded-[1px] [&_[data-slot=markdown]>:last-child]:after:bg-nq-accent [&_[data-slot=markdown]>:last-child]:after:content-[''] motion-safe:[&_[data-slot=markdown]>:last-child]:after:animate-pulse";
        }
    }
@endphp
