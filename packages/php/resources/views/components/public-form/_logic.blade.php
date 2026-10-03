{{-- Internal: the words and pure helpers of the public form, ported from public-form.tsx and form-model.ts (which fields show and which are
     required for the answers so far, the contact preset). Included with @include('nasaq::components.public-form._logic'); every function is
     defined once. The same rules run in the browser in public-form-logic.ts. --}}
@php
    if (! function_exists('nq_pf_words')) {
        /** The form's own words for the current locale, with the host's overrides on top. */
        function nq_pf_words(array $override = []): array
        {
            $en = [
                'submit' => 'Send', 'choose' => 'Choose an option', 'optional' => 'optional', 'closed' => 'This form is not accepting responses right now.',
                'another' => 'Send another response', 'failed' => 'Something went wrong. Please try again.', 'honeypot' => 'Leave this field empty',
                'preview' => 'Preview: nothing is sent.',
                'errors' => ['required' => 'This field is required.', 'email' => 'Enter a valid email address.', 'phone' => 'Enter a phone number with its country code.', 'number' => 'Enter a number.'],
            ];
            $ar = [
                'submit' => 'إرسال', 'choose' => 'اختر خيارًا', 'optional' => 'اختياري', 'closed' => 'هذا النموذج لا يستقبل ردودًا حاليًا.',
                'another' => 'إرسال رد آخر', 'failed' => 'حدث خطأ. حاول مرة أخرى.', 'honeypot' => 'اترك هذا الحقل فارغًا',
                'preview' => 'معاينة: لا يُرسل شيء.',
                'errors' => ['required' => 'هذا الحقل مطلوب.', 'email' => 'أدخل بريدًا إلكترونيًا صحيحًا.', 'phone' => 'أدخل رقم هاتف مع رمز الدولة.', 'number' => 'أدخل رقمًا.'],
            ];
            $words = \Nasaq\Nasaq::rtl() ? $ar : $en;
            foreach ($override as $k => $v) {
                $words[$k] = is_array($v) && is_array($words[$k] ?? null) ? array_merge($words[$k], $v) : $v;
            }

            return $words;
        }

        /** The Arabic or English text of a pair, falling back to the other one. */
        function nq_pf_text(?string $en, ?string $ar): string
        {
            return (\Nasaq\Nasaq::rtl() ? ($ar ?: $en) : ($en ?: $ar)) ?? '';
        }

        function nq_pf_digits(string $text): string
        {
            return strtr($text, ['٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
                '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9', '٫' => '.']);
        }

        function nq_pf_condition(array $c, array $fields, array $values): bool
        {
            $kind = null;
            foreach ($fields as $f) {
                if (($f['id'] ?? null) === ($c['field'] ?? null)) {
                    $kind = $f['kind'] ?? null;
                }
            }
            $raw = $values[$c['field'] ?? ''] ?? null;
            $text = $raw === null ? '' : (is_bool($raw) ? ($raw ? 'true' : 'false') : (string) $raw);
            $op = $c['op'] ?? '';
            if ($op === 'isEmpty') {
                return $text === '';
            }
            if ($op === 'isNotEmpty') {
                return $text !== '';
            }
            if ($kind === 'number') {
                $a = nq_pf_digits($text);
                $b = nq_pf_digits((string) ($c['value'] ?? ''));
                if ($text === '' || ! is_numeric($a) || ! is_numeric($b)) {
                    return $op === 'isNot';
                }
                $a = (float) $a;
                $b = (float) $b;

                return match ($op) { 'is' => $a == $b, 'isNot' => $a != $b, 'gt' => $a > $b, 'gte' => $a >= $b, 'lt' => $a < $b, default => $a <= $b };
            }
            $a = mb_strtolower($text);
            $b = mb_strtolower((string) ($c['value'] ?? ''));

            return match ($op) { 'is' => $a === $b, 'isNot' => $a !== $b, 'contains' => str_contains($a, $b), 'startsWith' => str_starts_with($a, $b), default => false };
        }

        function nq_pf_group(array $g, array $fields, array $values): bool
        {
            $results = array_map(fn ($n) => (($n['kind'] ?? '') === 'group') ? nq_pf_group($n, $fields, $values) : nq_pf_condition($n, $fields, $values), (array) ($g['children'] ?? []));
            if (! $results) {
                return true;
            }

            return ($g['join'] ?? 'and') === 'and' ? ! in_array(false, $results, true) : in_array(true, $results, true);
        }

        /** Which fields show and which are required for these answers: id => ['visible' => bool, 'required' => bool]. */
        function nq_pf_states(array $form, array $values): array
        {
            $shown = $shownTargets = $hidden = $required = [];
            foreach ((array) ($form['rules'] ?? []) as $rule) {
                $matched = nq_pf_group((array) ($rule['conditions'] ?? []), (array) $form['fields'], $values);
                foreach ((array) ($rule['actions'] ?? []) as $action) {
                    $target = (string) ($action['config']['target'] ?? '');
                    if ($target === '') {
                        continue;
                    }
                    $type = $action['type'] ?? '';
                    if ($type === 'show') {
                        $shownTargets[$target] = true;
                        if ($matched) {
                            $shown[$target] = true;
                        }
                    } elseif ($type === 'hide' && $matched) {
                        $hidden[$target] = true;
                    } elseif ($type === 'require' && $matched) {
                        $required[$target] = true;
                    }
                }
            }
            $out = [];
            foreach ((array) $form['fields'] as $f) {
                $id = $f['id'];
                $visible = ! isset($hidden[$id]) && (! isset($shownTargets[$id]) || isset($shown[$id]));
                $out[$id] = ['visible' => $visible, 'required' => $visible && (! empty($f['required']) || isset($required[$id]))];
            }

            return $out;
        }

        /** name, email, topic, message and the honeypot: the contact form every site needs. */
        function nq_pf_contact(?array $topics = null): array
        {
            $topics ??= [['value' => 'sales', 'label' => 'Sales', 'labelAr' => 'المبيعات'], ['value' => 'support', 'label' => 'Support', 'labelAr' => 'الدعم'], ['value' => 'other', 'label' => 'Something else', 'labelAr' => 'شيء آخر']];

            return [
                'name' => 'Contact', 'kind' => 'contact',
                'fields' => [
                    ['id' => 'name', 'kind' => 'text', 'label' => 'Your name', 'labelAr' => 'اسمك', 'required' => true],
                    ['id' => 'email', 'kind' => 'email', 'label' => 'Email', 'labelAr' => 'البريد الإلكتروني', 'required' => true],
                    ['id' => 'topic', 'kind' => 'select', 'label' => 'Topic', 'labelAr' => 'الموضوع', 'required' => true, 'options' => $topics],
                    ['id' => 'message', 'kind' => 'textarea', 'label' => 'Message', 'labelAr' => 'الرسالة', 'required' => true],
                ],
                'rules' => [], 'allowedOrigins' => [], 'enabled' => true,
                'thanksEn' => 'Thanks, we will get back to you soon.', 'thanksAr' => 'شكرًا لك، سنرد عليك قريبًا.', 'honeypot' => true,
            ];
        }
    }
@endphp
