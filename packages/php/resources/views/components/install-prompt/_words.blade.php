{{-- Internal: the install-prompt words and helpers (en / ar). Included with @include('nasaq::components.install-prompt._words'); every function is defined once.
     Words with a value in them use {app} / {name} placeholders (the JS side fills them in). Port of the strings in web/src/components/install-prompt/install-prompt.tsx. --}}
@php
    if (! function_exists('nq_ip_words')) {
        /** The words for a locale, with $override laid over them. */
        function nq_ip_words(string $locale, array $override = []): array
        {
            $en = [
            'title' => 'Install {app}', 'description' => 'Add it to your device for a faster start, a full-screen window and offline access.',
            'benefitFast' => 'Opens in one tap, like any app', 'benefitOffline' => 'Keeps working when the connection drops',
            'benefitAlerts' => 'Can send you alerts on this device', 'install' => 'Install', 'installing' => 'Installing', 'later' => 'Not now',
            'done' => 'Done', 'installedTitle' => '{app} is installed', 'installedBody' => 'Open it from your home screen or app list.',
            'iosIntro' => 'Safari does not show an install button. Add it yourself in two steps.',
            'iosStep1' => 'Tap the Share button in the toolbar', 'iosStep2' => 'Choose Add to Home Screen, then Add',
            'unsupportedBody' => 'This browser can not install apps. Open the page in Chrome, Edge or Safari to install it.',
            'pushTitle' => 'Notifications on this device',
            'pushDescription' => 'Each device is turned on by itself, so your phone can buzz while your laptop stays quiet.',
            'pushSwitch' => 'Send notifications to this device', 'pushOn' => 'This device will get notifications.',
            'pushOff' => 'This device will not get notifications.',
            'pushNeedsInstall' => 'On iPhone and iPad, install the app to your home screen first. Notifications only work from the installed app.',
            'devices' => 'Your devices', 'thisDevice' => 'This device', 'lastSeen' => 'Last seen', 'remove' => 'Remove {name}',
            'test' => 'Send a test', 'noDevices' => 'No other devices yet.',
            ];
            $ar = [
            'title' => 'ثبّت {app}', 'description' => 'أضفه إلى جهازك لبداية أسرع ونافذة كاملة وعمل دون اتصال.',
            'benefitFast' => 'يفتح بلمسة واحدة كأي تطبيق', 'benefitOffline' => 'يواصل العمل عند انقطاع الاتصال',
            'benefitAlerts' => 'يمكنه إرسال تنبيهات إلى هذا الجهاز', 'install' => 'تثبيت', 'installing' => 'جارٍ التثبيت', 'later' => 'ليس الآن',
            'done' => 'تم', 'installedTitle' => 'تم تثبيت {app}', 'installedBody' => 'افتحه من الشاشة الرئيسية أو قائمة التطبيقات.',
            'iosIntro' => 'لا يعرض Safari زر تثبيت. أضفه بنفسك في خطوتين.', 'iosStep1' => 'اضغط زر المشاركة في شريط الأدوات',
            'iosStep2' => 'اختر إضافة إلى الشاشة الرئيسية ثم إضافة',
            'unsupportedBody' => 'هذا المتصفح لا يدعم تثبيت التطبيقات. افتح الصفحة في Chrome أو Edge أو Safari لتثبيته.',
            'pushTitle' => 'الإشعارات على هذا الجهاز', 'pushDescription' => 'يُفعَّل كل جهاز على حدة، فيهتز هاتفك بينما يبقى حاسوبك هادئاً.',
            'pushSwitch' => 'إرسال الإشعارات إلى هذا الجهاز', 'pushOn' => 'سيستلم هذا الجهاز الإشعارات.',
            'pushOff' => 'لن يستلم هذا الجهاز الإشعارات.',
            'pushNeedsInstall' => 'على iPhone وiPad ثبّت التطبيق على الشاشة الرئيسية أولاً. تعمل الإشعارات من التطبيق المثبّت فقط.',
            'devices' => 'أجهزتك', 'thisDevice' => 'هذا الجهاز', 'lastSeen' => 'آخر ظهور', 'remove' => 'إزالة {name}',
            'test' => 'أرسل إشعاراً تجريبياً', 'noDevices' => 'لا توجد أجهزة أخرى بعد.',
            ];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }
    }

    if (! function_exists('nq_ip_fill')) {
        /** Fills {name} placeholders. */
        function nq_ip_fill(string $text, array $values): string
        {
            return (string) preg_replace_callback('/\{(\w+)\}/', fn ($m) => (string) ($values[$m[1]] ?? ''), $text);
        }
    }
@endphp
