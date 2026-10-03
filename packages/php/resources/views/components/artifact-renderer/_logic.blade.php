{{-- Internal: helpers of x-nq::artifact-renderer, ported from artifact-renderer-logic.ts and the chart geometry.
     Included with @include('nasaq::components.artifact-renderer._logic'); every function is defined once.
     An artifact is an array (or a JSON string / object): nothing in it is trusted. Strings stay strings (they are escaped on output),
     colours are limited to theme tokens and sizes are capped. --}}
@php
    if (! function_exists('nq_art_limits')) {
        function nq_art_limits(): array
        {
            return ['text' => 20000, 'short' => 300, 'rows' => 200, 'columns' => 20, 'series' => 8, 'points' => 200, 'options' => 50, 'actions' => 8,
                'fields' => 30, 'items' => 12, 'slices' => 8, 'sparkline' => 60, 'html' => 60000];
        }

        function nq_art_kinds(): array
        {
            return ['card', 'table', 'chart', 'markdown', 'code', 'actions', 'picker', 'stats', 'html'];
        }

        function nq_art_tones(): array
        {
            return ['neutral', 'success', 'warning', 'danger', 'info'];
        }

        /** The built-in words for a locale, with $override laid over them. */
        function nq_art_words(string $locale, array $override = []): array
        {
            $en = [
                'invalid' => 'This content could not be shown', 'unsupported' => 'Unsupported content', 'yes' => 'Yes', 'no' => 'No',
                'confirm' => 'Confirm', 'cancel' => 'Cancel', 'send' => 'Send', 'sent' => 'Sent', 'choose' => 'Choose an option',
                'failed' => 'That did not work. Try again.',
                'htmlAsCode' => 'HTML from the agent is shown as code. Enable it in a sandbox with allow-html.',
                'htmlFrame' => 'Content from the agent, in a sandbox', 'source' => 'Source', 'chart' => 'Chart', 'chartTitled' => 'Chart: %s', 'other' => 'Other',
                'neutral' => 'Neutral', 'success' => 'Good', 'warning' => 'Warning', 'danger' => 'Critical', 'info' => 'Info',
            ];
            $ar = [
                'invalid' => 'تعذّر عرض هذا المحتوى', 'unsupported' => 'محتوى غير مدعوم', 'yes' => 'نعم', 'no' => 'لا',
                'confirm' => 'تأكيد', 'cancel' => 'إلغاء', 'send' => 'إرسال', 'sent' => 'تم الإرسال', 'choose' => 'اختر خيارًا',
                'failed' => 'لم تنجح العملية. حاول مرة أخرى.',
                'htmlAsCode' => 'يُعرض HTML القادم من الوكيل على هيئة شيفرة. فعّله داخل صندوق معزول بالخاصية allow-html.',
                'htmlFrame' => 'محتوى من الوكيل داخل صندوق معزول', 'source' => 'المصدر', 'chart' => 'مخطط', 'chartTitled' => 'مخطط: %s', 'other' => 'أخرى',
                'neutral' => 'محايد', 'success' => 'جيد', 'warning' => 'تحذير', 'danger' => 'حرج', 'info' => 'معلومة',
            ];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        /** A coloured dot with the tone in words for screen readers, so the tone is never colour alone. Returns safe HTML. */
        function nq_art_tone_dot(string $tone, array $words): string
        {
            $bg = ['neutral' => 'bg-muted-foreground', 'success' => 'bg-nq-success', 'warning' => 'bg-nq-warning', 'danger' => 'bg-nq-danger', 'info' => 'bg-nq-info'];
            $tone = isset($bg[$tone]) ? $tone : 'neutral';

            return '<span aria-hidden="true" data-tone="'.e($tone).'" class="inline-block size-2 shrink-0 rounded-full '.$bg[$tone].'"></span><span class="sr-only">'.e($words[$tone]).': </span>';
        }

        /** Picks the string for a locale. Falls back to the other language, then to an empty string. */
        function nq_art_localize(mixed $value, string $locale): string
        {
            if ($value === null) {
                return '';
            }
            if (is_string($value)) {
                return $value;
            }
            $ar = str_starts_with($locale, 'ar');

            return (string) (($ar ? ($value['ar'] ?? $value['en'] ?? null) : ($value['en'] ?? $value['ar'] ?? null)) ?? '');
        }

        function nq_art_is_record(mixed $v): bool
        {
            return is_array($v) && ($v === [] || ! array_is_list($v));
        }

        function nq_art_fail(string $message): never
        {
            throw new \InvalidArgumentException($message);
        }

        function nq_art_str(mixed $v, string $path, int $max = 300): string
        {
            if (! is_string($v)) {
                nq_art_fail("$path must be a string");
            }
            if (mb_strlen($v) > $max) {
                nq_art_fail("$path is longer than $max characters");
            }

            return $v;
        }

        function nq_art_text(mixed $v, string $path, int $max = 300): string|array
        {
            if (is_string($v)) {
                return nq_art_str($v, $path, $max);
            }
            if (nq_art_is_record($v)) {
                $out = [];
                if (isset($v['en'])) {
                    $out['en'] = nq_art_str($v['en'], "$path.en", $max);
                }
                if (isset($v['ar'])) {
                    $out['ar'] = nq_art_str($v['ar'], "$path.ar", $max);
                }
                if (! $out) {
                    nq_art_fail("$path needs an en or ar string");
                }

                return $out;
            }
            nq_art_fail("$path must be a string or { en, ar }");
        }

        function nq_art_cell(mixed $v, string $path): string|int|float|bool|null
        {
            if ($v === null || is_bool($v)) {
                return $v;
            }
            if (is_int($v) || is_float($v)) {
                return is_finite((float) $v) ? $v : nq_art_fail("$path must be a finite number");
            }

            return nq_art_str($v, $path, nq_art_limits()['text']);
        }

        function nq_art_list(mixed $v, string $path, int $max, callable $each): array
        {
            if (! is_array($v) || ($v !== [] && ! array_is_list($v))) {
                nq_art_fail("$path must be an array");
            }
            if (count($v) > $max) {
                nq_art_fail("$path has more than $max items");
            }
            $out = [];
            foreach ($v as $i => $x) {
                $out[] = $each($x, $path.'['.$i.']');
            }

            return $out;
        }

        function nq_art_obj(mixed $v, string $path): array
        {
            return nq_art_is_record($v) ? $v : nq_art_fail("$path must be an object");
        }

        function nq_art_num(mixed $v, string $path): int|float
        {
            return (is_int($v) || is_float($v)) && is_finite((float) $v) ? $v : nq_art_fail("$path must be a finite number");
        }

        function nq_art_tone(mixed $v, string $path): string
        {
            return in_array($v, nq_art_tones(), true) ? $v : nq_art_fail("$path is not one of ".implode(', ', nq_art_tones()));
        }

        function nq_art_action(mixed $v, string $path): array
        {
            $o = nq_art_obj($v, $path);
            $out = ['id' => nq_art_str($o['id'] ?? null, "$path.id", 80), 'label' => nq_art_text($o['label'] ?? null, "$path.label")];
            if (array_key_exists('variant', $o)) {
                if (! in_array($o['variant'], ['primary', 'secondary', 'ghost', 'danger'], true)) {
                    nq_art_fail("$path.variant is not one of primary, secondary, ghost, danger");
                }
                $out['variant'] = $o['variant'];
            }
            if (array_key_exists('confirm', $o)) {
                $out['confirm'] = nq_art_text($o['confirm'], "$path.confirm", 500);
            }

            return $out;
        }

        /** Only theme tokens: var(--nq-tag-teal). Anything else (hex, url(), expressions) is dropped so it cannot inject CSS. */
        function nq_art_safe_color(mixed $v): ?string
        {
            return is_string($v) && preg_match('/^var\(--[a-z0-9-]{1,40}\)$/i', $v) ? $v : null;
        }

        /** Accepts the older wire shape title_en / title_ar too. */
        function nq_art_bilingual(array $o, string $key): mixed
        {
            if (array_key_exists($key, $o)) {
                return $o[$key];
            }
            $out = [];
            foreach (['en', 'ar'] as $l) {
                if (array_key_exists("{$key}_$l", $o)) {
                    $out[$l] = $o["{$key}_$l"];
                }
            }

            return $out ?: null;
        }

        function nq_art_build(mixed $input): array
        {
            $o = nq_art_obj($input, 'artifact');
            $kind = $o['kind'] ?? null;
            if (! is_string($kind)) {
                nq_art_fail('kind is required');
            }
            if (! in_array($kind, nq_art_kinds(), true)) {
                nq_art_fail('kind "'.mb_substr($kind, 0, 40).'" is not supported');
            }
            $L = nq_art_limits();
            $base = [];
            if (array_key_exists('id', $o)) {
                $base['id'] = nq_art_str($o['id'], 'id', 80);
            }
            $title = nq_art_bilingual($o, 'title');
            if ($title !== null) {
                $base['title'] = nq_art_text($title, 'title');
            }
            $description = nq_art_bilingual($o, 'description');
            if ($description !== null) {
                $base['description'] = nq_art_text($description, 'description', 1000);
            }

            switch ($kind) {
                case 'card':
                    $a = $base + ['kind' => 'card'];
                    if (array_key_exists('badges', $o)) {
                        $a['badges'] = nq_art_list($o['badges'], 'badges', $L['items'], function ($b, $p) {
                            $bo = nq_art_obj($b, $p);

                            return ['label' => nq_art_text($bo['label'] ?? null, "$p.label", 80)] + (array_key_exists('tone', $bo) ? ['tone' => nq_art_tone($bo['tone'], "$p.tone")] : []);
                        });
                    }
                    if (array_key_exists('fields', $o)) {
                        $a['fields'] = nq_art_list($o['fields'], 'fields', $L['fields'], function ($f, $p) {
                            $fo = nq_art_obj($f, $p);

                            return ['label' => nq_art_text($fo['label'] ?? null, "$p.label", 120), 'value' => nq_art_cell($fo['value'] ?? null, "$p.value")];
                        });
                    }
                    if (array_key_exists('items', $o)) {
                        $a['items'] = nq_art_list($o['items'], 'items', $L['fields'], function ($x, $p) {
                            $xo = nq_art_obj($x, $p);

                            return ['label' => nq_art_text($xo['label'] ?? null, "$p.label", 200)]
                                + (array_key_exists('description', $xo) ? ['description' => nq_art_text($xo['description'], "$p.description", 400)] : [])
                                + (array_key_exists('value', $xo) ? ['value' => nq_art_cell($xo['value'], "$p.value")] : [])
                                + (array_key_exists('tone', $xo) ? ['tone' => nq_art_tone($xo['tone'], "$p.tone")] : []);
                        });
                    }
                    if (array_key_exists('body', $o)) {
                        $a['body'] = nq_art_text($o['body'], 'body', $L['text']);
                    }
                    if (array_key_exists('footer', $o)) {
                        $a['footer'] = nq_art_text($o['footer'], 'footer', 500);
                    }
                    if (array_key_exists('actions', $o)) {
                        $a['actions'] = nq_art_list($o['actions'], 'actions', $L['actions'], 'nq_art_action');
                    }

                    return $a;

                case 'table':
                    $columns = nq_art_list($o['columns'] ?? null, 'columns', $L['columns'], function ($c, $p) {
                        $co = nq_art_obj($c, $p);
                        $align = null;
                        if (array_key_exists('align', $co)) {
                            $align = in_array($co['align'], ['start', 'end'], true) ? $co['align'] : nq_art_fail("$p.align must be start or end");
                        }

                        return ['key' => nq_art_str($co['key'] ?? null, "$p.key", 80), 'label' => nq_art_text($co['label'] ?? null, "$p.label", 120)] + ($align ? ['align' => $align] : []);
                    });
                    $rows = nq_art_list($o['rows'] ?? null, 'rows', $L['rows'], function ($r, $p) use ($columns) {
                        $ro = nq_art_obj($r, $p);
                        $row = [];
                        foreach ($columns as $c) {
                            $row[$c['key']] = ! array_key_exists($c['key'], $ro) || $ro[$c['key']] === null ? null : nq_art_cell($ro[$c['key']], $p.'.'.$c['key']);
                        }

                        return $row;
                    });

                    return $base + ['kind' => 'table', 'columns' => $columns, 'rows' => $rows];

                case 'chart':
                    $chart = null;
                    if (array_key_exists('chart', $o)) {
                        $chart = in_array($o['chart'], ['bar', 'line', 'area', 'pie', 'donut'], true) ? $o['chart'] : nq_art_fail('chart must be bar, line, area, pie, donut');
                    }
                    $xKey = nq_art_str($o['xKey'] ?? null, 'xKey', 80);
                    $series = nq_art_list($o['series'] ?? null, 'series', $L['series'], function ($s, $p) {
                        $so = nq_art_obj($s, $p);
                        $color = nq_art_safe_color($so['color'] ?? null);

                        return ['key' => nq_art_str($so['key'] ?? null, "$p.key", 80), 'label' => nq_art_text($so['label'] ?? null, "$p.label", 120)] + ($color ? ['color' => $color] : []);
                    });
                    if (! $series) {
                        nq_art_fail('series needs at least one entry');
                    }
                    $data = nq_art_list($o['data'] ?? null, 'data', $L['points'], function ($d, $p) use ($xKey, $series) {
                        $dobj = nq_art_obj($d, $p);
                        $row = [];
                        $x = $dobj[$xKey] ?? null;
                        if (is_string($x)) {
                            $row[$xKey] = nq_art_str($x, "$p.$xKey", 120);
                        } elseif ((is_int($x) || is_float($x))) {
                            $row[$xKey] = $x;
                        } else {
                            nq_art_fail("$p.$xKey must be a string or number");
                        }
                        foreach ($series as $s) {
                            $row[$s['key']] = nq_art_num($dobj[$s['key']] ?? null, $p.'.'.$s['key']);
                        }

                        return $row;
                    });

                    return $base + ['kind' => 'chart'] + ($chart ? ['chart' => $chart] : []) + ['xKey' => $xKey, 'series' => $series, 'data' => $data];

                case 'markdown':
                    return $base + ['kind' => 'markdown', 'text' => nq_art_str($o['text'] ?? null, 'text', $L['text'])];

                case 'code':
                    return $base + ['kind' => 'code', 'code' => nq_art_str($o['code'] ?? null, 'code', $L['text'])]
                        + (array_key_exists('language', $o) ? ['language' => nq_art_str($o['language'], 'language', 40)] : [])
                        + (array_key_exists('filename', $o) ? ['filename' => nq_art_str($o['filename'], 'filename', 200)] : []);

                case 'actions':
                    $actions = nq_art_list($o['actions'] ?? null, 'actions', $L['actions'], 'nq_art_action');
                    if (! $actions) {
                        nq_art_fail('actions needs at least one entry');
                    }

                    return $base + ['kind' => 'actions', 'actions' => $actions];

                case 'picker':
                    $mode = null;
                    if (array_key_exists('mode', $o)) {
                        $mode = in_array($o['mode'], ['single', 'multiple'], true) ? $o['mode'] : nq_art_fail('mode must be single or multiple');
                    }
                    $options = nq_art_list($o['options'] ?? null, 'options', $L['options'], function ($x, $p) {
                        $xo = nq_art_obj($x, $p);

                        return ['value' => nq_art_str($xo['value'] ?? null, "$p.value", 120), 'label' => nq_art_text($xo['label'] ?? null, "$p.label", 200)]
                            + (array_key_exists('description', $xo) ? ['description' => nq_art_text($xo['description'], "$p.description", 400)] : []);
                    });
                    if (! $options) {
                        nq_art_fail('options needs at least one entry');
                    }
                    $values = array_column($options, 'value');
                    if (count(array_unique($values)) !== count($options)) {
                        nq_art_fail('options must have unique values');
                    }
                    $default = null;
                    if (array_key_exists('defaultValue', $o)) {
                        $default = array_values(array_filter(
                            nq_art_list($o['defaultValue'], 'defaultValue', $L['options'], fn ($v, $p) => nq_art_str($v, $p, 120)),
                            fn ($v) => in_array($v, $values, true),
                        ));
                    }

                    return $base + ['kind' => 'picker'] + ($mode ? ['mode' => $mode] : []) + ['options' => $options]
                        + ($default !== null ? ['defaultValue' => $default] : [])
                        + (array_key_exists('submitLabel', $o) ? ['submitLabel' => nq_art_text($o['submitLabel'], 'submitLabel', 80)] : []);

                case 'stats':
                    $items = nq_art_list($o['items'] ?? null, 'items', $L['items'], function ($x, $p) use ($L) {
                        $xo = nq_art_obj($x, $p);
                        $v = $xo['value'] ?? null;
                        $value = is_int($v) || is_float($v) ? (is_finite((float) $v) ? $v : nq_art_fail("$p.value must be finite")) : nq_art_str($v, "$p.value", 80);
                        $delta = null;
                        if (array_key_exists('delta', $xo)) {
                            $delta = (is_int($xo['delta']) || is_float($xo['delta'])) && is_finite((float) $xo['delta']) ? $xo['delta'] : nq_art_fail("$p.delta must be a number");
                        }
                        $spark = null;
                        if (array_key_exists('sparkline', $xo)) {
                            $spark = nq_art_list($xo['sparkline'], "$p.sparkline", $L['sparkline'], fn ($n, $q) => (is_int($n) || is_float($n)) && is_finite((float) $n) ? $n : nq_art_fail("$q must be a finite number"));
                        }

                        return ['label' => nq_art_text($xo['label'] ?? null, "$p.label", 120), 'value' => $value]
                            + ($delta !== null ? ['delta' => $delta] : [])
                            + (($xo['invert'] ?? false) === true ? ['invert' => true] : [])
                            + (array_key_exists('tone', $xo) ? ['tone' => nq_art_tone($xo['tone'], "$p.tone")] : [])
                            + ($spark && count($spark) > 1 ? ['sparkline' => $spark] : []);
                    });
                    if (! $items) {
                        nq_art_fail('items needs at least one entry');
                    }

                    return $base + ['kind' => 'stats', 'items' => $items];

                case 'html':
                    $height = null;
                    if (array_key_exists('height', $o)) {
                        $height = (is_int($o['height']) || is_float($o['height'])) && is_finite((float) $o['height']) ? $o['height'] : nq_art_fail('height must be a number');
                    }

                    return $base + ['kind' => 'html', 'html' => nq_art_str($o['html'] ?? null, 'html', $L['html'])] + ($height !== null ? ['height' => $height] : []);
            }
            nq_art_fail('Invalid artifact');
        }

        /** Validates one payload (array, object or JSON string). Returns ['ok' => true, 'artifact' => [...]] or ['ok' => false, 'error' => '...', 'kind' => ?]. Never throws. */
        function nq_art_parse(mixed $input): array
        {
            if (is_array($input) && array_key_exists('ok', $input) && is_bool($input['ok']) && ($input['ok'] ? array_key_exists('artifact', $input) : array_key_exists('error', $input))) {
                return $input;
            }
            if (is_string($input)) {
                $decoded = json_decode($input, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    return ['ok' => false, 'error' => 'The block is not valid JSON'];
                }
                $input = $decoded;
            } elseif (is_object($input)) {
                $input = json_decode(json_encode($input), true);
            }
            try {
                return ['ok' => true, 'artifact' => nq_art_build($input)];
            } catch (\InvalidArgumentException $e) {
                $kind = nq_art_is_record($input) && isset($input['kind']) && is_string($input['kind']) ? mb_substr($input['kind'], 0, 40) : null;

                return ['ok' => false, 'error' => $e->getMessage()] + ($kind ? ['kind' => $kind] : []);
            } catch (\Throwable) {
                return ['ok' => false, 'error' => 'Invalid artifact'];
            }
        }

        /** Pulls ```artifact (or ```a2ui) JSON blocks out of a model's answer. Returns ['text' => ..., 'artifacts' => [parse results]]. */
        function nq_art_extract(string $source): array
        {
            $artifacts = [];
            $text = preg_replace_callback('/```(?:artifact|a2ui)[ \t]*\r?\n([\s\S]*?)```/', function ($m) use (&$artifacts) {
                $data = json_decode($m[1], true);
                $artifacts[] = json_last_error() === JSON_ERROR_NONE ? nq_art_parse($data) : ['ok' => false, 'error' => 'The block is not valid JSON'];

                return '';
            }, $source);

            return ['text' => trim(preg_replace('/\n{3,}/', "\n\n", $text)), 'artifacts' => $artifacts];
        }

        function nq_art_frame_height(int|float|null $h): int
        {
            return (int) min(600, max(80, $h ?? 240));
        }

        function nq_art_frame_document(string $html): string
        {
            $csp = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";

            return '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="'.$csp.'"><base target="_blank">'.$html;
        }

        /** The slices of a pie or donut: the first series by xKey, zero and negative values dropped. Past $max the smallest fold into "Other". */
        function nq_art_pie_slices(array $artifact, int $max = 8): array
        {
            $key = $artifact['series'][0]['key'] ?? null;
            if ($key === null) {
                return [];
            }
            $all = [];
            foreach ($artifact['data'] as $row) {
                $v = (float) ($row[$key] ?? 0);
                if (is_finite($v) && $v > 0) {
                    $all[] = ['name' => (string) ($row[$artifact['xKey']] ?? ''), 'value' => $v];
                }
            }
            if (count($all) <= $max) {
                return $all;
            }
            $order = array_keys($all);
            usort($order, fn ($a, $b) => $all[$b]['value'] <=> $all[$a]['value']);
            $keep = array_flip(array_slice($order, 0, $max - 1));
            $rest = 0.0;
            $out = [];
            foreach ($all as $i => $s) {
                if (isset($keep[$i])) {
                    $out[] = $s;
                } else {
                    $rest += $s['value'];
                }
            }
            $out[] = ['name' => '', 'value' => $rest, 'other' => true];

            return $out;
        }

        /** A figure as plain text with Latin digits: compact (1.2K) or with grouping. */
        function nq_art_fmt(int|float $v, string $locale, bool $compact = false): string
        {
            if ($compact) {
                $units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
                [$div, $suffix] = [1, ''];
                foreach ($units as $u) {
                    if (abs($v) >= $u[0]) {
                        [$div, $suffix] = $u;
                        break;
                    }
                }

                return rtrim(rtrim(number_format(round($v / $div, 1), 1, '.', ''), '0'), '.').$suffix;
            }
            if (class_exists(\NumberFormatter::class)) {
                $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::DECIMAL);

                return (string) $f->format($v);
            }

            return rtrim(rtrim(number_format($v, 3, '.', ','), '0'), '.');
        }

        /** A plain number for an SVG path: at most two decimals, no trailing zeros. */
        function nq_art_f(float $v): string
        {
            $s = rtrim(rtrim(number_format($v, 2, '.', ''), '0'), '.');

            return $s === '-0' || $s === '' ? '0' : $s;
        }

        function nq_art_nice_step(float $raw): float
        {
            if (! ($raw > 0)) {
                return 1.0;
            }
            $p = 10 ** floor(log10($raw));
            $n = $raw / $p;

            return ($n <= 1 ? 1 : ($n <= 2 ? 2 : ($n <= 5 ? 5 : 10))) * $p;
        }

        /** Axis ticks that cover [min, max] with round steps, including zero. */
        function nq_art_ticks(float $min, float $max, int $count = 4): array
        {
            $lo = min(0, $min);
            $hi = max(0, $max);
            if ($hi == $lo) {
                return [0, 1];
            }
            $step = nq_art_nice_step(($hi - $lo) / $count);
            $out = [];
            $end = ceil($hi / $step) * $step + $step / 1e6;
            for ($v = floor($lo / $step) * $step; $v <= $end; $v += $step) {
                $out[] = round($v, 10);
            }

            return $out;
        }

        /** Monotone cubic (Fritsch-Carlson) path, the same curve Recharts draws for type="monotone". */
        function nq_art_monotone(array $pts): string
        {
            $n = count($pts);
            if ($n === 0) {
                return '';
            }
            if ($n === 1) {
                return 'M'.nq_art_f($pts[0][0]).','.nq_art_f($pts[0][1]);
            }
            $dx = [];
            $slope = [];
            for ($i = 0; $i < $n - 1; $i++) {
                $dx[$i] = $pts[$i + 1][0] - $pts[$i][0];
                $slope[$i] = $dx[$i] == 0 ? 0 : ($pts[$i + 1][1] - $pts[$i][1]) / $dx[$i];
            }
            $m = [$slope[0]];
            for ($i = 1; $i < $n - 1; $i++) {
                $m[$i] = $slope[$i - 1] * $slope[$i] <= 0 ? 0 : ($slope[$i - 1] + $slope[$i]) / 2;
            }
            $m[$n - 1] = $slope[$n - 2];
            for ($i = 0; $i < $n - 1; $i++) {
                if ($slope[$i] == 0) {
                    $m[$i] = 0;
                    $m[$i + 1] = 0;

                    continue;
                }
                $a = $m[$i] / $slope[$i];
                $b = $m[$i + 1] / $slope[$i];
                $s = $a * $a + $b * $b;
                if ($s > 9) {
                    $t = 3 / sqrt($s);
                    $m[$i] = $t * $a * $slope[$i];
                    $m[$i + 1] = $t * $b * $slope[$i];
                }
            }
            $d = 'M'.nq_art_f($pts[0][0]).','.nq_art_f($pts[0][1]);
            for ($i = 0; $i < $n - 1; $i++) {
                [$x0, $y0] = $pts[$i];
                [$x1, $y1] = $pts[$i + 1];
                $h = $dx[$i] / 3;
                $d .= 'C'.nq_art_f($x0 + $h).','.nq_art_f($y0 + $m[$i] * $h).','.nq_art_f($x1 - $h).','.nq_art_f($y1 - $m[$i + 1] * $h).','.nq_art_f($x1).','.nq_art_f($y1);
            }

            return $d;
        }

        /**
         * Geometry of a bar, line or area chart in a 600 x 224 viewBox, mirrored for RTL.
         * $data: rows of ['x' => label, 's0' => number, ...]; $keys: ['s0', ...]; $labels: series labels (hover text).
         */
        function nq_art_cartesian(string $kind, array $keys, array $data, bool $rtl, string $locale, array $labels): array
        {
            $W = 600;
            $H = 224;
            $L = 44;
            $R = 8;
            $T = 8;
            $B = 26;
            $values = [];
            foreach ($data as $row) {
                foreach ($keys as $k) {
                    $values[] = (float) $row[$k];
                }
            }
            $ticks = nq_art_ticks(min(0, ...($values ?: [0])), max(0, ...($values ?: [0])));
            $lo = $ticks[0];
            $hi = $ticks[count($ticks) - 1];
            $span = ($hi - $lo) ?: 1;
            $ph = $H - $T - $B;
            $pw = $W - $L - $R;
            $yOf = fn ($v) => $T + $ph - (($v - $lo) / $span) * $ph;
            $mx = fn ($x) => $rtl ? $W - $x : $x;
            $n = count($data);
            $band = $n ? $pw / $n : $pw;
            $bandX = fn ($i) => $L + $i * $band;
            $centre = fn ($i) => $kind === 'bar' ? $bandX($i) + $band / 2 : ($n === 1 ? $L + $pw / 2 : $L + ($i / ($n - 1)) * $pw);
            $fmt = fn ($v) => nq_art_fmt($v, $locale, true);

            $out = ['width' => $W, 'height' => $H, 'grid' => [], 'yTicks' => [], 'xTicks' => [], 'bars' => [], 'lines' => [], 'areas' => [], 'bands' => []];
            foreach ($ticks as $v) {
                $out['grid'][] = ['y' => nq_art_f($yOf($v)), 'x1' => nq_art_f($rtl ? $R : $L), 'x2' => nq_art_f($rtl ? $W - $L : $W - $R)];
                $out['yTicks'][] = ['x' => nq_art_f($rtl ? $W - $L + 6 : $L - 6), 'y' => nq_art_f($yOf($v) + 4), 'text' => $fmt($v), 'anchor' => $rtl ? 'start' : 'end'];
            }
            $every = max(1, (int) ceil(56 / max($band, 1)));
            foreach ($data as $i => $row) {
                if ($i % $every === 0) {
                    $out['xTicks'][] = ['x' => nq_art_f($mx($centre($i))), 'y' => $H - 8, 'text' => (string) $row['x']];
                }
            }
            $count = count($keys);
            foreach ($keys as $s => $key) {
                if ($kind === 'bar') {
                    $bw = ($band * 0.8) / $count;
                    foreach ($data as $i => $row) {
                        $x0 = $bandX($i) + $band * 0.1 + $s * $bw;
                        $v = (float) $row[$key];
                        $y0 = $yOf(0);
                        $y1 = $yOf($v);
                        $top = min($y0, $y1);
                        $h = abs($y0 - $y1);
                        if ($h == 0) {
                            continue;
                        }
                        $r = min(4, $bw / 2, $h);
                        $left = $rtl ? $W - ($x0 + $bw) : $x0;
                        $right = $left + $bw;
                        $f = 'nq_art_f';
                        $out['bars'][] = ['key' => $key, 'd' => $v >= 0
                            ? "M{$f($left)},{$f($top + $h)}V{$f($top + $r)}Q{$f($left)},{$f($top)},{$f($left + $r)},{$f($top)}H{$f($right - $r)}Q{$f($right)},{$f($top)},{$f($right)},{$f($top + $r)}V{$f($top + $h)}Z"
                            : "M{$f($left)},{$f($top)}V{$f($top + $h - $r)}Q{$f($left)},{$f($top + $h)},{$f($left + $r)},{$f($top + $h)}H{$f($right - $r)}Q{$f($right)},{$f($top + $h)},{$f($right)},{$f($top + $h - $r)}V{$f($top)}Z"];
                    }
                } else {
                    $pts = [];
                    foreach ($data as $i => $row) {
                        $pts[] = [$mx($centre($i)), $yOf((float) $row[$key])];
                    }
                    $line = nq_art_monotone($pts);
                    $out['lines'][] = ['key' => $key, 'd' => $line];
                    if ($kind === 'area' && $pts) {
                        $base = nq_art_f($yOf(0));
                        $out['areas'][] = ['key' => $key, 'd' => $line.'L'.nq_art_f($pts[count($pts) - 1][0]).','.$base.'L'.nq_art_f($pts[0][0]).','.$base.'Z'];
                    }
                }
            }
            foreach ($data as $i => $row) {
                $x0 = $bandX($i);
                $left = $rtl ? $W - ($x0 + $band) : $x0;
                $tipRows = [];
                foreach ($keys as $s => $k) {
                    $tipRows[] = ['color' => "var(--color-$k)", 'label' => (string) ($labels[$s] ?? $k), 'text' => $fmt((float) $row[$k])];
                }
                $out['bands'][] = ['x' => nq_art_f($left), 'width' => nq_art_f($band), 'tip' => ['heading' => (string) $row['x'], 'rows' => $tipRows]];
            }

            return $out;
        }

        /** Slice paths for a pie (inner 0) or donut (inner 58%), starting at 12 o'clock, clockwise. */
        function nq_art_pie(array $slices, bool $donut, array $names, string $locale, int $width = 600, int $height = 256): array
        {
            $cx = $width / 2;
            $cy = $height / 2;
            $max = min($width, $height) / 2;
            $outer = $max * 0.8;
            $inner = $donut ? $max * 0.58 : 0;
            $total = array_sum(array_column($slices, 'value')) ?: 1;
            $pt = fn ($r, $a) => nq_art_f($cx + $r * sin($a)).','.nq_art_f($cy - $r * cos($a));
            $acc = 0;
            $out = [];
            foreach ($slices as $i => $s) {
                $a0 = ($acc / $total) * M_PI * 2;
                $acc += $s['value'];
                $a1 = min(($acc / $total) * M_PI * 2, $a0 + M_PI * 2 - 0.0001);
                $large = $a1 - $a0 > M_PI ? 1 : 0;
                $d = $inner
                    ? 'M'.$pt($outer, $a0).'A'.nq_art_f($outer).','.nq_art_f($outer).",0,$large,1,".$pt($outer, $a1).'L'.$pt($inner, $a1).'A'.nq_art_f($inner).','.nq_art_f($inner).",0,$large,0,".$pt($inner, $a0).'Z'
                    : 'M'.nq_art_f($cx).','.nq_art_f($cy).'L'.$pt($outer, $a0).'A'.nq_art_f($outer).','.nq_art_f($outer).",0,$large,1,".$pt($outer, $a1).'Z';
                $out[] = ['key' => "p$i", 'd' => $d, 'tip' => ['heading' => '', 'rows' => [['color' => "var(--color-p$i)", 'label' => (string) ($names[$i] ?? ''), 'text' => nq_art_fmt($s['value'], $locale)]]]];
            }

            return ['width' => $width, 'height' => $height, 'slices' => $out];
        }
    }
@endphp
