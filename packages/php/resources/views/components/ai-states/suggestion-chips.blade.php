{{-- <x-nq::ai-states.suggestion-chips :suggestions="[['id' => 'shorter', 'label' => 'Make it shorter'], ['id' => 'tr', 'label' => 'Translate', 'icon' => 'languages']]" dismissible />
     Inline suggestions next to a field or under an answer. One tap runs one. suggestions: [{ id, label, icon? (a Lucide name) }]. dismissible: a dismiss button on each chip (the chip hides, the event tells you).
     label: accessible name of the group (default "AI suggestions"), labels: words (suggestions, dismiss with {label}). Renders nothing without suggestions. Events, bubbling from the chip:
       nq-ai-pick { id }     nq-ai-dismiss { id }
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.ai-states._logic')
@props(['suggestions' => [], 'dismissible' => false, 'label' => null, 'labels' => []])
@php($t = nq_ai_words($labels))
@if (count($suggestions) > 0)
<div role="group" aria-label="{{ $label ?? $t['suggestions'] }}" data-slot="{{ $attributes->get('data-slot', 'ai-suggestion-chips') }}" x-data="{ gone: [] }" {{ $attributes->except('data-slot')->cn('flex flex-wrap gap-1.5') }}>
    @foreach ($suggestions as $s)
        @php($id = \Illuminate\Support\Js::from((string) $s['id'])->toHtml())
        <span x-show="! gone.includes({!! $id !!})" class="inline-flex max-w-full items-center rounded-full border border-border bg-card text-caption text-foreground transition-colors duration-150 ease-nq focus-within:outline-2 focus-within:outline-nq-focus hover:bg-nq-hover">
            <button type="button" x-on:click="$dispatch('nq-ai-pick', { id: {!! $id !!} })" class="{{ \Nasaq\Cn::merge('inline-flex min-h-7 min-w-0 items-center gap-1.5 rounded-full ps-2.5 outline-none', $dismissible ? 'pe-1.5' : 'pe-2.5') }}">
                @if (! empty($s['icon']))<x-dynamic-component :component="'lucide-'.$s['icon']" aria-hidden="true" class="size-3.5 shrink-0 text-nq-accent-text" />@else<x-lucide-sparkles aria-hidden="true" class="size-3.5 shrink-0 text-nq-accent-text" />@endif
                <span dir="auto" class="truncate">{{ $s['label'] }}</span>
            </button>
            @if ($dismissible)
                <button type="button" aria-label="{{ nq_ai_fill($t['dismiss'], ['label' => $s['label']]) }}" x-on:click="gone.push({!! $id !!}); $dispatch('nq-ai-dismiss', { id: {!! $id !!} })"
                    class="me-1 grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                    <x-lucide-x aria-hidden="true" class="size-3" />
                </button>
            @endif
        </span>
    @endforeach
</div>
@endif
