{{-- Internal: the numbered sources under an answer. Only http(s) urls become links. sources: [{ id, title, url?, snippet? }]. t: the words. --}}
@include('nasaq::components.copilot-chat._logic')
@props(['sources' => [], 't' => []])
@php
    $box = 'flex max-w-56 items-center gap-2 rounded-control border border-border bg-card px-2 py-1.5';
    $link = 'outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus';
@endphp
@if (count($sources) > 0)
<div data-slot="{{ $attributes->get('data-slot', 'copilot-sources') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-1.5') }}>
    <span class="text-caption text-muted-foreground">{{ $t['sources'] }}</span>
    <ol class="flex flex-wrap gap-2">
        @foreach (array_values($sources) as $i => $s)
            @php($safe = nq_cc_safe_url($s['url'] ?? null))
            <li class="min-w-0">
                @if ($safe)<a href="{{ $s['url'] }}" target="_blank" rel="noopener noreferrer" @if (! empty($s['snippet'])) title="{{ $s['snippet'] }}" @endif class="{{ \Nasaq\Cn::merge($box, $link) }}">@else<span @if (! empty($s['snippet'])) title="{{ $s['snippet'] }}" @endif class="{{ $box }}">@endif
                    @if (! $safe && ! empty($s['snippet']))<x-lucide-file-text aria-hidden="true" class="size-3.5 shrink-0 text-muted-foreground" />@endif
                    <span class="grid size-4 shrink-0 place-items-center rounded-full bg-secondary text-[10px] tabular-nums text-muted-foreground">{{ $i + 1 }}</span>
                    <span class="flex min-w-0 flex-col">
                        <span dir="auto" class="truncate text-caption text-foreground">{{ $s['title'] }}</span>
                        @if (nq_cc_host($s['url'] ?? null) !== '')<span dir="ltr" class="truncate text-[11px] text-muted-foreground">{{ nq_cc_host($s['url']) }}</span>@endif
                    </span>
                @if ($safe)</a>@else</span>@endif
            </li>
        @endforeach
    </ol>
</div>
@endif
