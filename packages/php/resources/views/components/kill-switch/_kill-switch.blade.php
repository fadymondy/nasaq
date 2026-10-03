{{-- Internal: the words shared by the kill-switch parts (port of the strings in web/src/components/kill-switch/kill-switch.tsx).
     Included with @include('nasaq::components.kill-switch._kill-switch'); every function is defined once.
     Strings with a value in them use {name} / {who} / {n} placeholders (the JS side fills them in). --}}
@php
    if (! function_exists('nq_kill_switch_strings')) {
        /** The built-in words for a locale, with `$labels` laid over them. */
        function nq_kill_switch_strings(string $locale, array $labels = []): array
        {
            $ar = str_starts_with($locale, 'ar');

            return array_merge($ar ? [
                'title' => 'الإيقاف الطارئ', 'description' => 'أوقف كل الأتمتة دفعة واحدة. لن يعمل شيء حتى يستأنفها أحد.', 'running' => 'الأتمتة تعمل',
                'stopAll' => 'إيقاف كل الأتمتة', 'stopTitle' => 'إيقاف كل الأتمتة؟', 'stopBody' => 'تُلغى المهام الجارية وتُجمّد الجداول. لن يبدأ شيء حتى تستأنف.',
                'reasonLabel' => 'السبب', 'reasonPlaceholder' => 'اكتب سبب إيقاف كل شيء', 'reasonHint' => 'يراه كل أعضاء الفريق.', 'reasonRequired' => 'اكتب سببًا.',
                'stopConfirm' => 'أوقف كل شيء', 'cancel' => 'إلغاء', 'paused' => 'كل الأتمتة متوقفة مؤقتًا', 'pausedBy' => 'أوقفها {who}', 'reason' => 'السبب',
                'resume' => 'استئناف الأتمتة', 'resumeTitle' => 'استئناف كل الأتمتة؟', 'resumeBody' => 'تعود الجداول للعمل وتُنفّذ المهام المجمّدة. راجع سبب الإيقاف أولًا.',
                'resumeConfirm' => 'استئناف', 'failed' => 'تعذّر إتمام ذلك. حاول مرة أخرى.', 'browsersTitle' => 'المتصفحات المقترنة',
                'browsersBody' => 'متصفحات تستطيع تشغيل الأتمتة نيابةً عنك. ألغِ اقتران أي متصفح لا تعرفه.', 'browsersEmpty' => 'لا توجد متصفحات مقترنة',
                'browsersEmptyBody' => 'اقرن متصفحًا من إضافته لتشغيل أتمتة المتصفح.', 'thisBrowser' => 'هذا المتصفح', 'online' => 'متصل', 'offline' => 'غير متصل',
                'lastSeen' => 'آخر ظهور', 'unpair' => 'إلغاء الاقتران', 'unpairFor' => 'إلغاء اقتران {name}', 'unpairTitle' => 'إلغاء اقتران {name}؟',
                'unpairBody' => 'تتوقف أتمتته حتى تقرنه مرة أخرى.', 'bannerTitle' => 'الأتمتة متوقفة مؤقتًا', 'bannerHint' => 'لن يعمل شيء حتى تُستأنف.',
                'bannerResume' => 'استئناف', 'bannerResuming' => 'جارٍ الاستئناف…', 'since' => 'منذ',
            ] : [
                'title' => 'Emergency stop', 'description' => 'Stop every automation at once. Nothing runs again until someone resumes it.', 'running' => 'Automations are running',
                'stopAll' => 'Stop all automations', 'stopTitle' => 'Stop every automation?', 'stopBody' => 'Running jobs are cancelled and schedules are held. Nothing starts until you resume.',
                'reasonLabel' => 'Reason', 'reasonPlaceholder' => 'Say why you are stopping everything', 'reasonHint' => 'Everyone on the team sees this.', 'reasonRequired' => 'Give a reason.',
                'stopConfirm' => 'Stop everything', 'cancel' => 'Cancel', 'paused' => 'All automations are paused', 'pausedBy' => 'Paused by {who}', 'reason' => 'Reason',
                'resume' => 'Resume automations', 'resumeTitle' => 'Resume all automations?', 'resumeBody' => 'Schedules start again and held jobs run. Check the reason it was stopped first.',
                'resumeConfirm' => 'Resume', 'failed' => 'Could not complete this. Try again.', 'browsersTitle' => 'Paired browsers',
                'browsersBody' => 'Browsers that can run automations for you. Unpair any you do not recognise.', 'browsersEmpty' => 'No browsers are paired',
                'browsersEmptyBody' => 'Pair a browser from its extension to run browser automations.', 'thisBrowser' => 'This browser', 'online' => 'Online', 'offline' => 'Offline',
                'lastSeen' => 'Last seen', 'unpair' => 'Unpair', 'unpairFor' => 'Unpair {name}', 'unpairTitle' => 'Unpair {name}?',
                'unpairBody' => 'Its automations stop running until you pair it again.', 'bannerTitle' => 'Automations are paused', 'bannerHint' => 'Nothing runs until they are resumed.',
                'bannerResume' => 'Resume', 'bannerResuming' => 'Resuming…', 'since' => 'Since',
            ], $labels);
        }

        /** "14 automations are active" in the locale's plural form. */
        function nq_kill_switch_running_count(string $locale, int $n): string
        {
            if (str_starts_with($locale, 'ar')) {
                return $n === 1 ? 'أتمتة واحدة نشطة' : ($n === 2 ? 'أتمتتان نشطتان' : ($n <= 10 ? "{$n} أتمتات نشطة" : "{$n} أتمتة نشطة"));
            }

            return $n === 1 ? '1 automation is active' : "{$n} automations are active";
        }
    }
@endphp
