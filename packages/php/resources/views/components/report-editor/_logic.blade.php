{{-- Internal: helpers of x-nq::report-editor, x-nq::report-editor.viewer and x-nq::report-editor.chart, ported from report-math.ts and report-strings.ts.
     Included with @include('nasaq::components.report-editor._logic'); every function is defined once.
     A report is an array: ['title', 'subtitle', 'author', 'date', 'blocks' => [block, ...]]. A block has 'id' and 'type'
     (heading | text | metrics | chart | table | callout | divider) and the fields of that type, as in the React model. --}}
@php
    if (! function_exists('nq_re_words')) {
        /** The built-in words by locale, with the host's overrides on top. :n :a :b :c are filled by nq_re_fill in order. */
        function nq_re_words(string $locale, array $override = []): array
        {
            $en = [
                'editor' => 'Report editor',
                'viewer' => 'Report',
                'reportTitle' => 'Report title',
                'titlePlaceholder' => 'Untitled report',
                'subtitle' => 'Subtitle',
                'author' => 'Author',
                'date' => 'Date',
                'edit' => 'Edit',
                'preview' => 'Preview',
                'view' => 'View',
                'blocks' => 'Blocks',
                'insert' => 'Insert block',
                'addText' => 'Add text block',
                'blockType' => 'Block type',
                'typeHeading' => 'Heading',
                'typeText' => 'Text',
                'typeMetrics' => 'Key figures',
                'typeChart' => 'Chart',
                'typeTable' => 'Table',
                'typeCallout' => 'Callout',
                'typeDivider' => 'Divider',
                'untitledBlock' => 'Empty block',
                'headingText' => 'Heading text',
                'headingLevel' => 'Level',
                'level1' => 'Large',
                'level2' => 'Medium',
                'level3' => 'Small',
                'textLabel' => 'Text',
                'textPlaceholder' => 'Write the paragraph. Use the toolbar for lists, links and headings.',
                'metricLabel' => 'Label',
                'metricValue' => 'Value',
                'metricDelta' => 'Change in percent',
                'metricDeltaLabel' => 'Change note',
                'metricCurrency' => 'Currency code',
                'metricCurrencyHint' => 'Leave empty for a plain number.',
                'addMetric' => 'Add figure',
                'removeMetric' => 'Remove figure :n',
                'figureN' => 'Figure :n',
                'chartTitle' => 'Chart title',
                'chartKind' => 'Chart type',
                'kindBar' => 'Bars',
                'kindLine' => 'Lines',
                'kindArea' => 'Area',
                'caption' => 'Caption',
                'seriesName' => 'Series :n name',
                'addSeries' => 'Add series',
                'removeSeries' => 'Remove series :n',
                'rowLabel' => 'Label',
                'rowValue' => 'Value of :n',
                'addRow' => 'Add row',
                'removeRow' => 'Remove row :n',
                'defaultSeries' => 'Series :n',
                'chartSummary' => ':n: :b points, :c series',
                'tableTitle' => 'Table title',
                'column' => 'Column :n heading',
                'cell' => 'Row :n, column :a',
                'addColumn' => 'Add column',
                'removeColumn' => 'Remove column :n',
                'calloutTone' => 'Tone',
                'toneInfo' => 'Note',
                'toneSuccess' => 'Good news',
                'toneWarning' => 'Watch out',
                'toneDanger' => 'Problem',
                'calloutTitle' => 'Title',
                'calloutText' => 'Message',
                'save' => 'Save',
                'saving' => 'Saving',
                'saved' => 'Saved',
                'unsaved' => 'Unsaved changes',
                'saveFailed' => 'Could not save',
                'print' => 'Print',
                'words' => ':n words',
                'minutes' => ':n min read',
                'issues' => ':n blocks need content',
                'contents' => 'Contents',
                'emptyReport' => 'This report is empty.',
                'previewEmpty' => 'Nothing to preview yet. Add a block in Edit.',
                'by' => 'By :n',
                'issueEmptyHeading' => 'Heading is empty',
                'issueEmptyText' => 'Text is empty',
                'issueEmptyMetric' => 'A figure has no label',
                'issueEmptyChart' => 'A chart row has no label',
                'issueEmptyTable' => 'Table has no headings',
            ];
            $ar = [
                'editor' => 'محرر التقارير',
                'viewer' => 'التقرير',
                'reportTitle' => 'عنوان التقرير',
                'titlePlaceholder' => 'تقرير بلا عنوان',
                'subtitle' => 'عنوان فرعي',
                'author' => 'الكاتب',
                'date' => 'التاريخ',
                'edit' => 'تحرير',
                'preview' => 'معاينة',
                'view' => 'عرض',
                'blocks' => 'الكتل',
                'insert' => 'إدراج كتلة',
                'addText' => 'إضافة كتلة نص',
                'blockType' => 'نوع الكتلة',
                'typeHeading' => 'عنوان',
                'typeText' => 'نص',
                'typeMetrics' => 'أرقام رئيسية',
                'typeChart' => 'رسم بياني',
                'typeTable' => 'جدول',
                'typeCallout' => 'تنبيه',
                'typeDivider' => 'فاصل',
                'untitledBlock' => 'كتلة فارغة',
                'headingText' => 'نص العنوان',
                'headingLevel' => 'المستوى',
                'level1' => 'كبير',
                'level2' => 'متوسط',
                'level3' => 'صغير',
                'textLabel' => 'النص',
                'textPlaceholder' => 'اكتب الفقرة. استخدم شريط الأدوات للقوائم والروابط والعناوين.',
                'metricLabel' => 'التسمية',
                'metricValue' => 'القيمة',
                'metricDelta' => 'التغيّر بالنسبة المئوية',
                'metricDeltaLabel' => 'ملاحظة التغيّر',
                'metricCurrency' => 'رمز العملة',
                'metricCurrencyHint' => 'اتركه فارغًا لعرض رقم عادي.',
                'addMetric' => 'إضافة رقم',
                'removeMetric' => 'حذف الرقم :n',
                'figureN' => 'الرقم :n',
                'chartTitle' => 'عنوان الرسم',
                'chartKind' => 'نوع الرسم',
                'kindBar' => 'أعمدة',
                'kindLine' => 'خطوط',
                'kindArea' => 'مساحة',
                'caption' => 'التعليق',
                'seriesName' => 'اسم السلسلة :n',
                'addSeries' => 'إضافة سلسلة',
                'removeSeries' => 'حذف السلسلة :n',
                'rowLabel' => 'التسمية',
                'rowValue' => 'قيمة :n',
                'addRow' => 'إضافة صف',
                'removeRow' => 'حذف الصف :n',
                'defaultSeries' => 'السلسلة :n',
                'chartSummary' => ':n: :b نقاط، :c سلاسل',
                'tableTitle' => 'عنوان الجدول',
                'column' => 'عنوان العمود :n',
                'cell' => 'الصف :n، العمود :a',
                'addColumn' => 'إضافة عمود',
                'removeColumn' => 'حذف العمود :n',
                'calloutTone' => 'النوع',
                'toneInfo' => 'ملاحظة',
                'toneSuccess' => 'خبر جيد',
                'toneWarning' => 'تنبيه',
                'toneDanger' => 'مشكلة',
                'calloutTitle' => 'العنوان',
                'calloutText' => 'الرسالة',
                'save' => 'حفظ',
                'saving' => 'جارٍ الحفظ',
                'saved' => 'تم الحفظ',
                'unsaved' => 'تغييرات غير محفوظة',
                'saveFailed' => 'تعذر الحفظ',
                'print' => 'طباعة',
                'words' => ':n كلمة',
                'minutes' => 'قراءة :n د',
                'issues' => ':n كتل تحتاج محتوى',
                'contents' => 'المحتويات',
                'emptyReport' => 'هذا التقرير فارغ.',
                'previewEmpty' => 'لا شيء للمعاينة بعد. أضف كتلة في وضع التحرير.',
                'by' => 'بقلم :n',
                'issueEmptyHeading' => 'العنوان فارغ',
                'issueEmptyText' => 'النص فارغ',
                'issueEmptyMetric' => 'رقم بلا تسمية',
                'issueEmptyChart' => 'صف في الرسم بلا تسمية',
                'issueEmptyTable' => 'الجدول بلا عناوين',
            ];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        function nq_re_fill(string $sentence, string|int|float ...$values): string
        {
            $out = $sentence;
            foreach ([':n', ':a', ':b', ':c'] as $i => $key) {
                if (array_key_exists($i, $values)) {
                    $out = str_replace($key, (string) $values[$i], $out);
                }
            }

            return $out;
        }

        function nq_re_num(int|float $v, string $locale): string
        {
            if (class_exists(\NumberFormatter::class)) {
                $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::DECIMAL);

                return (string) $f->format($v);
            }

            return (string) $v;
        }

        function nq_re_compact(int|float $v, string $locale): string
        {
            if (class_exists(\NumberFormatter::class)) {
                $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::DECIMAL);
                $abs = abs($v);
                [$div, $suffix] = $abs >= 1e9 ? [1e9, 'B'] : ($abs >= 1e6 ? [1e6, 'M'] : ($abs >= 1e3 ? [1e3, 'K'] : [1, '']));
                $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, 1);

                return $f->format($v / $div).$suffix;
            }

            return (string) $v;
        }

        /** The text of an HTML string without tags, block ends as newlines. */
        function nq_re_html_text(string $html): string
        {
            $text = preg_replace(['/<\/(p|h[1-6]|li|blockquote|div)>/i', '/<br\s*\/?>/i'], "\n", $html);
            $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8');

            return trim(preg_replace("/\n{2,}/", "\n", str_replace("\u{a0}", ' ', $text)));
        }

        /** Only the tags the rich text editor makes survive; links keep http, https, mailto, tel, relative and # addresses only. */
        function nq_re_clean_html(string $html): string
        {
            if (trim($html) === '') {
                return '';
            }
            $allowed = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'hr'];
            $dom = new \DOMDocument;
            $prev = libxml_use_internal_errors(true);
            $dom->loadHTML('<?xml encoding="UTF-8"><body>'.$html.'</body>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
            libxml_clear_errors();
            libxml_use_internal_errors($prev);
            $body = $dom->getElementsByTagName('body')->item(0);
            if (! $body) {
                return e(strip_tags($html));
            }
            $walk = function (\DOMNode $node) use (&$walk, $allowed): void {
                foreach (iterator_to_array($node->childNodes) as $child) {
                    if (! $child instanceof \DOMElement) {
                        continue;
                    }
                    $walk($child);
                    $tag = strtolower($child->tagName);
                    if (! in_array($tag, $allowed, true)) {
                        if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed'], true)) {
                            $node->removeChild($child);
                        } else {
                            while ($child->firstChild) {
                                $node->insertBefore($child->firstChild, $child);
                            }
                            $node->removeChild($child);
                        }

                        continue;
                    }
                    foreach (iterator_to_array($child->attributes) as $attr) {
                        if (! ($tag === 'a' && in_array($attr->name, ['href', 'title'], true))) {
                            $child->removeAttribute($attr->name);
                        }
                    }
                    if ($tag === 'a') {
                        $href = trim($child->getAttribute('href'));
                        if (! preg_match('#^(https?:|mailto:|tel:|/|\#)#i', $href)) {
                            $child->removeAttribute('href');
                        } else {
                            $child->setAttribute('rel', 'noopener noreferrer');
                            $child->setAttribute('target', '_blank');
                        }
                    } else {
                        $child->setAttribute('dir', 'auto');
                    }
                }
            };
            $walk($body);
            $out = '';
            foreach ($body->childNodes as $child) {
                $out .= $dom->saveHTML($child);
            }

            return $out;
        }

        /** The words a block contributes to the report's word count. */
        function nq_re_block_text(array $b): string
        {
            return match ($b['type'] ?? '') {
                'heading' => (string) ($b['text'] ?? ''),
                'text' => nq_re_html_text((string) ($b['html'] ?? '')),
                'metrics' => implode(' ', array_map(fn ($m) => (string) ($m['label'] ?? ''), $b['items'] ?? [])),
                'chart' => trim(($b['title'] ?? '').' '.($b['caption'] ?? '')),
                'table' => trim(($b['title'] ?? '').' '.implode(' ', $b['columns'] ?? []).' '.implode(' ', array_map(fn ($r) => implode(' ', $r), $b['rows'] ?? []))),
                'callout' => trim(($b['title'] ?? '').' '.($b['text'] ?? '')),
                default => '',
            };
        }

        function nq_re_word_count(array $report): int
        {
            $text = trim(($report['title'] ?? '').' '.($report['subtitle'] ?? '').' '.implode(' ', array_map('nq_re_block_text', $report['blocks'] ?? [])));

            return $text === '' ? 0 : count(preg_split('/\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY));
        }

        function nq_re_reading_minutes(int $words): int
        {
            return max(1, (int) ceil($words / 200));
        }

        /** Headings for the contents list: [['id', 'text', 'level'], ...]. */
        function nq_re_toc(array $report): array
        {
            $out = [];
            foreach ($report['blocks'] ?? [] as $b) {
                if (($b['type'] ?? '') === 'heading' && trim((string) ($b['text'] ?? '')) !== '') {
                    $out[] = ['id' => $b['id'], 'text' => $b['text'], 'level' => (int) ($b['level'] ?? 1)];
                }
            }

            return $out;
        }

        /** A table padded so every row is as wide as the header. */
        function nq_re_fit_table(array $b): array
        {
            $cols = array_values($b['columns'] ?? []);
            $rows = array_map(fn ($r) => array_map(fn ($i) => (string) (array_values($r)[$i] ?? ''), array_keys($cols)), $b['rows'] ?? []);

            return ['columns' => $cols, 'rows' => $rows] + $b;
        }

        /** Chart geometry in a 100 x 100 box: bounds, bars, lines, areas and dots. */
        function nq_re_chart(array $b, array $names, string $locale): array
        {
            $rows = array_values($b['rows'] ?? []);
            $count = max(1, count($rows));
            $series = count($b['series'] ?? []);
            $vals = [];
            foreach ($rows as $r) {
                for ($si = 0; $si < $series; $si++) {
                    $v = $r['values'][$si] ?? 0;
                    $vals[] = is_numeric($v) ? (float) $v : 0.0;
                }
            }
            $lo = min(0, ...($vals ?: [0]));
            $hi = max(0, ...($vals ?: [0]));
            if ($hi === $lo) {
                $hi = $lo + 1;
            }
            $y = fn ($v) => 100 - (($v - $lo) / ($hi - $lo)) * 100;
            $zero = $y(0);
            $x = fn ($i) => $count === 1 ? 50 : ($i / ($count - 1)) * 100;
            $fmt = fn ($v) => round($v, 3);
            $bars = $lines = $dots = [];
            $slot = 100 / $count;
            $barW = ($slot * 0.7) / max(1, $series);
            for ($si = 0; $si < $series; $si++) {
                $pts = [];
                foreach ($rows as $ri => $r) {
                    $v = (float) ($r['values'][$si] ?? 0);
                    $tip = ($r['label'] ?? '').', '.$names[$si].': '.nq_re_num($v, $locale);
                    $pts[] = $fmt($x($ri)).','.$fmt($y($v));
                    $bars[] = ['si' => $si, 'x' => $fmt($ri * $slot + $slot * 0.15 + $si * $barW), 'w' => $fmt($barW), 'y' => $fmt(min($y($v), $zero)), 'h' => $fmt(abs($y($v) - $zero)), 'tip' => $tip];
                    $dots[] = ['si' => $si, 'x' => $fmt($x($ri)), 'y' => $fmt($y($v)), 'tip' => $tip];
                }
                $lines[] = ['si' => $si, 'line' => implode(' ', $pts), 'area' => $fmt($x(0)).','.$fmt($zero).' '.implode(' ', $pts).' '.$fmt($x($count - 1)).','.$fmt($zero)];
            }

            return ['lo' => $lo, 'hi' => $hi, 'bars' => $bars, 'lines' => $lines, 'dots' => $dots];
        }
    }
@endphp
