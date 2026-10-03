{{-- Internal: the desktop-notification words (en / ar). Included with @include('nasaq::components.desktop-notification._words'); defined once. --}}
@php
    if (! function_exists('nq_dn_words')) {
        /** The words for a locale, with $override laid over them. */
        function nq_dn_words(string $locale, array $override = []): array
        {
            $en = [
                'close' => 'Close', 'options' => 'Options', 'now' => 'now', 'stack' => 'Notifications',
                'askTitle' => 'Turn on desktop notifications?', 'askBody' => 'Get a quiet alert when something needs you, even when this window is in the background.',
                'enable' => 'Turn on', 'later' => 'Not now',
                'waitingTitle' => 'Waiting for your system', 'waitingBody' => 'Choose Allow in the system dialog to finish.',
                'grantedTitle' => 'Desktop notifications are on', 'grantedBody' => 'You will see alerts here. You can turn them off in system settings.',
                'test' => 'Send a test',
                'deniedTitle' => 'Notifications are blocked', 'deniedBody' => 'This app is not allowed to show alerts. Allow it in your system settings, then come back.',
                'openSettings' => 'Open settings',
                'unsupportedTitle' => 'Not available here', 'unsupportedBody' => 'Your system does not support desktop notifications.',
            ];
            $ar = [
                'close' => 'إغلاق', 'options' => 'خيارات', 'now' => 'الآن', 'stack' => 'الإشعارات',
                'askTitle' => 'تفعيل إشعارات سطح المكتب؟', 'askBody' => 'احصل على تنبيه هادئ عندما يحتاجك أمر ما، حتى لو كانت هذه النافذة في الخلفية.',
                'enable' => 'تفعيل', 'later' => 'ليس الآن',
                'waitingTitle' => 'بانتظار نظامك', 'waitingBody' => 'اختر السماح في نافذة النظام لإتمام التفعيل.',
                'grantedTitle' => 'إشعارات سطح المكتب مفعلة', 'grantedBody' => 'ستظهر التنبيهات هنا. يمكنك إيقافها من إعدادات النظام.',
                'test' => 'أرسل إشعاراً تجريبياً',
                'deniedTitle' => 'الإشعارات محظورة', 'deniedBody' => 'لا يُسمح لهذا التطبيق بإظهار التنبيهات. اسمح به من إعدادات النظام ثم عد.',
                'openSettings' => 'فتح الإعدادات',
                'unsupportedTitle' => 'غير متاح هنا', 'unsupportedBody' => 'نظامك لا يدعم إشعارات سطح المكتب.',
            ];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }
    }
@endphp
