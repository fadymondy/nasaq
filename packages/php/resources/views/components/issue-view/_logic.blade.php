{{-- Internal: helpers of x-nq::issue-view and its parts, ported from issue-logic.ts and the strings of issue-view.tsx / issue-properties.tsx.
     Included with @include('nasaq::components.issue-view._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_iv_words')) {
        /** The built-in words for a locale, with the caller's overrides on top. */
        function nq_iv_words(string $locale, array $override = []): array
        {
            $en = [
                'back' => 'Back', 'close' => 'Close', 'copyKey' => 'Copy issue key', 'description' => 'Description', 'noDescription' => 'No description yet.',
                'edit' => 'Edit', 'save' => 'Save', 'cancel' => 'Cancel', 'editTitle' => 'Edit title', 'titleEmpty' => 'A title is required',
                'subIssues' => 'Sub-issues', 'subIssuePlaceholder' => 'Add a sub-issue', 'addSubIssue' => 'Add', 'noSubIssues' => 'No sub-issues',
                'open' => 'Open', 'copyKeyAction' => 'Copy key', 'actions' => 'Actions', 'development' => 'Development', 'comments' => 'Comments',
                'activity' => 'Activity', 'time' => 'Time', 'ai' => 'AI cost', 'timerRunning' => 'Timer running', 'created' => 'Created', 'updated' => 'Updated',
                'loading' => 'Loading', 'details' => 'Details',
                'urgent' => 'Urgent', 'high' => 'High', 'medium' => 'Medium', 'low' => 'Low', 'none' => 'No priority',
                'bug' => 'Bug', 'feature' => 'Feature', 'improvement' => 'Improvement', 'task' => 'Task', 'chore' => 'Chore',
                'unassigned' => 'Unassigned', 'noParent' => 'No parent', 'noEstimate' => 'No estimate', 'noLabels' => 'No labels',
                'overdue' => 'Overdue', 'dueToday' => 'Due today', 'dueSoon' => 'Due soon',
                'status' => 'Status', 'priority' => 'Priority', 'type' => 'Type', 'assignee' => 'Assignee', 'labels' => 'Labels', 'estimate' => 'Estimate',
                'estimateHint' => 'Hours, for example 2 or 1h 30m', 'due' => 'Due date', 'project' => 'Project', 'parent' => 'Parent',
                'logged' => '%s logged', 'over' => 'Over the estimate', 'pickLabels' => 'Choose labels', 'failed' => 'That did not work. Try again.',
            ];
            $ar = [
                'back' => 'رجوع', 'close' => 'إغلاق', 'copyKey' => 'نسخ رمز المهمة', 'description' => 'الوصف', 'noDescription' => 'لا يوجد وصف بعد.',
                'edit' => 'تعديل', 'save' => 'حفظ', 'cancel' => 'إلغاء', 'editTitle' => 'تعديل العنوان', 'titleEmpty' => 'العنوان مطلوب',
                'subIssues' => 'المهام الفرعية', 'subIssuePlaceholder' => 'أضف مهمة فرعية', 'addSubIssue' => 'إضافة', 'noSubIssues' => 'لا مهام فرعية',
                'open' => 'فتح', 'copyKeyAction' => 'نسخ الرمز', 'actions' => 'إجراءات', 'development' => 'التطوير', 'comments' => 'التعليقات',
                'activity' => 'النشاط', 'time' => 'الوقت', 'ai' => 'تكلفة الذكاء الاصطناعي', 'timerRunning' => 'المؤقت يعمل', 'created' => 'أُنشئت', 'updated' => 'حُدّثت',
                'loading' => 'جارٍ التحميل', 'details' => 'التفاصيل',
                'urgent' => 'عاجلة', 'high' => 'عالية', 'medium' => 'متوسطة', 'low' => 'منخفضة', 'none' => 'بلا أولوية',
                'bug' => 'خطأ', 'feature' => 'ميزة', 'improvement' => 'تحسين', 'task' => 'مهمة', 'chore' => 'صيانة',
                'unassigned' => 'غير مسند', 'noParent' => 'بلا أصل', 'noEstimate' => 'بلا تقدير', 'noLabels' => 'بلا وسوم',
                'overdue' => 'متأخرة', 'dueToday' => 'تستحق اليوم', 'dueSoon' => 'تستحق قريبًا',
                'status' => 'الحالة', 'priority' => 'الأولوية', 'type' => 'النوع', 'assignee' => 'المسؤول', 'labels' => 'الوسوم', 'estimate' => 'التقدير',
                'estimateHint' => 'ساعات، مثل 2 أو 1h 30m', 'due' => 'موعد الاستحقاق', 'project' => 'المشروع', 'parent' => 'الأصل',
                'logged' => 'سُجّل %s', 'over' => 'تجاوز التقدير', 'pickLabels' => 'اختر الوسوم', 'failed' => 'تعذّر تنفيذ ذلك. حاول مرة أخرى.',
            ];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        /** Not finished and not canceled. */
        function nq_iv_is_open(array $issue, array $statuses): bool
        {
            foreach ($statuses as $s) {
                if ((string) $s['id'] === (string) $issue['statusId']) {
                    return ! in_array($s['stage'] ?? 'todo', ['done', 'canceled'], true);
                }
            }

            return true;
        }

        /** none | overdue | today | soon | later. Finished issues are never overdue. */
        function nq_iv_due_state(?string $due, \Carbon\CarbonInterface $now, bool $open = true): string
        {
            if (! $due) {
                return 'none';
            }
            $days = (int) round($now->copy()->startOfDay()->diffInDays(\Carbon\Carbon::parse($due)->startOfDay(), false));
            if ($days < 0) {
                return $open ? 'overdue' : 'later';
            }
            if ($days === 0) {
                return 'today';
            }

            return $days <= 3 ? 'soon' : 'later';
        }

        /** Whole and fractional hours as "1h 30m". "0m" for zero. */
        function nq_iv_format_hours(float|int $hours): string
        {
            $total = (int) round($hours * 60);
            $h = intdiv($total, 60);
            $m = $total % 60;

            return trim(($h ? $h.'h' : '').' '.(($m || ! $h) ? $m.'m' : ''));
        }

        /** Time logged against the estimate: ['loggedHours', 'ratio' (null without an estimate), 'over']. */
        function nq_iv_estimate_summary(int|float $loggedSeconds, float|int|null $estimate): array
        {
            $logged = $loggedSeconds / 3600;
            $est = $estimate && $estimate > 0 ? $estimate : null;
            $ratio = $est ? $logged / $est : null;

            return ['loggedHours' => $logged, 'ratio' => $ratio, 'over' => $ratio !== null && $ratio > 1];
        }

        /** Issues a parent may take: not itself, not one of its own descendants. */
        function nq_iv_parent_candidates(string $issueId, array $all): array
        {
            $banned = [$issueId => true];
            do {
                $grew = false;
                foreach ($all as $i) {
                    if (! empty($i['parentId']) && isset($banned[(string) $i['parentId']]) && ! isset($banned[(string) $i['id']])) {
                        $banned[(string) $i['id']] = true;
                        $grew = true;
                    }
                }
            } while ($grew);

            return array_values(array_filter($all, fn ($i) => ! isset($banned[(string) $i['id']])));
        }

        /** Sub-issue progress: ['done', 'total', 'percent']. */
        function nq_iv_sub_progress(array $subs, array $statuses): array
        {
            $stage = fn ($id) => collect($statuses)->first(fn ($s) => (string) $s['id'] === (string) $id)['stage'] ?? null;
            $done = count(array_filter($subs, fn ($s) => $stage($s['statusId']) === 'done'));

            return ['done' => $done, 'total' => count($subs), 'percent' => count($subs) ? (int) round($done / count($subs) * 100) : 0];
        }

        /** Plain text of the description's HTML: paragraph and line breaks become newlines. */
        function nq_iv_html_text(string $html): string
        {
            $spaced = preg_replace(['/<\s*br\s*\/?>/i', '/<\/(p|div|li|h[1-6]|blockquote)>/i'], "\n", $html);

            return trim(html_entity_decode(strip_tags((string) $spaced), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        }
    }
@endphp
