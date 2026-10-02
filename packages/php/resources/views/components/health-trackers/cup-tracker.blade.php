{{-- <x-nq::health-trackers.cup-tracker :filled="7" :total="12" unit-label="250 ml" wait-label="0:12" @log="$event.detail.wait(…)" />
     A day of a countable unit drawn as the cups it takes. Filled cups are logged, the next one is the only button, the rest are outlines. The row has one accessible name ("7 of 12 cups logged today").
     filled, total: the numbers your server sent (nothing here works out the length of a day). unit-label: what one cup holds, under the row. wait-label: time left before the next cup, already formatted ("0:12"). disabled blocks logging. labels: array overriding the words.
     It fires `log` on the root with detail { wait(promise) }: resolve, or resolve { error } shown under the row. On success the filled count goes up by one (resolve { filled: n } to set it). A rejection, or nobody listening, shows a generic error.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['filled' => 0, 'total' => 0, 'unitLabel' => null, 'waitLabel' => null, 'disabled' => false, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $w = array_merge([
        'cupsLabel' => $t::t('{filled} of {total} cups logged today', '{filled} من {total} أكواب مسجّلة اليوم'),
        'cupNext' => $t::t('Log one cup', 'سجّل كوبًا'),
        'cupWait' => $t::t('Wait {time} for the next cup', 'انتظر {time} للكوب التالي'),
        'cupsDone' => $t::t('Every cup logged. That is the day done.', 'سُجّلت كل الأكواب. اكتمل اليوم.'),
        'cupsLogging' => $t::t('Logging', 'جارٍ التسجيل'),
        'cupsFailed' => $t::t('Could not log the cup.', 'تعذر تسجيل الكوب.'),
    ], (array) $labels);
    $total = max(0, (int) $total);
    $filled = max(0, min((int) $filled, $total));
    $config = [
        'filled' => $filled, 'total' => $total, 'disabled' => (bool) $disabled, 'waitLabel' => $waitLabel ?: null,
        'locale' => $t::rtl() ? 'ar' : 'en',
        'labels' => ['cupsLabel' => $w['cupsLabel'], 'cupNext' => $w['cupNext'], 'cupWait' => $w['cupWait'], 'cupsFailed' => $w['cupsFailed']],
    ];
    $nextLabel = $waitLabel ? str_replace('{time}', $waitLabel, $w['cupWait']) : $w['cupNext'];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'cup-tracker') }}" x-data="nqCupTracker(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-2') }}>
    <div role="group" x-bind:aria-label="groupLabel"
        class="grid grid-cols-[repeat(auto-fill,minmax(1.75rem,1fr))] gap-1.5">
        <template x-for="c in cups" :key="c.i">
            <span class="contents">
                <template x-if="c.state !== 'next'">
                    <span x-bind:data-state="c.state" class="aspect-[3/4] w-full">
                        <svg viewBox="0 0 24 32" aria-hidden="true" class="size-full">
                            <path d="M4 4 h16 l-2 24 a2 2 0 0 1 -2 2 h-8 a2 2 0 0 1 -2 -2 z" stroke-width="1.6" stroke-linejoin="round" x-bind:class="cupClass(c.state)" />
                            <path x-show="c.state === `filled`" d="M8 17 l3 3 l6 -7" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="stroke-background" />
                        </svg>
                    </span>
                </template>
                <template x-if="c.state === 'next'">
                    <button type="button" data-state="next" x-bind:disabled="blocked" x-bind:aria-busy="pending ? `true` : null" aria-label="{{ $nextLabel }}" x-on:click="log()"
                        class="relative aspect-[3/4] w-full rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-60">
                        <svg viewBox="0 0 24 32" aria-hidden="true" class="size-full">
                            <path d="M4 4 h16 l-2 24 a2 2 0 0 1 -2 2 h-8 a2 2 0 0 1 -2 -2 z" stroke-width="1.6" stroke-linejoin="round" class="fill-transparent stroke-primary" />
                        </svg>
                        <span dir="ltr" class="absolute inset-0 flex items-center justify-center text-caption font-medium tabular-nums text-muted-foreground">
                            @if ($waitLabel){{ $waitLabel }}@else<x-lucide-plus aria-hidden="true" class="size-3.5 text-primary" />@endif
                        </span>
                    </button>
                </template>
            </span>
        </template>
    </div>
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
        <span class="tabular-nums" x-text="count">{{ $filled }} / {{ $total }}</span>
        @if ($unitLabel)<bdi dir="ltr">{{ $unitLabel }}</bdi>@endif
        <span role="status" x-show="pending" style="display: none">{{ $w['cupsLogging'] }}</span>
        <span role="status" x-show="done" @unless ($total > 0 && $filled >= $total) style="display: none" @endunless class="text-nq-success-text">{{ $w['cupsDone'] }}</span>
    </div>
    <p role="alert" x-show="error" style="display: none" x-text="error" class="text-caption text-nq-danger-text"></p>
</div>
