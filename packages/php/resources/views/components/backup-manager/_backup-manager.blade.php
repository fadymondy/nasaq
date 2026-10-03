{{-- Internal: strings and helpers shared by the backup-manager parts (port of web/src/components/backup-manager/backup-format.ts and the strings in backup-manager.tsx).
     Included with @include('nasaq::components.backup-manager._backup-manager'); every function is defined once.
     Strings with a value in them use {name} / {n} placeholders (the JS side fills them in). --}}
@php
    if (! function_exists('nq_backup_strings')) {
        /** The built-in words for a locale, with `$labels` laid over them. */
        function nq_backup_strings(string $locale, array $labels = []): array
        {
            $ar = str_starts_with($locale, 'ar');

            return array_merge($ar ? [
                'title' => 'النسخ الاحتياطية', 'description' => 'نسخ تلقائية ويدوية من بياناتك. استعد إحداها للرجوع إلى حالة سابقة.', 'runNow' => 'نسخ احتياطي الآن',
                'running' => 'جارٍ النسخ', 'lastBackup' => 'آخر نسخة', 'nextRun' => 'النسخة القادمة', 'scheduleOff' => 'الجدولة متوقفة', 'storage' => 'المساحة المستخدمة',
                'never' => 'لا توجد نسخة بعد', 'listTitle' => 'سجل النسخ', 'list' => 'النسخ الاحتياطية', 'emptyTitle' => 'لا توجد نسخ احتياطية بعد',
                'emptyBody' => 'شغّل أول نسخة الآن، أو فعّل الجدولة.', 'kind' => ['scheduled' => 'مجدولة', 'manual' => 'يدوية', 'pre-restore' => 'قبل الاستعادة'],
                'status' => ['completed' => 'مكتملة', 'running' => 'قيد التنفيذ', 'failed' => 'فشلت', 'restoring' => 'قيد الاستعادة'],
                'progressFor' => 'تقدم {name}', 'locked' => 'محفوظة حتى تحذفها', 'restore' => 'استعادة', 'restoreFor' => 'استعادة {name}', 'download' => 'تنزيل',
                'downloadFor' => 'تنزيل {name}', 'remove' => 'حذف', 'removeFor' => 'حذف {name}', 'deleteTitle' => 'حذف {name}؟',
                'deleteBody' => 'تُحذف هذه النسخة نهائيًا ولن تتمكن من الاستعادة منها.', 'deleteConfirm' => 'حذف النسخة', 'restoreTitle' => 'استعادة {name}؟',
                'restoreBody' => 'تُستبدل بياناتك الحالية ببيانات هذه النسخة. تضيع التغييرات التي جرت بعد أخذها.',
                'restoreSafety' => 'تؤخذ أولًا نسخة أمان من البيانات الحالية، ليمكنك التراجع.', 'restoreCheck' => 'أفهم أن بياناتي الحالية ستُستبدل.',
                'restoreConfirm' => 'استعادة النسخة', 'cancel' => 'إلغاء', 'scheduleTitle' => 'الجدولة', 'scheduleBody' => 'خذ نسخة احتياطية حسب جدول، بتوقيت الخادم.',
                'enabled' => 'النسخ التلقائي', 'frequency' => 'التكرار',
                'frequencies' => ['hourly' => 'كل ساعة', 'daily' => 'كل يوم', 'weekly' => 'كل أسبوع', 'monthly' => 'كل شهر'],
                'time' => 'الوقت', 'minute' => 'الدقيقة من الساعة', 'weekday' => 'يوم الأسبوع', 'monthlyHint' => 'تعمل في اليوم الأول من كل شهر.',
                'retentionTitle' => 'الاحتفاظ', 'retentionBody' => 'تُحذف النسخ القديمة تلقائيًا ليبقى التخزين تحت السيطرة.', 'keepLast' => 'احتفظ بآخر',
                'keepLastSuffix' => 'نسخة', 'maxAge' => 'الحذف بعد (أيام)', 'maxAgeHint' => 'الصفر يبقي النسخ إلى أن يزيلها حد العدد.',
                'prune0' => 'لن يُحذف شيء الآن.', 'prune1' => 'ستُحذف نسخة واحدة عند التشغيل القادم.', 'prune2' => 'ستُحذف نسختان عند التشغيل القادم.',
                'pruneN' => 'ستُحذف {n} نسخ عند التشغيل القادم.',
                'errors' => ['keepLast' => 'أدخل عددًا صحيحًا من النسخ، من 1 إلى 1000.', 'maxAgeDays' => 'الأيام عدد صحيح من 0 إلى 3650.'],
                'timeInvalid' => 'أدخل وقتًا مثل 02:30.', 'save' => 'حفظ الجدولة', 'saved' => 'تم حفظ الجدولة.', 'genericError' => 'حدث خطأ ما. حاول مرة أخرى.',
                'actionsFor' => 'إجراءات {name}', 'loading' => 'جارٍ تحميل النسخ',
            ] : [
                'title' => 'Backups', 'description' => 'Automatic and manual copies of your data. Restore one to roll back.', 'runNow' => 'Back up now',
                'running' => 'Backing up', 'lastBackup' => 'Last backup', 'nextRun' => 'Next backup', 'scheduleOff' => 'Schedule is off', 'storage' => 'Storage used',
                'never' => 'No backup yet', 'listTitle' => 'Backup history', 'list' => 'Backups', 'emptyTitle' => 'No backups yet',
                'emptyBody' => 'Run your first backup now, or turn on the schedule.', 'kind' => ['scheduled' => 'Scheduled', 'manual' => 'Manual', 'pre-restore' => 'Before restore'],
                'status' => ['completed' => 'Completed', 'running' => 'In progress', 'failed' => 'Failed', 'restoring' => 'Restoring'],
                'progressFor' => 'Progress of {name}', 'locked' => 'Kept until you delete it', 'restore' => 'Restore', 'restoreFor' => 'Restore {name}', 'download' => 'Download',
                'downloadFor' => 'Download {name}', 'remove' => 'Delete', 'removeFor' => 'Delete {name}', 'deleteTitle' => 'Delete {name}?',
                'deleteBody' => 'This backup is removed for good. You will not be able to restore from it.', 'deleteConfirm' => 'Delete backup', 'restoreTitle' => 'Restore {name}?',
                'restoreBody' => 'Your current data is replaced with the data in this backup. Changes made after it was taken are lost.',
                'restoreSafety' => 'A safety backup of the current data is taken first, so you can undo this.', 'restoreCheck' => 'I understand my current data will be replaced.',
                'restoreConfirm' => 'Restore backup', 'cancel' => 'Cancel', 'scheduleTitle' => 'Schedule', 'scheduleBody' => "Back up on a schedule, in the server's time.",
                'enabled' => 'Automatic backups', 'frequency' => 'Frequency',
                'frequencies' => ['hourly' => 'Every hour', 'daily' => 'Every day', 'weekly' => 'Every week', 'monthly' => 'Every month'],
                'time' => 'Time', 'minute' => 'Minute past the hour', 'weekday' => 'Day of the week', 'monthlyHint' => 'Runs on the 1st of each month.',
                'retentionTitle' => 'Retention', 'retentionBody' => 'Old backups are deleted automatically so storage stays under control.', 'keepLast' => 'Keep the last',
                'keepLastSuffix' => 'backups', 'maxAge' => 'Delete after (days)', 'maxAgeHint' => '0 keeps backups until the count limit removes them.',
                'prune0' => 'Nothing would be deleted right now.', 'prune1' => '1 backup would be deleted at the next run.', 'prune2' => '{n} backups would be deleted at the next run.',
                'pruneN' => '{n} backups would be deleted at the next run.',
                'errors' => ['keepLast' => 'Keep a whole number of backups, from 1 to 1000.', 'maxAgeDays' => 'Days is a whole number from 0 to 3650.'],
                'timeInvalid' => 'Enter a time like 02:30.', 'save' => 'Save schedule', 'saved' => 'Schedule saved.', 'genericError' => 'Something went wrong. Try again.',
                'actionsFor' => 'Actions for {name}', 'loading' => 'Loading backups',
            ], $labels);
        }

        /** "1 backup" / "14 backups" (Arabic: one, two, a few, many). */
        function nq_backup_count(string $locale, int $n): string
        {
            if (str_starts_with($locale, 'ar')) {
                return $n === 1 ? 'نسخة واحدة' : ($n === 2 ? 'نسختان' : ($n <= 10 ? "{$n} نسخ" : "{$n} نسخة"));
            }

            return $n === 1 ? '1 backup' : "{$n} backups";
        }

        /** The milliseconds of a date-like (DateTime, timestamp in seconds or milliseconds, or a string). */
        function nq_backup_ms(mixed $v): int
        {
            if ($v instanceof \DateTimeInterface) {
                return $v->getTimestamp() * 1000;
            }
            if (is_numeric($v)) {
                return (int) ($v > 20000000000 ? $v : $v * 1000);
            }

            return \Carbon\Carbon::parse($v)->getTimestamp() * 1000;
        }

        /** `842 B`, `12.4 MB`, `1.8 GB`. Base 1024, Latin digits; the units stay Latin in Arabic too. */
        function nq_backup_bytes(float|int $bytes): string
        {
            if ($bytes < 0) {
                return '-';
            }
            $units = ['B', 'KB', 'MB', 'GB', 'TB'];
            $value = (float) $bytes;
            $i = 0;
            while ($value >= 1024 && $i < count($units) - 1) {
                $value /= 1024;
                $i++;
            }
            $text = $i === 0 || $value >= 100 ? (string) round($value) : preg_replace('/\.0$/', '', number_format($value, 1, '.', ''));

            return $text.' '.$units[$i];
        }

        /** [h, m] of "HH:MM", or null when it is not a time. */
        function nq_backup_parse_time(string $time): ?array
        {
            if (! preg_match('/^(\d{1,2}):(\d{2})$/', trim($time), $m)) {
                return null;
            }

            return (int) $m[1] <= 23 && (int) $m[2] <= 59 ? [(int) $m[1], (int) $m[2]] : null;
        }

        /** The next time the schedule fires after `$now`, or null when it is off or the time is invalid. */
        function nq_backup_next_run(array $schedule, mixed $now = null): ?\Carbon\Carbon
        {
            if (empty($schedule['enabled'])) {
                return null;
            }
            $t = nq_backup_parse_time((string) ($schedule['time'] ?? ''));
            if (! $t) {
                return null;
            }
            $from = $now === null ? \Carbon\Carbon::now() : \Carbon\Carbon::createFromTimestampMs(nq_backup_ms($now));
            $next = $from->copy()->setSecond(0)->setMicrosecond(0);
            $freq = $schedule['frequency'] ?? 'daily';
            if ($freq === 'hourly') {
                $next->setMinute($t[1]);
                if ($next <= $from) {
                    $next->addHour();
                }

                return $next;
            }
            $next->setTime($t[0], $t[1], 0);
            if ($freq === 'daily') {
                if ($next <= $from) {
                    $next->addDay();
                }
            } elseif ($freq === 'weekly') {
                $add = (((int) ($schedule['dayOfWeek'] ?? 0)) - $next->dayOfWeek + 7) % 7;
                if ($add === 0 && $next <= $from) {
                    $add = 7;
                }
                $next->addDays($add);
            } else {
                $next->setDay(1);
                if ($next <= $from) {
                    $next->addMonthNoOverflow()->setDay(1);
                }
            }

            return $next;
        }

        /** Sum of the sizes of the completed backups. */
        function nq_backup_total(array $backups): float|int
        {
            return array_sum(array_map(fn ($b) => ($b['status'] ?? '') === 'completed' ? ($b['sizeBytes'] ?? 0) : 0, $backups));
        }

        /** Clamp a percentage for a progress bar. */
        function nq_backup_clamp(mixed $v): float|int
        {
            return $v === null || ! is_numeric($v) ? 0 : min(100, max(0, $v));
        }
    }
@endphp
