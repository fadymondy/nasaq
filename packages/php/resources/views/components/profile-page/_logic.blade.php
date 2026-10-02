{{-- Internal: helpers of x-nq::profile-page, ported from profile-page.tsx and personal-model.ts. Included by every part; defined once. --}}
@php
    if (! function_exists('nq_pp_words')) {
        /** The built-in words by locale, with the host's overrides on top. */
        function nq_pp_words(string $locale, array $override = []): array
        {
            $en = [
                'contact' => 'Get in touch', 'downloadCv' => 'Download CV', 'about' => 'About', 'experience' => 'Experience', 'experienceHint' => 'Where I have worked, newest first.',
                'present' => 'Present', 'current' => 'Current', 'yearsShort' => '{n} yr', 'monthsShort' => '{n} mo', 'totalExperience' => '{time} of experience',
                'skills' => 'Skills', 'skillsHint' => 'What I use most, strongest first.', 'projects' => 'Projects', 'projectsHint' => 'Selected work.',
                'featuredProject' => 'Featured project', 'allProjects' => 'All', 'viewProject' => 'View project', 'viewCode' => 'Source', 'writing' => 'Latest writing',
                'writingHint' => 'Notes from the last few months.', 'allArticles' => 'All articles', 'testimonials' => 'Kind words', 'testimonialsHint' => 'From people I have worked with.',
                'contactTitle' => "Let's build something together", 'contactBody' => 'Tell me about your project. I usually reply within two working days.',
                'projectsNav' => 'Project categories', 'sections' => 'Profile sections', 'editProfile' => 'Edit profile', 'joined' => 'Joined {date}', 'profileDetails' => 'Profile details',
                'apps' => 'Apps', 'appsHint' => 'The apps you use with this account.', 'browseApps' => 'Browse apps', 'noApps' => 'No apps yet',
                'noAppsHint' => 'Apps you sign in to with this account show up here.', 'lastUsed' => 'Used {date}', 'account' => 'Account', 'accountHint' => 'Only you can see this.',
            ];
            $ar = [
                'contact' => 'تواصل معي', 'downloadCv' => 'تنزيل السيرة الذاتية', 'about' => 'نبذة', 'experience' => 'الخبرة', 'experienceHint' => 'أين عملت، من الأحدث.',
                'present' => 'حتى الآن', 'current' => 'الحالي', 'yearsShort' => '{n} سنة', 'monthsShort' => '{n} شهر', 'totalExperience' => '{time} من الخبرة',
                'skills' => 'المهارات', 'skillsHint' => 'ما أستخدمه أكثر، الأقوى أولًا.', 'projects' => 'المشاريع', 'projectsHint' => 'أعمال مختارة.',
                'featuredProject' => 'مشروع مميز', 'allProjects' => 'الكل', 'viewProject' => 'عرض المشروع', 'viewCode' => 'الشيفرة', 'writing' => 'أحدث ما كتبت',
                'writingHint' => 'ملاحظات من الأشهر الأخيرة.', 'allArticles' => 'كل المقالات', 'testimonials' => 'كلمات طيبة', 'testimonialsHint' => 'من أشخاص عملت معهم.',
                'contactTitle' => 'لنبنِ شيئًا معًا', 'contactBody' => 'أخبرني عن مشروعك. أرد عادةً خلال يومي عمل.',
                'projectsNav' => 'تصنيفات المشاريع', 'sections' => 'أقسام الملف', 'editProfile' => 'تعديل الملف', 'joined' => 'انضم في {date}', 'profileDetails' => 'تفاصيل الملف',
                'apps' => 'التطبيقات', 'appsHint' => 'التطبيقات التي تستخدمها بهذا الحساب.', 'browseApps' => 'تصفّح التطبيقات', 'noApps' => 'لا تطبيقات بعد',
                'noAppsHint' => 'تظهر هنا التطبيقات التي تسجّل الدخول إليها بهذا الحساب.', 'lastUsed' => 'استُخدم {date}', 'account' => 'الحساب', 'accountHint' => 'لا يراه غيرك.',
            ];

            return array_replace(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        function nq_pp_fill(string $sentence, array $vars = []): string
        {
            foreach ($vars as $k => $v) {
                $sentence = str_replace('{'.$k.'}', (string) $v, $sentence);
            }

            return $sentence;
        }

        function nq_pp_num(float|int $n, string $locale): string
        {
            if (! class_exists(\NumberFormatter::class)) {
                return (string) $n;
            }

            return (string) (new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::DECIMAL))->format($n);
        }

        /** A date as an ICU pattern in the locale, Latin digits. Dates without a zone are read as UTC. */
        function nq_pp_date(string|int|\DateTimeInterface $value, string $locale, string $pattern): string
        {
            $d = $value instanceof \DateTimeInterface ? \DateTimeImmutable::createFromInterface($value) : (is_numeric($value) ? new \DateTimeImmutable('@'.(int) $value) : new \DateTimeImmutable($value, new \DateTimeZone('UTC')));
            $tz = $d->getTimezone()->getName();
            $tz = $tz === 'Z' ? 'UTC' : (preg_match('/^[+-]\d/', $tz) ? 'GMT'.$tz : $tz);
            $f = new \IntlDateFormatter(str_replace('_', '-', $locale).'@numbers=latn', \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, $tz, null, $pattern);

            return (string) $f->format($d->getTimestamp());
        }

        function nq_pp_instant(mixed $v): \DateTimeImmutable
        {
            if ($v === null) {
                return new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
            }
            if ($v instanceof \DateTimeInterface) {
                return \DateTimeImmutable::createFromInterface($v);
            }

            return is_numeric($v) ? new \DateTimeImmutable('@'.(int) $v) : new \DateTimeImmutable((string) $v, new \DateTimeZone('UTC'));
        }

        /** Whole months between two dates (UTC), as years and months. */
        function nq_pp_tenure(\DateTimeInterface $start, \DateTimeInterface $end): array
        {
            $a = \DateTimeImmutable::createFromInterface($start)->setTimezone(new \DateTimeZone('UTC'));
            $b = \DateTimeImmutable::createFromInterface($end)->setTimezone(new \DateTimeZone('UTC'));
            $months = ((int) $b->format('Y') - (int) $a->format('Y')) * 12 + ((int) $b->format('n') - (int) $a->format('n'));
            if ((int) $b->format('j') < (int) $a->format('j')) {
                $months--;
            }
            $months = max(0, $months);

            return ['years' => intdiv($months, 12), 'months' => $months % 12];
        }

        /** The total over all roles, counted once where roles overlap. */
        function nq_pp_total_experience(array $jobs, \DateTimeImmutable $now): array
        {
            $spans = [];
            foreach ($jobs as $j) {
                $s = nq_pp_instant($j['start'])->getTimestamp();
                $e = nq_pp_instant($j['end'] ?? $now)->getTimestamp();
                if ($e > $s) {
                    $spans[] = [$s, $e];
                }
            }
            usort($spans, fn ($x, $y) => $x[0] <=> $y[0]);
            $merged = [];
            foreach ($spans as [$s, $e]) {
                $last = count($merged) - 1;
                if ($last >= 0 && $s <= $merged[$last][1]) {
                    $merged[$last][1] = max($merged[$last][1], $e);
                } else {
                    $merged[] = [$s, $e];
                }
            }
            $months = 0;
            foreach ($merged as [$s, $e]) {
                $t = nq_pp_tenure(new \DateTimeImmutable('@'.$s), new \DateTimeImmutable('@'.$e));
                $months += $t['years'] * 12 + $t['months'];
            }

            return ['years' => intdiv($months, 12), 'months' => $months % 12];
        }

        function nq_pp_tenure_label(array $tenure, array $t, string $locale): string
        {
            $parts = [];
            if ($tenure['years']) {
                $parts[] = nq_pp_fill($t['yearsShort'], ['n' => nq_pp_num($tenure['years'], $locale)]);
            }
            if ($tenure['months'] || ! $parts) {
                $parts[] = nq_pp_fill($t['monthsShort'], ['n' => nq_pp_num($tenure['months'], $locale)]);
            }

            return implode(' ', $parts);
        }

        /** "Mar 2021 – Jun 2023" (shared parts written once), or "Mar 2021 – Present" for a current role. */
        function nq_pp_period(string $start, ?string $end, \DateTimeImmutable $now, array $t, string $locale): string
        {
            $a = nq_pp_instant($start);
            $b = $end ? nq_pp_instant($end) : $now;
            $sameYear = $a->format('Y') === $b->format('Y');
            $left = nq_pp_date($a, $locale, $sameYear ? 'MMM' : 'MMM y');
            if (! $end) {
                return $left.' – '.$t['present'];
            }
            if ($sameYear && $a->format('n') === $b->format('n')) {
                return nq_pp_date($a, $locale, 'MMM y');
            }

            return $left.' – '.nq_pp_date($b, $locale, 'MMM y');
        }

        function nq_pp_link_text(array $l): string
        {
            if (! empty($l['handle'])) {
                return $l['handle'];
            }
            if (($l['kind'] ?? '') === 'email') {
                return preg_replace('/^mailto:/i', '', $l['href']);
            }
            if (($l['kind'] ?? '') === 'website') {
                return rtrim(preg_replace('/^https?:\/\/(www\.)?/i', '', $l['href']), '/');
            }

            return $l['label'];
        }

        /** The tag hue of a category, the same one the blog index gives it. */
        function nq_pp_hue(string $category): string
        {
            $hues = ['gray', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink'];
            $h = 5381;
            foreach (unpack('n*', mb_convert_encoding($category, 'UTF-16BE', 'UTF-8')) ?: [] as $unit) {
                $h = (($h << 5) + $h + $unit) & 0xFFFFFFFF;
            }

            return $hues[1 + ($h % (count($hues) - 1))];
        }

        function nq_pp_distinct(array $items, string $key): array
        {
            $out = [];
            foreach ($items as $i) {
                $v = $i[$key] ?? null;
                if ($v && ! in_array($v, $out, true)) {
                    $out[] = $v;
                }
            }

            return $out;
        }
    }
@endphp
