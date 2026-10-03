{{-- Internal: the words of the mail-settings components (port of the strings in web/src/components/mail-settings/mail-settings.tsx).
     Included with @include('nasaq::components.mail-settings._mail-settings'); the function is defined once.
     Strings with a value in them use {port} / {n} / {a} placeholders. --}}
@php
    if (! function_exists('nq_mail_strings')) {
        /** The built-in words for a locale, with the labels laid over them. */
        function nq_mail_strings(string $locale, array $labels = []): array
        {
            $ar = str_starts_with($locale, 'ar');

            return array_merge($ar ? [
                'genericError' => 'حدث خطأ. حاول مرة أخرى.',
                'cancel' => 'إلغاء',
                'dismiss' => 'إغلاق',
                'smtpTitle' => 'SMTP',
                'smtpDescription' => 'خادم البريد الذي يرسل التطبيق عبره.',
                'host' => 'المضيف',
                'hostPlaceholder' => 'smtp.example.com',
                'hostInvalid' => 'أدخل اسم مضيف أو عنوان IP.',
                'port' => 'المنفذ',
                'portInvalid' => 'أدخل منفذًا من 1 إلى 65535.',
                'encryption' => 'التشفير',
                'encryptions' => [
                    'none' => 'بدون',
                    'starttls' => 'STARTTLS',
                    'tls' => 'SSL/TLS',
                ],
                'encryptionHint' => 'المنفذ المعتاد {port}.',
                'username' => 'اسم المستخدم',
                'password' => 'كلمة المرور',
                'passwordSaved' => 'توجد كلمة مرور محفوظة. اتركه فارغًا للإبقاء عليها.',
                'passwordPlaceholderSaved' => 'محفوظة',
                'passwordHint' => 'تُخزَّن للكتابة فقط ولا تُعرض مرة أخرى.',
                'fromName' => 'اسم المرسل',
                'fromNamePlaceholder' => 'نسق',
                'fromAddress' => 'عنوان المرسل',
                'fromAddressPlaceholder' => 'no-reply@example.com',
                'fromAddressInvalid' => 'أدخل بريدًا إلكترونيًا صحيحًا.',
                'save' => 'حفظ الإعدادات',
                'saved' => 'تم حفظ الإعدادات.',
                'testTitle' => 'إرسال بريد تجريبي',
                'testDescription' => 'يستخدم الإعدادات أعلاه، محفوظة أم لا، ويفحص كل خطوة في الاتصال.',
                'testTo' => 'إرسال إلى',
                'testToPlaceholder' => 'you@example.com',
                'testToInvalid' => 'أدخل بريدًا إلكترونيًا صحيحًا.',
                'sendTest' => 'إرسال تجريبي',
                'testing' => 'جارٍ الاختبار…',
                'testPassed' => 'تم إرسال البريد التجريبي.',
                'testFailed' => 'فشل الاختبار.',
                'steps' => [
                    'connect' => 'الاتصال بالخادم',
                    'tls' => 'تأمين الاتصال',
                    'auth' => 'تسجيل الدخول',
                    'send' => 'إرسال الرسالة',
                ],
                'stepState' => [
                    'pass' => 'نجحت',
                    'fail' => 'فشلت',
                    'skipped' => 'تم تخطيها',
                ],
                'testHost' => 'صحّح المضيف والمنفذ والعنوان أولًا.',
                'domainsTitle' => 'نطاقات البريد',
                'domainsDescription' => 'صناديق البريد والأسماء المستعارة لكل نطاق، مع سجلات DNS التي تجعل البريد قابلًا للتسليم.',
                'domain' => 'النطاق',
                'noDomains' => 'لا توجد نطاقات بريد',
                'noDomainsBody' => 'أضف نطاقًا لإنشاء صناديق بريد وأسماء مستعارة.',
                'health' => [
                    'healthy' => 'جاهز للإرسال',
                    'attention' => 'جارٍ الفحص',
                    'critical' => 'يحتاج سجلات DNS',
                ],
                'checklistTitle' => 'قائمة فحص DNS',
                'checklistDescription' => 'أضف هذه السجلات عند مزوّد DNS ثم افحص مرة أخرى.',
                'recheck' => 'افحص مرة أخرى',
                'checking' => 'جارٍ الفحص…',
                'lastChecked' => 'آخر فحص',
                'kinds' => [
                    'spf' => 'SPF',
                    'dkim' => 'DKIM',
                    'dmarc' => 'DMARC',
                ],
                'kindHelp' => [
                    'spf' => 'يحدد الخوادم المسموح لها بالإرسال باسم النطاق.',
                    'dkim' => 'يوقّع كل رسالة حتى لا يمكن تزويرها.',
                    'dmarc' => 'يخبر المستلمين بما يفعلونه بالبريد الذي يفشل في الفحصين السابقين.',
                ],
                'dnsStatus' => [
                    'pass' => 'صحيح',
                    'fail' => 'قيمة خاطئة',
                    'missing' => 'غير موجود',
                    'pending' => 'جارٍ الفحص',
                ],
                'recordName' => 'الاسم',
                'recordType' => 'النوع',
                'expected' => 'القيمة المتوقعة',
                'found' => 'الموجود',
                'nothingFound' => 'لا يوجد شيء.',
                'spfOpen' => 'يسمح هذا السجل لأي خادم بالإرسال باسم النطاق (+all). استخدم -all أو ~all.',
                'spfLookups' => '{n} عمليات بحث DNS. أكثر من 10 يكسر SPF.',
                'dmarcNone' => 'السياسة none للمراقبة فقط. انتقل إلى quarantine أو reject عندما تبدو التقارير نظيفة.',
                'mailboxesTitle' => 'صناديق البريد',
                'mailboxesDescription' => 'لكل صندوق تسجيل دخول وحصة خاصة.',
                'mailboxesTable' => 'صناديق البريد',
                'address' => 'العنوان',
                'quota' => 'الحصة',
                'used' => 'المستخدم',
                'addMailbox' => 'إضافة صندوق',
                'mailboxesEmpty' => 'لا توجد صناديق بريد',
                'localPart' => 'الاسم',
                'localPlaceholder' => 'info',
                'localInvalid' => 'استخدم الأحرف والأرقام و . _ + - فقط.',
                'quotaLabel' => 'الحصة (ميغابايت)',
                'quotaInvalid' => 'أدخل حجمًا بالميغابايت.',
                'mailboxPassword' => 'كلمة المرور',
                'mailboxPasswordInvalid' => 'استخدم 10 أحرف على الأقل.',
                'addMailboxTitle' => 'إضافة صندوق بريد',
                'add' => 'إضافة',
                'remove' => 'إزالة',
                'removeMailboxTitle' => 'إزالة {a}؟',
                'removeMailboxBody' => 'سيُحذف الصندوق وكل الرسائل فيه.',
                'aliasesTitle' => 'الأسماء المستعارة',
                'aliasesDescription' => 'حوّل عنوانًا إلى آخر. النجمة تلتقط كل ما تبقى.',
                'aliasesTable' => 'الأسماء المستعارة',
                'aliasSource' => 'الاسم المستعار',
                'aliasDestination' => 'يُحوَّل إلى',
                'aliasesEmpty' => 'لا توجد أسماء مستعارة',
                'addAlias' => 'إضافة اسم مستعار',
                'addAliasTitle' => 'إضافة اسم مستعار',
                'aliasSourceLabel' => 'الاسم المستعار',
                'aliasSourcePlaceholder' => 'sales',
                'aliasSourceInvalid' => 'استخدم الأحرف والأرقام و . _ + - أو نجمة.',
                'aliasDestLabel' => 'التحويل إلى',
                'aliasDestPlaceholder' => 'team@example.com',
                'aliasDestInvalid' => 'أدخل بريدًا إلكترونيًا صحيحًا.',
                'removeAliasTitle' => 'إزالة {a}؟',
                'removeAliasBody' => 'الرسائل المرسلة إلى هذا الاسم ستُرتد.',
                'copyRecord' => 'نسخ السجل',
            ] : [
                'genericError' => 'Something went wrong. Try again.',
                'cancel' => 'Cancel',
                'dismiss' => 'Dismiss',
                'smtpTitle' => 'SMTP',
                'smtpDescription' => 'The mail server the app sends through.',
                'host' => 'Host',
                'hostPlaceholder' => 'smtp.example.com',
                'hostInvalid' => 'Enter a host name or IP address.',
                'port' => 'Port',
                'portInvalid' => 'Enter a port from 1 to 65535.',
                'encryption' => 'Encryption',
                'encryptions' => [
                    'none' => 'None',
                    'starttls' => 'STARTTLS',
                    'tls' => 'SSL/TLS',
                ],
                'encryptionHint' => 'Usual port {port}.',
                'username' => 'Username',
                'password' => 'Password',
                'passwordSaved' => 'A password is saved. Leave blank to keep it.',
                'passwordPlaceholderSaved' => 'Saved',
                'passwordHint' => 'Stored write-only. It is never shown again.',
                'fromName' => 'From name',
                'fromNamePlaceholder' => 'Nasaq',
                'fromAddress' => 'From address',
                'fromAddressPlaceholder' => 'no-reply@example.com',
                'fromAddressInvalid' => 'Enter a valid email address.',
                'save' => 'Save settings',
                'saved' => 'Settings saved.',
                'testTitle' => 'Send a test email',
                'testDescription' => 'Uses the settings above, saved or not. It checks each step of the connection.',
                'testTo' => 'Send to',
                'testToPlaceholder' => 'you@example.com',
                'testToInvalid' => 'Enter a valid email address.',
                'sendTest' => 'Send test',
                'testing' => 'Testing…',
                'testPassed' => 'The test email was sent.',
                'testFailed' => 'The test failed.',
                'steps' => [
                    'connect' => 'Connect to the server',
                    'tls' => 'Secure the connection',
                    'auth' => 'Sign in',
                    'send' => 'Send the message',
                ],
                'stepState' => [
                    'pass' => 'Passed',
                    'fail' => 'Failed',
                    'skipped' => 'Skipped',
                ],
                'testHost' => 'Fix the host, port and address first.',
                'domainsTitle' => 'Mail domains',
                'domainsDescription' => 'Mailboxes and aliases per domain, with the DNS records that make mail deliverable.',
                'domain' => 'Domain',
                'noDomains' => 'No mail domains',
                'noDomainsBody' => 'Add a domain to create mailboxes and aliases.',
                'health' => [
                    'healthy' => 'Ready to send',
                    'attention' => 'Checking',
                    'critical' => 'Needs DNS records',
                ],
                'checklistTitle' => 'DNS checklist',
                'checklistDescription' => 'Add these records at your DNS host. Then check again.',
                'recheck' => 'Check again',
                'checking' => 'Checking…',
                'lastChecked' => 'Last checked',
                'kinds' => [
                    'spf' => 'SPF',
                    'dkim' => 'DKIM',
                    'dmarc' => 'DMARC',
                ],
                'kindHelp' => [
                    'spf' => 'Says which servers may send for the domain.',
                    'dkim' => 'Signs each message so it cannot be forged.',
                    'dmarc' => 'Tells receivers what to do with mail that fails the two above.',
                ],
                'dnsStatus' => [
                    'pass' => 'Correct',
                    'fail' => 'Wrong value',
                    'missing' => 'Not found',
                    'pending' => 'Checking',
                ],
                'recordName' => 'Name',
                'recordType' => 'Type',
                'expected' => 'Expected value',
                'found' => 'Found',
                'nothingFound' => 'Nothing found.',
                'spfOpen' => 'This record lets any server send for the domain (+all). Use -all or ~all.',
                'spfLookups' => '{n} DNS lookups. More than 10 breaks SPF.',
                'dmarcNone' => 'Policy none only monitors. Move to quarantine or reject once reports look clean.',
                'mailboxesTitle' => 'Mailboxes',
                'mailboxesDescription' => 'Each has its own sign-in and quota.',
                'mailboxesTable' => 'Mailboxes',
                'address' => 'Address',
                'quota' => 'Quota',
                'used' => 'Used',
                'addMailbox' => 'Add mailbox',
                'mailboxesEmpty' => 'No mailboxes',
                'localPart' => 'Name',
                'localPlaceholder' => 'info',
                'localInvalid' => 'Use letters, digits and . _ + - only.',
                'quotaLabel' => 'Quota (MB)',
                'quotaInvalid' => 'Enter a size in MB.',
                'mailboxPassword' => 'Password',
                'mailboxPasswordInvalid' => 'Use at least 10 characters.',
                'addMailboxTitle' => 'Add a mailbox',
                'add' => 'Add',
                'remove' => 'Remove',
                'removeMailboxTitle' => 'Remove {a}?',
                'removeMailboxBody' => 'The mailbox and every message in it are deleted.',
                'aliasesTitle' => 'Aliases',
                'aliasesDescription' => 'Forward an address to another one. A star catches everything else.',
                'aliasesTable' => 'Aliases',
                'aliasSource' => 'Alias',
                'aliasDestination' => 'Forwards to',
                'aliasesEmpty' => 'No aliases',
                'addAlias' => 'Add alias',
                'addAliasTitle' => 'Add an alias',
                'aliasSourceLabel' => 'Alias name',
                'aliasSourcePlaceholder' => 'sales',
                'aliasSourceInvalid' => 'Use letters, digits and . _ + - or a star.',
                'aliasDestLabel' => 'Forward to',
                'aliasDestPlaceholder' => 'team@example.com',
                'aliasDestInvalid' => 'Enter a valid email address.',
                'removeAliasTitle' => 'Remove {a}?',
                'removeAliasBody' => 'Mail sent to this alias will bounce.',
                'copyRecord' => 'Copy record',
            ], $labels);
        }
    }
@endphp
@php
    if (! function_exists('nq_mail_health')) {
        /** healthy when SPF, DKIM and DMARC all pass, critical when any is missing or failing, otherwise attention. */
        function nq_mail_health(array $checks): string
        {
            $by = [];
            foreach ($checks as $c) {
                $by[$c['kind']] = $c['status'];
            }
            $statuses = array_map(fn ($k) => $by[$k] ?? 'missing', ['spf', 'dkim', 'dmarc']);
            if (count(array_filter($statuses, fn ($s) => $s === 'pass')) === 3) {
                return 'healthy';
            }

            return array_filter($statuses, fn ($s) => $s === 'fail' || $s === 'missing') ? 'critical' : 'attention';
        }

        /** Warnings from reading the record DNS returned: [open SPF, too many lookups, DMARC p=none]. */
        function nq_mail_warnings(string $kind, ?string $found, array $t): array
        {
            $out = [];
            if (! $found) {
                return $out;
            }
            $text = preg_replace('/^"|"$/', '', trim($found));
            if ($kind === 'spf' && preg_match('/^v=spf1(\s|$)/i', $text)) {
                $terms = array_slice(preg_split('/\s+/', $text), 1);
                $all = collect($terms)->first(fn ($x) => preg_match('/^[+\-~?]?all$/i', $x));
                if ($all !== null && ! preg_match('/^[\-~?]/', $all)) {
                    $out[] = $t['spfOpen'];
                }
                $lookups = count(array_filter($terms, fn ($x) => preg_match('/^[+\-~?]?(include|a|mx|ptr|exists|redirect)([:=\/]|$)/i', $x)));
                if ($lookups > 10) {
                    $out[] = str_replace('{n}', (string) $lookups, $t['spfLookups']);
                }
            }
            if ($kind === 'dmarc' && preg_match('/^v=DMARC1\s*;/i', $text)) {
                foreach (explode(';', $text) as $part) {
                    $kv = explode('=', $part, 2);
                    if (count($kv) === 2 && strtolower(trim($kv[0])) === 'p' && strtolower(trim($kv[1])) === 'none') {
                        $out[] = $t['dmarcNone'];
                    }
                }
            }

            return $out;
        }

        /** Share of the quota used, clamped to 0..1. */
        function nq_mail_fraction(float $used, float $quota): float
        {
            return $quota <= 0 ? 0.0 : min(1.0, max(0.0, $used / $quota));
        }

        /** `500 MB`, `2 GB`, Latin digits. */
        function nq_mail_mb(float $mb): string
        {
            if ($mb < 0) {
                return '-';
            }
            if ($mb < 1024) {
                return round($mb).' MB';
            }
            $gb = $mb / 1024;

            return (0 + round($gb, $gb >= 100 ? 0 : 1)).' GB';
        }
    }
@endphp
