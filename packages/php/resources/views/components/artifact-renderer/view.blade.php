{{-- Internal: renders one already-validated artifact (see <x-nq::artifact-renderer>, which validates first). --}}
@include('nasaq::components.artifact-renderer._logic')
@props(['artifact', 'allowHtml' => false, 'words' => null, 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $words ??= nq_art_words($locale);
    $kind = $artifact['kind'];
    $tx = fn ($v) => nq_art_localize($v, $locale);
    $badge = ['neutral' => 'neutral', 'success' => 'success', 'warning' => 'warning', 'danger' => 'danger', 'info' => 'info'];
@endphp
@if ($kind === 'card')
    @php
        $footerNote = $tx($artifact['footer'] ?? null);
        $actions = $artifact['actions'] ?? [];
    @endphp
    <x-nq::artifact-renderer.frame :artifact="$artifact" :locale="$locale" :note="$footerNote !== '' ? $footerNote : null">
        @if (! empty($artifact['badges']))
            <div class="flex flex-wrap gap-1.5">
                @foreach ($artifact['badges'] as $b)
                    <x-nq::badge :variant="$badge[$b['tone'] ?? 'neutral']">{{ $tx($b['label']) }}</x-nq::badge>
                @endforeach
            </div>
        @endif
        @if (! empty($artifact['fields']))
            <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
                @foreach ($artifact['fields'] as $f)
                    <div class="contents">
                        <dt dir="auto" class="text-muted-foreground">{{ $tx($f['label']) }}</dt>
                        <dd dir="auto" class="min-w-0 break-words text-foreground"><x-nq::artifact-renderer.cell :value="$f['value']" :words="$words" :locale="$locale" /></dd>
                    </div>
                @endforeach
            </dl>
        @endif
        @if (! empty($artifact['items']))
            <ul data-slot="artifact-items" class="flex flex-col divide-y divide-border rounded-control border border-border">
                @foreach ($artifact['items'] as $it)
                    <li class="flex items-start gap-3 px-3 py-2">
                        <span class="flex min-w-0 flex-1 flex-col">
                            <span dir="auto" class="flex items-center gap-2 text-body-sm text-foreground">
                                @if (isset($it['tone'])){!! nq_art_tone_dot($it['tone'], $words) !!}@endif
                                {{ $tx($it['label']) }}
                            </span>
                            @if (isset($it['description']))<span dir="auto" class="text-caption text-muted-foreground">{{ $tx($it['description']) }}</span>@endif
                        </span>
                        @if (array_key_exists('value', $it))
                            <span dir="auto" class="shrink-0 text-body-sm text-foreground tabular-nums"><x-nq::artifact-renderer.cell :value="$it['value']" :words="$words" :locale="$locale" /></span>
                        @endif
                    </li>
                @endforeach
            </ul>
        @endif
        @if (isset($artifact['body']))
            <x-nq::markdown :source="$tx($artifact['body'])" />
        @endif
        @if ($actions)
            <x-slot:footer>
                <x-nq::artifact-renderer.actions :actions="$actions" :artifact-id="$artifact['id'] ?? null" :words="$words" :locale="$locale" />
            </x-slot:footer>
        @endif
    </x-nq::artifact-renderer.frame>
@elseif ($kind === 'table')
    <x-nq::artifact-renderer.frame :artifact="$artifact" :locale="$locale">
        <x-nq::table :label="$tx($artifact['title'] ?? null) ?: null">
            <x-nq::table.header>
                <x-nq::table.row>
                    @foreach ($artifact['columns'] as $c)
                        <x-nq::table.head dir="auto" :class="($c['align'] ?? null) === 'end' ? 'text-start text-end' : 'text-start'">{{ $tx($c['label']) }}</x-nq::table.head>
                    @endforeach
                </x-nq::table.row>
            </x-nq::table.header>
            <x-nq::table.body>
                @foreach ($artifact['rows'] as $r)
                    <x-nq::table.row>
                        @foreach ($artifact['columns'] as $c)
                            @php $end = ($c['align'] ?? null) === 'end' || is_int($r[$c['key']] ?? null) || is_float($r[$c['key']] ?? null); @endphp
                            <x-nq::table.cell dir="auto" :class="$end ? 'text-start text-end tabular-nums' : 'text-start'">
                                <x-nq::artifact-renderer.cell :value="$r[$c['key']] ?? null" :words="$words" :locale="$locale" />
                            </x-nq::table.cell>
                        @endforeach
                    </x-nq::table.row>
                @endforeach
            </x-nq::table.body>
        </x-nq::table>
    </x-nq::artifact-renderer.frame>
@elseif ($kind === 'chart')
    <x-nq::artifact-renderer.frame :artifact="$artifact" :locale="$locale">
        <x-nq::artifact-renderer.chart :artifact="$artifact" :words="$words" :locale="$locale" />
    </x-nq::artifact-renderer.frame>
@elseif ($kind === 'markdown')
    <x-nq::artifact-renderer.frame :artifact="$artifact" :locale="$locale">
        <x-nq::markdown :source="$artifact['text']" />
    </x-nq::artifact-renderer.frame>
@elseif ($kind === 'code')
    <x-nq::artifact-renderer.frame :artifact="$artifact" :locale="$locale">
        <x-nq::code-block :code="$artifact['code']" :language="$artifact['language'] ?? 'text'" :filename="$artifact['filename'] ?? null" :label="$tx($artifact['title'] ?? null) ?: $words['source']" pre-class="max-h-80" />
    </x-nq::artifact-renderer.frame>
@elseif ($kind === 'actions')
    <x-nq::artifact-renderer.frame :artifact="$artifact" :locale="$locale">
        <x-nq::artifact-renderer.actions :actions="$artifact['actions']" :artifact-id="$artifact['id'] ?? null" :words="$words" :locale="$locale" />
    </x-nq::artifact-renderer.frame>
@elseif ($kind === 'picker')
    <x-nq::artifact-renderer.frame :artifact="$artifact" :locale="$locale">
        <x-nq::artifact-renderer.picker :artifact="$artifact" :words="$words" :locale="$locale" />
    </x-nq::artifact-renderer.frame>
@elseif ($kind === 'stats')
    <x-nq::artifact-renderer.frame :artifact="$artifact" :locale="$locale">
        <x-nq::stat-card.grid>
            @foreach ($artifact['items'] as $s)
                @php
                    $numeric = is_int($s['value']) || is_float($s['value']);
                    $label = isset($s['tone'])
                        ? new \Illuminate\Support\HtmlString('<span class="inline-flex items-center gap-1.5">'.nq_art_tone_dot($s['tone'], $words).e($tx($s['label'])).'</span>')
                        : $tx($s['label']);
                @endphp
                <x-nq::stat-card :label="$label" :value="$numeric ? $s['value'] : null" :delta="$s['delta'] ?? null" :invert="$s['invert'] ?? false" :sparkline="$s['sparkline'] ?? null" :locale="$locale">
                    @unless ($numeric){{ $s['value'] }}@endunless
                </x-nq::stat-card>
            @endforeach
        </x-nq::stat-card.grid>
    </x-nq::artifact-renderer.frame>
@elseif ($kind === 'html')
    <x-nq::artifact-renderer.frame :artifact="$artifact" :locale="$locale">
        @if ($allowHtml)
            {{-- Empty sandbox: no scripts, no same-origin, no forms, no top navigation, no popups. The document also carries a CSP. --}}
            <iframe title="{{ $tx($artifact['title'] ?? null) ?: $words['htmlFrame'] }}" sandbox="" referrerpolicy="no-referrer" loading="lazy" srcdoc="{{ nq_art_frame_document($artifact['html']) }}"
                style="height: {{ nq_art_frame_height($artifact['height'] ?? null) }}px" class="w-full rounded-control border border-border bg-background"></iframe>
        @else
            <p class="text-caption text-muted-foreground">{{ $words['htmlAsCode'] }}</p>
            <x-nq::code-block :code="$artifact['html']" language="html" :label="$words['source']" pre-class="max-h-60" />
        @endif
    </x-nq::artifact-renderer.frame>
@endif
