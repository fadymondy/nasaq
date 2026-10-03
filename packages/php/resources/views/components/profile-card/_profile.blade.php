{{-- Internal: helpers shared by the profile-card parts (port of web/src/components/profile-card/profile-model.ts and its strings).
     Included with @include('nasaq::components.profile-card._profile'); every function is defined once. --}}
@php
    if (! function_exists('nq_profile_t')) {
        /** The built-in words, English or Arabic, with the caller's overrides on top. */
        function nq_profile_t(array $labels = []): array
        {
            $ar = \Nasaq\Nasaq::rtl();

            return array_merge($ar ? [
                'online' => 'متصل', 'away' => 'بعيد', 'busy' => 'مشغول', 'offline' => 'غير متصل', 'localTime' => 'الوقت المحلي',
                'sameTime' => 'نفس توقيتك', 'ahead' => 'يسبقك بـ {time}', 'behind' => 'يتأخر عنك بـ {time}', 'night' => 'الوقت ليلًا عنده',
                'team' => 'الفريق', 'teams' => 'الفرق', 'email' => 'البريد الإلكتروني', 'message' => 'مراسلة', 'mention' => 'إشارة',
                'viewProfile' => 'عرض الملف', 'hours' => '{n} س', 'hoursMinutes' => '{h} س {m} د', 'minutes' => '{m} د', 'profileOf' => 'ملف {name}',
            ] : [
                'online' => 'Online', 'away' => 'Away', 'busy' => 'Busy', 'offline' => 'Offline', 'localTime' => 'Local time',
                'sameTime' => 'Same time as you', 'ahead' => '{time} ahead of you', 'behind' => '{time} behind you', 'night' => 'It is night there',
                'team' => 'Team', 'teams' => 'Teams', 'email' => 'Email', 'message' => 'Message', 'mention' => 'Mention',
                'viewProfile' => 'View profile', 'hours' => '{n}h', 'hoursMinutes' => '{h}h {m}m', 'minutes' => '{m}m', 'profileOf' => 'Profile of {name}',
            ], $labels);
        }

        function nq_profile_fill(string $template, array $values): string
        {
            return (string) preg_replace_callback('/\{(\w+)\}/', fn ($m) => (string) ($values[$m[1]] ?? ''), $template);
        }

        /** A time zone the runtime knows, or null. */
        function nq_profile_zone(?string $name): ?\DateTimeZone
        {
            try {
                return $name ? new \DateTimeZone($name) : null;
            } catch (\Throwable) {
                return null;
            }
        }

        /** A moment as a Unix timestamp: DateTimeInterface, seconds, a date string, or null for now. */
        function nq_profile_moment(mixed $now): int
        {
            if ($now instanceof \DateTimeInterface) {
                return $now->getTimestamp();
            }
            if (is_numeric($now)) {
                return (int) $now;
            }

            return is_string($now) && strtotime($now) !== false ? (int) strtotime($now) : time();
        }

        /** Their clock minus yours, in minutes (positive: they are ahead). */
        function nq_profile_offset(\DateTimeZone $theirs, \DateTimeZone $yours, int $at): int
        {
            $moment = new \DateTimeImmutable('@'.$at);

            return (int) round(($theirs->getOffset($moment) - $yours->getOffset($moment)) / 60);
        }

        /** The time of day in a zone, for example "3:41 PM". Latin digits, so it reads the same in every locale. */
        function nq_profile_time(\DateTimeZone $zone, int $at): string
        {
            if (class_exists(\IntlDateFormatter::class)) {
                $locale = (\Nasaq\Nasaq::rtl() ? 'ar' : str_replace('_', '-', app()->getLocale())).'@numbers=latn';
                $f = new \IntlDateFormatter($locale, \IntlDateFormatter::NONE, \IntlDateFormatter::SHORT, $zone);

                return (string) $f->format($at);
            }

            return (new \DateTimeImmutable('@'.$at))->setTimezone($zone)->format('g:i A');
        }

        /** Whether it is night (before 7:00 or from 22:00) where they are. */
        function nq_profile_night(\DateTimeZone $zone, int $at): bool
        {
            $hour = (int) (new \DateTimeImmutable('@'.$at))->setTimezone($zone)->format('G');

            return $hour < 7 || $hour >= 22;
        }

        /** "3h ahead of you", "1h 30m behind you", "Same time as you". */
        function nq_profile_offset_text(array $t, int $minutes): string
        {
            if ($minutes === 0) {
                return $t['sameTime'];
            }
            $abs = abs($minutes);
            $h = intdiv($abs, 60);
            $m = $abs % 60;
            $time = $m === 0 ? nq_profile_fill($t['hours'], ['n' => $h]) : ($h === 0 ? nq_profile_fill($t['minutes'], ['m' => $m]) : nq_profile_fill($t['hoursMinutes'], ['h' => $h, 'm' => $m]));

            return nq_profile_fill($minutes > 0 ? $t['ahead'] : $t['behind'], ['time' => $time]);
        }
    }
@endphp
