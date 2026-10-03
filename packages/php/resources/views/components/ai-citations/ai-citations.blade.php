{{-- <x-nq::ai-citations :text="$answer" :sources="$sources" :provenance="['model' => 'claude-sonnet', 'grounded' => true]" />
     The whole answer: AI generated label, text with [n] markers, source chips, an evidence panel with the quotes, a note when paragraphs have no source,
     provenance, and thumbs. Marker, chip and card light up together (bubbling "nq-cite-active" { id | null }). Pressing a chip opens the evidence and fires "nq-source-open" { id }.
     Needs the Alpine runtime (@nasaqScripts).
     text: Markdown with [n] markers (1-based into sources). sources: [{ id, title, url?, quote?, snippet?, locator?, kind?, score?, highlight? }].
     provenance: array for ai-citations.provenance. model: after the "AI generated" label (defaults to provenance model). default-evidence-open.
     feedback: true to show thumbs, or 'up' | 'down' to show it with a choice (fires "nq-ai-feedback"). labels: words. --}}
@include('nasaq::components.ai-citations._logic')
@props(['text', 'sources' => [], 'provenance' => null, 'model' => null, 'defaultEvidenceOpen' => false, 'feedback' => false, 'labels' => []])
@php
    $t = nq_aic_words($labels);
    $list = array_values($sources);
    $uid = 'nq-ai-'.\Illuminate\Support\Str::random(6);
    $citedIds = array_map(fn ($n) => $list[$n - 1]['id'], nq_aic_cited_numbers((string) $text, count($list)));
    $cov = nq_aic_coverage((string) $text, count($list));
    $partly = count($list) > 0 && $cov['total'] > 0 && $cov['cited'] < $cov['total'];
    $evidence = [];
    foreach ($list as $i => $s) {
        if (! empty($s['quote']) || ! empty($s['snippet'])) {
            $evidence[] = [$i + 1, $s];
        }
    }
    $js = fn ($v) => \Illuminate\Support\Js::from($v);
    $p = $provenance ?? [];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'ai-cited-answer') }}" x-data="nqAiCitations({{ $defaultEvidenceOpen ? 'true' : 'false' }}, {!! $js($uid) !!})" x-on:nq-cite-active="setActive($event)" x-on:nq-cite-select="select($event)"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <div class="flex items-center justify-between gap-2">
        <x-nq::ai-states.generated-label :model="$model ?? ($p['model'] ?? null)" />
        @if ($feedback)<x-nq::ai-states.feedback :value="is_string($feedback) ? $feedback : null" />@endif
    </div>
    <x-nq::ai-citations.cited-text :text="$text" :sources="$list" :labels="$labels" />
    @if ($partly)
        <p role="note" class="text-caption text-muted-foreground"><span class="text-nq-warning-text">{{ nq_aic_fill($t['coverage'], ['cited' => $cov['cited'], 'total' => $cov['total']]) }}</span> {{ $t['partlyCited'] }}</p>
    @endif
    <x-nq::ai-citations.source-chips :sources="$list" :cited-ids="$citedIds" :select="count($evidence) > 0" :labels="$labels" />
    @if (count($evidence) > 0)
        <x-nq::collapsible :open="$defaultEvidenceOpen" x-model="evidenceOpen">
            <button type="button" data-slot="collapsible-trigger" x-bind:aria-controls="$id('nq-collapsible', 'panel')" x-bind:data-panel-open="open ? '' : undefined" x-on:click="toggle()" x-bind:aria-expanded="open" aria-expanded="{{ $defaultEvidenceOpen ? 'true' : 'false' }}"
                @if ($defaultEvidenceOpen) data-panel-open @endif
                class="group/trigger inline-flex min-h-control-sm items-center gap-1.5 rounded-control text-caption text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                <x-lucide-chevron-down aria-hidden="true" class="size-3.5 transition-transform duration-150 ease-nq group-data-panel-open/trigger:rotate-180" />
                <span x-text="open ? {!! $js($t['hideEvidence']) !!} : {!! $js($t['showEvidence']) !!}">{{ $defaultEvidenceOpen ? $t['hideEvidence'] : $t['showEvidence'] }}</span>
            </button>
            <x-nq::collapsible.panel>
                <ul aria-label="{{ $t['evidence'] }}" class="mt-1 grid gap-2 sm:grid-cols-2">
                    @foreach ($evidence as [$n, $s])
                        <li id="{{ $uid }}-ev-{{ $s['id'] }}" class="min-w-0"><x-nq::ai-citations.evidence-card :source="$s" :index="$n" track :labels="$labels" /></li>
                    @endforeach
                </ul>
            </x-nq::collapsible.panel>
        </x-nq::collapsible>
    @endif
    @if ($provenance)
        <x-nq::ai-citations.provenance :labels="$labels" :model="$p['model'] ?? null" :latency-ms="$p['latencyMs'] ?? null" :grounded="$p['grounded'] ?? null" :source-count="$p['sourceCount'] ?? null" :tokens="$p['tokens'] ?? null" :retrieved="$p['retrieved'] ?? null" :at="$p['at'] ?? null" :confidence="$p['confidence'] ?? null" :extra="$p['extra'] ?? []" />
    @endif
</section>
