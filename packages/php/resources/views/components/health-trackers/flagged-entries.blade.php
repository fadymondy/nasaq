{{-- <x-nq::health-trackers.flagged-entries :entries="[['id' => 'f1', 'at' => '2026-09-29T08:30:00Z', 'label' => 'Espresso', 'reason' => 'Logged after the cut-off.', 'area' => 'Caffeine']]" />   <x-nq::health-trackers.flagged-entries lazy :count="2" @load="$event.detail.wait(…)" />
     The day's flagged entries behind a disclosure on the count. Flagged means recorded and then marked against the protocol: the list explains why, and does not call them errors.
     entries: [id, at (ISO string or timestamp), label, reason, area?]. count: the number shown on the toggle before the list loads (default: the number of entries). open: start open. labels: override the words.
     lazy: load the entries the first time the disclosure opens (and on retry) through the `load` event on the root, with detail { wait(promise) }: resolve the array of entries. A rejection, or nobody listening, shows "Could not load" with a Try again button.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['entries' => null, 'count' => null, 'open' => false, 'lazy' => false, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $w = array_merge([
        'flaggedTitle' => $t::t('Flagged entries', 'الإدخالات المعلَّمة'),
        'flaggedCount' => $t::t('{count} flagged', '{count} معلَّمة'),
        'flaggedNone' => $t::t('Nothing flagged today.', 'لا شيء معلَّم اليوم.'),
        'flaggedIntro' => $t::t('These were recorded, then flagged against your protocol. They are not errors.', 'سُجّلت هذه ثم عُلّمت بالنسبة لبروتوكولك. ليست أخطاء.'),
        'flaggedLoading' => $t::t('Loading flagged entries', 'جارٍ تحميل الإدخالات المعلَّمة'),
        'flaggedFailed' => $t::t('Could not load the flagged entries.', 'تعذر تحميل الإدخالات المعلَّمة.'),
        'retry' => $t::t('Try again', 'حاول مرة أخرى'),
    ], (array) $labels);
    $list = is_null($entries) ? null : array_values(array_map(fn ($e) => (array) $e, (array) $entries));
    $config = [
        'entries' => $list, 'count' => $count ?? ($list ? count($list) : 0), 'open' => (bool) $open, 'hasLoader' => (bool) $lazy,
        'locale' => $t::rtl() ? 'ar' : 'en',
        'labels' => ['genericError' => $w['retry'], 'flaggedCount' => $w['flaggedCount']],
    ];
    $shown = $count ?? ($list ? count($list) : 0);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'flagged-entries') }}" x-data="nqFlaggedEntries(@js($config))" {{ $attributes->except('data-slot')->cn('min-w-0') }}>
    <x-nq::collapsible x-model="isOpen" :open="$open">
        <x-nq::collapsible.trigger variant="ghost" class="h-auto w-full justify-between gap-3 border border-border px-3 py-2 text-start font-normal">
            <span class="flex items-center gap-2">
                <x-lucide-flag aria-hidden="true" class="size-4 text-nq-warning-text" />
                {{ $w['flaggedTitle'] }}
                <x-nq::badge variant="warning" x-show="hasAny" :style="$shown > 0 ? null : 'display: none'"><span x-text="countText">{{ str_replace('{count}', $shown, $w['flaggedCount']) }}</span></x-nq::badge>
                <x-nq::badge variant="neutral" x-show="!hasAny" :style="$shown > 0 ? 'display: none' : null"><span x-text="countText">{{ str_replace('{count}', $shown, $w['flaggedCount']) }}</span></x-nq::badge>
            </span>
            <x-lucide-chevron-down aria-hidden="true" class="size-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none" x-bind:class="isOpen ? `rotate-180` : ``" />
        </x-nq::collapsible.trigger>
        <x-nq::collapsible.panel>
            <div class="flex flex-col gap-3 px-1 pt-3">
                <div role="status" aria-label="{{ $w['flaggedLoading'] }}" class="flex flex-col gap-2" x-show="phase === `loading`" style="display: none">
                    <x-nq::states.skeleton class="h-10 w-full" />
                    <x-nq::states.skeleton class="h-10 w-full" />
                </div>
                <p role="alert" class="flex flex-wrap items-center gap-2 text-caption text-nq-danger-text" x-show="phase === `error`" style="display: none">
                    {{ $w['flaggedFailed'] }}
                    <x-nq::button variant="link" size="sm" x-on:click="load()">{{ $w['retry'] }}</x-nq::button>
                </p>
                <p class="text-body-sm text-muted-foreground" x-show="isEmpty" @unless (is_array($list) && count($list) === 0) style="display: none" @endunless>{{ $w['flaggedNone'] }}</p>
                <div class="flex flex-col gap-3" x-show="showList" @if (is_array($list) && count($list) === 0) style="display: none" @endif>
                    <p class="text-caption text-muted-foreground">{{ $w['flaggedIntro'] }}</p>
                    <ul class="flex flex-col divide-y divide-border rounded-control border border-border">
                        <template x-for="e in (loaded || [])" :key="e.id">
                            <li class="flex flex-col gap-0.5 px-3 py-2">
                                <span class="flex flex-wrap items-baseline justify-between gap-x-3">
                                    <span class="text-label text-foreground" dir="auto" x-text="e.label"></span>
                                    <span class="text-caption tabular-nums text-muted-foreground" x-text="timeOf(e.at)"></span>
                                </span>
                                <span class="text-body-sm text-muted-foreground">
                                    <span class="text-foreground" x-show="e.area" x-text="e.area + `: `"></span>
                                    <span dir="auto" x-text="e.reason"></span>
                                </span>
                            </li>
                        </template>
                    </ul>
                </div>
            </div>
        </x-nq::collapsible.panel>
    </x-nq::collapsible>
</div>
