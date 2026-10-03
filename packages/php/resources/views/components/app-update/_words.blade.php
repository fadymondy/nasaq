{{-- Internal: the app-update words and helpers (en / ar). Included with @include('nasaq::components.app-update._words'); every function is defined once.
     Words with a value in them use {version} / {percent} / {build} / {current} / {min} / {count} placeholders (the JS side fills them in).
     Port of the strings in web/src/components/app-update/app-update.tsx and of app-update-format.ts. --}}
@php
    if (! function_exists('nq_au_words')) {
        /** The words for a locale, with $override laid over them. */
        function nq_au_words(string $locale, array $override = []): array
        {
            $en = [
            'pillAvailable' => 'Update available', 'pillDownloading' => 'Downloading {percent}%', 'pillReady' => 'Restart to update',
            'pillError' => 'Update failed', 'pillHint' => 'Version {version}', 'sheetTitle' => 'Version {version} is ready',
            'sheetDescription' => 'Build {build}', 'whatsNew' => 'What is new', 'noNotes' => 'Fixes and improvements.', 'typeNew' => 'New',
            'typeImproved' => 'Improved', 'typeFixed' => 'Fixed', 'download' => 'Download update', 'downloading' => 'Downloading update',
            'speed' => 'Speed', 'remaining' => 'left', 'size' => 'Size', 'restart' => 'Restart now', 'later' => 'Later', 'retry' => 'Try again',
            'readyNote' => 'The update is downloaded. Restarting takes a few seconds and keeps your work.',
            'errorNote' => 'The download did not finish. Check your connection and try again.', 'forcedTitle' => 'Please update to continue',
            'forcedBody' => 'This version is no longer supported. Update to keep using the app.',
            'forcedVersions' => 'You have build {current}. The oldest supported build is {min}.', 'managerTitle' => 'Releases',
            'managerDescription' => 'Publish builds, roll them out slowly and decide the oldest build that may still run.',
            'minBuild' => 'Minimum supported build', 'minBuildHint' => 'Builds below this are stopped and must update.', 'save' => 'Save',
            'saved' => 'Saved', 'invalid' => 'Enter a whole number, 0 or more.', 'tooHigh' => 'That is newer than the latest release.',
            'blocked' => '{count} people are on a build below this and will be asked to update.', 'version' => 'Version', 'build' => 'Build',
            'channel' => 'Channel', 'released' => 'Released', 'rollout' => 'Rollout', 'status' => 'Status', 'actions' => 'Actions',
            'stable' => 'Stable', 'beta' => 'Beta', 'draft' => 'Draft', 'live' => 'Live', 'rolledBack' => 'Rolled back', 'publish' => 'Publish',
            'rollback' => 'Roll back', 'releasesLabel' => 'Releases', 'empty' => 'No releases yet.', 'minTag' => 'Min',
            ];
            $ar = [
            'pillAvailable' => 'تحديث متاح', 'pillDownloading' => 'جارٍ التنزيل {percent}%', 'pillReady' => 'أعد التشغيل للتحديث',
            'pillError' => 'فشل التحديث', 'pillHint' => 'الإصدار {version}', 'sheetTitle' => 'الإصدار {version} جاهز',
            'sheetDescription' => 'النسخة {build}', 'whatsNew' => 'الجديد', 'noNotes' => 'إصلاحات وتحسينات.', 'typeNew' => 'جديد',
            'typeImproved' => 'تحسين', 'typeFixed' => 'إصلاح', 'download' => 'تنزيل التحديث', 'downloading' => 'جارٍ تنزيل التحديث',
            'speed' => 'السرعة', 'remaining' => 'متبقية', 'size' => 'الحجم', 'restart' => 'أعد التشغيل الآن', 'later' => 'لاحقاً',
            'retry' => 'حاول مرة أخرى', 'readyNote' => 'تم تنزيل التحديث. إعادة التشغيل تستغرق ثوانٍ ولا تفقدك عملك.',
            'errorNote' => 'لم يكتمل التنزيل. تحقق من اتصالك وحاول مرة أخرى.', 'forcedTitle' => 'يرجى التحديث للمتابعة',
            'forcedBody' => 'هذا الإصدار لم يعد مدعوماً. حدّث التطبيق لتواصل استخدامه.',
            'forcedVersions' => 'لديك النسخة {current}. أقدم نسخة مدعومة هي {min}.', 'managerTitle' => 'الإصدارات',
            'managerDescription' => 'انشر النسخ، وأطلقها تدريجياً، وحدد أقدم نسخة يُسمح لها بالعمل.', 'minBuild' => 'أدنى نسخة مدعومة',
            'minBuildHint' => 'النسخ الأقدم من هذا الرقم تتوقف ويجب أن تُحدَّث.', 'save' => 'حفظ', 'saved' => 'تم الحفظ',
            'invalid' => 'أدخل رقماً صحيحاً، صفراً أو أكثر.', 'tooHigh' => 'هذا الرقم أحدث من آخر إصدار.',
            'blocked' => '{count} مستخدماً على نسخة أقدم من هذا الرقم وسيُطلب منهم التحديث.', 'version' => 'الإصدار', 'build' => 'النسخة',
            'channel' => 'القناة', 'released' => 'تاريخ الإصدار', 'rollout' => 'الإطلاق', 'status' => 'الحالة', 'actions' => 'الإجراءات',
            'stable' => 'مستقر', 'beta' => 'تجريبي', 'draft' => 'مسودة', 'live' => 'منشور', 'rolledBack' => 'تم التراجع', 'publish' => 'نشر',
            'rollback' => 'تراجع', 'releasesLabel' => 'الإصدارات', 'empty' => 'لا توجد إصدارات بعد.', 'minTag' => 'الأدنى',
            ];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }
    }

    if (! function_exists('nq_au_fill')) {
        /** Fills {name} placeholders. */
        function nq_au_fill(string $text, array $values): string
        {
            return (string) preg_replace_callback('/\{(\w+)\}/', fn ($m) => (string) ($values[$m[1]] ?? ''), $text);
        }
    }

    if (! function_exists('nq_au_size')) {
        /** Bytes as "46 MB" (Latin digits in every locale). */
        function nq_au_size(float|int $bytes, string $locale = 'en'): string
        {
            $units = str_starts_with($locale, 'ar') ? ['بايت', 'كيلوبايت', 'م.ب', 'غ.ب'] : ['byte', 'kB', 'MB', 'GB'];
            $value = max(0, $bytes);
            $i = 0;
            while ($value >= 1024 && $i < 3) {
                $value /= 1024;
                $i++;
            }
            $digits = ($value >= 100 || $i === 0) ? 0 : 1;
            $text = number_format($value, $digits, '.', '');
            if ($digits === 1) {
                $text = rtrim(rtrim($text, '0'), '.');
            }

            return $text.' '.$units[$i];
        }
    }

    if (! function_exists('nq_au_percent')) {
        /** Clamps a percentage into 0..100. */
        function nq_au_percent(float|int|null $value): float
        {
            return $value === null || ! is_finite((float) $value) ? 0.0 : (float) max(0, min(100, $value));
        }
    }
@endphp
