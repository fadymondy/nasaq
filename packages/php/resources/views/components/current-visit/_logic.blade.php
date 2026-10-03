{{-- Internal: helpers of x-nq::current-visit, ported from current-visit.tsx. Included with
     @include('nasaq::components.current-visit._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_cv_words')) {
        /** The built-in words by locale (English or Arabic), with the host's overrides on top. A string with :n is a sentence. */
        function nq_cv_words(string $locale, array $override = []): array
        {
            $en = [
                'allergies' => 'Allergies', 'conditions' => 'Conditions', 'none' => 'None recorded', 'history' => 'Earlier visits',
                'noHistory' => 'No earlier visits.', 'visit' => 'This visit', 'timer' => 'Time in visit', 'notes' => 'Visit notes',
                'notesHint' => 'Findings, diagnosis and advice.', 'prescriptions' => 'Prescriptions', 'addRx' => 'Add medicine',
                'removeRx' => 'Remove medicine :n', 'drug' => 'Medicine', 'dose' => 'Dose', 'frequency' => 'How often', 'days' => 'Days',
                'frequencyHint' => 'Twice daily', 'required' => 'Required', 'invalid' => '1 to 365', 'followUp' => 'Follow-up',
                'noFollowUp' => 'None', 'orPick' => 'Or pick a date', 'followUpOn' => 'Follow-up on :n', 'finish' => 'Finish visit',
                'needSomething' => 'Add a note or a prescription to finish.', 'fixRx' => 'Fix the highlighted medicines to finish.',
                'failed' => 'The visit could not be saved. Try again.', 'saved' => 'Visit saved.', 'room' => 'Room :n',
            ];
            $ar = [
                'allergies' => 'الحساسية', 'conditions' => 'الحالات', 'none' => 'لا شيء مسجل', 'history' => 'الزيارات السابقة',
                'noHistory' => 'لا زيارات سابقة.', 'visit' => 'هذه الزيارة', 'timer' => 'مدة الزيارة', 'notes' => 'ملاحظات الزيارة',
                'notesHint' => 'الفحص والتشخيص والنصائح.', 'prescriptions' => 'الوصفة الطبية', 'addRx' => 'إضافة دواء',
                'removeRx' => 'حذف الدواء :n', 'drug' => 'الدواء', 'dose' => 'الجرعة', 'frequency' => 'التكرار', 'days' => 'الأيام',
                'frequencyHint' => 'مرتين يوميًا', 'required' => 'مطلوب', 'invalid' => 'من 1 إلى 365', 'followUp' => 'المتابعة',
                'noFollowUp' => 'بدون', 'orPick' => 'أو اختر تاريخًا', 'followUpOn' => 'المتابعة في :n', 'finish' => 'إنهاء الزيارة',
                'needSomething' => 'أضف ملاحظة أو دواءً لإنهاء الزيارة.', 'fixRx' => 'صحّح الأدوية المظللة لإنهاء الزيارة.',
                'failed' => 'تعذّر حفظ الزيارة. حاول مجددًا.', 'saved' => 'تم حفظ الزيارة.', 'room' => 'الغرفة :n',
            ];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        function nq_cv_fill(string $sentence, string|int $n = ''): string
        {
            return str_replace(':n', (string) $n, $sentence);
        }

        /** "34 years" / "34 سنة" (with the Arabic dual and plural forms). */
        function nq_cv_years(int $n, string $locale): string
        {
            if (str_starts_with($locale, 'ar')) {
                return $n === 1 ? 'سنة' : ($n === 2 ? 'سنتان' : ($n <= 10 ? $n.' سنوات' : $n.' سنة'));
            }

            return $n.' years';
        }

        /** The quick follow-up label: "In 1 week", "In 2 months", "In 10 days". */
        function nq_cv_in_days(int $n, string $locale): string
        {
            if (str_starts_with($locale, 'ar')) {
                return $n % 30 === 0 ? ($n === 30 ? 'بعد شهر' : 'بعد شهرين') : ($n % 7 === 0 ? ($n === 7 ? 'بعد أسبوع' : 'بعد أسبوعين') : 'بعد '.$n.' أيام');
            }

            return $n % 30 === 0 ? 'In '.($n / 30).' '.($n === 30 ? 'month' : 'months') : ($n % 7 === 0 ? 'In '.($n / 7).' '.($n === 7 ? 'week' : 'weeks') : 'In '.$n.' days');
        }

        /** 754 to "12:34", 3725 to "1:02:05". */
        function nq_cv_elapsed(int $seconds): string
        {
            $s = max(0, $seconds);
            $h = intdiv($s, 3600);
            $m = intdiv($s % 3600, 60);

            return $h > 0 ? sprintf('%d:%02d:%02d', $h, $m, $s % 60) : sprintf('%02d:%02d', $m, $s % 60);
        }
    }
@endphp
