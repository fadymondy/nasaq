{{-- Internal: the words and pure helpers of the form builder, ported from form-builder.tsx and form-model.ts (the embed snippet, origin
     normalisation). Included with @include('nasaq::components.form-builder._logic'); every function is defined once. The browser side is
     form-builder.ts / form-builder-logic.ts. --}}
@include('nasaq::components.public-form._logic')
@php
    if (! function_exists('nq_fb_words')) {
        /** The builder's own words for the current locale, with the host's overrides on top. */
        function nq_fb_words(array $override = [], ?bool $forceAr = null): array
        {
            $en = [
                'tabs' => [
                    'fields' => 'Fields',
                    'logic' => 'Logic',
                    'settings' => 'Settings',
                    'embed' => 'Embed',
                ],
                'name' => 'Form name',
                'enabled' => 'Accepting responses',
                'save' => 'Save form',
                'addField' => 'Add a field',
                'kinds' => [
                    'text' => 'Short text',
                    'email' => 'Email',
                    'phone' => 'Phone',
                    'number' => 'Number',
                    'textarea' => 'Long text',
                    'select' => 'Dropdown',
                    'radio' => 'Choice',
                    'checkbox' => 'Checkbox',
                ],
                'untitled' => 'Untitled field',
                'required' => 'Required',
                'moveUp' => 'Move up',
                'moveDown' => 'Move down',
                'duplicate' => 'Duplicate',
                'remove' => 'Remove field',
                'fieldList' => 'Form fields',
                'noFields' => 'No fields yet. Add one to start.',
                'editing' => 'Field settings',
                'labelEn' => 'Label (English)',
                'labelAr' => 'Label (Arabic)',
                'kind' => 'Type',
                'isRequired' => 'Visitors must fill this in',
                'placeholder' => 'Placeholder',
                'help' => 'Help text',
                'options' => 'Options',
                'optionsHint' => 'One per line. Write the Arabic after a bar: Riyadh | الرياض',
                'preview' => 'Live preview',
                'logicIntro' => 'Show, hide or require a field depending on what the visitor answered.',
                'addRule' => 'Add a rule',
                'removeRule' => 'Remove rule',
                'rule' => 'Rule {n}',
                'noRules' => 'No rules. Every field always shows.',
                'event' => 'An answer changes',
                'show' => 'Show field',
                'hide' => 'Hide field',
                'requireField' => 'Require field',
                'target' => 'Field',
                'origins' => 'Allowed sites',
                'originsHint' => 'Where this form may be embedded. Separate with a comma or Enter, for example https://example.com or https://*.example.com.',
                'originsAdd' => 'https://example.com',
                'originsInvalid' => 'Use a full address that starts with http:// or https://.',
                'originsClosed' => 'Closed: no site can embed this form until you add its address.',
                'originsOpen' => 'Open to {n} site(s).',
                'originTest' => 'Try an address',
                'originTestAllowed' => 'Allowed',
                'originTestBlocked' => 'Blocked',
                'thanksEn' => 'Thank-you message (English)',
                'thanksAr' => 'Thank-you message (Arabic)',
                'honeypot' => 'Hide a trap field from bots',
                'honeypotHint' => 'Bots fill it in, people never see it. Those submissions are dropped without telling the sender.',
                'embedIntro' => 'Paste this where the form should appear.',
                'iframe' => 'Iframe',
                'script' => 'Script',
                'copyLink' => 'Copy public link',
                'embedClosed' => 'This form is closed. Add the site under Settings first, or the snippet will be refused.',
                'ruleFieldsMissing' => 'Add fields first to build rules.',
            ];
            $ar = [
                'tabs' => [
                    'fields' => 'الحقول',
                    'logic' => 'المنطق',
                    'settings' => 'الإعدادات',
                    'embed' => 'التضمين',
                ],
                'name' => 'اسم النموذج',
                'enabled' => 'يستقبل الردود',
                'save' => 'حفظ النموذج',
                'addField' => 'إضافة حقل',
                'kinds' => [
                    'text' => 'نص قصير',
                    'email' => 'بريد إلكتروني',
                    'phone' => 'هاتف',
                    'number' => 'رقم',
                    'textarea' => 'نص طويل',
                    'select' => 'قائمة منسدلة',
                    'radio' => 'اختيار',
                    'checkbox' => 'خانة اختيار',
                ],
                'untitled' => 'حقل بلا عنوان',
                'required' => 'مطلوب',
                'moveUp' => 'نقل لأعلى',
                'moveDown' => 'نقل لأسفل',
                'duplicate' => 'تكرار',
                'remove' => 'حذف الحقل',
                'fieldList' => 'حقول النموذج',
                'noFields' => 'لا حقول بعد. أضف حقلًا للبدء.',
                'editing' => 'إعدادات الحقل',
                'labelEn' => 'العنوان (بالإنجليزية)',
                'labelAr' => 'العنوان (بالعربية)',
                'kind' => 'النوع',
                'isRequired' => 'يجب على الزائر تعبئته',
                'placeholder' => 'النص الإرشادي',
                'help' => 'نص مساعد',
                'options' => 'الخيارات',
                'optionsHint' => 'خيار في كل سطر. اكتب العربية بعد شرطة: Riyadh | الرياض',
                'preview' => 'معاينة مباشرة',
                'logicIntro' => 'أظهر حقلًا أو أخفِه أو اجعله مطلوبًا بحسب ما أجاب به الزائر.',
                'addRule' => 'إضافة قاعدة',
                'removeRule' => 'حذف القاعدة',
                'rule' => 'القاعدة {n}',
                'noRules' => 'لا قواعد. كل الحقول تظهر دائمًا.',
                'event' => 'تغيّرت إجابة',
                'show' => 'إظهار الحقل',
                'hide' => 'إخفاء الحقل',
                'requireField' => 'جعل الحقل مطلوبًا',
                'target' => 'الحقل',
                'origins' => 'المواقع المسموح بها',
                'originsHint' => 'المواقع التي يجوز تضمين النموذج فيها. افصل بفاصلة أو Enter، مثل https://example.com أو https://*.example.com.',
                'originsAdd' => 'https://example.com',
                'originsInvalid' => 'استخدم عنوانًا كاملًا يبدأ بـ http:// أو https://.',
                'originsClosed' => 'مغلق: لا يستطيع أي موقع تضمين النموذج حتى تضيف عنوانه.',
                'originsOpen' => 'مفتوح لـ {n} موقع.',
                'originTest' => 'جرّب عنوانًا',
                'originTestAllowed' => 'مسموح',
                'originTestBlocked' => 'محظور',
                'thanksEn' => 'رسالة الشكر (بالإنجليزية)',
                'thanksAr' => 'رسالة الشكر (بالعربية)',
                'honeypot' => 'إخفاء حقل فخ عن الروبوتات',
                'honeypotHint' => 'تعبئه الروبوتات ولا يراه الناس. تُهمل هذه الردود دون إخبار المرسل.',
                'embedIntro' => 'الصق هذا حيث يجب أن يظهر النموذج.',
                'iframe' => 'إطار iframe',
                'script' => 'سكربت',
                'copyLink' => 'نسخ الرابط العام',
                'embedClosed' => 'هذا النموذج مغلق. أضف الموقع من الإعدادات أولًا وإلا سيُرفض التضمين.',
                'ruleFieldsMissing' => 'أضف حقولًا أولًا لبناء القواعد.',
            ];
            $words = \Nasaq\Nasaq::rtl() ? $ar : $en;
            foreach ($override as $k => $v) {
                $words[$k] = is_array($v) && is_array($words[$k] ?? null) ? array_merge($words[$k], $v) : $v;
            }

            return $words;
        }

        /** "https://Example.com/path" to "https://example.com"; null for anything that is not an http(s) origin. */
        function nq_fb_origin(string $raw): ?string
        {
            $text = mb_strtolower(trim($raw));
            if (! preg_match('#^(https?)://(\*\.)?((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*)(:\d{1,5})?(?:[/?\#].*)?$#', $text, $m)) {
                return null;
            }
            if ($m[2] !== '' && ! str_contains($m[3], '.')) {
                return null;
            }

            return $m[1].'://'.$m[2].$m[3].($m[4] ?? '');
        }

        /** What to paste on the site: an iframe, or a script that mounts the form in a div. */
        function nq_fb_snippet(string $baseUrl, string $formKey, string $style = 'iframe', string $title = 'Form', int $height = 520): string
        {
            $base = rtrim($baseUrl, '/');
            if ($style === 'script') {
                return '<div data-nasaq-form="'.$formKey.'"></div>'."\n".'<script async src="'.$base.'/embed.js"></script>';
            }

            return '<iframe src="'.$base.'/f/'.$formKey.'" title="'.$title.'" width="100%" height="'.$height.'" style="border:0" loading="lazy"></iframe>';
        }
    }
@endphp
