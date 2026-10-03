{{-- <x-nq::knowledge-gaps :gaps="[['id' => 'g1', 'query' => 'Do you ship to Jeddah?', 'hits' => 9, 'firstSeen' => '2026-09-01', 'lastSeen' => '2026-09-20', 'status' => 'open']]" @nq-knowledge-gap-resolve="$event.detail.promise = setStatus($event.detail.gap.id, $event.detail.status)" />
     Questions the brain could not answer, grouped Open / Indexed / Dismissed, most asked first. Each row can be marked indexed, dismissed or reopened.
     gaps: each ['id', 'query', 'hits', 'firstSeen', 'lastSeen', 'status' => open | indexed | dismissed, 'resolution' (optional)]; x-modelable.
     status: the filter ("" for all, the default). interactive (default true): false hides the row buttons. loading, error: show those states instead of the list.
     labels: ['label' => …, 'filter' => …, 'all' => …, 'open' => …, 'indexed' => …, 'dismissed' => …, 'unanswered' => '{n} unanswered', 'asked' => …, 'askedOne' => …, 'firstSeen' => …, 'lastSeen' => …, 'markIndexed' => …, 'dismiss' => …, 'reopen' => …, 'empty' => …, 'emptyHint' => …, 'emptyFiltered' => …, 'loading' => …, 'failed' => …, 'resolvedOpen' => …, 'resolvedIndexed' => …, 'resolvedDismissed' => …].
     A move dispatches the bubbling "nq-knowledge-gap-resolve" with { gap, status, promise }: set event.detail.promise to a Promise (or one resolving to { error }); on success the gap moves, otherwise it stays and the error is announced.
     The row context menu of the Vue and React versions is not ported. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['gaps' => [], 'status' => '', 'interactive' => true, 'loading' => false, 'error' => null, 'labels' => [], 'locale' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $strings = [
        'en' => [
            'label' => 'Knowledge gaps', 'filter' => 'Filter by status', 'all' => 'All', 'open' => 'Open', 'indexed' => 'Indexed', 'dismissed' => 'Dismissed', 'unanswered' => '{n} unanswered',
            'asked' => 'Asked {n} times', 'askedOne' => 'Asked {n} time', 'firstSeen' => 'First asked', 'lastSeen' => 'Last asked', 'markIndexed' => 'Mark as indexed', 'dismiss' => 'Dismiss', 'reopen' => 'Reopen',
            'empty' => 'No unanswered questions', 'emptyHint' => 'When the brain cannot answer a question, it shows up here so you can add what is missing.', 'emptyFiltered' => 'Nothing with this status',
            'loading' => 'Loading gaps', 'failed' => 'The change could not be saved. Try again.', 'resolvedOpen' => 'Reopened.', 'resolvedIndexed' => 'Marked as indexed.', 'resolvedDismissed' => 'Dismissed.',
        ],
        'ar' => [
            'label' => 'فجوات المعرفة', 'filter' => 'تصفية حسب الحالة', 'all' => 'الكل', 'open' => 'مفتوحة', 'indexed' => 'مفهرسة', 'dismissed' => 'مستبعدة', 'unanswered' => '{n} بلا إجابة',
            'asked' => 'سُئل {n} مرات', 'askedOne' => 'سُئل مرة واحدة', 'firstSeen' => 'أول مرة', 'lastSeen' => 'آخر مرة', 'markIndexed' => 'تحديد كمفهرس', 'dismiss' => 'استبعاد', 'reopen' => 'إعادة فتح',
            'empty' => 'لا توجد أسئلة بلا إجابة', 'emptyHint' => 'عندما يعجز العقل عن الإجابة عن سؤال، يظهر هنا لتضيف ما ينقصه.', 'emptyFiltered' => 'لا شيء بهذه الحالة',
            'loading' => 'جارٍ تحميل الفجوات', 'failed' => 'تعذر حفظ التغيير. حاول مرة أخرى.', 'resolvedOpen' => 'أُعيد فتحه.', 'resolvedIndexed' => 'تم تحديده كمفهرس.', 'resolvedDismissed' => 'تم استبعاده.',
        ],
    ];
    $t = array_merge($strings[$ar ? 'ar' : 'en'], (array) $labels);
    $list = array_values(array_map(fn ($g) => (array) $g, (array) $gaps));
    $options = array_filter([
        'status' => $status ?: null,
        'locale' => $locale ?? ($ar ? 'ar' : 'en'),
        'interactive' => $interactive ? null : false,
        'labels' => ['failed' => $t['failed'], 'resolved' => ['open' => $t['resolvedOpen'], 'indexed' => $t['resolvedIndexed'], 'dismissed' => $t['resolvedDismissed']]],
    ], fn ($v) => $v !== null);
    $hide = 'style="display: none"';
    $toggle = 'inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-label text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-disabled:pointer-events-none data-disabled:opacity-50 rounded-[calc(var(--radius-control)-2px)] data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-xs';
    $btn = 'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-control-sm px-2.5';
    $groups = ['open' => 'warning', 'indexed' => 'success', 'dismissed' => 'neutral'];
    $actions = ['open' => ['reopen', 'rotate-ccw', 'secondary'], 'indexed' => ['markIndexed', 'check', 'secondary'], 'dismissed' => ['dismiss', 'x', 'ghost']];
@endphp
<section data-slot="knowledge-gaps" aria-label="{{ $t['label'] }}" x-data="nqKnowledgeGaps({!! \Illuminate\Support\Js::from($list) !!}, {!! \Illuminate\Support\Js::from((object) $options) !!})" x-modelable="gaps"
    {{ $attributes->cn('flex min-w-0 flex-col gap-4') }}>
    <div class="flex flex-wrap items-center gap-2">
        <div role="group" data-slot="toggle-group" data-variant="segmented" data-orientation="horizontal" aria-label="{{ $t['filter'] }}" class="flex w-fit max-w-full gap-0.5 rounded-control bg-secondary p-0.5">
            <button type="button" data-slot="toggle" x-bind:aria-pressed="String(filter === '')" x-bind:data-pressed="filter === '' ? '' : null" x-on:click="setFilter('')" class="{{ $toggle }}">{{ $t['all'] }}</button>
            @foreach ($groups as $key => $tone)
                <button type="button" data-slot="toggle" x-bind:aria-pressed="String(filter === '{{ $key }}')" x-bind:data-pressed="filter === '{{ $key }}' ? '' : null" x-on:click="setFilter('{{ $key }}')" class="{{ $toggle }}">
                    {{ $t[$key] }}
                    <span class="ms-1.5 tabular-nums text-muted-foreground" x-text="count('{{ $key }}')"></span>
                </button>
            @endforeach
        </div>
        <span class="ms-auto text-caption text-muted-foreground" x-show="gaps.some((g) => g.status === 'open')" x-text="@js($t['unanswered']).replace('{n}', count('open'))" {!! $hide !!}></span>
    </div>

    <p role="status" aria-live="polite" x-bind:class="failed ? 'text-nq-danger-text' : 'text-muted-foreground'" class="min-h-5 text-body-sm text-muted-foreground" x-text="message"></p>

    @if ($error)
        <x-nq::states.error :title="$error" />
    @elseif ($loading)
        <x-nq::states.loading :label="$t['loading']" :rows="4" />
    @else
        <x-nq::states.empty icon="circle-dashed" :title="$t['empty']" :description="$t['emptyHint']" x-show="gaps.length === 0" style="display: none" />
        <x-nq::states.empty icon="circle-dashed" :title="$t['emptyFiltered']" x-show="gaps.length > 0 && filter !== '' && ! shown(filter)" style="display: none" />
        @foreach ($groups as $key => $tone)
            <div data-status="{{ $key }}" x-show="shown('{{ $key }}')" class="flex flex-col gap-2" @if (! collect($list)->contains('status', $key)) {!! $hide !!} @endif>
                <h3 class="flex items-center gap-2 text-label text-foreground">
                    <x-nq::status :tone="$tone">{{ $t[$key] }}</x-nq::status>
                    <span class="text-caption tabular-nums text-muted-foreground" x-text="count('{{ $key }}')"></span>
                </h3>
                <ul aria-label="{{ $t[$key] }}" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
                    <template x-for="gap in group('{{ $key }}')" :key="gap.id">
                        <li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                            <div class="min-w-0 flex-1">
                                <p dir="auto" x-bind:title="gap.query" class="truncate text-label text-foreground" x-text="gap.query"></p>
                                <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                                    <span class="inline-flex items-center gap-2">
                                        <span aria-hidden="true" class="block h-1 w-10 overflow-hidden rounded-full bg-nq-surface-soft">
                                            <span class="block h-full rounded-full bg-nq-accent" x-bind:style="width(gap)"></span>
                                        </span>
                                        <span x-text="(gap.hits === 1 ? @js($t['askedOne']) : @js($t['asked'])).replace('{n}', num(gap.hits))"></span>
                                    </span>
                                    <span>{{ $t['firstSeen'] }} <time data-slot="date-time" dir="auto" class="tabular-nums [unicode-bidi:isolate]" x-bind:datetime="iso(gap.firstSeen)" x-text="date(gap.firstSeen)"></time></span>
                                    <span>{{ $t['lastSeen'] }} <time data-slot="date-time" dir="auto" class="tabular-nums [unicode-bidi:isolate]" x-bind:datetime="iso(gap.lastSeen)" x-bind:title="date(gap.lastSeen)" x-text="relative(gap.lastSeen)"></time></span>
                                </p>
                                <p x-show="gap.resolution" dir="auto" class="mt-1 text-body-sm italic text-muted-foreground" x-text="'“' + gap.resolution + '”'" {!! $hide !!}></p>
                            </div>
                            @if ($interactive)
                                <div class="flex shrink-0 flex-wrap gap-1.5">
                                    @foreach ($actions as $to => [$labelKey, $icon, $variant])
                                        <button type="button" data-slot="button" x-show="can(gap, '{{ $to }}')" x-bind:aria-busy="busy === gap.id + ':{{ $to }}' ? 'true' : null"
                                            x-bind:disabled="(busy !== null) ? '' : null" x-bind:data-disabled="(busy !== null) ? '' : null" x-on:click="move(gap, '{{ $to }}')" {!! $hide !!}
                                            class="{{ $btn }} {{ $variant === 'ghost' ? 'text-foreground hover:bg-nq-hover' : 'border-border bg-card text-foreground hover:bg-nq-hover' }}">
                                            <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />
                                            {{ $t[$labelKey] }}
                                        </button>
                                    @endforeach
                                </div>
                            @endif
                        </li>
                    </template>
                </ul>
            </div>
        @endforeach
    @endif
</section>
