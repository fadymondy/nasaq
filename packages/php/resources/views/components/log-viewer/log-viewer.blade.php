{{-- <x-nq::log-viewer streaming :entries="[['id' => 1, 'time' => 1790000000000, 'level' => 'info', 'source' => 'api', 'message' => 'listening on :3000']]" />
     A log stream that behaves like a dev tool: level filters with counts, search with highlights (optionally a regular expression), follow-the-tail with a jump button,
     timestamps, keyboard navigation (arrows, PageUp/PageDown, Home/End, Esc) and a detail panel. The list is windowed with fixed-height rows. Always left-to-right, also in Arabic pages.
     entries: ['id' =>, 'time' => ms | ISO string | DateTime, 'level' => trace|debug|info|warn|error|fatal, 'message' =>, 'source' =>?, 'fields' => [...]?], oldest first.
     title (the list's accessible name), streaming (live badge), follow (true), default-levels (all), default-query, timestamps (true), utc, row-height (24), height ("24rem"), download-filename ("logs.log").
     ranges (true for the defaults, or [['id' =>, 'label' =>, 'labelAr' =>?, 'ms' => int|null]]: adds a time range select), default-range (the last one),
     manual (the server filters: entries are shown as given and each filter change fires nq-log-filter), counts (['error' => 40]: chip totals) and total (footer total),
     has-older (shows "Load older entries" and fires nq-log-older; answer with nq-log-write { entries, prepend: true }), live-tail (adds a pause / resume button, fires nq-log-live).
     Named slot "toolbar" adds buttons next to the built-in ones.
     Append later: el.dispatchEvent(new CustomEvent('nq-log-write', { detail: { entries: [...] } })); end the stream with 'nq-log-state' { streaming: false }
     (it also takes hasOlder, loadingOlder, total and counts).
     Events: nq-log-download { entries } (cancelable), nq-log-copy { text }, nq-log-filter { levels, query, regex, range, since }, nq-log-older, nq-log-live { live }.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['entries' => [], 'title' => null, 'streaming' => false, 'follow' => true, 'defaultLevels' => null, 'defaultQuery' => '', 'timestamps' => true, 'utc' => false, 'rowHeight' => 24, 'height' => '24rem', 'downloadFilename' => 'logs.log',
    'manual' => false, 'counts' => null, 'total' => null, 'ranges' => null, 'defaultRange' => null, 'hasOlder' => false, 'liveTail' => false])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $levels = ['trace' => $t('Trace', 'تتبّع'), 'debug' => $t('Debug', 'تصحيح'), 'info' => $t('Info', 'معلومات'), 'warn' => $t('Warn', 'تحذير'), 'error' => $t('Error', 'خطأ'), 'fatal' => $t('Fatal', 'حرج')];
    $strings = [
        'copied' => $t('Logs copied to clipboard', 'تم نسخ السجلات إلى الحافظة'),
        'entryCopied' => $t('Entry copied to clipboard', 'تم نسخ المدخل إلى الحافظة'),
        'countAll' => $t('{total} entries', '{total} مدخلات'),
        'countSome' => $t('{shown} of {total} entries', '{shown} من {total} مدخلات'),
        'emptyTitle' => $t('No logs yet', 'لا توجد سجلات بعد'),
        'emptyBody' => $t('New entries show up here as they arrive.', 'تظهر المدخلات الجديدة هنا فور وصولها.'),
        'noMatchTitle' => $t('No entries match', 'لا توجد مدخلات مطابقة'),
        'noMatchBody' => $t('Try a different search or turn on more levels.', 'جرّب بحثًا آخر أو فعّل مستويات أكثر.'),
        'pause' => $t('Pause live tail', 'إيقاف التتبّع المباشر مؤقتًا'),
        'resume' => $t('Resume live tail', 'استئناف التتبّع المباشر'),
        'newOne' => $t('1 new entry', 'مدخل جديد واحد'),
        'newMany' => $t('{n} new entries', '{n} مدخلات جديدة'),
    ];
    $rangeList = $ranges === true ? [
        ['id' => '15m', 'label' => 'Last 15 minutes', 'labelAr' => 'آخر ١٥ دقيقة', 'ms' => 900000],
        ['id' => '1h', 'label' => 'Last hour', 'labelAr' => 'آخر ساعة', 'ms' => 3600000],
        ['id' => '24h', 'label' => 'Last 24 hours', 'labelAr' => 'آخر ٢٤ ساعة', 'ms' => 86400000],
        ['id' => '7d', 'label' => 'Last 7 days', 'labelAr' => 'آخر ٧ أيام', 'ms' => 604800000],
        ['id' => 'all', 'label' => 'All time', 'labelAr' => 'كل الأوقات', 'ms' => null],
    ] : array_values(array_map(fn ($r) => (array) $r + ['labelAr' => null, 'ms' => null], (array) ($ranges ?: [])));
    $rangeId = $defaultRange ?? ($rangeList ? $rangeList[array_key_last($rangeList)]['id'] : '');
    $rangeOptions = array_map(fn ($r) => ['value' => $r['id'], 'label' => \Nasaq\Nasaq::t($r['label'], $r['labelAr'] ?: $r['label'])], $rangeList);
    $rows = collect($entries)->map(function ($e) {
        $e = (array) $e;
        if ($e['time'] instanceof \DateTimeInterface) {
            $e['time'] = $e['time']->format(\DATE_ATOM);
        }
        if (isset($e['fields']) && (! is_array($e['fields']) || $e['fields'] === [])) {
            unset($e['fields']);
        }

        return $e;
    })->values()->all();
    $config = [
        'entries' => $rows, 'streaming' => (bool) $streaming, 'follow' => (bool) $follow, 'defaultLevels' => $defaultLevels ? array_values($defaultLevels) : null,
        'defaultQuery' => (string) $defaultQuery, 'timestamps' => (bool) $timestamps, 'utc' => (bool) $utc, 'rowHeight' => (int) $rowHeight,
        'downloadFilename' => $downloadFilename, 'strings' => $strings,
        'manual' => (bool) $manual, 'counts' => $counts ?: null, 'total' => $total === null ? null : (int) $total, 'ranges' => $rangeList, 'defaultRange' => $rangeId,
        'hasOlder' => (bool) $hasOlder, 'liveTail' => (bool) $liveTail,
    ];
    $count = count($rows);
    $listHeight = is_numeric($height) ? $height.'px' : $height;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'log-viewer') }}" dir="ltr" x-data="nqLogViewer({!! \Illuminate\Support\Js::from($config) !!})" x-bind:data-streaming="streaming ? '' : null" x-bind:data-paused="paused ? '' : null"
    {{ $attributes->except('data-slot')->cn('relative flex min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start') }}>
    <div data-slot="log-viewer-toolbar" class="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <x-nq::input-group class="min-w-40 flex-1 basis-56">
            <x-nq::input-group.addon align="start">
                <x-nq::icon name="search" aria-hidden="true" class="size-4 text-muted-foreground" />
            </x-nq::input-group.addon>
            <x-nq::input-group.input ltr type="search" x-model="query" placeholder="{{ $t('Search logs', 'ابحث في السجلات') }}" aria-label="{{ $t('Search logs', 'بحث في السجلات') }}"
                x-bind:aria-invalid="invalid ? 'true' : null" x-bind:aria-describedby="invalid ? uid + '-invalid' : null" class="font-mono text-code" />
            <x-nq::input-group.addon align="end">
                <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t('Use regular expression', 'استخدام تعبير نمطي') }}" class="data-active:bg-nq-selected"
                    x-on:click="regex = ! regex" x-bind:aria-pressed="regex ? 'true' : 'false'" x-bind:data-active="regex ? '' : null">
                    <x-nq::icon name="regex" aria-hidden="true" />
                </x-nq::button>
            </x-nq::input-group.addon>
        </x-nq::input-group>
        @if ($rangeList)
            <x-nq::native-select size="sm" aria-label="{{ $t('Time range', 'النطاق الزمني') }}" data-slot="log-viewer-range" :options="$rangeOptions" :value="$rangeId" x-model="rangeId" class="w-auto" />
        @endif
        <div role="group" aria-label="{{ $t('Filter by level', 'تصفية حسب المستوى') }}" class="flex flex-wrap items-center gap-1">
            @foreach ($levels as $level => $label)
                <button type="button" data-level="{{ $level }}" x-on:click="toggleLevel('{{ $level }}')" x-bind:aria-pressed="isOn('{{ $level }}') ? 'true' : 'false'" x-bind:class="chipClass('{{ $level }}')"
                    class="inline-flex h-control-sm items-center gap-1.5 rounded-control border px-2 text-caption outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                    <span class="font-mono" x-bind:class="isOn('{{ $level }}') ? levelClass('{{ $level }}') : ''">{{ $label }}</span>
                    <span class="tabular-nums text-muted-foreground" x-text="levelCount('{{ $level }}')"></span>
                </button>
            @endforeach
        </div>
        <div class="ms-auto flex items-center gap-0.5">
            {{ $toolbar ?? '' }}
            @if ($liveTail)
                <x-nq::button type="button" variant="ghost" size="icon-sm" data-slot="log-viewer-live" class="data-active:bg-nq-selected"
                    x-on:click="setLive(paused)" x-bind:aria-label="liveLabel" x-bind:aria-pressed="paused ? 'true' : 'false'" x-bind:data-active="paused ? '' : null">
                    <x-nq::icon name="pause" aria-hidden="true" x-show="! paused" />
                    <x-nq::icon name="play" aria-hidden="true" x-show="paused" style="display: none" />
                </x-nq::button>
            @endif
            <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t('Show timestamps', 'إظهار الطوابع الزمنية') }}" class="data-active:bg-nq-selected"
                x-on:click="showTime = ! showTime" x-bind:aria-pressed="showTime ? 'true' : 'false'" x-bind:data-active="showTime ? '' : null">
                <x-nq::icon name="clock" aria-hidden="true" />
            </x-nq::button>
            <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t('Follow new logs', 'تتبّع السجلات الجديدة') }}" class="data-active:bg-nq-selected"
                x-on:click="setFollowing(! following)" x-bind:aria-pressed="following ? 'true' : 'false'" x-bind:data-active="following ? '' : null">
                <x-nq::icon name="arrow-down-to-line" aria-hidden="true" />
            </x-nq::button>
            <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t('Copy visible logs', 'نسخ السجلات الظاهرة') }}" class="data-copied:text-nq-success-text"
                x-on:click="copyVisible()" x-bind:data-copied="flash === strings.copied ? '' : null">
                <x-nq::icon name="copy" aria-hidden="true" x-show="flash !== strings.copied" />
                <x-nq::icon name="check" aria-hidden="true" x-show="flash === strings.copied" style="display: none" />
            </x-nq::button>
            <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t('Download logs', 'تنزيل السجلات') }}" x-on:click="download()">
                <x-nq::icon name="download" aria-hidden="true" />
            </x-nq::button>
        </div>
    </div>
    <p x-show="invalid" style="display: none" x-bind:id="uid + '-invalid'" class="border-b border-border px-3 py-1 text-caption text-nq-danger-text">{{ $t('Invalid regular expression', 'تعبير نمطي غير صالح') }}</p>

    <div class="relative">
        <div x-ref="list" data-slot="log-viewer-list" role="log" aria-label="{{ $title ?? $t('Log entries', 'مدخلات السجل') }}" aria-live="off" tabindex="0"
            x-bind:aria-activedescendant="current ? rowId(current) : null" style="height: {{ $listHeight }}" x-on:scroll="onScroll()" x-on:keydown="onKey($event)"
            class="overflow-auto font-mono text-code outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
            <div x-show="olderOpen && rows.length === 0" data-slot="log-viewer-older" class="flex items-center justify-center border-b border-border/60" style="height: 36px;@if (! $hasOlder || $count !== 0) display: none @endif">
                <span x-show="loadingOlder" style="display: none" role="status" class="inline-flex items-center gap-2 font-sans text-caption text-muted-foreground">
                    <x-nq::spinner class="size-3" />
                    {{ $t('Loading older entries…', 'جارٍ تحميل مدخلات أقدم…') }}
                </span>
                <x-nq::button type="button" size="sm" variant="ghost" x-show="! loadingOlder" x-on:click="loadOlder()">
                    <x-nq::icon name="history" aria-hidden="true" />
                    {{ $t('Load older entries', 'تحميل مدخلات أقدم') }}
                </x-nq::button>
            </div>
            <div x-show="rows.length === 0" @if ($count === 0) @else style="display: none" @endif data-slot="empty-state" class="m-3 flex flex-col items-center justify-center gap-3 rounded-card border-0 px-6 py-12 text-center font-sans">
                <span data-slot="state-icon" class="inline-flex size-10 items-center justify-center rounded-control border border-border bg-card text-muted-foreground [&_svg]:size-5">
                    <x-nq::icon name="inbox" aria-hidden="true" />
                </span>
                <div class="flex max-w-sm flex-col gap-1">
                    <p class="text-label text-foreground" x-text="entries.length === 0 ? strings.emptyTitle : strings.noMatchTitle">{{ $strings['emptyTitle'] }}</p>
                    <p class="text-body-sm text-muted-foreground" x-text="entries.length === 0 ? strings.emptyBody : strings.noMatchBody">{{ $strings['emptyBody'] }}</p>
                </div>
                <x-nq::button type="button" size="sm" x-show="canReset" style="display: none" x-on:click="reset()">
                    <x-nq::icon name="x" aria-hidden="true" />
                    {{ $t('Reset filters', 'إعادة ضبط المرشحات') }}
                </x-nq::button>
            </div>
            <div x-show="rows.length !== 0" @if ($count === 0) style="display: none" @endif class="relative w-max min-w-full" x-bind:style="{ height: (head + rows.length * rowHeight) + 'px' }">
                <div class="absolute inset-x-0 top-0" x-show="olderOpen" @unless ($hasOlder) style="display: none" @endunless>
                    <div data-slot="log-viewer-older" class="flex items-center justify-center border-b border-border/60" style="height: 36px">
                        <span x-show="loadingOlder" style="display: none" role="status" class="inline-flex items-center gap-2 font-sans text-caption text-muted-foreground">
                            <x-nq::spinner class="size-3" />
                            {{ $t('Loading older entries…', 'جارٍ تحميل مدخلات أقدم…') }}
                        </span>
                        <x-nq::button type="button" size="sm" variant="ghost" x-show="! loadingOlder" x-on:click="loadOlder()">
                            <x-nq::icon name="history" aria-hidden="true" />
                            {{ $t('Load older entries', 'تحميل مدخلات أقدم') }}
                        </x-nq::button>
                    </div>
                </div>
                <template x-for="item in visible" x-bind:key="item.entry.id">
                    <div role="listitem" x-bind:id="rowId(item.entry)" x-bind:aria-posinset="item.index + 1" x-bind:aria-setsize="rows.length"
                        x-bind:aria-current="item.entry.id === selected ? 'true' : null" x-bind:data-level="item.entry.level" x-bind:data-selected="item.entry.id === selected ? '' : null"
                        x-bind:title="rowTitle(item.entry)" x-bind:class="rowClass(item.entry)"
                        x-bind:style="{ position: 'absolute', insetInlineStart: '0', insetInlineEnd: '0', top: item.top + 'px', height: rowHeight + 'px' }"
                        x-on:click="toggleRow(item.entry.id)">
                        <span x-show="showTime" class="shrink-0 text-muted-foreground tabular-nums" x-text="time(item.entry)"></span>
                        <span class="w-[5ch] shrink-0" x-bind:class="levelClass(item.entry.level)" x-text="tag(item.entry.level)"></span>
                        <span x-show="item.entry.source" style="display: none" class="max-w-[16ch] shrink-0 truncate text-nq-info-text" x-text="item.entry.source"></span>
                        <span class="text-foreground">
                            <template x-for="(part, i) in pieces(item.entry)" x-bind:key="i">
                                <span>
                                    <mark x-show="part.match" style="display: none" class="rounded-[2px] bg-nq-accent/30 text-inherit" x-text="part.text"></mark>
                                    <span x-show="! part.match" x-text="part.text"></span>
                                </span>
                            </template>
                        </span>
                    </div>
                </template>
            </div>
        </div>
        <x-nq::button type="button" size="sm" variant="primary" class="absolute end-3 bottom-3 shadow-sm" style="display: none" x-show="showResume" x-on:click="setLive(true)">
            <x-nq::icon name="play" aria-hidden="true" />
            <span x-text="waitingText"></span>
        </x-nq::button>
        <x-nq::button type="button" size="sm" variant="secondary" class="absolute end-3 bottom-3 shadow-sm" style="display: none" x-show="showJump" x-on:click="setFollowing(true)">
            <x-nq::icon name="arrow-down-to-line" aria-hidden="true" />
            {{ $t('Jump to latest', 'الانتقال إلى الأحدث') }}
        </x-nq::button>
    </div>

    <section x-show="current" style="display: none" data-slot="log-viewer-detail" aria-label="{{ $t('Entry details', 'تفاصيل المدخل') }}"
        class="max-h-48 shrink-0 overflow-auto border-t border-border bg-card p-3 font-mono text-code">
        <div class="mb-2 flex items-center justify-between gap-2">
            <span class="text-caption" x-bind:class="current ? levelClass(current.level) : ''">
                <span x-text="current ? tag(current.level) : ''"></span>
                <span class="text-muted-foreground" x-text="currentTime()"></span>
                <span x-show="current && current.source" style="display: none" class="text-nq-info-text" x-text="current ? ' ' + (current.source || '') : ''"></span>
            </span>
            <span class="flex items-center">
                <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t('Copy entry', 'نسخ المدخل') }}" x-on:click="copyEntry()">
                    <x-nq::icon name="copy" aria-hidden="true" />
                </x-nq::button>
                <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t('Close details', 'إغلاق التفاصيل') }}" x-on:click="select(null)">
                    <x-nq::icon name="x" aria-hidden="true" />
                </x-nq::button>
            </span>
        </div>
        <p class="whitespace-pre-wrap break-all text-foreground" x-text="current ? current.message : ''"></p>
        <dl x-show="currentFields.length" style="display: none" class="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5">
            <template x-for="f in currentFields" x-bind:key="f[0]">
                <div class="contents">
                    <dt class="text-muted-foreground" x-text="f[0]"></dt>
                    <dd class="m-0 break-all text-foreground" x-text="f[1]"></dd>
                </div>
            </template>
        </dl>
    </section>

    <div data-slot="log-viewer-footer" class="flex h-8 items-center justify-between gap-2 border-t border-border px-3 text-caption text-muted-foreground">
        <span class="tabular-nums" x-text="count">{{ str_replace('{total}', (string) ($total ?? $count), $strings['countAll']) }}</span>
        <span x-show="paused" style="display: none" role="status" class="inline-flex items-center gap-1 text-nq-warning-text">
            <x-nq::icon name="pause" aria-hidden="true" class="size-3" />
            {{ $t('Paused', 'متوقف مؤقتًا') }}
            <span x-show="waiting > 0" style="display: none" class="tabular-nums text-muted-foreground"> · <span x-text="waitingText"></span></span>
        </span>
        <span x-show="streaming && ! paused" @unless ($streaming) style="display: none" @endunless class="inline-flex items-center gap-1 text-nq-success-text">
            <x-nq::spinner class="size-3" />
            {{ $t('Live', 'مباشر') }}
        </span>
    </div>
    <span role="status" aria-live="polite" class="sr-only" x-text="flash"></span>
</div>
