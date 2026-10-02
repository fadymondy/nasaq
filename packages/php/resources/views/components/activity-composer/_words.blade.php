{{-- Internal: the built-in words of x-nq::activity-composer and its timeline, ported from activity-composer.tsx and activity-logic.ts.
     Included with @include('nasaq::components.activity-composer._words'); every function is defined once. Sentences use %s placeholders. --}}
@php
    if (! function_exists('nq_ac_words')) {
        /** The built-in words for a locale, with `$override` laid over them. */
        function nq_ac_words(string $locale, array $override = []): array
        {
            $en = [
                'kinds' => ['note' => 'Note', 'call' => 'Call', 'meeting' => 'Meeting', 'task' => 'Task', 'event' => 'Event'],
                'kindPicker' => 'Kind of activity',
                'bodyLabel' => ['note' => 'Note', 'call' => 'What was discussed', 'meeting' => 'Minutes', 'task' => 'What needs doing'],
                'bodyHint' => ['note' => 'Write a note…', 'call' => 'Summarise the call…', 'meeting' => 'Decisions and next steps…', 'task' => 'Follow up on…'],
                'whenLabel' => ['note' => 'When', 'call' => 'When', 'meeting' => 'When', 'task' => 'Due'],
                'duration' => 'Duration (minutes)',
                'submit' => ['note' => 'Log note', 'call' => 'Log call', 'meeting' => 'Log meeting', 'task' => 'Add task'],
                'errors' => ['empty' => 'Write something first.', 'badDate' => 'Pick a valid date and time.', 'badDuration' => 'Duration must be between 0 and 1440 minutes.'],
                'planned' => 'Planned', 'history' => 'History', 'empty' => 'No activity yet',
                'emptyHint' => 'Log a note, a call, a meeting or a task to start the history.',
                'overdue' => 'Overdue', 'due' => 'Due', 'minutes' => '%s min', 'complete' => 'Mark done: %s', 'reopen' => 'Reopen: %s',
                'delete' => 'Delete', 'actions' => 'Activity actions', 'completed' => 'Done', 'listLabel' => 'Activity history', 'plannedLabel' => 'Planned tasks',
                'by' => 'by', 'failed' => 'That did not work. Try again.',
            ];
            $ar = [
                'kinds' => ['note' => 'ملاحظة', 'call' => 'مكالمة', 'meeting' => 'اجتماع', 'task' => 'مهمة', 'event' => 'حدث'],
                'kindPicker' => 'نوع النشاط',
                'bodyLabel' => ['note' => 'الملاحظة', 'call' => 'ما جرى النقاش فيه', 'meeting' => 'محضر الاجتماع', 'task' => 'المطلوب إنجازه'],
                'bodyHint' => ['note' => 'اكتب ملاحظة…', 'call' => 'لخّص المكالمة…', 'meeting' => 'القرارات والخطوات التالية…', 'task' => 'متابعة…'],
                'whenLabel' => ['note' => 'الوقت', 'call' => 'الوقت', 'meeting' => 'الوقت', 'task' => 'الاستحقاق'],
                'duration' => 'المدة (بالدقائق)',
                'submit' => ['note' => 'تسجيل ملاحظة', 'call' => 'تسجيل مكالمة', 'meeting' => 'تسجيل اجتماع', 'task' => 'إضافة مهمة'],
                'errors' => ['empty' => 'اكتب شيئًا أولًا.', 'badDate' => 'اختر تاريخًا ووقتًا صالحين.', 'badDuration' => 'يجب أن تكون المدة بين 0 و1440 دقيقة.'],
                'planned' => 'المخطط', 'history' => 'السجل', 'empty' => 'لا يوجد نشاط بعد',
                'emptyHint' => 'سجّل ملاحظة أو مكالمة أو اجتماعًا أو مهمة لبدء السجل.',
                'overdue' => 'متأخرة', 'due' => 'الاستحقاق', 'minutes' => '%s د', 'complete' => 'إنهاء: %s', 'reopen' => 'إعادة فتح: %s',
                'delete' => 'حذف', 'actions' => 'إجراءات النشاط', 'completed' => 'منجزة', 'listLabel' => 'سجل النشاط', 'plannedLabel' => 'المهام المخططة',
                'by' => 'بواسطة', 'failed' => 'لم ينجح ذلك. حاول مرة أخرى.',
            ];

            return array_replace_recursive(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        /** Kind => lucide icon name. */
        function nq_ac_icons(): array
        {
            return ['note' => 'notebook-pen', 'call' => 'phone', 'meeting' => 'users', 'task' => 'list-todo', 'event' => 'zap'];
        }

        /** A Carbon date from a DateTime, an ISO string, or epoch seconds or milliseconds. */
        function nq_ac_time($v): \Carbon\Carbon
        {
            if ($v instanceof \DateTimeInterface) {
                return \Carbon\Carbon::instance($v);
            }
            if (is_numeric($v)) {
                return \Carbon\Carbon::createFromTimestamp($v > 100000000000 ? intdiv((int) $v, 1000) : (int) $v);
            }

            return \Carbon\Carbon::parse($v);
        }

        /** Open tasks (soonest due first) and the rest of the history (newest first; a done task sits at its completion time). */
        function nq_ac_split(array $records): array
        {
            $ts = fn ($v) => nq_ac_time($v)->getTimestamp();
            $isOpen = fn ($a) => ($a['kind'] ?? '') === 'task' && empty($a['done']);
            $open = array_values(array_filter($records, $isOpen));
            usort($open, fn ($a, $b) => $ts($a['at']) <=> $ts($b['at']));
            $history = array_values(array_filter($records, fn ($a) => ! $isOpen($a)));
            $at = fn ($a) => $ts(($a['kind'] ?? '') === 'task' && ! empty($a['done']) && ! empty($a['doneAt']) ? $a['doneAt'] : $a['at']);
            usort($history, fn ($a, $b) => $at($b) <=> $at($a));

            return ['open' => $open, 'history' => $history];
        }
    }
@endphp
