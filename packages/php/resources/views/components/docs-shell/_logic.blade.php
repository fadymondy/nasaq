{{-- Internal: the words and pure helpers of the docs shell, ported from docs-shell.tsx and docs-model.ts (pages, trail, previous/next, copied page).
     Included with @include('nasaq::components.docs-shell._logic'); every function is defined once. The sidebar filter runs in the browser (nqDocsShell). --}}
@php
    if (! function_exists('nq_docs_words')) {
        /** The shell's own words for a locale, with the host's overrides on top. */
        function nq_docs_words(array $override = []): array
        {
            $en = [
                'nav' => 'Documentation', 'menu' => 'Open navigation', 'closeMenu' => 'Close navigation', 'filter' => 'Filter pages', 'clearFilter' => 'Clear filter',
                'noMatch' => 'No pages match “{query}”.', 'onThisPage' => 'On this page', 'copyPage' => 'Copy page', 'copied' => 'Copied', 'editPage' => 'Edit this page',
                'updated' => 'Last updated', 'previous' => 'Previous', 'next' => 'Next', 'pager' => 'Previous and next pages', 'crumbs' => 'Breadcrumb', 'docs' => 'Docs',
            ];
            $ar = [
                'nav' => 'التوثيق', 'menu' => 'فتح التنقل', 'closeMenu' => 'إغلاق التنقل', 'filter' => 'تصفية الصفحات', 'clearFilter' => 'مسح التصفية',
                'noMatch' => 'لا صفحات تطابق «{query}».', 'onThisPage' => 'في هذه الصفحة', 'copyPage' => 'نسخ الصفحة', 'copied' => 'تم النسخ', 'editPage' => 'عدّل هذه الصفحة',
                'updated' => 'آخر تحديث', 'previous' => 'السابق', 'next' => 'التالي', 'pager' => 'الصفحتان السابقة والتالية', 'crumbs' => 'مسار التنقل', 'docs' => 'التوثيق',
            ];

            return array_merge(\Nasaq\Nasaq::rtl() ? $ar : $en, $override);
        }

        /** Pages (leaves) in reading order. */
        function nq_docs_pages(array $nodes): array
        {
            $out = [];
            foreach ($nodes as $n) {
                if (empty($n['children'])) {
                    $out[] = $n;
                } else {
                    array_push($out, ...nq_docs_pages($n['children']));
                }
            }

            return $out;
        }

        /** The path from a root to the node, or [] when the id is not in the tree. */
        function nq_docs_trail(array $nodes, string $id): array
        {
            foreach ($nodes as $n) {
                if ((string) $n['id'] === $id) {
                    return [$n];
                }
                $rest = ! empty($n['children']) ? nq_docs_trail($n['children'], $id) : [];
                if ($rest) {
                    return [$n, ...$rest];
                }
            }

            return [];
        }

        /** The pages before and after in reading order: ['prev' => node|null, 'next' => node|null]. */
        function nq_docs_prev_next(array $nodes, string $id): array
        {
            $pages = array_values(nq_docs_pages($nodes));
            foreach ($pages as $i => $p) {
                if ((string) $p['id'] === $id) {
                    return ['prev' => $pages[$i - 1] ?? null, 'next' => $pages[$i + 1] ?? null];
                }
            }

            return ['prev' => null, 'next' => null];
        }

        /** What "Copy page" puts on the clipboard: the title as a heading, the summary, then the body. */
        function nq_docs_page_markdown(array $page): string
        {
            $body = preg_replace('/^\s*#\s+.*\R+/u', '', (string) ($page['markdown'] ?? ''), 1);
            $text = implode("\n", ['# '.$page['title'], ! empty($page['description']) ? "\n".$page['description'] : '', "\n".trim($body)."\n"]);

            return preg_replace('/\n{3,}/', "\n\n", $text);
        }

        /** The navigation tree as <x-nq::tree-view> items. A badge follows the title as text. */
        function nq_docs_items(array $nodes): array
        {
            return array_map(fn ($n) => array_filter([
                'id' => (string) $n['id'],
                'label' => $n['title'].(! empty($n['badge']) ? ' · '.$n['badge'] : ''),
                'textValue' => $n['title'],
                'children' => ! empty($n['children']) ? nq_docs_items($n['children']) : null,
            ], fn ($v) => $v !== null), array_values($nodes));
        }

        /** The tree as the browser needs it for the filter: id, title and children only. */
        function nq_docs_compact(array $nodes): array
        {
            return array_map(fn ($n) => array_filter([
                'id' => (string) $n['id'],
                'title' => $n['title'],
                'children' => ! empty($n['children']) ? nq_docs_compact($n['children']) : null,
            ], fn ($v) => $v !== null), array_values($nodes));
        }
    }
@endphp
