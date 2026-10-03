{{-- <x-nq::semantic-search :results="$hits" @nq-semantic-search="$event.detail.promise = search($event.detail.query, $event.detail.mode, $event.detail.limit)" @nq-semantic-open="open($event.detail.hit.id)" />
     A search box for a knowledge base with ranked results. Each hit shows its text with the query words marked, where it came from and a similarity score. Facet chips (group, type, source, high importance) narrow the hits in the browser.
     results: the hits, each ['id', 'content', 'score' (0 to 1), 'group', 'kind', 'source', 'sourceRef', 'importance' (0 to 1), 'viaEntity']; x-modelable.
     query: start with this text. modes: [['id' => 'semantic', 'label' => …], …] (default semantic and keyword; [] hides the switch). mode, limits (default [10, 20, 50]), limit. show-scores (default true). open (default true): show the Open button.
     labels: ['label' => …, 'placeholder' => …, 'search' => …, 'searching' => …, 'mode' => …, 'limitLabel' => …, 'tune' => …, 'group' => …, 'kind' => …, 'source' => …, 'highImportance' => …, 'clear' => …, 'open' => …, 'copy' => …, 'copied' => …, 'score' => …, 'scoreTitle' => 'Similarity {n}', 'strong' => …, 'good' => …, 'weak' => …, 'importance' => 'Importance {n}', 'via' => 'via {entity}', 'idle' => …, 'none' => 'Nothing found for “{q}”', 'noneHint' => …, 'allFiltered' => '{n} …', 'countOne' => …, 'countMany' => '{n} results', 'countOf' => '{n} of {total} results', 'loading' => …, 'failed' => …].
     Submitting dispatches the bubbling "nq-semantic-search" with { query, mode, limit, promise }: set event.detail.promise to a Promise resolving to the hits array (or { error }). The Open button dispatches "nq-semantic-open" with { hit }.
     The result context menu of the Vue and React versions is not ported. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['results' => [], 'query' => '', 'modes' => null, 'mode' => null, 'limits' => [10, 20, 50], 'limit' => null, 'showScores' => true, 'open' => true, 'labels' => [], 'locale' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $strings = [
        'en' => [
            'label' => 'Semantic search', 'placeholder' => 'Ask or describe what you are looking for', 'search' => 'Search', 'searching' => 'Searching', 'mode' => 'Search mode', 'limitLabel' => 'Results', 'tune' => 'Refine',
            'group' => 'Group', 'kind' => 'Type', 'source' => 'Source', 'highImportance' => 'High importance', 'clear' => 'Clear filters', 'countOne' => '1 result', 'countMany' => '{n} results', 'countOf' => '{n} of {total} results',
            'open' => 'Open', 'copy' => 'Copy text', 'copied' => 'Copied', 'score' => 'Match', 'scoreTitle' => 'Similarity {n}', 'strong' => 'Strong', 'good' => 'Good', 'weak' => 'Weak', 'importance' => 'Importance {n}', 'via' => 'via {entity}',
            'idle' => 'Search the brain in plain words. Results are ranked by meaning, not only by matching words.', 'none' => 'Nothing found for “{q}”',
            'noneHint' => 'Try other words, or a shorter question. If it should be there, add it and it will show up as a knowledge gap.', 'allFiltered' => 'All {n} results are hidden by the filters.',
            'loading' => 'Searching', 'failed' => 'The search failed. Try again.', 'semantic' => 'Semantic', 'keyword' => 'Keyword',
        ],
        'ar' => [
            'label' => 'البحث الدلالي', 'placeholder' => 'اسأل أو صِف ما تبحث عنه', 'search' => 'بحث', 'searching' => 'جارٍ البحث', 'mode' => 'نمط البحث', 'limitLabel' => 'النتائج', 'tune' => 'تضييق',
            'group' => 'المجموعة', 'kind' => 'النوع', 'source' => 'المصدر', 'highImportance' => 'أهمية عالية', 'clear' => 'مسح التصفية', 'countOne' => 'نتيجة واحدة', 'countMany' => '{n} نتائج', 'countOf' => '{n} من {total} نتيجة',
            'open' => 'فتح', 'copy' => 'نسخ النص', 'copied' => 'تم النسخ', 'score' => 'التطابق', 'scoreTitle' => 'التشابه {n}', 'strong' => 'قوي', 'good' => 'جيد', 'weak' => 'ضعيف', 'importance' => 'الأهمية {n}', 'via' => 'عبر {entity}',
            'idle' => 'ابحث في العقل بكلمات عادية. تُرتَّب النتائج بحسب المعنى، لا بمطابقة الكلمات فقط.', 'none' => 'لا نتائج لـ «{q}»',
            'noneHint' => 'جرّب كلمات أخرى أو سؤالًا أقصر. إن كان يجب أن يكون موجودًا، أضِفه وسيظهر كفجوة معرفة.', 'allFiltered' => 'كل النتائج ({n}) مخفية بسبب التصفية.',
            'loading' => 'جارٍ البحث', 'failed' => 'تعذر البحث. حاول مرة أخرى.', 'semantic' => 'دلالي', 'keyword' => 'بالكلمات',
        ],
    ];
    $t = array_merge($strings[$ar ? 'ar' : 'en'], (array) $labels);
    $modes = array_values((array) ($modes ?? [['id' => 'semantic'], ['id' => 'keyword']]));
    $limits = array_values((array) $limits);
    $list = array_values(array_map(fn ($h) => (array) $h, (array) $results));
    $options = [
        'results' => $list,
        'query' => $query ?: null,
        'mode' => $mode ?? ($modes[0]['id'] ?? 'semantic'),
        'limit' => $limit ?? ($limits[0] ?? 10),
        'locale' => $locale ?? ($ar ? 'ar' : 'en'),
        'labels' => array_intersect_key($t, array_flip(['strong', 'good', 'weak', 'failed', 'scoreTitle', 'importance', 'via', 'none', 'allFiltered', 'countOne', 'countMany', 'countOf'])),
    ];
    $options = array_filter($options, fn ($v) => $v !== null);
    $hide = 'style="display: none"';
    $sm = 'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-control-sm px-2.5';
    $primary = 'bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--nq-action)_88%,var(--nq-fg))]';
    $secondary = 'border-border bg-card text-foreground hover:bg-nq-hover';
    $ghost = 'text-foreground hover:bg-nq-hover';
    $fields = ['group', 'kind', 'source'];
@endphp
<section data-slot="semantic-search" aria-label="{{ $t['label'] }}" x-data="nqSemanticSearch({!! \Illuminate\Support\Js::from((object) $options) !!})" x-modelable="results"
    {{ $attributes->cn('flex min-w-0 flex-col gap-4') }}>
    <form class="flex flex-col gap-3" role="search" x-on:submit.prevent="submit()">
        @if (count($modes) > 0 || count($limits) > 1)
            <div class="flex flex-wrap items-center gap-2">
                @if (count($modes) > 0)
                    <div role="group" aria-label="{{ $t['mode'] }}" class="flex flex-wrap items-center gap-1.5">
                        @foreach ($modes as $i => $m)
                            <button type="button" data-slot="button" x-bind:aria-pressed="String(mode === '{{ $m['id'] }}')" x-on:click="mode = '{{ $m['id'] }}'"
                                x-bind:class="mode === '{{ $m['id'] }}' ? '{{ $primary }}' : '{{ $secondary }}'" class="{{ $sm }} {{ $secondary }}">
                                <x-dynamic-component :component="$i === 0 ? 'lucide-sparkles' : 'lucide-search'" aria-hidden="true" />
                                {{ $m['label'] ?? ($t[$m['id']] ?? $m['id']) }}
                            </button>
                        @endforeach
                    </div>
                @endif
                @if (count($limits) > 1)
                    <div role="group" aria-label="{{ $t['limitLabel'] }}" class="ms-auto flex items-center gap-1.5">
                        <span class="text-caption text-muted-foreground">{{ $t['limitLabel'] }}</span>
                        @foreach ($limits as $n)
                            <button type="button" data-slot="button" x-bind:aria-pressed="String(limit === {{ (int) $n }})" x-on:click="limit = {{ (int) $n }}"
                                x-bind:class="limit === {{ (int) $n }} ? '{{ $primary }}' : '{{ $ghost }}'" class="{{ $sm }} {{ $ghost }} h-7 px-2 tabular-nums">{{ (int) $n }}</button>
                        @endforeach
                    </div>
                @endif
            </div>
        @endif
        <div class="flex flex-col gap-2 sm:flex-row">
            <div class="relative min-w-0 flex-1">
                <x-lucide-search aria-hidden="true" class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <x-nq::field.input dir="auto" x-model="query" :placeholder="$t['placeholder']" :aria-label="$t['placeholder']" class="ps-9" />
            </div>
            <button type="submit" data-slot="button" x-bind:aria-busy="searching ? 'true' : null" x-bind:disabled="(searching || ! query.trim()) ? '' : null" x-bind:data-disabled="(searching || ! query.trim()) ? '' : null"
                @if (! $query) disabled data-disabled @endif
                class="inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 {{ $primary }} h-control px-[var(--nq-control-pad)]">
                <span x-show="searching" {!! $hide !!}><x-nq::spinner /></span>
                <span x-text="searching ? @js($t['searching']) : @js($t['search'])">{{ $t['search'] }}</span>
            </button>
        </div>
    </form>

    <div x-show="results.length > 0 && ! searching" class="flex flex-wrap items-center gap-1.5" role="group" aria-label="{{ $t['tune'] }}" @if (! $list) {!! $hide !!} @endif>
        <span class="me-1 inline-flex items-center gap-1.5 text-caption text-muted-foreground">
            <x-lucide-sliders-horizontal aria-hidden="true" class="size-3.5" />
            {{ $t['tune'] }}
        </span>
        @foreach ($fields as $field)
            <span x-show="values('{{ $field }}').length > 0" role="group" aria-label="{{ $t[$field] }}" class="flex flex-wrap items-center gap-1.5 border-s border-border ps-2 first:border-s-0 first:ps-0">
                <template x-for="value in values('{{ $field }}')" :key="value">
                    <button type="button" data-slot="button" x-bind:aria-pressed="String(isOn('{{ $field }}', value))" x-on:click="toggle('{{ $field }}', value)"
                        x-bind:class="isOn('{{ $field }}', value) ? '{{ $primary }}' : '{{ $secondary }}'" class="{{ $sm }} {{ $secondary }} h-7 px-2.5 text-caption">
                        <span x-show="isOn('{{ $field }}', value)" class="flex [&_svg]:size-4" {!! $hide !!}><x-lucide-check aria-hidden="true" /></span>
                        <bdi dir="ltr" class="font-mono text-[12px]" x-text="value"></bdi>
                    </button>
                </template>
            </span>
        @endforeach
        <span x-show="hasImportance" class="border-s border-border ps-2" {!! $hide !!}>
            <button type="button" data-slot="button" x-bind:aria-pressed="String(high)" x-on:click="high = ! high" x-bind:class="high ? '{{ $primary }}' : '{{ $secondary }}'" class="{{ $sm }} {{ $secondary }} h-7 px-2.5 text-caption">
                <x-lucide-star aria-hidden="true" />
                {{ $t['highImportance'] }}
            </button>
        </span>
        <button type="button" data-slot="button" x-show="filtered" x-on:click="clear()" class="{{ $sm }} {{ $ghost }} ms-auto h-7" {!! $hide !!}>
            <x-lucide-x aria-hidden="true" />
            {{ $t['clear'] }}
        </button>
    </div>

    <div x-show="searching" role="status" aria-live="polite" class="flex flex-col gap-3 rounded-card border border-border bg-card p-4" {!! $hide !!}>
        <span class="sr-only">{{ $t['loading'] }}</span>
        @foreach ([0, 1, 2] as $i)
            <div class="flex flex-col gap-2">
                <x-nq::states.skeleton class="h-4 w-3/4" />
                <x-nq::states.skeleton class="h-3 w-1/3" />
            </div>
        @endforeach
    </div>
    <div x-show="! searching && error" role="alert" data-slot="error-state" class="flex flex-col items-center justify-center gap-3 border border-dashed border-border px-6 py-12 text-center rounded-card" {!! $hide !!}>
        <span data-slot="state-icon" class="inline-flex size-10 items-center justify-center rounded-control border border-border bg-card [&_svg]:size-5 text-nq-danger-text"><x-lucide-circle-alert aria-hidden="true" /></span>
        <div class="flex max-w-sm flex-col gap-1"><p class="text-label text-foreground" x-text="error"></p></div>
    </div>
    <p x-show="! searching && ! error && ! asked && results.length === 0" class="py-6 text-center text-body-sm text-muted-foreground" @if ($list || false) {!! $hide !!} @endif>{{ $t['idle'] }}</p>
    <div x-show="! searching && ! error && asked && results.length === 0" data-slot="empty-state" class="flex flex-col items-center justify-center gap-3 border border-dashed border-border px-6 py-12 text-center rounded-card" {!! $hide !!}>
        <span data-slot="state-icon" class="inline-flex size-10 items-center justify-center rounded-control border border-border bg-card [&_svg]:size-5 text-muted-foreground"><x-lucide-search aria-hidden="true" /></span>
        <div class="flex max-w-sm flex-col gap-1">
            <p class="text-label text-foreground" x-text="noneText"></p>
            <p class="text-body-sm text-muted-foreground">{{ $t['noneHint'] }}</p>
        </div>
    </div>
    <p x-show="! searching && ! error && results.length > 0 && shown.length === 0" class="py-6 text-center text-body-sm text-muted-foreground" x-text="filteredText" {!! $hide !!}></p>
    <div x-show="! searching && ! error && shown.length > 0" class="flex flex-col gap-2" @if (! $list) {!! $hide !!} @endif>
        <p role="status" aria-live="polite" class="text-caption text-muted-foreground" x-text="countText"></p>
        <ol class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            <template x-for="hit in shown" :key="hit.id">
                <li class="flex flex-col gap-2 px-4 py-3">
                    <div class="flex items-start gap-3">
                        <p dir="auto" class="line-clamp-4 min-w-0 flex-1 whitespace-pre-wrap text-body text-foreground" x-html="marked(hit)"></p>
                        @if ($open)
                            <button type="button" data-slot="button" x-on:click="open(hit)" class="{{ $sm }} {{ $secondary }} shrink-0">{{ $t['open'] }}</button>
                        @endif
                    </div>
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-muted-foreground">
                        <span x-show="hit.group || hit.kind" data-slot="badge" dir="ltr" x-text="tag(hit)" {!! $hide !!}
                            class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3 border-border text-muted-foreground font-mono"></span>
                        <bdi x-show="hit.source" dir="ltr" class="max-w-56 truncate font-mono" x-text="sourceText(hit)" {!! $hide !!}></bdi>
                        <span x-show="hit.viaEntity" class="text-nq-accent-text" x-text="viaText(hit)" {!! $hide !!}></span>
                        <span class="ms-auto flex flex-wrap items-center gap-3">
                            <span x-show="copied === hit.id" role="status" {!! $hide !!}>{{ $t['copied'] }}</span>
                            @if ($showScores)
                                <span class="inline-flex items-center gap-2" x-bind:title="scoreTitle(hit)">
                                    <span class="sr-only">{{ $t['score'] }}</span>
                                    <span aria-hidden="true" class="block h-1 w-12 overflow-hidden rounded-full bg-nq-surface-soft">
                                        <span class="block h-full rounded-full" x-bind:class="weak(hit) ? 'bg-nq-line-strong' : 'bg-nq-accent'" x-bind:style="scoreWidth(hit)"></span>
                                    </span>
                                    <bdi dir="ltr" class="tabular-nums" x-text="fig(hit.score)"></bdi>
                                    <span x-text="level(hit)"></span>
                                </span>
                            @endif
                            <span x-show="hit.importance !== undefined && hit.importance !== null" x-text="importanceText(hit)" {!! $hide !!}></span>
                        </span>
                    </div>
                </li>
            </template>
        </ol>
    </div>
</section>
