{{-- <x-nq::ai-states.stream-controls state="streaming" />   <x-nq::ai-states.stream-controls state="done" regenerate />   <x-nq::ai-states.stream-controls x-model="phase" regenerate />
     Stop while it writes, Regenerate once it is done, stopped or failed. state: idle | streaming | stopped | done | error. regenerate: the Regenerate button exists (React: onRegenerate given).
     Live state: x-model="phase" (x-modelable) or state-expr="phase" (an Alpine expression), re-read whenever it changes; both need the Alpine runtime. labels: words (stop, stopped, regenerate, streaming, failed).
     Events, bubbling from the root: nq-ai-stop, nq-ai-regenerate. --}}
@include('nasaq::components.ai-states._logic')
@props(['state' => 'idle', 'regenerate' => false, 'stateExpr' => null, 'labels' => []])
@php
    $t = nq_ai_words($labels);
    $live = $stateExpr !== null || $attributes->whereStartsWith('x-model')->isNotEmpty();
    $status = ['streaming' => $t['streaming'], 'stopped' => $t['stopped'], 'error' => $t['failed']];
    $config = \Illuminate\Support\Js::from(['state' => $state, 'regenerate' => (bool) $regenerate, 'words' => $status])->toHtml();
    $statusClass = 'text-caption text-muted-foreground';
@endphp
@if ($live)
    <div data-slot="{{ $attributes->get('data-slot', 'ai-stream-controls') }}" x-data="nqAiStream({!! $config !!})" x-modelable="state"{!! $stateExpr !== null ? ' x-effect="sync('.e($stateExpr).')"' : '' !!}
        x-bind:data-state="state" {{ $attributes->except('data-slot')->cn('flex flex-wrap items-center gap-2') }}>
        <x-nq::button type="button" size="sm" variant="secondary" x-show="isStreaming()" style="display: none" x-on:click="stop()">
            <x-lucide-square aria-hidden="true" class="fill-current" />{{ $t['stop'] }}
        </x-nq::button>
        <x-nq::button type="button" size="sm" variant="secondary" x-show="canRegenerate()" style="display: none" x-on:click="again()">
            <x-lucide-refresh-cw aria-hidden="true" />{{ $t['regenerate'] }}
        </x-nq::button>
        <span role="status" class="{{ $statusClass }}" x-text="status()">{{ $status[$state] ?? '' }}</span>
    </div>
@else
    <div data-slot="{{ $attributes->get('data-slot', 'ai-stream-controls') }}" data-state="{{ $state }}" {{ $attributes->except('data-slot')->cn('flex flex-wrap items-center gap-2') }}>
        @if ($state === 'streaming')
            <x-nq::button type="button" size="sm" variant="secondary" x-on:click="$dispatch(`nq-ai-stop`)"><x-lucide-square aria-hidden="true" class="fill-current" />{{ $t['stop'] }}</x-nq::button>
        @elseif ($state !== 'idle' && $regenerate)
            <x-nq::button type="button" size="sm" variant="secondary" x-on:click="$dispatch(`nq-ai-regenerate`)"><x-lucide-refresh-cw aria-hidden="true" />{{ $t['regenerate'] }}</x-nq::button>
        @endif
        <span role="status" class="{{ $statusClass }}">{{ $status[$state] ?? '' }}</span>
    </div>
@endif
