{{-- Internal: the words and pure helpers of the copilot chat, ported from copilot-chat.tsx and copilot-chat-format.ts (Markdown fences, safe links, sizes,
     step counts, the copied conversation). Included with @include('nasaq::components.copilot-chat._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_cc_words')) {
        /** The chat's own words for a locale, with the host's overrides on top. Templates use {name}; usedSteps uses {n}. */
        function nq_cc_words(array $override = []): array
        {
            $en = [
                'title' => 'Copilot', 'assistant' => 'Copilot', 'you' => 'You', 'conversation' => 'Copilot conversation', 'placeholder' => 'Ask anything. Type @ to mention.',
                'send' => 'Send', 'stop' => 'Stop', 'close' => 'Close', 'newChat' => 'New chat', 'copyChat' => 'Copy conversation', 'copied' => 'Copied', 'copy' => 'Copy answer',
                'regenerate' => 'Try again', 'good' => 'Good answer', 'bad' => 'Not helpful', 'sources' => 'Sources', 'usedOne' => 'Used 1 tool', 'usedMany' => 'Used {n} tools',
                'working' => 'Working', 'stepFailed' => 'A step failed', 'context' => 'Context', 'addContext' => 'Add context', 'removeContext' => 'Remove {name}', 'model' => 'Model',
                'emptyTitle' => 'How can I help?', 'emptyBody' => 'Ask about your data, or start from one of these.', 'followUps' => 'Suggested follow-ups', 'starters' => 'Suggestions',
                'message' => 'Message', 'mentions' => 'Mentions', 'attach' => 'Attach files', 'dropFiles' => 'Drop files to attach', 'removeAttachment' => 'Remove {name}',
                'attachments' => 'Attachments', 'commands' => 'Tools and skills', 'commandHint' => 'Type / for tools and skills', 'noCommands' => 'No matching tools',
                'removeCommand' => 'Stop using {name}', 'options' => 'Options', 'history' => 'History', 'noHistory' => 'No saved conversations yet.', 'deleteSession' => 'Delete {name}',
                'share' => 'Share answer', 'streamError' => 'The answer stopped before it finished.', 'retry' => 'Retry', 'sendFailed' => 'Could not send. Try again.',
            ];
            $ar = [
                'title' => 'المساعد', 'assistant' => 'المساعد', 'you' => 'أنت', 'conversation' => 'محادثة المساعد', 'placeholder' => 'اسأل أي شيء. اكتب @ للإشارة.',
                'send' => 'إرسال', 'stop' => 'إيقاف', 'close' => 'إغلاق', 'newChat' => 'محادثة جديدة', 'copyChat' => 'نسخ المحادثة', 'copied' => 'تم النسخ', 'copy' => 'نسخ الإجابة',
                'regenerate' => 'حاول مرة أخرى', 'good' => 'إجابة جيدة', 'bad' => 'غير مفيدة', 'sources' => 'المصادر', 'usedOne' => 'استخدم أداة واحدة', 'usedMany' => 'استخدم {n} أدوات',
                'working' => 'جارٍ العمل', 'stepFailed' => 'فشلت إحدى الخطوات', 'context' => 'السياق', 'addContext' => 'إضافة سياق', 'removeContext' => 'إزالة {name}', 'model' => 'النموذج',
                'emptyTitle' => 'كيف أساعدك؟', 'emptyBody' => 'اسأل عن بياناتك، أو ابدأ من أحد هذه الاقتراحات.', 'followUps' => 'أسئلة مقترحة للمتابعة', 'starters' => 'اقتراحات',
                'message' => 'الرسالة', 'mentions' => 'الإشارات', 'attach' => 'إرفاق ملفات', 'dropFiles' => 'أفلت الملفات لإرفاقها', 'removeAttachment' => 'إزالة {name}',
                'attachments' => 'المرفقات', 'commands' => 'الأدوات والمهارات', 'commandHint' => 'اكتب / للأدوات والمهارات', 'noCommands' => 'لا توجد أدوات مطابقة',
                'removeCommand' => 'إيقاف استخدام {name}', 'options' => 'الخيارات', 'history' => 'السجل', 'noHistory' => 'لا توجد محادثات محفوظة بعد.', 'deleteSession' => 'حذف {name}',
                'share' => 'مشاركة الإجابة', 'streamError' => 'توقفت الإجابة قبل أن تكتمل.', 'retry' => 'إعادة المحاولة', 'sendFailed' => 'تعذر الإرسال. حاول مرة أخرى.',
            ];

            return array_merge(\Nasaq\Nasaq::rtl() ? $ar : $en, $override);
        }

        /** Replaces {name}-style placeholders. */
        function nq_cc_fill(string $template, array $values): string
        {
            foreach ($values as $k => $v) {
                $template = str_replace('{'.$k.'}', (string) $v, $template);
            }

            return $template;
        }

        /** The summary line of the steps: "Used 3 tools" (Arabic dual for two). */
        function nq_cc_used(array $t, int $n): string
        {
            if (\Nasaq\Nasaq::rtl() && $n === 2 && ! isset($t['usedMany_override'])) {
                return 'استخدم أداتين';
            }

            return $n === 1 ? $t['usedOne'] : nq_cc_fill($t['usedMany'], ['n' => $n]);
        }

        /** Whether a link is safe to render as an anchor (http or https). */
        function nq_cc_safe_url($url): bool
        {
            return is_string($url) && $url !== '' && (bool) preg_match('#^https?://[^\s/]+#i', $url);
        }

        /** Host of a url without www., or an empty string. */
        function nq_cc_host($url): string
        {
            return nq_cc_safe_url($url) ? preg_replace('/^www\./', '', (string) parse_url($url, PHP_URL_HOST)) : '';
        }

        /** Whether an attachment url may be put in an img src. */
        function nq_cc_preview_url($url): bool
        {
            return is_string($url) && ($url !== '') && (str_starts_with($url, 'blob:') || preg_match('#^data:image/(png|jpe?g|gif|webp|avif);#i', $url) || nq_cc_safe_url($url));
        }

        /** 1.2 MB style sizes. */
        function nq_cc_bytes($bytes): string
        {
            if (! is_numeric($bytes) || $bytes < 0) {
                return '';
            }
            $units = ['B', 'KB', 'MB', 'GB'];
            $v = (float) $bytes;
            $u = 0;
            while ($v >= 1024 && $u < 3) {
                $v /= 1024;
                $u++;
            }

            return rtrim(rtrim(number_format($v, $u === 0 ? 0 : 1, '.', ''), '0'), '.').' '.$units[$u];
        }

        /** Counts of done, running and failed steps. */
        function nq_cc_step_counts(array $steps): array
        {
            $by = fn (string $s) => count(array_filter($steps, fn ($x) => ($x['status'] ?? 'done') === $s));

            return ['total' => count($steps), 'running' => $by('running'), 'error' => $by('error'), 'done' => $by('done')];
        }

        /** Splits Markdown into prose and fenced code; a fence still open at the end runs to the end of the text. */
        function nq_cc_segments(string $text): array
        {
            $out = [];
            $lines = explode(chr(10), $text);
            $prose = [];
            $i = 0;
            $n = count($lines);
            $flush = function () use (&$out, &$prose) {
                $joined = implode(chr(10), $prose);
                if (trim($joined) !== '') {
                    $out[] = ['kind' => 'markdown', 'text' => $joined];
                }
                $prose = [];
            };
            while ($i < $n) {
                $line = $lines[$i];
                if (! preg_match('/^ {0,3}(`{3,}|~{3,})\s*([\w+-]*)/', $line, $open)) {
                    $prose[] = $line;
                    $i++;

                    continue;
                }
                $flush();
                $fence = $open[1];
                $body = [];
                $i++;
                while ($i < $n) {
                    $l = $lines[$i];
                    if (preg_match('/^ {0,3}'.preg_quote($fence[0], '/').'{'.strlen($fence).',}\s*$/', $l)) {
                        $i++;
                        break;
                    }
                    $body[] = $l;
                    $i++;
                }
                $out[] = ['kind' => 'code', 'language' => ($open[2] ?? '') !== '' ? $open[2] : 'text', 'code' => implode(chr(10), $body)];
            }
            $flush();

            return $out;
        }

        /** The whole conversation as Markdown, for the copy button. */
        function nq_cc_transcript(array $messages, array $names): string
        {
            $parts = [];
            foreach ($messages as $m) {
                if (trim((string) ($m['text'] ?? '')) === '') {
                    continue;
                }
                $head = '**'.(($m['role'] ?? 'user') === 'user' ? $names['user'] : $names['assistant']).'**';
                $sources = '';
                if (! empty($m['sources'])) {
                    $rows = [];
                    foreach (array_values($m['sources']) as $i => $s) {
                        $rows[] = ($i + 1).'. '.(nq_cc_safe_url($s['url'] ?? null) ? '['.$s['title'].']('.$s['url'].')' : $s['title']);
                    }
                    $sources = chr(10).chr(10).implode(chr(10), $rows);
                }
                $parts[] = $head.chr(10).chr(10).trim($m['text']).$sources;
            }

            return implode(chr(10).chr(10).'---'.chr(10).chr(10), $parts);
        }
    }
@endphp
