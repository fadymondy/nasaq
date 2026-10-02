{{-- Internal: the words and pure helpers of research-run, ported from research-run.tsx and research-run-math.ts. Included with
     @include('nasaq::components.research-run._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_rr_words')) {
        /** The words of the research run for the locale, with the host's overrides on top. Templates use {n}. */
        function nq_rr_words(array $override = []): array
        {
            $en = [
                'label' => 'Research run', 'ask' => 'Ask', 'asking' => 'Researching', 'placeholder' => 'What do you want researched?', 'cancel' => 'Stop research',
                'retry' => 'Try again', 'newQuestion' => 'New question', 'suggestions' => 'Try asking', 'queued' => 'Waiting for a free researcher', 'stages' => 'Progress',
                'checked' => '{n} sources checked', 'read' => '{n} read',
                'stageStates' => ['pending' => 'Waiting', 'running' => 'In progress', 'done' => 'Done', 'failed' => 'Failed'],
                'answer' => 'Answer', 'evidence' => 'Evidence', 'evidenceHint' => 'The passages the answer rests on.', 'citation' => 'Evidence {n}', 'showEvidence' => 'Show evidence {n}',
                'openSource' => 'Open source', 'relevance' => 'Relevance {n}', 'notCited' => 'Also found', 'sources' => 'Sources',
                'failed' => 'The research stopped before it had an answer.', 'cancelled' => 'Research stopped.', 'noAnswer' => 'No answer was found for this question.', 'finished' => 'Finished',
            ];
            $ar = [
                'label' => 'جولة بحث', 'ask' => 'اسأل', 'asking' => 'جارٍ البحث', 'placeholder' => 'ما الذي تريد بحثه؟', 'cancel' => 'إيقاف البحث', 'retry' => 'حاول مرة أخرى',
                'newQuestion' => 'سؤال جديد', 'suggestions' => 'جرّب أن تسأل', 'queued' => 'بانتظار باحث متاح', 'stages' => 'التقدم',
                'checked' => '{n} مصادر تمت مراجعتها', 'read' => '{n} قُرئت',
                'stageStates' => ['pending' => 'بالانتظار', 'running' => 'قيد التنفيذ', 'done' => 'تم', 'failed' => 'فشل'],
                'answer' => 'الإجابة', 'evidence' => 'الأدلة', 'evidenceHint' => 'المقاطع التي تستند إليها الإجابة.', 'citation' => 'الدليل {n}', 'showEvidence' => 'إظهار الدليل {n}',
                'openSource' => 'فتح المصدر', 'relevance' => 'الصلة {n}', 'notCited' => 'وُجد أيضًا', 'sources' => 'المصادر',
                'failed' => 'توقف البحث قبل الوصول إلى إجابة.', 'cancelled' => 'تم إيقاف البحث.', 'noAnswer' => 'لم يُعثر على إجابة لهذا السؤال.', 'finished' => 'اكتمل',
            ];
            $base = \Nasaq\Nasaq::rtl() ? $ar : $en;
            $words = array_merge($base, $override);
            $words['stageStates'] = array_merge($base['stageStates'], $override['stageStates'] ?? []);

            return $words;
        }

        /** Text before and after the {n} of a template: ['', ' sources checked']. */
        function nq_rr_around(string $template): array
        {
            $parts = explode('{n}', $template, 2);

            return [$parts[0], $parts[1] ?? ''];
        }

        /** Evidence id => its number in the answer (1-based, in list order). */
        function nq_rr_evidence_numbers(array $evidence): array
        {
            $map = [];
            foreach ($evidence as $e) {
                if (! isset($map[$e['id']])) {
                    $map[$e['id']] = count($map) + 1;
                }
            }

            return $map;
        }

        /** The citation numbers a block points at, ascending and without duplicates: [['id' => .., 'n' => ..], ..]. Ids with no evidence are dropped. */
        function nq_rr_cited_numbers(?array $cites, array $numbers): array
        {
            $seen = [];
            $out = [];
            foreach ($cites ?? [] as $id) {
                if (! isset($numbers[$id]) || isset($seen[$id])) {
                    continue;
                }
                $seen[$id] = true;
                $out[] = ['id' => $id, 'n' => $numbers[$id]];
            }
            usort($out, fn ($a, $b) => $a['n'] <=> $b['n']);

            return $out;
        }

        /** How far along the stages are: ['done' => n, 'total' => n, 'current' => index of the running (or first pending) stage]. */
        function nq_rr_stage_progress(array $stages): array
        {
            $states = array_values(array_map(fn ($s) => $s['state'], $stages));
            $done = count(array_filter($states, fn ($s) => $s === 'done'));
            $running = array_search('running', $states, true);
            $pending = array_search('pending', $states, true);
            $current = $running !== false ? $running : ($pending !== false ? $pending : 0);

            return ['done' => $done, 'total' => count($states), 'current' => min($current, max(0, count($states) - 1))];
        }

        /** Evidence that no answer block cites. Worth showing apart, so nothing kept is lost. */
        function nq_rr_uncited(array $evidence, array $blocks): array
        {
            $cited = [];
            foreach ($blocks as $b) {
                foreach ($b['cites'] ?? [] as $id) {
                    $cited[$id] = true;
                }
            }

            return array_values(array_filter($evidence, fn ($e) => ! isset($cited[$e['id']])));
        }
    }
@endphp
