{{-- Internal: helpers of x-nq::workflow-views, ported from workflow-views-logic.ts. Included with
     @include('nasaq::components.workflow-views._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_wfv_kind')) {
        /** A step's kind: its own, else decision when it has branches, else step. */
        function nq_wfv_kind(array $step): string
        {
            return $step['kind'] ?? (! empty($step['branches']) ? 'decision' : 'step');
        }

        /** Every step in reading order with its outline number ("2", "2.1", "3.a.1"). Each entry: ['step', 'number', 'depth']. */
        function nq_wfv_number(array $steps, string $prefix = ''): array
        {
            $out = [];
            $depth = $prefix !== '' ? count(explode('.', $prefix)) - 1 : 0;
            foreach (array_values($steps) as $i => $step) {
                $number = $prefix.($i + 1);
                $out[] = ['step' => $step, 'number' => $number, 'depth' => $depth];
                if (! empty($step['children'])) {
                    array_push($out, ...nq_wfv_number($step['children'], $number.'.'));
                }
                foreach (array_values($step['branches'] ?? []) as $j => $branch) {
                    array_push($out, ...nq_wfv_number($branch['steps'] ?? [], $number.'.'.chr(97 + $j).'.'));
                }
            }

            return $out;
        }

        /** Flattens the tree into the cards and links a workflow-network draws. Returns ['steps' => [...], 'links' => [...]]. */
        function nq_wfv_network(array $steps): array
        {
            $cards = [];
            $links = [];
            $walk = function (array $list) use (&$walk, &$cards, &$links): array {
                $entry = null;
                $open = [];
                foreach ($list as $step) {
                    $cards[] = array_filter(
                        ['id' => $step['id'], 'title' => $step['title'], 'description' => $step['description'] ?? null, 'owner' => $step['owner'] ?? null, 'kind' => nq_wfv_kind($step)],
                        fn ($v) => $v !== null,
                    );
                    foreach ($open as $from) {
                        $links[] = ['from' => $from['id'], 'to' => $step['id']] + (! empty($from['label']) ? ['label' => $from['label']] : []);
                    }
                    $entry ??= $step['id'];
                    $exits = [['id' => $step['id']]];
                    if (! empty($step['children'])) {
                        $inner = $walk(array_values($step['children']));
                        if ($inner['entry'] !== null) {
                            $links[] = ['from' => $step['id'], 'to' => $inner['entry']];
                            $exits = $inner['exits'];
                        }
                    }
                    if (! empty($step['branches'])) {
                        $exits = [];
                        foreach ($step['branches'] as $branch) {
                            $inner = $walk(array_values($branch['steps'] ?? []));
                            if ($inner['entry'] !== null) {
                                $links[] = ['from' => $step['id'], 'to' => $inner['entry'], 'label' => $branch['label']];
                                array_push($exits, ...$inner['exits']);
                            } else {
                                // An empty branch goes straight on.
                                $exits[] = ['id' => $step['id'], 'label' => $branch['label']];
                            }
                        }
                    }
                    $open = $exits;
                }

                return ['entry' => $entry, 'exits' => $open];
            };
            $walk(array_values($steps));

            return ['steps' => $cards, 'links' => $links];
        }
    }
@endphp
