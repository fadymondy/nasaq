{{-- <x-nq::report-editor.viewer :report="$report" />
     A finished report for reading: cover, contents, and the blocks as prose, figures, charts, tables and callouts. Read-only and print friendly:
     the Print button hides on paper and charts, tables and figures do not split across pages. Text blocks show their HTML with the editor's tags only.
     report: ['title', 'subtitle', 'author', 'date', 'blocks' => [...]] (see the React ReportEditor). show-toc: default true with two or more headings.
     hide-print removes the Print button; it calls window.print() unless you pass print-action, a JS expression (x-on:click) such as "$dispatch('nq-print')".
     labels: array overriding the built-in words. locale overrides the app's. --}}
@include('nasaq::components.report-editor._logic')
@props(['report', 'showToc' => null, 'hidePrint' => false, 'printAction' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_re_words($locale, $labels);
    $uid = 'rep-'.\Illuminate\Support\Str::random(6);
    $blocks = array_values($report['blocks'] ?? []);
    $toc = nq_re_toc($report);
    $words = nq_re_word_count($report);
    $withToc = $showToc ?? count($toc) >= 2;
    $meta = array_values(array_filter([
        ! empty($report['author']) ? nq_re_fill($t['by'], $report['author']) : null,
        ! empty($report['date']) ? \Illuminate\Support\Carbon::parse($report['date'])->locale(str_starts_with($locale, 'ar') ? 'ar' : 'en')->isoFormat('LL') : null,
        $words ? nq_re_fill($t['words'], nq_re_num($words, $locale)).' · '.nq_re_fill($t['minutes'], nq_re_num(nq_re_reading_minutes($words), $locale)) : null,
    ]));
    $click = $printAction ?? 'window.print()';
    $headingClass = [1 => 'text-h2', 2 => 'text-h3', 3 => 'text-label'];
@endphp
<article data-slot="report-viewer" aria-label="{{ ($report['title'] ?? '') !== '' ? $report['title'] : $t['viewer'] }}" {{ $attributes->cn('mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-5 print:max-w-none') }}>
    <header class="flex flex-col gap-2">
        <div class="flex items-start gap-3">
            <h1 dir="auto" class="min-w-0 flex-1 text-start text-h1 font-semibold text-foreground">{{ ($report['title'] ?? '') !== '' ? $report['title'] : $t['titlePlaceholder'] }}</h1>
            @unless ($hidePrint)
                <x-nq::button type="button" variant="secondary" size="sm" class="print:hidden" x-on:click="{{ $click }}">
                    <x-lucide-printer aria-hidden="true" />
                    {{ $t['print'] }}
                </x-nq::button>
            @endunless
        </div>
        @if (! empty($report['subtitle']))
            <p dir="auto" class="text-start text-body text-muted-foreground">{{ $report['subtitle'] }}</p>
        @endif
        @if (count($meta))
            <p class="text-caption text-muted-foreground">{{ implode(' · ', $meta) }}</p>
        @endif
    </header>

    @if ($withToc && count($toc))
        <nav aria-label="{{ $t['contents'] }}" class="rounded-card border border-border bg-card p-3 break-inside-avoid">
            <p class="mb-1 text-label text-foreground">{{ $t['contents'] }}</p>
            <ol class="flex flex-col gap-0.5">
                @foreach ($toc as $e)
                    <li style="padding-inline-start: {{ ($e['level'] - 1) * 0.75 }}rem">
                        <a href="#{{ $uid }}-{{ $e['id'] }}" dir="auto" x-on:click.prevent="document.getElementById('{{ $uid }}-{{ $e['id'] }}')?.scrollIntoView({ behavior: 'smooth', block: 'start' })"
                            class="rounded-control text-body-sm text-foreground underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus">{{ $e['text'] }}</a>
                    </li>
                @endforeach
            </ol>
        </nav>
    @endif

    @if (count($blocks) === 0)
        <p class="text-body-sm text-muted-foreground">{{ $t['emptyReport'] }}</p>
    @else
        @foreach ($blocks as $b)
            @php
                $type = $b['type'] ?? '';
                $items = $type === 'metrics' ? array_values(array_filter($b['items'] ?? [], fn ($m) => trim((string) ($m['label'] ?? '')) !== '')) : [];
                $fit = $type === 'table' ? nq_re_fit_table($b) : null;
                $hasCallout = $type === 'callout' && (trim((string) ($b['text'] ?? '')) !== '' || trim((string) ($b['title'] ?? '')) !== '');
                $level = (int) ($b['level'] ?? 1);
                $level = in_array($level, [1, 2, 3], true) ? $level : 1;
                $tag = 'h'.($level + 1);
                $clean = $type === 'text' ? nq_re_clean_html((string) ($b['html'] ?? '')) : '';
            @endphp
            @if ($type === 'heading' && trim((string) ($b['text'] ?? '')) !== '')
                <{{ $tag }} id="{{ $uid }}-{{ $b['id'] }}" dir="auto" class="scroll-mt-4 text-start font-semibold text-foreground break-after-avoid {{ $headingClass[$level] }}">{{ $b['text'] }}</{{ $tag }}>
            @elseif ($type === 'text' && $clean !== '')
                <div data-slot="report-text" class="flex flex-col gap-3 text-body text-nq-fg-body [&_p]:text-start [&_h1]:text-h1 [&_h2]:text-h2 [&_h3]:text-h3 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-6 [&_ol]:ps-6 [&_li]:text-start [&_blockquote]:border-s-2 [&_blockquote]:border-nq-line-strong [&_blockquote]:ps-4 [&_blockquote]:text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_strong]:font-semibold [&_strong]:text-foreground [&_code]:rounded-[4px] [&_code]:bg-secondary [&_code]:px-1 [&_code]:font-mono">{!! $clean !!}</div>
            @elseif ($type === 'metrics')
                <x-nq::stat-card.grid class="break-inside-avoid">
                    @foreach ($items as $m)
                        @php
                            $fmt = ! empty($m['currency']) ? ['style' => 'currency', 'currency' => $m['currency'], 'maxFraction' => 0] : [];
                        @endphp
                        <x-nq::stat-card :label="$m['label']" :value="$m['value'] ?? 0" :format="$fmt" :delta="$m['delta'] ?? null" :delta-label="$m['deltaLabel'] ?? null" :locale="$locale" />
                    @endforeach
                </x-nq::stat-card.grid>
            @elseif ($type === 'chart')
                <figure class="flex min-w-0 flex-col gap-2 break-inside-avoid">
                    @if (! empty($b['title']))
                        <figcaption class="text-label text-foreground">{{ $b['title'] }}</figcaption>
                    @endif
                    <div class="rounded-card border border-border bg-card p-3"><x-nq::report-editor.chart :block="$b" :labels="$labels" :locale="$locale" /></div>
                    @if (! empty($b['caption']))
                        <p dir="auto" class="text-caption text-muted-foreground">{{ $b['caption'] }}</p>
                    @endif
                </figure>
            @elseif ($type === 'table')
                <figure class="flex min-w-0 flex-col gap-2 break-inside-avoid">
                    @if (! empty($b['title']))
                        <figcaption class="text-label text-foreground">{{ $b['title'] }}</figcaption>
                    @endif
                    <div class="overflow-x-auto rounded-card border border-border">
                        <table class="w-full border-collapse text-body-sm">
                            <thead class="bg-secondary text-start">
                                <tr>
                                    @foreach ($fit['columns'] as $c)
                                        <th scope="col" class="border-b border-border px-3 py-2 text-start text-label text-foreground">{{ $c }}</th>
                                    @endforeach
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($fit['rows'] as $r)
                                    <tr class="border-b border-border last:border-b-0">
                                        @foreach ($r as $cell)
                                            <td dir="auto" class="px-3 py-2 text-start text-foreground">{{ $cell }}</td>
                                        @endforeach
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                </figure>
            @elseif ($hasCallout)
                <x-nq::alert :tone="$b['tone'] ?? 'info'" :title="$b['title'] ?? null" role="note" class="break-inside-avoid"><span dir="auto">{{ $b['text'] ?? '' }}</span></x-nq::alert>
            @elseif ($type === 'divider')
                <hr class="border-border">
            @endif
        @endforeach
    @endif
</article>
