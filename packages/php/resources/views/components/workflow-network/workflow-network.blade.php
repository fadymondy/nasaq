{{-- <x-nq::workflow-network title="Refund requests" :steps="[['id' => 'ask', 'title' => 'Customer asks', 'owner' => 'Customer'], ['id' => 'check', 'title' => 'Within 14 days?', 'kind' => 'decision']]" :links="[['from' => 'ask', 'to' => 'check', 'label' => 'Yes']]" />
     A workflow drawn as cards joined by connectors, for explaining a process: who does what, where a decision branches, where it ends. Read-only and responsive: rows wrap and balance, and on a narrow container it becomes one column.
     Rows follow the reading direction, so an Arabic flow runs right to left. Connectors are measured from the rendered cards by the Alpine runtime, so they always meet them.
     steps: each ['id', 'title', 'description', 'icon' (a lucide name overriding the kind's icon), 'owner' (who or what does it), 'kind' (step | decision | human | system | output, default step)].
     links: ['from', 'to', 'label'] by step id; without any the steps run in order. layout: auto (default, vertical when narrow) | horizontal | vertical. highlight: a step id to emphasise.
     clickable: the cards are buttons that fire a nq-step-click event ({ id }). animate: draw the connectors in on first appearance. title / caption: heading and caption. labels: ['kind' => [...], 'stepCount' => fn ($n) => …].
     Needs the Alpine runtime (@nasaqScripts) to draw the connectors. --}}
@props(['steps' => [], 'links' => null, 'layout' => 'auto', 'highlight' => null, 'animate' => false, 'clickable' => false, 'title' => null, 'caption' => null, 'labels' => []])
@php
    $steps = array_values((array) $steps);
    $n = count($steps);
    $kinds = array_merge([
        'step' => \Nasaq\Nasaq::t('Step', 'خطوة'),
        'decision' => \Nasaq\Nasaq::t('Decision', 'قرار'),
        'human' => \Nasaq\Nasaq::t('Human review', 'مراجعة بشرية'),
        'system' => \Nasaq\Nasaq::t('Automated', 'آلية'),
        'output' => \Nasaq\Nasaq::t('Result', 'النتيجة'),
    ], (array) ($labels['kind'] ?? []));
    $count = isset($labels['stepCount']) ? $labels['stepCount']($n) : \Nasaq\Nasaq::t($n.' steps', $n.' خطوات');
    $kindIcon = ['step' => 'arrow-right', 'decision' => 'git-branch', 'human' => 'user-check', 'system' => 'cpu', 'output' => 'flag'];
    $kindStyle = ['step' => '', 'decision' => 'border-nq-accent/60', 'human' => 'border-dashed', 'system' => 'bg-secondary', 'output' => 'border-nq-brand/50'];

    // The first frame, as in React before anything is measured: rows of up to 4 (balanced), or one column when vertical.
    // The Alpine runtime re-flows the rows to the container's width and draws the connectors.
    $vertical = $layout === 'vertical';
    $per = $vertical ? 1 : 4;
    $rowCount = $n > 0 ? max(1, (int) ceil($n / max(1, $per))) : 0;
    $perRow = $rowCount > 0 ? (int) ceil($n / $rowCount) : 1;
    $rows = array_chunk($steps, max(1, $perRow));

    $uid = 'nq-net-'.substr(md5(json_encode([$steps, $links])), 0, 8);
    $ids = array_map(fn ($s) => (string) ($s['id'] ?? ''), $steps);
    $config = ['ids' => $ids, 'links' => $links === null ? null : array_values((array) $links), 'layout' => $layout, 'highlight' => $highlight, 'animate' => (bool) $animate, 'uid' => $uid];
    $cardBase = 'relative flex w-full min-w-0 flex-col items-stretch gap-1.5 rounded-card border border-border bg-card p-3 text-start shadow-xs';
@endphp
<figure data-slot="workflow-network" data-layout="{{ $vertical ? 'vertical' : 'horizontal' }}" x-data="nqWorkflowNetwork(@js($config))" {{ $attributes->cn('m-0 w-full') }}>
    @if ($title)
        <h3 class="mb-2 text-h3 text-foreground">{{ $title }}</h3>
    @endif
    <p class="sr-only">{{ $count }}</p>
    <div data-net="flow" class="relative">
        <svg data-net="edges" aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-visible text-muted-foreground" width="0" height="0" viewBox="0 0 1 1">
            <defs>
                <marker id="{{ $uid }}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" class="fill-muted-foreground" />
                </marker>
                <marker id="{{ $uid }}-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" class="fill-nq-brand" />
                </marker>
            </defs>
        </svg>
        <div data-net="rows" class="relative flex flex-col p-2 {{ $vertical ? 'gap-9' : 'gap-10' }}">
            @foreach ($rows as $row)
                <div data-net="row" class="flex items-stretch justify-center {{ $vertical ? 'mx-auto w-full max-w-[26rem]' : 'gap-10' }}">
                    @foreach ($row as $s)
                        @php
                            $kind = $s['kind'] ?? 'step';
                            $icon = $s['icon'] ?? $kindIcon[$kind] ?? 'arrow-right';
                            $hot = $highlight !== null && ($s['id'] ?? null) === $highlight;
                            $card = \Nasaq\Cn::merge($cardBase, $kindStyle[$kind] ?? '', $hot ? 'ring-2 ring-nq-brand ring-offset-2 ring-offset-background' : '', $clickable ? 'cursor-pointer outline-none transition-colors hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus' : '');
                            $tag = $clickable ? 'button' : 'div';
                        @endphp
                        <div data-net="cell" class="flex min-w-0 {{ $vertical ? 'w-full' : 'max-w-64 flex-1 basis-0' }}">
                            <{{ $tag }} @if ($clickable) type="button" x-on:click="$dispatch('nq-step-click', { id: @js($s['id'] ?? '') })" @endif data-step="{{ $s['id'] ?? '' }}" data-kind="{{ $kind }}" class="{{ $card }}">
                                <span class="flex items-center gap-2">
                                    <span class="{{ \Nasaq\Cn::merge('flex size-8 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-foreground [&_svg]:size-4', $kind === 'decision' ? 'rotate-45 rounded-[8px]' : '', $kind === 'output' ? 'border-nq-brand/40 bg-nq-brand text-white' : '') }}">
                                        <span class="{{ $kind === 'decision' ? 'flex -rotate-45' : 'flex' }}">
                                            <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" :class="$kind === 'step' && empty($s['icon']) ? 'rtl:-scale-x-100' : ''" />
                                        </span>
                                    </span>
                                    <span class="min-w-0 flex-1 text-label leading-tight text-foreground">{{ $s['title'] ?? '' }}</span>
                                </span>
                                @if (! empty($s['description']))
                                    <span class="text-caption text-muted-foreground">{{ $s['description'] }}</span>
                                @endif
                                @if (! empty($s['owner']) || $kind !== 'step')
                                    <span class="flex flex-wrap items-center gap-1.5">
                                        @if (! empty($s['owner']))
                                            <x-nq::badge variant="neutral">{{ $s['owner'] }}</x-nq::badge>
                                        @endif
                                        @if ($kind !== 'step')
                                            <x-nq::badge variant="outline">{{ $kinds[$kind] ?? $kind }}</x-nq::badge>
                                        @endif
                                    </span>
                                @endif
                            </{{ $tag }}>
                        </div>
                    @endforeach
                </div>
            @endforeach
        </div>
    </div>
    @if ($caption)
        <figcaption class="mt-3 text-body-sm text-muted-foreground">{{ $caption }}</figcaption>
    @endif
</figure>
