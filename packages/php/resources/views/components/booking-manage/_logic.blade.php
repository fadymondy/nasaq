{{-- Internal: helpers of x-nq::booking-manage and x-nq::booking-manage.ticket, ported from booking-manage.tsx and booking-flow's booking-math.
     Included with @include('nasaq::components.booking-manage._logic'); every function is defined once. Bookings are arrays:
     ['id', 'code', 'status', 'start', 'end' (ISO strings), 'service', 'provider', 'location', 'address', 'patient', 'phone', 'price', 'currency', 'payment' (online|visit), 'paid']. --}}
@php
    if (! function_exists('nq_bm_words')) {
        /** The built-in words by locale (English or Arabic), with the host's overrides on top. A string with :n is a sentence. */
        function nq_bm_words(string $locale, array $override = []): array
        {
            $en = [
                'scan' => 'Show this code at reception.', 'code' => 'Booking code', 'when' => 'When', 'who' => 'Patient', 'provider' => 'With',
                'where' => 'Where', 'phone' => 'Phone', 'payment' => 'Payment', 'payOnline' => 'Paid online', 'payOnlinePending' => 'To pay online',
                'payVisit' => 'Pay at the visit', 'downloadIcs' => 'Download .ics', 'google' => 'Google Calendar', 'qrLabel' => 'QR code for booking :n',
                'reschedule' => 'Reschedule', 'cancel' => 'Cancel booking', 'rescheduleTitle' => 'Choose a new time',
                'rescheduleText' => 'Your booking moves to the time you pick. The old time is released.', 'confirmMove' => 'Move my booking',
                'close' => 'Keep current time', 'cancelTitle' => 'Cancel this booking?', 'freeCancel' => 'You can cancel for free up to :n hours before the visit.',
                'lateFee' => 'Cancelling now is late: :n% of the price is charged.', 'lateNoFee' => 'Cancelling now is late, but it is not charged.',
                'tooLate' => 'This booking can no longer be changed online. Call the clinic.', 'noReschedule' => 'Rescheduling closes :n hours before the visit.',
                'cancelConfirm' => 'Yes, cancel it', 'cancelledNote' => 'This booking was cancelled.', 'failed' => 'That did not work. Try again.',
            ];
            $ar = [
                'scan' => 'أظهر هذا الرمز عند الاستقبال.', 'code' => 'رمز الحجز', 'when' => 'الموعد', 'who' => 'المريض', 'provider' => 'مع',
                'where' => 'المكان', 'phone' => 'الهاتف', 'payment' => 'الدفع', 'payOnline' => 'تم الدفع إلكترونيًا', 'payOnlinePending' => 'الدفع إلكترونيًا',
                'payVisit' => 'الدفع عند الزيارة', 'downloadIcs' => 'تنزيل ملف ‎.ics', 'google' => 'تقويم Google', 'qrLabel' => 'رمز QR للحجز :n',
                'reschedule' => 'تغيير الموعد', 'cancel' => 'إلغاء الحجز', 'rescheduleTitle' => 'اختر موعدًا جديدًا',
                'rescheduleText' => 'سينتقل حجزك إلى الموعد الذي تختاره، ويُحرَّر الموعد القديم.', 'confirmMove' => 'انقل حجزي',
                'close' => 'إبقاء الموعد الحالي', 'cancelTitle' => 'إلغاء هذا الحجز؟', 'freeCancel' => 'يمكنك الإلغاء مجانًا حتى :n ساعة قبل الزيارة.',
                'lateFee' => 'الإلغاء الآن متأخر: تُحتسب :n% من السعر.', 'lateNoFee' => 'الإلغاء الآن متأخر، لكن لا رسوم عليه.',
                'tooLate' => 'لم يعد ممكنًا تعديل هذا الحجز عبر الإنترنت. تواصل مع العيادة.', 'noReschedule' => 'يُغلق تغيير الموعد قبل الزيارة بـ :n ساعة.',
                'cancelConfirm' => 'نعم، ألغِ الحجز', 'cancelledNote' => 'تم إلغاء هذا الحجز.', 'failed' => 'لم تنجح العملية. حاول مجددًا.',
            ];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        function nq_bm_fill(string $sentence, string|int|float $n = ''): string
        {
            return str_replace(':n', (string) $n, $sentence);
        }

        /** What the ticket's QR holds. The check-in kiosk reads it back (waiting-screen). */
        function nq_bm_ticket_value(string $code): string
        {
            return 'booking:'.$code;
        }

        /** Cancel and reschedule rules at $now. Mirrors evaluatePolicy: canCancel, canReschedule, freeCancel, feePercent. */
        function nq_bm_policy(string $start, \DateTimeInterface $now, array $policy, string $status): array
        {
            $open = in_array($status, ['requested', 'confirmed'], true);
            $hoursLeft = ((new \DateTimeImmutable($start))->getTimestamp() - $now->getTimestamp()) / 3600;
            $free = $open && $hoursLeft >= ($policy['cancelHours'] ?? 24);

            return [
                'canCancel' => $open && $hoursLeft > 0,
                'freeCancel' => $free,
                'canReschedule' => $open && $hoursLeft >= ($policy['rescheduleHours'] ?? $policy['cancelHours'] ?? 24),
                'feePercent' => $open && ! $free ? min(100, max(0, $policy['lateFeePercent'] ?? 0)) : 0,
            ];
        }

        function nq_bm_utc(string $iso): string
        {
            return (new \DateTimeImmutable($iso))->setTimezone(new \DateTimeZone('UTC'))->format('Ymd\THis\Z');
        }

        function nq_bm_ics_text(string $s): string
        {
            return preg_replace('/\r?\n/', '\\n', str_replace(['\\', ';', ','], ['\\\\', '\\;', '\\,'], $s));
        }

        /** The calendar event of a booking: uid, title, start, end, location, description. */
        function nq_bm_event(array $b): array
        {
            return [
                'uid' => ($b['id'] ?? '').'@nasaq',
                'title' => ($b['service'] ?? '').' – '.($b['provider'] ?? ''),
                'start' => $b['start'], 'end' => $b['end'],
                'location' => implode(', ', array_filter([$b['location'] ?? null, $b['address'] ?? null])) ?: null,
                'description' => $b['code'] ?? null,
            ];
        }

        /** An iCalendar (.ics) file for one event: CRLF line ends, UTC times, escaped text. */
        function nq_bm_ics(array $e, \DateTimeInterface $stamp): string
        {
            $lines = [
                'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nasaq//Booking//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
                'UID:'.$e['uid'], 'DTSTAMP:'.nq_bm_utc($stamp->format('c')), 'DTSTART:'.nq_bm_utc($e['start']), 'DTEND:'.nq_bm_utc($e['end']),
                'SUMMARY:'.nq_bm_ics_text($e['title']),
                ...($e['location'] ? ['LOCATION:'.nq_bm_ics_text($e['location'])] : []),
                ...($e['description'] ? ['DESCRIPTION:'.nq_bm_ics_text($e['description'])] : []),
                'END:VEVENT', 'END:VCALENDAR',
            ];

            return implode("\r\n", $lines)."\r\n";
        }

        /** An "add to Google Calendar" link for the same event. */
        function nq_bm_google_url(array $e): string
        {
            $params = ['action' => 'TEMPLATE', 'text' => $e['title'], 'dates' => nq_bm_utc($e['start']).'/'.nq_bm_utc($e['end'])];
            if ($e['location']) {
                $params['location'] = $e['location'];
            }
            if ($e['description']) {
                $params['details'] = $e['description'];
            }

            return 'https://calendar.google.com/calendar/render?'.http_build_query($params, '', '&', PHP_QUERY_RFC1738);
        }

        /** A date or time of an ISO string in the locale, Latin digits. $kind: day | time. */
        function nq_bm_format(string $iso, string $locale, string $kind): string
        {
            $d = new \DateTimeImmutable($iso);
            if (! class_exists(\IntlDateFormatter::class)) {
                return $d->format($kind === 'day' ? 'l, F j, Y' : 'g:i A');
            }
            $f = new \IntlDateFormatter(str_replace('_', '-', $locale).'@numbers=latn', $kind === 'day' ? \IntlDateFormatter::FULL : \IntlDateFormatter::NONE, $kind === 'day' ? \IntlDateFormatter::NONE : \IntlDateFormatter::SHORT, $d->getTimezone());

            return $f->format($d);
        }
    }
@endphp
