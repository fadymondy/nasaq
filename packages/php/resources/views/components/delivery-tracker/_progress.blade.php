{{-- Internal: port of deliveryProgress in web/src/lib/delivery.ts. Included with @include('nasaq::components.delivery-tracker._progress'); defined once.
     Duration and money helpers come from courier-card/_delivery. --}}
@php
    if (! function_exists('nq_delivery_progress')) {
        /** The five delivery steps. */
        function nq_delivery_steps(): array
        {
            return ['placed', 'assigned', 'picked-up', 'on-the-way', 'delivered'];
        }

        /** State of each step (done | current | upcoming | stopped), plus the terminal status for cancelled and failed orders. */
        function nq_delivery_progress(string $status, string $reachedBefore = 'placed'): array
        {
            $keys = nq_delivery_steps();
            if ($status === 'cancelled' || $status === 'failed') {
                $last = max(0, (int) array_search($reachedBefore, $keys, true));
                $steps = [];
                foreach ($keys as $i => $key) {
                    $steps[] = ['key' => $key, 'state' => $i <= $last ? 'done' : ($i === $last + 1 ? 'stopped' : 'upcoming')];
                }

                return ['steps' => $steps, 'current' => -1, 'terminal' => $status];
            }
            $at = (int) array_search($status, $keys, true);
            $delivered = $status === 'delivered';
            $steps = [];
            foreach ($keys as $i => $key) {
                $steps[] = ['key' => $key, 'state' => $delivered || $i < $at ? 'done' : ($i === $at ? 'current' : 'upcoming')];
            }

            return ['steps' => $steps, 'current' => $delivered ? -1 : $at, 'terminal' => null];
        }

        /** Short local time ("2:05 PM") with Latin digits, from a DateTime, timestamp or string. */
        function nq_delivery_time(mixed $value, string $locale): string
        {
            $date = $value instanceof \DateTimeInterface ? \Carbon\Carbon::instance($value) : (is_numeric($value) ? \Carbon\Carbon::createFromTimestamp($value) : \Carbon\Carbon::parse($value));
            if (! class_exists(\IntlDateFormatter::class)) {
                return $date->format('g:i A');
            }
            $tz = $date->getTimezone()->getName();
            $tz = $tz === 'Z' ? 'UTC' : (preg_match('/^[+-]\d/', $tz) ? 'GMT'.$tz : $tz);

            return (new \IntlDateFormatter(str_replace('_', '-', $locale).'@numbers=latn', \IntlDateFormatter::NONE, \IntlDateFormatter::SHORT, $tz))->format($date);
        }
    }
@endphp
