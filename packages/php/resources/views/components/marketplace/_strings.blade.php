{{-- Internal: the built-in strings shared by the marketplace parts (port of marketplace.tsx).
     Included with @include('nasaq::components.marketplace._strings'); the functions are defined once.
     Templates take :p (a publisher) and :n (a count). --}}
@php
    if (! function_exists('nq_marketplace_labels')) {
        /** The built-in strings (Arabic under an Arabic locale) with any overrides on top. */
        function nq_marketplace_labels(array $override = [], ?string $locale = null): array
        {
            $strings = [
                'en' => [
                    'extensions' => 'Extensions', 'templates' => 'Templates', 'view' => 'Browse', 'featured' => 'Featured', 'publish' => 'Publish',
                    'back' => 'Back to the store', 'install' => 'Install', 'overview' => 'Overview', 'changelog' => 'Changelog', 'reviews' => 'Reviews',
                    'screenshots' => 'Screenshots', 'permissions' => 'Permissions', 'permissionsHint' => 'What this extension can do once installed.',
                    'noPermissions' => 'It asks for no permissions.', 'risk' => ['low' => 'Low', 'medium' => 'Medium', 'high' => 'High'],
                    'links' => 'Links', 'details' => 'Details', 'publisher' => 'Publisher', 'version' => 'Version', 'updated' => 'Updated', 'category' => 'Category',
                    'compatibility' => 'Works with', 'size' => 'Size', 'license' => 'License', 'tags' => 'Tags', 'installs' => 'installs', 'by' => 'by :p',
                    'noChangelog' => 'No release notes yet.', 'noReviews' => 'No reviews yet.', 'related' => 'More like this', 'uninstall' => 'Uninstall',
                    'uninstalling' => 'Removing', 'failed' => 'Something went wrong. Try again.', 'free' => 'Free',
                    'publishTitle' => 'Publish an extension', 'publishBody' => 'Send it for review. Once approved it appears in the store.',
                    'name' => 'Name', 'summary' => 'One-line summary', 'summaryHint' => 'Up to :n characters.', 'description' => 'Description',
                    'categoryLabel' => 'Category', 'categoryPlaceholder' => 'Choose a category', 'versionLabel' => 'Version', 'repository' => 'Source repository',
                    'repositoryHint' => 'A public https link, for review.', 'pricing' => 'Price', 'pricingFree' => 'Free', 'pricingPaid' => 'Paid',
                    'priceAmount' => 'Price per month', 'tagsLabel' => 'Tags', 'tagsPlaceholder' => 'Add a tag and press Enter',
                    'permissionsLabel' => 'Permissions it asks for', 'cancel' => 'Cancel', 'submit' => 'Submit for review', 'submitting' => 'Sending',
                    'submitted' => 'Sent for review. We will email you when it is approved.',
                    'errors' => ['required' => 'This is required.', 'invalid' => 'Check this value.', 'tooLong' => 'This is too long.'],
                    'templatesSearch' => 'Templates', 'useTemplate' => 'Use template', 'using' => 'Creating', 'uses' => 'uses',
                    'noTemplates' => 'No templates here yet', 'noTemplatesBody' => 'Pick another category.', 'allTemplates' => 'All',
                    'templateCategories' => 'Template categories', 'preview' => 'Preview',
                ],
                'ar' => [
                    'extensions' => 'الإضافات', 'templates' => 'القوالب', 'view' => 'تصفّح', 'featured' => 'مميّزة', 'publish' => 'انشر',
                    'back' => 'العودة إلى المتجر', 'install' => 'تثبيت', 'overview' => 'نظرة عامة', 'changelog' => 'سجل التغييرات', 'reviews' => 'التقييمات',
                    'screenshots' => 'لقطات الشاشة', 'permissions' => 'الصلاحيات', 'permissionsHint' => 'ما تستطيع هذه الإضافة فعله بعد تثبيتها.',
                    'noPermissions' => 'لا تطلب أي صلاحيات.', 'risk' => ['low' => 'منخفضة', 'medium' => 'متوسطة', 'high' => 'عالية'],
                    'links' => 'الروابط', 'details' => 'التفاصيل', 'publisher' => 'الناشر', 'version' => 'الإصدار', 'updated' => 'آخر تحديث', 'category' => 'الفئة',
                    'compatibility' => 'يعمل مع', 'size' => 'الحجم', 'license' => 'الترخيص', 'tags' => 'الوسوم', 'installs' => 'تثبيت', 'by' => 'من :p',
                    'noChangelog' => 'لا ملاحظات إصدار بعد.', 'noReviews' => 'لا تقييمات بعد.', 'related' => 'المزيد مثلها', 'uninstall' => 'إزالة',
                    'uninstalling' => 'جارٍ الإزالة', 'failed' => 'حدث خطأ ما. حاول مرة أخرى.', 'free' => 'مجاني',
                    'publishTitle' => 'انشر إضافة', 'publishBody' => 'أرسلها للمراجعة. عند الموافقة تظهر في المتجر.',
                    'name' => 'الاسم', 'summary' => 'ملخص في سطر', 'summaryHint' => 'حتى :n حرفًا.', 'description' => 'الوصف',
                    'categoryLabel' => 'الفئة', 'categoryPlaceholder' => 'اختر فئة', 'versionLabel' => 'الإصدار', 'repository' => 'مستودع المصدر',
                    'repositoryHint' => 'رابط https عام، للمراجعة.', 'pricing' => 'السعر', 'pricingFree' => 'مجاني', 'pricingPaid' => 'مدفوع',
                    'priceAmount' => 'السعر شهريًا', 'tagsLabel' => 'الوسوم', 'tagsPlaceholder' => 'أضف وسمًا واضغط Enter',
                    'permissionsLabel' => 'الصلاحيات التي تطلبها', 'cancel' => 'إلغاء', 'submit' => 'أرسل للمراجعة', 'submitting' => 'جارٍ الإرسال',
                    'submitted' => 'أُرسلت للمراجعة. سنراسلك عند الموافقة عليها.',
                    'errors' => ['required' => 'هذا الحقل مطلوب.', 'invalid' => 'تحقق من هذه القيمة.', 'tooLong' => 'النص أطول من اللازم.'],
                    'templatesSearch' => 'القوالب', 'useTemplate' => 'استخدم القالب', 'using' => 'جارٍ الإنشاء', 'uses' => 'استخدام',
                    'noTemplates' => 'لا قوالب هنا بعد', 'noTemplatesBody' => 'اختر فئة أخرى.', 'allTemplates' => 'الكل',
                    'templateCategories' => 'فئات القوالب', 'preview' => 'معاينة',
                ],
            ];
            $base = $strings[\Nasaq\Nasaq::rtl($locale) ? 'ar' : 'en'];
            $merged = array_merge($base, $override);
            $merged['risk'] = array_merge($base['risk'], (array) ($override['risk'] ?? []));
            $merged['errors'] = array_merge($base['errors'], (array) ($override['errors'] ?? []));

            return $merged;
        }
    }
    if (! function_exists('nq_marketplace_risk')) {
        /** The highest risk in a permission list ('low' | 'medium' | 'high'), or null when it is empty. */
        function nq_marketplace_risk(array $permissions): ?string
        {
            $rank = ['low' => 0, 'medium' => 1, 'high' => 2];
            $best = null;
            foreach ($permissions as $p) {
                $r = $p['risk'] ?? 'low';
                if ($best === null || $rank[$r] > $rank[$best]) {
                    $best = $r;
                }
            }

            return $best;
        }
    }
    if (! function_exists('nq_marketplace_risk_tone')) {
        /** The badge variant of a risk level. */
        function nq_marketplace_risk_tone(?string $risk): string
        {
            return ['low' => 'neutral', 'medium' => 'warning', 'high' => 'danger'][$risk ?? 'low'] ?? 'neutral';
        }
    }
@endphp
