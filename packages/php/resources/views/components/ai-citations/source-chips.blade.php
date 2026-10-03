{{-- <x-nq::ai-citations.source-chips :sources="$sources" :cited-ids="['s1']" />
     A row of numbered source chips with the host underneath. Hovering or focusing one tells the enclosing <x-nq::ai-citations> (a bubbling "nq-cite-active" { id | null })
     so the matching marker and evidence card light up; the chip lights up when its source is active. Needs the Alpine runtime (@nasaqScripts).
     sources: [{ id, title, url?, ... }]. cited-ids: ids the text cites; others are dimmed and marked not cited (omit to treat all as cited).
     select: chips are buttons that dispatch "nq-cite-select" { id, index } (without it a chip with a safe url is a link). label: heading. labels: words. --}}
@include('nasaq::components.ai-citations._logic')
@include('nasaq::components.copilot-chat._logic')
@props(['sources' => [], 'citedIds' => null, 'select' => false, 'label' => null, 'labels' => []])
@php
    $t = nq_aic_words($labels);
    $list = array_values($sources);
    $js = fn ($v) => \Illuminate\Support\Js::from($v);
    $base = 'flex max-w-56 items-center gap-2 rounded-control border border-border bg-card px-2 py-1.5 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus data-active:border-nq-accent data-active:bg-nq-hover';
@endphp
@if (count($list) > 0)
<div data-slot="{{ $attributes->get('data-slot', 'ai-source-chips') }}" role="group" aria-label="{{ $label ?? $t['sourcesLabel'] }}" x-data {{ $attributes->except('data-slot')->cn('flex flex-col gap-1.5') }}>
    <span class="text-caption text-muted-foreground">{{ $label ?? $t['sources'] }}</span>
    <ol class="flex flex-wrap gap-2">
        @foreach ($list as $i => $s)
            @php
                $cited = $citedIds === null || in_array($s['id'], $citedIds, true);
                $safe = nq_cc_safe_url($s['url'] ?? null);
                $cls = \Nasaq\Cn::merge($base, $cited ? "" : "opacity-60");
                $tag = $select ? 'button' : ($safe ? 'a' : 'span');
                $id = $js($s['id']);
                $hover = 'x-bind:data-active="$data.active === '.$id.' ? `` : null" x-on:mouseenter="$dispatch(`nq-cite-active`, { id: '.$id.' })" x-on:mouseleave="$dispatch(`nq-cite-active`, { id: null })" x-on:focus="$dispatch(`nq-cite-active`, { id: '.$id.' })" x-on:blur="$dispatch(`nq-cite-active`, { id: null })"';
                $open = match ($tag) {
                    'button' => '<button type="button" class="'.e($cls).'" x-on:click="$dispatch(`nq-cite-select`, { id: '.$id.', index: '.$i.' })" '.$hover.'>',
                    'a' => '<a href="'.e($s['url']).'" target="_blank" rel="noopener noreferrer" class="'.e($cls).'" '.$hover.'>',
                    default => '<span class="'.e($cls).'" '.$hover.'>',
                };
            @endphp
            <li class="min-w-0">
                {!! $open !!}
                    <span class="grid size-4 shrink-0 place-items-center rounded-full bg-secondary text-[10px] tabular-nums text-muted-foreground"><x-nq::numeric :value="$i + 1" /></span>
                    <span class="flex min-w-0 flex-col">
                        <span dir="auto" class="truncate text-caption text-foreground">{{ $s['title'] }}</span>
                        @if (nq_cc_host($s['url'] ?? null) !== '')<bdi dir="ltr" class="truncate text-[11px] text-muted-foreground">{{ nq_cc_host($s['url']) }}</bdi>@endif
                        @if (! $cited)<span class="text-[11px] text-muted-foreground">{{ $t['notCited'] }}</span>@endif
                    </span>
                {!! '</'.$tag.'>' !!}
            </li>
        @endforeach
    </ol>
</div>
@endif
