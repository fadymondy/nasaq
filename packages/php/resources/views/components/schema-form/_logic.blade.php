{{-- Internal: the PHP side of the schema form, ported from schema-fields.ts and the builder half of schema-tree.ts: a JSON Schema (a PHP array)
     becomes the tree of objects, lists and fields that the markup is drawn from and that the browser side (schema-form.ts) works on.
     Included with @include('nasaq::components.schema-form._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_sf_human')) {
        /** "first_name" and "firstName" both become "First name". */
        function nq_sf_human(string $key): string
        {
            $words = trim((string) preg_replace('/[_\-.]+/', ' ', (string) preg_replace('/([a-z0-9])([A-Z])/', '$1 $2', $key)));
            $words = mb_strtolower($words);

            return $words === '' ? $key : mb_strtoupper(mb_substr($words, 0, 1)).mb_substr($words, 1);
        }

        /** Resolves a local #/$defs/x or #/definitions/x pointer. Anything else is left alone. */
        function nq_sf_resolve(array $node, array $root, int $depth = 0): array
        {
            if (empty($node['$ref']) || $depth > 8) {
                return $node;
            }
            if (! preg_match('/^#\/(\$defs|definitions)\/(.+)$/', (string) $node['$ref'], $m)) {
                return $node;
            }
            $target = $root[$m[1]][$m[2]] ?? null;
            if (! is_array($target)) {
                return $node;
            }
            unset($node['$ref']);

            return nq_sf_resolve(array_replace($target, $node), $root, $depth + 1);
        }

        function nq_sf_type(array $node): ?string
        {
            $t = $node['type'] ?? null;
            if (is_array($t)) {
                foreach ($t as $x) {
                    if ($x !== 'null') {
                        return $x;
                    }
                }

                return null;
            }

            return $t;
        }

        /** The text in the current language: the Arabic key when asked for, else the base one. */
        function nq_sf_pick(array $node, string $base, bool $ar): ?string
        {
            $v = $ar ? (($node[$base.'-ar'] ?? null) ?: ($node[$base] ?? null)) : ($node[$base] ?? null);

            return $v === null || $v === '' ? null : (string) $v;
        }

        function nq_sf_options(array $node, bool $ar): ?array
        {
            $one = $node['oneOf'] ?? null;
            if (is_array($one) && $one && count(array_filter($one, fn ($o) => is_array($o) && array_key_exists('const', $o))) === count($one)) {
                return array_map(fn ($o) => ['value' => nq_sf_str($o['const']), 'label' => ($ar ? (($o['x-title-ar'] ?? null) ?: ($o['title'] ?? null)) : ($o['title'] ?? null)) ?? nq_sf_str($o['const'])], array_values($one));
            }
            if (! empty($node['enum'])) {
                $titles = ($ar ? ($node['x-enum-titles-ar'] ?? null) : null) ?? ($node['x-enum-titles'] ?? []);

                return array_map(fn ($v) => ['value' => nq_sf_str($v), 'label' => $titles[nq_sf_str($v)] ?? (is_string($v) ? nq_sf_human($v) : nq_sf_str($v))], array_values($node['enum']));
            }

            return null;
        }

        function nq_sf_str(mixed $v): string
        {
            return is_bool($v) ? ($v ? 'true' : 'false') : (string) $v;
        }

        /** Keeps what is set: null and false-y "unset" entries leave the array, so the JSON has no nulls where the browser expects undefined. */
        function nq_sf_clean(array $a): array
        {
            return array_filter($a, fn ($v) => $v !== null);
        }

        /** A field for a scalar schema: text, number, enum, boolean, date, or a foreign key. Null for anything else. */
        function nq_sf_leaf(string $key, array $raw, array $root, bool $required, bool $ar): ?array
        {
            $node = nq_sf_resolve($raw, $root);
            $parts = explode('.', $key);
            $label = nq_sf_pick($node, 'title', $ar) ?? nq_sf_human(end($parts));
            $base = [
                'key' => $key,
                'label' => $label,
                'description' => nq_sf_pick($node, 'description', $ar),
                'required' => $required ?: null,
                'width' => $node['x-width'] ?? null,
            ];
            $type = nq_sf_type($node);

            if (! empty($node['x-relation'])) {
                $rel = $node['x-relation'];

                return ['field' => nq_sf_clean($base + ['type' => 'text', 'relation' => ['resource' => $rel['resource'], 'multiple' => ! empty($rel['multiple']) || $type === 'array']]), 'numeric' => false];
            }

            $opts = nq_sf_options($node, $ar);
            if ($opts !== null) {
                $numeric = $type === 'number' || $type === 'integer';
                $def = array_key_exists('default', $node) && $node['default'] !== null ? nq_sf_str($node['default']) : null;

                return ['field' => nq_sf_clean($base + ['type' => 'select', 'options' => $opts, 'defaultValue' => $def, 'placeholder' => $node['x-placeholder'] ?? null]), 'numeric' => $numeric];
            }

            switch ($type) {
                case 'string':
                    if (($node['format'] ?? null) === 'date') {
                        return ['field' => nq_sf_clean($base + ['type' => 'date', 'defaultValue' => is_string($node['default'] ?? null) ? $node['default'] : null]), 'numeric' => false];
                    }
                    $fmt = $node['format'] ?? null;
                    $inputType = $fmt === 'email' ? 'email' : (in_array($fmt, ['uri', 'url'], true) ? 'url' : (in_array($fmt, ['tel', 'phone'], true) ? 'tel' : 'text'));

                    return ['field' => nq_sf_clean($base + [
                        'type' => 'text',
                        'inputType' => $inputType,
                        'multiline' => (($node['x-widget'] ?? null) === 'textarea' || ($node['maxLength'] ?? 0) > 200) ?: null,
                        'ltr' => ($inputType !== 'text' || ($node['x-widget'] ?? null) === 'ltr') ?: null,
                        'placeholder' => $node['x-placeholder'] ?? null,
                        'minLength' => $node['minLength'] ?? null,
                        'maxLength' => $node['maxLength'] ?? null,
                        'pattern' => $node['pattern'] ?? null,
                        'defaultValue' => is_string($node['default'] ?? null) ? $node['default'] : null,
                    ]), 'numeric' => false];
                case 'number':
                case 'integer':
                    return ['field' => nq_sf_clean($base + [
                        'type' => 'number',
                        'integer' => $type === 'integer' ?: null,
                        'min' => $node['minimum'] ?? null,
                        'max' => $node['maximum'] ?? null,
                        'step' => $node['multipleOf'] ?? null,
                        'unit' => $node['x-unit'] ?? null,
                        'placeholder' => $node['x-placeholder'] ?? null,
                        'defaultValue' => is_int($node['default'] ?? null) || is_float($node['default'] ?? null) ? $node['default'] : null,
                    ]), 'numeric' => false];
                case 'boolean':
                    return ['field' => nq_sf_clean($base + ['type' => 'switch', 'defaultValue' => ($node['default'] ?? null) === true]), 'numeric' => false];
                default:
                    return null;
            }
        }

        function nq_sf_title(array $node, string $fallback, bool $ar): string
        {
            return nq_sf_pick($node, 'title', $ar) ?? $fallback;
        }

        function nq_sf_children(array $node, string $parentPath, array &$ctx, int $depth): array
        {
            $required = (array) ($node['required'] ?? []);
            $props = [];
            $i = 0;
            foreach ((array) ($node['properties'] ?? []) as $key => $raw) {
                $props[] = ['key' => (string) $key, 'raw' => (array) $raw, 'index' => $i++];
            }
            usort($props, fn ($a, $b) => (($a['raw']['x-order'] ?? 1e6) <=> ($b['raw']['x-order'] ?? 1e6)) ?: $a['index'] <=> $b['index']);
            $out = [];
            foreach ($props as $p) {
                $child = nq_sf_node($p['key'], $p['raw'], $parentPath !== '' ? $parentPath.'.'.$p['key'] : $p['key'], in_array($p['key'], $required, true), $ctx, $depth);
                if ($child) {
                    $out[] = $child;
                }
            }

            return $out;
        }

        function nq_sf_object(string $key, array $node, string $path, bool $required, array &$ctx, int $depth): array
        {
            return nq_sf_clean([
                'kind' => 'object',
                'key' => $key,
                'path' => $path,
                'label' => nq_sf_title($node, nq_sf_human($key), $ctx['ar']),
                'description' => nq_sf_pick($node, 'description', $ctx['ar']),
                'required' => $required,
                'width' => $node['x-width'] ?? null,
                'children' => nq_sf_children($node, $path, $ctx, $depth + 1),
            ]);
        }

        function nq_sf_node(string $key, array $raw, string $path, bool $required, array &$ctx, int $depth): ?array
        {
            $node = nq_sf_resolve($raw, $ctx['root']);
            if ($depth > 12) {
                $ctx['unsupported'][] = ['key' => $path, 'reason' => 'Nested too deep.'];

                return null;
            }
            $type = nq_sf_type($node);
            if (empty($node['x-relation'])) {
                if ($type === 'object' && ! empty($node['properties'])) {
                    return nq_sf_object($key, $node, $path, $required, $ctx, $depth);
                }
                if ($type === 'array' && empty($node['enum'])) {
                    return nq_sf_list($key, $node, $path, $required, $ctx, $depth);
                }
            }
            $leaf = nq_sf_leaf($key, $raw, $ctx['root'], $required, $ctx['ar']);
            if (! $leaf) {
                $ctx['unsupported'][] = ['key' => $path, 'reason' => 'Type "'.(is_array($node['type'] ?? null) ? implode(',', $node['type']) : ($node['type'] ?? '')).'" is not supported.'];

                return null;
            }
            $f = $leaf['field'];

            return nq_sf_clean(['kind' => 'field', 'key' => $key, 'path' => $path, 'label' => $f['label'], 'description' => $f['description'] ?? null, 'required' => $required, 'width' => $f['width'] ?? null, 'field' => $f, 'numeric' => $leaf['numeric']]);
        }

        function nq_sf_list(string $key, array $node, string $path, bool $required, array &$ctx, int $depth): ?array
        {
            $itemRaw = $node['items'] ?? null;
            if (! is_array($itemRaw)) {
                $ctx['unsupported'][] = ['key' => $path, 'reason' => 'An array needs `items`.'];

                return null;
            }
            $item = nq_sf_resolve($itemRaw, $ctx['root']);
            $ar = $ctx['ar'];
            $label = nq_sf_title($node, nq_sf_human($key), $ar);
            $itemLabel = nq_sf_pick($item, 'title', $ar) ?? $label;
            $itemPath = $path.'[]';
            $base = [
                'kind' => 'list',
                'key' => $key,
                'path' => $path,
                'label' => $label,
                'description' => nq_sf_pick($node, 'description', $ar),
                'required' => $required,
                'width' => $node['x-width'] ?? null,
                'itemLabel' => $itemLabel,
                'min' => $node['minItems'] ?? null,
                'max' => $node['maxItems'] ?? null,
                'unique' => ($node['uniqueItems'] ?? false) === true,
                'titleSpec' => $item['x-title'] ?? $node['x-title'] ?? $node['x-title-key'] ?? null,
                'initial' => is_array($node['default'] ?? null) ? array_values($node['default']) : null,
            ];

            if (nq_sf_type($item) === 'object' && ! empty($item['properties']) && empty($item['x-relation'])) {
                $obj = nq_sf_object('item', $item, $itemPath, false, $ctx, $depth + 1);
                $obj['label'] = $itemLabel;

                return nq_sf_clean($base + ['mode' => 'groups', 'item' => $obj]);
            }

            $leaf = nq_sf_type($item) !== 'array' ? nq_sf_leaf('item', $itemRaw, $ctx['root'], true, $ar) : null;
            if (! $leaf) {
                $ctx['unsupported'][] = ['key' => $path, 'reason' => 'Arrays are supported when they hold objects or plain values (string, number, enum, boolean, date).'];

                return null;
            }
            $field = array_replace($leaf['field'], ['label' => $itemLabel, 'required' => true]);
            $item2 = nq_sf_clean(['kind' => 'field', 'key' => 'item', 'path' => $itemPath, 'label' => $itemLabel, 'required' => true, 'field' => $field, 'numeric' => $leaf['numeric']]);
            $mode = 'items';
            if ($field['type'] === 'select' && $base['unique']) {
                $mode = 'checkboxes';
            } elseif ($field['type'] === 'text' && empty($field['relation']) && empty($field['multiline'])) {
                $mode = 'tags';
            }

            return nq_sf_clean($base + ['mode' => $mode, 'item' => $item2]);
        }

        /** Builds the tree of an object schema. The language picks x-title-ar and the Arabic option titles. */
        function nq_sf_tree(array $schema, bool $ar = false): array
        {
            $top = nq_sf_resolve($schema, $schema);
            $ctx = ['root' => $schema, 'ar' => $ar, 'unsupported' => []];
            $root = ['kind' => 'object', 'key' => '', 'path' => '', 'label' => nq_sf_title($top, '', $ar), 'required' => true, 'children' => nq_sf_children($top, '', $ctx, 0)];

            return ['root' => $root, 'unsupported' => $ctx['unsupported']];
        }

        /** The JS template literal of a path: a dynamic prefix (an expression yielding the path of a row) and a static rest. */
        function nq_sf_p(?string $pre, string $suf): string
        {
            return '`'.($pre !== null ? '${'.$pre.'}' : '').$suf.'`';
        }

        /** [pre, suf] of a child key under a path. */
        function nq_sf_child(?string $pre, string $suf, string $key): array
        {
            return [$pre, ($pre === null && $suf === '') ? $key : $suf.'.'.$key];
        }

        /** The words the markup needs at render time; the rest (counts, names of rows) come from the browser side. */
        function nq_sf_words(array $override = [], ?bool $forceAr = null): array
        {
            $ar = $forceAr ?? \Nasaq\Nasaq::rtl();
            $en = [
                'submit' => 'Save', 'saving' => 'Saving…', 'reset' => 'Reset', 'select' => 'Select…', 'saved' => 'Saved.',
                'add' => 'Add %s', 'empty' => 'No %s yet.', 'expandAll' => 'Expand all', 'collapseAll' => 'Collapse all',
                'removeBody' => 'It has data that will be lost.', 'removeConfirm' => 'Remove', 'cancel' => 'Cancel',
                'unmatched' => 'The server reported problems that do not belong to a field.', 'goTo' => 'Fields to fix',
            ];
            $arabic = [
                'submit' => 'حفظ', 'saving' => 'جارٍ الحفظ…', 'reset' => 'إعادة ضبط', 'select' => 'اختر…', 'saved' => 'تم الحفظ.',
                'add' => 'إضافة %s', 'empty' => 'لا يوجد %s بعد.', 'expandAll' => 'توسيع الكل', 'collapseAll' => 'طيّ الكل',
                'removeBody' => 'يحتوي على بيانات ستفقد.', 'removeConfirm' => 'حذف', 'cancel' => 'إلغاء',
                'unmatched' => 'أبلغ الخادم عن مشكلات لا تخص حقلًا محددًا.', 'goTo' => 'حقول تحتاج تصحيحًا',
            ];

            return array_replace($ar ? $arabic : $en, $override);
        }
    }
@endphp
