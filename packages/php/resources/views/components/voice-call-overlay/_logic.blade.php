{{-- Internal: the words and pure helpers of the voice call overlay, ported from voice-call-overlay.tsx and voice-call-math.ts (levels, bar heights, the timer). Included with
     @include('nasaq::components.voice-call-overlay._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_voice_words')) {
        /** The words of the voice call for the locale, with the host's overrides on top (states can be overridden one by one). */
        function nq_voice_words(array $override = []): array
        {
            $en = [
                'label' => 'Voice call', 'states' => ['connecting' => 'Connecting', 'listening' => 'Listening', 'thinking' => 'Thinking', 'speaking' => 'Speaking', 'error' => 'Connection lost'],
                'muted' => 'Muted. The agent cannot hear you.', 'mute' => 'Mute microphone', 'unmute' => 'Unmute microphone', 'captionsOn' => 'Show captions', 'captionsOff' => 'Hide captions',
                'end' => 'End call', 'ending' => 'Ending call', 'retry' => 'Reconnect', 'you' => 'You', 'duration' => 'Call length', 'level' => 'Voice level', 'captions' => 'Captions',
                'noCaptions' => 'Captions appear here as you talk.', 'interrupt' => 'Interrupt',
            ];
            $ar = [
                'label' => 'مكالمة صوتية', 'states' => ['connecting' => 'جارٍ الاتصال', 'listening' => 'يستمع', 'thinking' => 'يفكّر', 'speaking' => 'يتحدث', 'error' => 'انقطع الاتصال'],
                'muted' => 'الميكروفون مكتوم. لا يسمعك الوكيل.', 'mute' => 'كتم الميكروفون', 'unmute' => 'إلغاء كتم الميكروفون', 'captionsOn' => 'إظهار الترجمة النصية', 'captionsOff' => 'إخفاء الترجمة النصية',
                'end' => 'إنهاء المكالمة', 'ending' => 'جارٍ إنهاء المكالمة', 'retry' => 'إعادة الاتصال', 'you' => 'أنت', 'duration' => 'مدة المكالمة', 'level' => 'مستوى الصوت', 'captions' => 'الترجمة النصية',
                'noCaptions' => 'تظهر الترجمة النصية هنا أثناء حديثك.', 'interrupt' => 'مقاطعة',
            ];
            $base = \Nasaq\Nasaq::rtl() ? $ar : $en;
            $states = array_merge($base['states'], $override['states'] ?? []);
            unset($override['states']);

            return array_merge($base, $override, ['states' => $states]);
        }

        function nq_voice_clamp($level): float
        {
            return is_numeric($level) && is_finite((float) $level) ? max(0.0, min(1.0, (float) $level)) : 0.0;
        }

        /** The level history after one more level: a fixed length, oldest dropped, padded with silence at the start. */
        function nq_voice_push(array $history, $level, int $size): array
        {
            $next = [...$history, nq_voice_clamp($level)];
            if (count($next) > $size) {
                return array_slice($next, count($next) - $size);
            }

            return count($next) < $size ? [...array_fill(0, $size - count($next), 0.0), ...$next] : $next;
        }

        /** Bar heights (0..1, never below $floor), newest level in the middle and older ones spreading outwards. */
        function nq_voice_heights(array $history, int $bars, float $floor = 0.08): array
        {
            $half = (int) ceil($bars / 2);
            $out = [];
            for ($i = 0; $i < $bars; $i++) {
                $distance = abs($i - ($bars - 1) / 2);
                $age = min($half - 1, (int) floor($distance));
                $level = $history[count($history) - 1 - $age] ?? 0;
                $taper = 1 - ($distance / ($half + 1)) * 0.55;
                $out[] = max($floor, min(1.0, nq_voice_clamp($level) * $taper));
            }

            return $out;
        }

        /** The classes of one bar (the Alpine runtime repaints them with the same rule). */
        function nq_voice_bar_class(string $state, bool $quiet, bool $reduced = false): string
        {
            $color = $state === 'speaking' ? 'bg-nq-accent' : ($state === 'error' ? 'bg-nq-danger' : ($quiet ? 'bg-nq-line-strong' : 'bg-foreground'));

            return implode(' ', array_filter([
                'w-1.5 rounded-full', $color, $state === 'connecting' ? 'opacity-40' : null, $reduced ? null : 'transition-[height] duration-100 ease-out',
                $state === 'thinking' && ! $reduced ? 'animate-pulse' : null,
            ]));
        }

        /** 65 -> 1:05, 3725 -> 1:02:05. */
        function nq_voice_time($seconds): string
        {
            $s = max(0, (int) floor(is_numeric($seconds) ? (float) $seconds : 0));
            $h = intdiv($s, 3600);
            $m = intdiv($s % 3600, 60);
            $ss = str_pad((string) ($s % 60), 2, '0', STR_PAD_LEFT);

            return $h > 0 ? $h.':'.str_pad((string) $m, 2, '0', STR_PAD_LEFT).':'.$ss : $m.':'.$ss;
        }
    }
@endphp
