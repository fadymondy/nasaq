{{-- <x-nq::ai-states.thinking :steps="['Reading the document', 'Finding key points', 'Writing']" :current="1" />   <x-nq::ai-states.thinking :steps="[..]" />
     Three pulsing dots, the sparkle and the stage the AI is in. Static (no pulse) under reduced motion.
     label: the text when there are no steps (default "Thinking"). steps: named stages. current: index of the running step; omit it and the labels rotate on their own every `interval` ms (1800)
     (needs the Alpine runtime). current-expr: an Alpine expression for the live index ("step", re-read whenever it changes). compact: one line with only the running step.
     labels: words (thinking, stepDone, stepActive, stepPending). --}}
@include('nasaq::components.ai-states._logic')
@props(['label' => null, 'steps' => [], 'current' => null, 'compact' => false, 'interval' => 1800, 'currentExpr' => null, 'labels' => []])
@php
    $t = nq_ai_words($labels);
    $list = array_values($steps);
    $live = $currentExpr !== null || ($current === null && count($list) > 1);
    $active = (int) ($current ?? 0);
    $running = $list ? $list[min($active, count($list) - 1)] : null;
    $words = ['done' => $t['stepDone'], 'active' => $t['stepActive'], 'pending' => $t['stepPending']];
    $config = \Illuminate\Support\Js::from(['count' => count($list), 'interval' => (int) $interval, 'current' => $current, 'steps' => $list, 'label' => $label ?? $t['thinking'], 'words' => $words])->toHtml();
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'ai-thinking') }}" role="status" aria-live="polite"{!! $live ? ' x-data="nqAiThinking('.$config.')"'.($currentExpr !== null ? ' x-effect="sync('.e($currentExpr).')"' : '') : '' !!}
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-2 text-body-sm text-muted-foreground') }}>
    <span class="inline-flex items-center gap-2">
        <x-lucide-sparkles aria-hidden="true" class="size-4 text-nq-accent-text motion-safe:animate-pulse" />
        @if ($live && $compact)<span x-text="headline()">{{ $running ?? ($label ?? $t['thinking']) }}</span>@else<span>{{ $compact && $running ? $running : ($label ?? $t['thinking']) }}</span>@endif
        <span aria-hidden="true" class="inline-flex items-center gap-1">
            @foreach ([0, 1, 2] as $i)<span class="size-1.5 rounded-full bg-nq-accent motion-safe:animate-pulse" style="animation-delay: {{ $i * 180 }}ms"></span>@endforeach
        </span>
    </span>
    @if (! $compact && count($list) > 0)
        <ol class="flex flex-col gap-1.5 ps-1">
            @foreach ($list as $i => $s)
                @php($st = nq_ai_step_state($i, $active))
                @if ($live)
                    <li x-bind:data-state="state({{ $i }})" x-bind:class="state({{ $i }}) === `pending` ? `opacity-60` : (state({{ $i }}) === `active` ? `text-foreground` : ``)" class="flex items-center gap-2 text-caption">
                        <span aria-hidden="true" class="grid size-4 shrink-0 place-items-center">
                            <x-lucide-check x-show="state({{ $i }}) === `done`" style="display: none" class="size-3.5 text-nq-success-text" />
                            <x-nq::spinner x-show="state({{ $i }}) === `active`" style="display: none" class="size-3.5" />
                            <span x-show="state({{ $i }}) === `pending`" class="size-1.5 rounded-full bg-nq-line-strong"></span>
                        </span>
                        <span dir="auto">{{ $s }}</span>
                        <span class="sr-only" x-text="words[state({{ $i }})]">{{ $words[$st] }}</span>
                    </li>
                @else
                    <li data-state="{{ $st }}" class="{{ \Nasaq\Cn::merge('flex items-center gap-2 text-caption', $st === 'pending' ? 'opacity-60' : '', $st === 'active' ? 'text-foreground' : '') }}">
                        <span aria-hidden="true" class="grid size-4 shrink-0 place-items-center">
                            @if ($st === 'done')<x-lucide-check class="size-3.5 text-nq-success-text" />@elseif ($st === 'active')<x-nq::spinner class="size-3.5" />@else<span class="size-1.5 rounded-full bg-nq-line-strong"></span>@endif
                        </span>
                        <span dir="auto">{{ $s }}</span>
                        <span class="sr-only">{{ $words[$st] }}</span>
                    </li>
                @endif
            @endforeach
        </ol>
    @endif
</div>
