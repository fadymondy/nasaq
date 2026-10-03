{{-- Internal: helpers of x-nq::waiting-screen, ported from waiting-screen.tsx and queue-math.ts. Included with
     @include('nasaq::components.waiting-screen._logic'); every function is defined once. Queue entries are arrays:
     ['id', 'ticket', 'number', 'status' (waiting|called|serving|done|skipped|no_show|left), 'priority', 'queuedAt', 'calledAt', 'room', 'providerId']. --}}
@php
    if (! function_exists('nq_ws_words')) {
        /** The built-in words by locale (English or Arabic), with the host's overrides on top. A string with :n is a sentence. */
        function nq_ws_words(string $locale, array $override = []): array
        {
            $en = [
                'yourTicket' => 'Your ticket', 'position' => 'Your place in line', 'wait' => 'Estimated wait', 'nowServing' => 'Now serving',
                'nobody' => 'Nobody is being served right now.', 'room' => 'Room :n', 'waiting' => 'Waiting', 'called' => 'It is your turn',
                'calledText' => 'Please go to :n now.', 'calledNoRoom' => 'Please go to the desk now.', 'serving' => 'In your visit',
                'servingText' => 'You are with the doctor in :n.', 'done' => 'Visit finished', 'doneText' => 'Thank you for coming. Take care.',
                'skipped' => 'We called you and could not find you', 'skippedText' => 'Please see reception and they will put you back in line.',
                'left' => 'You left the line', 'leftText' => 'Check in again at the kiosk if you still need to be seen.',
                'leave' => 'Leave the line', 'leaveTitle' => 'Leave the line?', 'leaveText' => 'You lose your place. You can check in again, but you go to the back.',
                'leaveConfirm' => 'Yes, leave', 'live' => 'Live', 'reconnecting' => 'Reconnecting', 'offline' => 'Offline',
                'updatedNow' => 'Updated just now', 'updated' => 'Updated :n s ago', 'offlineText' => 'You are offline. The numbers below may be out of date.',
                'connection' => 'Connection', 'next' => 'You are next', 'one' => '1 person ahead of you', 'many' => ':n people ahead of you',
                'anyMoment' => 'Any moment', 'about' => 'About :n min',
            ];
            $ar = [
                'yourTicket' => 'تذكرتك', 'position' => 'دورك في الصف', 'wait' => 'وقت الانتظار المتوقع', 'nowServing' => 'يُخدم الآن',
                'nobody' => 'لا أحد يُخدم الآن.', 'room' => 'الغرفة :n', 'waiting' => 'في الانتظار', 'called' => 'حان دورك',
                'calledText' => 'تفضّل إلى :n الآن.', 'calledNoRoom' => 'تفضّل إلى المكتب الآن.', 'serving' => 'أنت في الزيارة',
                'servingText' => 'أنت مع الطبيب في :n.', 'done' => 'انتهت الزيارة', 'doneText' => 'شكرًا لزيارتك. سلامتك.',
                'skipped' => 'ناديناك ولم نجدك', 'skippedText' => 'توجّه إلى الاستقبال وسيعيدونك إلى الصف.',
                'left' => 'غادرت الصف', 'leftText' => 'سجّل الوصول مجددًا من الكشك إن كنت ما زلت تريد الكشف.',
                'leave' => 'مغادرة الصف', 'leaveTitle' => 'مغادرة الصف؟', 'leaveText' => 'ستفقد دورك. يمكنك تسجيل الوصول مجددًا لكن في آخر الصف.',
                'leaveConfirm' => 'نعم، غادر', 'live' => 'مباشر', 'reconnecting' => 'جارٍ إعادة الاتصال', 'offline' => 'غير متصل',
                'updatedNow' => 'تم التحديث الآن', 'updated' => 'تم التحديث قبل :n ثانية', 'offlineText' => 'أنت غير متصل. قد تكون الأرقام أدناه قديمة.',
                'connection' => 'الاتصال', 'next' => 'أنت التالي', 'one' => 'شخص واحد قبلك', 'many' => ':n أشخاص قبلك', 'two' => 'شخصان قبلك',
                'anyMoment' => 'في أي لحظة', 'about' => 'حوالي :n دقيقة',
            ];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        function nq_ws_fill(string $sentence, string|int $n = ''): string
        {
            return str_replace(':n', (string) $n, $sentence);
        }

        /** "2 people ahead of you", "You are next". $ahead is position - 1. */
        function nq_ws_ahead(int $ahead, array $t): string
        {
            return match (true) {
                $ahead <= 0 => $t['next'],
                $ahead === 1 => $t['one'],
                $ahead === 2 && isset($t['two']) => $t['two'],
                default => nq_ws_fill($t['many'], $ahead),
            };
        }

        function nq_ws_minutes(int $n, array $t): string
        {
            return $n === 0 ? $t['anyMoment'] : nq_ws_fill($t['about'], $n);
        }

        /** Waiting tickets in the order they will be called: urgent, then appointments, then walk-ins; first come first served inside each. */
        function nq_ws_order(array $entries, ?string $providerId = null): array
        {
            $rank = ['urgent' => 0, 'appointment' => 1, 'normal' => 2];
            $list = array_values(array_filter($entries, fn ($e) => ($e['status'] ?? '') === 'waiting' && ($providerId === null || ! isset($e['providerId']) || $e['providerId'] === $providerId)));
            usort($list, fn ($a, $b) => ($rank[$a['priority'] ?? 'normal'] <=> $rank[$b['priority'] ?? 'normal']) ?: (($a['queuedAt'] ?? 0) <=> ($b['queuedAt'] ?? 0)) ?: (($a['number'] ?? 0) <=> ($b['number'] ?? 0)));

            return $list;
        }

        /** 1-based place in the call order, or 0 when the ticket is not waiting. */
        function nq_ws_position(array $entries, string $id): int
        {
            $target = collect($entries)->firstWhere('id', $id);
            if (! $target || ($target['status'] ?? '') !== 'waiting') {
                return 0;
            }
            foreach (nq_ws_order($entries, $target['providerId'] ?? null) as $i => $e) {
                if ($e['id'] === $id) {
                    return $i + 1;
                }
            }

            return 0;
        }

        /** Minutes until this ticket is called: free rooms take the first tickets now, then waves of one visit per open room. */
        function nq_ws_wait(array $entries, string $id, int|float $averageMinutes = 10, int $rooms = 1): int
        {
            $position = nq_ws_position($entries, $id);
            if ($position === 0) {
                return 0;
            }
            $open = max(1, $rooms);
            $busy = count(array_filter($entries, fn ($e) => in_array($e['status'] ?? '', ['called', 'serving'], true)));
            $free = max(0, $open - $busy);

            return $position <= $free ? 0 : (int) (ceil(($position - $free) / $open) * max(0, $averageMinutes));
        }

        /** Called and in-room tickets, newest call first. */
        function nq_ws_serving(array $entries): array
        {
            $list = array_values(array_filter($entries, fn ($e) => in_array($e['status'] ?? '', ['called', 'serving'], true)));
            usort($list, fn ($a, $b) => ($b['calledAt'] ?? 0) <=> ($a['calledAt'] ?? 0));

            return $list;
        }

        /** The current time in epoch milliseconds. */
        function nq_ws_now(): int
        {
            return \Carbon\Carbon::now()->getTimestampMs();
        }
    }
@endphp
