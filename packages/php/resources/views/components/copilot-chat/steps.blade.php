{{-- Internal: the tool calls behind an answer, folded into one line ("Used 3 tools") that opens into the list. Used by <x-nq::copilot-chat>.
     steps: [{ id, label, tool?, status: running|done|error, detail? }]. streaming: the answer is still coming. t: the words. --}}
@include('nasaq::components.copilot-chat._logic')
@props(['steps' => [], 'streaming' => false, 't' => []])
@php
    $c = nq_cc_step_counts($steps);
    $current = collect($steps)->first(fn ($s) => ($s['status'] ?? 'done') === 'running');
    $summary = $current ? $current['label'] : ($c['error'] > 0 ? $t['stepFailed'] : nq_cc_used($t, $c['total']));
@endphp
@if ($c['total'] > 0)
<x-nq::collapsible data-slot="{{ $attributes->get('data-slot', 'copilot-steps') }}" {{ $attributes->except('data-slot')->cn('rounded-control border border-border bg-secondary') }}>
    <button type="button" x-on:click="toggle()" x-bind:aria-expanded="open ? 'true' : 'false'" x-bind:aria-controls="$id('nq-collapsible', 'panel')"
        class="flex min-h-control-sm w-full items-center gap-2 px-3 py-1.5 text-start text-caption text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
        @if ($current && $streaming)
            <x-lucide-loader-circle aria-hidden="true" class="size-3.5 shrink-0 motion-safe:animate-spin" />
        @elseif ($c['error'] > 0)
            <x-lucide-triangle-alert aria-hidden="true" class="size-3.5 shrink-0 text-nq-danger-text" />
        @else
            <x-lucide-check aria-hidden="true" class="size-3.5 shrink-0 text-nq-success-text" />
        @endif
        <span class="min-w-0 flex-1 truncate">{{ $summary }}</span>
        <x-lucide-chevron-down aria-hidden="true" x-bind:class="open ? 'rotate-180' : ''" class="size-3.5 shrink-0 transition-transform duration-150 ease-nq" />
    </button>
    <x-nq::collapsible.panel>
        <ol class="flex flex-col gap-2 border-t border-border px-3 py-2">
            @foreach ($steps as $s)
                <li data-status="{{ $s['status'] ?? 'done' }}" class="flex items-start gap-2 text-caption">
                    <span class="mt-0.5 shrink-0" aria-hidden="true">
                        @if (($s['status'] ?? 'done') === 'running')
                            <x-lucide-loader-circle class="size-3.5 motion-safe:animate-spin" />
                        @elseif (($s['status'] ?? 'done') === 'error')
                            <x-lucide-triangle-alert class="size-3.5 text-nq-danger-text" />
                        @else
                            <x-lucide-check class="size-3.5 text-nq-success-text" />
                        @endif
                    </span>
                    <span class="flex min-w-0 flex-col gap-0.5">
                        <span class="text-foreground">
                            {{ $s['label'] }}
                            @if (! empty($s['tool']))<code dir="ltr" class="ms-2 rounded-sm bg-card px-1 font-mono text-[0.85em] text-muted-foreground">{{ $s['tool'] }}</code>@endif
                        </span>
                        @if (! empty($s['detail']))<span dir="auto" class="truncate font-mono text-muted-foreground">{{ $s['detail'] }}</span>@endif
                    </span>
                </li>
            @endforeach
        </ol>
    </x-nq::collapsible.panel>
</x-nq::collapsible>
@endif
