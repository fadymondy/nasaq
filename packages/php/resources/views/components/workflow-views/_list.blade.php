{{-- Internal: the numbered outline of x-nq::workflow-views. Recursive: loops and branches include this again.
     Variables: $steps, $prefix, $kinds, $clickable, $highlight. --}}
<ol class="flex flex-col gap-2">
    @foreach (array_values($steps) as $i => $step)
        @php
            $number = $prefix.($i + 1);
            $kind = nq_wfv_kind($step);
            $active = $highlight !== null && ($step['id'] ?? null) === $highlight;
            $tag = $clickable ? 'button' : 'div';
            $card = \Nasaq\Cn::merge(
                'flex w-full items-start gap-3 rounded-control border bg-card px-3 py-2.5 text-start',
                $active ? 'border-primary bg-nq-selected' : 'border-border',
                $clickable ? 'outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus' : '',
            );
        @endphp
        <li data-slot="workflow-step" data-step="{{ $step['id'] }}" data-kind="{{ $kind }}" class="flex flex-col gap-2">
            <{{ $tag }} @if ($clickable) type="button" x-on:click="$dispatch('nq-step-click', { id: @js($step['id']) })" @endif @if ($active) aria-current="step" @endif class="{{ $card }}">
                <bdi dir="ltr" class="min-w-8 pt-px font-mono text-caption text-muted-foreground tabular-nums">{{ $number }}</bdi>
                <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span class="flex flex-wrap items-center gap-2">
                        <span dir="auto" class="text-label text-foreground">{{ $step['title'] }}</span>
                        @if ($kind !== 'step')
                            <x-nq::badge :variant="$kind === 'decision' ? 'info' : 'neutral'">{{ $kinds[$kind] ?? $kind }}</x-nq::badge>
                        @endif
                    </span>
                    @if (! empty($step['description']))
                        <span dir="auto" class="text-caption text-muted-foreground">{{ $step['description'] }}</span>
                    @endif
                </span>
                @if (! empty($step['owner']))
                    <span dir="auto" class="shrink-0 text-caption text-muted-foreground">{{ $step['owner'] }}</span>
                @endif
            </{{ $tag }}>
            @if (! empty($step['children']))
                <div class="ms-5 border-s border-border ps-4">
                    @include('nasaq::components.workflow-views._list', ['steps' => $step['children'], 'prefix' => $number.'.', 'kinds' => $kinds, 'clickable' => $clickable, 'highlight' => $highlight])
                </div>
            @endif
            @foreach (array_values($step['branches'] ?? []) as $j => $branch)
                <div data-slot="workflow-branch" class="ms-5 flex flex-col gap-2 border-s border-dashed border-nq-line-strong ps-4">
                    <span class="flex items-center gap-2 text-caption text-muted-foreground">
                        <x-lucide-git-branch aria-hidden="true" class="size-3.5" />
                        <span dir="auto">{{ $branch['label'] }}</span>
                    </span>
                    @if (! empty($branch['steps']))
                        @include('nasaq::components.workflow-views._list', ['steps' => $branch['steps'], 'prefix' => $number.'.'.chr(97 + $j).'.', 'kinds' => $kinds, 'clickable' => $clickable, 'highlight' => $highlight])
                    @endif
                </div>
            @endforeach
        </li>
    @endforeach
</ol>
