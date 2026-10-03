{{-- Internal: the words for the database-explorer (port of the strings in web/src/components/database-explorer/database-explorer.tsx).
     Included with @include('nasaq::components.database-explorer._database-explorer'); the function is defined once.
     Counts are objects with {n} placeholders that the JS side fills in. --}}
@php
    if (! function_exists('nq_dbx_strings')) {
        /** The built-in words for a locale, with `$labels` laid over them. */
        function nq_dbx_strings(string $locale, array $labels = []): array
        {
            $ar = str_starts_with($locale, 'ar');

            return array_merge($ar ? [
                'title' => 'مستكشف قاعدة البيانات', 'tables' => 'الجداول', 'filterTables' => 'تصفية الجداول', 'noTables' => 'لا توجد جداول مطابقة.',
                'noSchema' => 'لا توجد جداول بعد', 'noSchemaBody' => 'لا تحتوي قاعدة البيانات هذه على جداول لتصفحها.',
                'rows' => ['one' => 'صف واحد', 'two' => 'صفان', 'few' => '{n} صفوف', 'many' => '{n} صفًا'],
                'editor' => 'استعلام SQL', 'editorHint' => 'Ctrl أو Cmd + Enter للتنفيذ', 'placeholder' => 'SELECT * FROM users LIMIT 100;',
                'run' => 'تنفيذ', 'running' => 'جارٍ التنفيذ', 'clear' => 'مسح', 'results' => 'النتائج', 'structure' => 'البنية', 'history' => 'السجل',
                'resultsTable' => 'نتائج الاستعلام', 'noRun' => 'نفّذ استعلامًا لعرض الصفوف هنا', 'noRunBody' => 'اختر جدولًا من القائمة أو اكتب استعلامًا.',
                'noRows' => 'لم يُرجع الاستعلام أي صفوف', 'affected' => ['one' => 'تأثر صف واحد', 'other' => 'تأثر {n} صفوف'], 'took' => '{n} مللي ثانية',
                'truncated' => 'يُعرض أول {n} صفًا فقط.', 'exportCsv' => 'تنزيل CSV', 'copyCsv' => 'نسخ CSV', 'copied' => 'تم النسخ',
                'queryFailed' => 'فشل الاستعلام', 'genericError' => 'حدث خطأ ما. حاول مرة أخرى.', 'null' => 'NULL', 'column' => 'العمود', 'type' => 'النوع',
                'nullable' => 'يقبل الفراغ', 'yes' => 'نعم', 'no' => 'لا', 'primaryKey' => 'مفتاح أساسي', 'references' => 'يشير إلى {target}',
                'pickTable' => 'اختر جدولًا لعرض أعمدته', 'historyEmpty' => 'تظهر هنا الاستعلامات التي تنفذها', 'historyClear' => 'مسح السجل',
                'useQuery' => 'تحميل في المحرر', 'writeTitle' => 'تنفيذ استعلام يغيّر البيانات؟',
                'writeBody' => 'لا يبدو أن هذا الاستعلام للقراءة فقط. سيُنفَّذ على الاتصال الحي وقد لا يمكن التراجع عنه.',
                'writeConfirm' => 'تنفيذ الاستعلام', 'cancel' => 'إلغاء', 'modifies' => 'يغيّر البيانات',
            ] : [
                'title' => 'Database explorer', 'tables' => 'Tables', 'filterTables' => 'Filter tables', 'noTables' => 'No tables match.',
                'noSchema' => 'No tables yet', 'noSchemaBody' => 'This database has no tables to browse.',
                'rows' => ['one' => '1 row', 'two' => '{n} rows', 'few' => '{n} rows', 'many' => '{n} rows'],
                'editor' => 'SQL query', 'editorHint' => 'Ctrl or Cmd + Enter to run', 'placeholder' => 'SELECT * FROM users LIMIT 100;',
                'run' => 'Run', 'running' => 'Running', 'clear' => 'Clear', 'results' => 'Results', 'structure' => 'Structure', 'history' => 'History',
                'resultsTable' => 'Query results', 'noRun' => 'Run a query to see rows here', 'noRunBody' => 'Pick a table on the left, or write a query.',
                'noRows' => 'The query returned no rows', 'affected' => ['one' => '1 row affected', 'other' => '{n} rows affected'], 'took' => '{n} ms',
                'truncated' => 'Showing the first {n} rows.', 'exportCsv' => 'Download CSV', 'copyCsv' => 'Copy CSV', 'copied' => 'Copied to clipboard',
                'queryFailed' => 'The query failed', 'genericError' => 'Something went wrong. Try again.', 'null' => 'NULL', 'column' => 'Column', 'type' => 'Type',
                'nullable' => 'Nullable', 'yes' => 'Yes', 'no' => 'No', 'primaryKey' => 'Primary key', 'references' => 'References {target}',
                'pickTable' => 'Pick a table to see its columns', 'historyEmpty' => 'Queries you run appear here', 'historyClear' => 'Clear history',
                'useQuery' => 'Load into the editor', 'writeTitle' => 'Run a query that changes data?',
                'writeBody' => 'This statement does not look read-only. It runs against the live connection and may not be reversible.',
                'writeConfirm' => 'Run query', 'cancel' => 'Cancel', 'modifies' => 'Changes data',
            ], $labels);
        }
    }
@endphp
