{{-- Internal: the words of the ask-ai parts (ported from ask-ai.tsx STRINGS). Included with @include('nasaq::components.ask-ai._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_askai_words')) {
        /** The words of the ask-ai parts for the locale, with the host's overrides on top. */
        function nq_askai_words(array $override = []): array
        {
            $en = [
                'ask' => 'Ask AI', 'title' => 'Ask AI about this text', 'close' => 'Close', 'selected' => 'Selected text', 'truncated' => 'Only the first part of a long selection is sent.',
                'quick' => 'Quick actions', 'inputLabel' => 'Your question', 'placeholder' => 'Ask anything about the selection', 'send' => 'Ask', 'thinking' => 'Reading the selection',
                'failed' => 'The AI could not answer. Try again.', 'retry' => 'Try again', 'copy' => 'Copy answer', 'replace' => 'Replace selection', 'another' => 'Ask something else',
                'explain' => 'Explain', 'summarize' => 'Summarize', 'translate' => 'Translate', 'improve' => 'Improve writing', 'define' => 'Define terms',
                'insight' => 'AI insight', 'dismiss' => 'Dismiss insight', 'askMore' => 'Ask AI about this', 'sources' => 'Based on', 'loading' => 'Analyzing',
                'tone' => ['info' => 'Insight', 'success' => 'Good news', 'warning' => 'Worth a look', 'danger' => 'Needs attention', 'neutral' => 'Insight'],
                'good' => 'Helpful insight', 'bad' => 'Not helpful',
            ];
            $ar = [
                'ask' => 'اسأل الذكاء الاصطناعي', 'title' => 'اسأل الذكاء الاصطناعي عن هذا النص', 'close' => 'إغلاق', 'selected' => 'النص المحدد', 'truncated' => 'يُرسل الجزء الأول فقط من التحديد الطويل.',
                'quick' => 'إجراءات سريعة', 'inputLabel' => 'سؤالك', 'placeholder' => 'اسأل أي شيء عن النص المحدد', 'send' => 'اسأل', 'thinking' => 'جارٍ قراءة النص المحدد',
                'failed' => 'تعذّر على الذكاء الاصطناعي الإجابة. حاول مرة أخرى.', 'retry' => 'حاول مرة أخرى', 'copy' => 'نسخ الإجابة', 'replace' => 'استبدال النص المحدد', 'another' => 'اسأل شيئًا آخر',
                'explain' => 'اشرح', 'summarize' => 'لخّص', 'translate' => 'ترجم', 'improve' => 'حسّن الصياغة', 'define' => 'عرّف المصطلحات',
                'insight' => 'رؤية من الذكاء الاصطناعي', 'dismiss' => 'تجاهل الرؤية', 'askMore' => 'اسأل الذكاء الاصطناعي عن هذا', 'sources' => 'مبنية على', 'loading' => 'جارٍ التحليل',
                'tone' => ['info' => 'رؤية', 'success' => 'خبر جيد', 'warning' => 'تستحق النظر', 'danger' => 'تحتاج انتباهًا', 'neutral' => 'رؤية'],
                'good' => 'رؤية مفيدة', 'bad' => 'غير مفيدة',
            ];
            $words = \Nasaq\Nasaq::rtl() ? $ar : $en;
            $tone = array_merge($words['tone'], (array) ($override['tone'] ?? []));
            unset($override['tone']);

            return array_merge($words, $override, ['tone' => $tone]);
        }
    }
@endphp
