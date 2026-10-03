{{-- <x-nq::editor-chrome.backlinks :backlinks="[['id' => 'a', 'title' => 'Trip plan', 'snippet' => 'See the Packing list for gear.', 'path' => 'Travel']]" highlight="Packing list" />
     A side panel of the documents that link here (the mentioning line highlighted) and related documents below. Static markup, no Alpine.
     backlinks, related: id, title, snippet, path, href (links go to href, else #id). highlight: the word in a snippet to emphasise.
     labels: ['panel', 'backlinks', 'related', 'noBacklinks', 'noRelated']. --}}
@props(['backlinks' => [], 'related' => [], 'highlight' => null, 'labels' => []])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $L = array_merge([
        'panel' => $T('Links and related documents', 'الروابط والمستندات ذات الصلة'),
        'backlinks' => $T('Backlinks', 'الروابط الواردة'),
        'related' => $T('Related', 'ذات صلة'),
        'noBacklinks' => $T('Nothing links here yet.', 'لا شيء يشير إلى هنا بعد.'),
        'noRelated' => $T('No related documents.', 'لا مستندات ذات صلة.'),
    ], $labels);
    $uid = 'nq-eb-'.\Illuminate\Support\Str::random(6);
    $sections = [
        ['key' => 'backlinks', 'heading' => $L['backlinks'], 'links' => array_values($backlinks), 'empty' => $L['noBacklinks'], 'term' => $highlight],
        ['key' => 'related', 'heading' => $L['related'], 'links' => array_values($related), 'empty' => $L['noRelated'], 'term' => null],
    ];
    $parts = function (string $text, ?string $term) {
        if (! $term) return [$text, '', ''];
        $i = mb_stripos($text, $term);
        if ($i === false) return [$text, '', ''];
        return [mb_substr($text, 0, $i), mb_substr($text, $i, mb_strlen($term)), mb_substr($text, $i + mb_strlen($term))];
    };
@endphp
<aside data-slot="{{ $attributes->get('data-slot', 'editor-backlinks') }}" aria-label="{{ $L['panel'] }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-5') }}>
    @foreach ($sections as $s)
        <section aria-labelledby="{{ $uid }}-{{ $s['key'] }}" class="flex flex-col gap-2">
            <h3 id="{{ $uid }}-{{ $s['key'] }}" class="eyebrow flex items-center justify-between">
                {{ $s['heading'] }}
                <span class="tabular-nums">{{ number_format(count($s['links'])) }}</span>
            </h3>
            @if (count($s['links']) === 0)
                <p class="text-body-sm text-muted-foreground">{{ $s['empty'] }}</p>
            @else
                <ul class="flex flex-col gap-1">
                    @foreach ($s['links'] as $link)
                        @php [$before, $mark, $after] = $parts($link['snippet'] ?? '', $s['term']); @endphp
                        <li>
                            <a href="{{ $link['href'] ?? '#'.$link['id'] }}" class="flex flex-col gap-0.5 rounded-control p-2 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                                <span dir="auto" class="flex items-center gap-1.5 text-label text-foreground">
                                    <x-lucide-link-2 aria-hidden="true" class="size-3.5 shrink-0 text-muted-foreground" />
                                    <span class="truncate">{{ $link['title'] }}</span>
                                </span>
                                @if (! empty($link['snippet']))
                                    <span dir="auto" class="line-clamp-2 text-caption text-muted-foreground">{{ $before }}@if ($mark !== '')<mark class="rounded-[2px] bg-nq-selected px-0.5 text-foreground">{{ $mark }}</mark>@endif{{ $after }}</span>
                                @endif
                                @if (! empty($link['path']))
                                    <span dir="auto" class="truncate text-caption text-muted-foreground/80">{{ $link['path'] }}</span>
                                @endif
                            </a>
                        </li>
                    @endforeach
                </ul>
            @endif
        </section>
    @endforeach
</aside>
