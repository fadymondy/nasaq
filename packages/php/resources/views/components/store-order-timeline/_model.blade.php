{{-- Internal: port of timeline-model.ts (trackingModel, trackingUrl, sortEventsNewestFirst, activityKind).
     Included with @include('nasaq::components.store-order-timeline._model'); every function is defined once. --}}
@php
    if (! function_exists('nq_store_tracking_model')) {
        /**
         * The step reached and when each step happened.
         *
         * @param  array{status: string, payment?: ?string, placedAt?: ?string, events?: array, hasTracking?: bool}  $in
         * @return array{steps: array, reached: int, terminal: ?array, partial: bool, percent: int}
         */
        function nq_store_tracking_model(array $in): array
        {
            $keys = ['placed', 'paid', 'shipped', 'out-for-delivery', 'delivered'];
            $kindStep = ['placed' => 'placed', 'paid' => 'paid', 'payment' => 'paid', 'confirmed' => 'paid', 'fulfilled' => 'shipped', 'shipped' => 'shipped', 'out-for-delivery' => 'out-for-delivery', 'delivered' => 'delivered'];
            $statusStep = ['pending' => 0, 'paid' => 1, 'processing' => 1, 'partially-fulfilled' => 1, 'fulfilled' => 2, 'shipped' => 2, 'out-for-delivery' => 3, 'delivered' => 4];
            $terminals = ['cancelled', 'refunded', 'returned', 'partially-refunded'];
            $events = $in['events'] ?? [];
            $status = $in['status'];
            $stamps = [];
            $evidence = -1;
            foreach ($events as $event) {
                $key = $kindStep[$event['kind']] ?? null;
                if (! $key) {
                    continue;
                }
                $evidence = max($evidence, (int) array_search($key, $keys, true));
                if (! isset($stamps[$key]) || $event['at'] < $stamps[$key]) {
                    $stamps[$key] = $event['at'];
                }
            }
            if (! empty($in['placedAt']) && ! isset($stamps['placed'])) {
                $stamps['placed'] = $in['placedAt'];
            }

            $ended = in_array($status, $terminals, true);
            if ($ended) {
                $reached = max($evidence, ! empty($in['hasTracking']) ? 2 : -1, $status === 'cancelled' ? 0 : 1);
            } else {
                $reached = $statusStep[$status] ?? 0;
            }
            // Cash on delivery has no payment to wait for: an order that is confirmed counts as paid.
            if (! $ended && ($in['payment'] ?? null) === 'cod' && $reached === 0 && $status !== 'pending') {
                $reached = 1;
            }

            $cancelled = $ended && $status === 'cancelled';
            $steps = [];
            foreach ($keys as $i => $key) {
                if ($i < $reached) {
                    $state = 'done';
                } elseif ($i === $reached) {
                    $state = $ended || $i === count($keys) - 1 ? 'done' : 'current';
                } else {
                    $state = $cancelled ? 'skipped' : 'upcoming';
                }
                $steps[] = ['key' => $key, 'state' => $state, 'at' => $stamps[$key] ?? null];
            }

            $terminal = null;
            if ($ended) {
                $at = null;
                foreach (array_reverse($events) as $e) {
                    $hit = $e['kind'] === $status || (in_array($status, ['returned', 'partially-refunded'], true) && $e['kind'] === 'refund');
                    if ($hit) {
                        $at = $e['at'];
                        break;
                    }
                }
                $terminal = ['kind' => $status, 'at' => $at];
            }
            $done = count(array_filter($steps, fn ($s) => $s['state'] === 'done'));
            $current = count(array_filter($steps, fn ($s) => $s['state'] === 'current')) > 0 ? 0.5 : 0;

            return [
                'steps' => $steps,
                'reached' => $reached,
                'terminal' => $terminal,
                'partial' => ! $ended && $status === 'partially-fulfilled',
                'percent' => (int) round((($done + $current) / count($keys)) * 100),
            ];
        }

        /** The carrier's tracking page: the tracking's own url, else the template with {number} filled in. */
        function nq_store_tracking_url(?array $tracking, ?string $template = null): ?string
        {
            if (! $tracking) {
                return null;
            }
            if (! empty($tracking['url'])) {
                return $tracking['url'];
            }

            return $template ? str_replace('{number}', rawurlencode($tracking['number']), $template) : null;
        }

        /** Newest first, stable for equal times (later input wins a tie, as in the React model). */
        function nq_store_events_newest_first(array $events): array
        {
            $indexed = [];
            foreach (array_values($events) as $i => $e) {
                $indexed[] = [$e, $i];
            }
            usort($indexed, fn ($a, $b) => $a[0]['at'] < $b[0]['at'] ? 1 : ($a[0]['at'] > $b[0]['at'] ? -1 : $b[1] <=> $a[1]));

            return array_map(fn ($p) => $p[0], $indexed);
        }

        /** Groups the free-form event kinds into the few the log draws an icon for. */
        function nq_store_activity_kind(string $kind): string
        {
            return match (true) {
                $kind === 'placed' => 'placed',
                in_array($kind, ['paid', 'payment', 'confirmed'], true) => 'payment',
                in_array($kind, ['shipped', 'fulfilled', 'out-for-delivery'], true) => 'shipment',
                $kind === 'delivered' => 'delivery',
                in_array($kind, ['refund', 'refunded', 'returned', 'return'], true) => 'refund',
                in_array($kind, ['cancelled', 'cancel'], true) => 'cancel',
                $kind === 'note' => 'note',
                default => 'other',
            };
        }
    }
@endphp
