{{-- <x-nq::project-view.feed :items="$activity" today="2026-09-29" />
     The Activity tab of x-nq::project-view: everything that happened on the project, newest first, grouped by day, with filters by type and person.
     items: [['id', 'title', 'description', 'at', 'actor' => ['name', 'avatar'], 'kind' => issue|comment|status|member|file|code|time|other]]. today: civil "Y-m-d" so the day headings read Today and Yesterday.
     The whole feed is drawn by the server; the filters (feedKind, feedActor on the enclosing x-nq::project-view) hide what does not match, update the count and show the no-match state.
     text: array overriding the words (see x-nq::project-view). locale: default the app locale. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.project-view._logic')
@props(['items' => [], 'today', 'text' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = nq_pv_words($locale, (array) $text);
    $items = array_values((array) $items);
    $groups = nq_pv_group_by_day($items);
    $order = ['issue', 'comment', 'status', 'member', 'file', 'code', 'time', 'other'];
    $icons = ['issue' => 'circle-dot', 'comment' => 'message-square', 'status' => 'refresh-cw', 'member' => 'user-plus', 'file' => 'file-text', 'code' => 'code', 'time' => 'clock', 'other' => 'activity'];
    $kinds = array_values(array_filter($order, fn ($k) => collect($items)->contains(fn ($i) => ($i['kind'] ?? 'other') === $k)));
    $people = collect($items)->map(fn ($i) => $i['actor']['name'] ?? null)->filter()->unique()->sort()->values()->all();
    $yesterday = nq_pv_add_days($today, -1);
    $heading = fn ($day) => $day === $today ? $t['feedToday'] : ($day === $yesterday ? $t['feedYesterday'] : \Carbon\Carbon::parse($day)->locale($ar ? 'ar' : 'en')->isoFormat($ar ? 'dddd D MMMM YYYY' : 'dddd, MMMM D, YYYY'));
    $uid = 'nq-pv-feed-'.substr(md5(json_encode(array_column($items, 'id'))), 0, 6);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'project-feed') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <div class="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-0.5">
            <h2 class="m-0 text-h3">{{ $t['feedTitle'] }}</h2>
            <p role="status" class="m-0 text-body-sm text-muted-foreground" data-feed-count x-text="feedCountText()">{{ sprintf($t['feedCount'], number_format(count($items))) }}</p>
        </div>
        <div class="flex min-w-0 flex-wrap items-center gap-3">
            <div class="flex min-w-0 items-center gap-2">
                <span id="{{ $uid }}-kind" class="shrink-0 text-body-sm text-muted-foreground">{{ $t['feedKind'] }}</span>
                <x-nq::select value="all" x-model="feedKind">
                    <x-nq::select.trigger aria-labelledby="{{ $uid }}-kind" class="min-w-32"><x-nq::select.value /></x-nq::select.trigger>
                    <x-nq::select.content>
                        <x-nq::select.item value="all">{{ $t['feedAll'] }}</x-nq::select.item>
                        @foreach ($kinds as $k)
                            <x-nq::select.item :value="$k">{{ $t['feedKinds'][$k] }}</x-nq::select.item>
                        @endforeach
                    </x-nq::select.content>
                </x-nq::select>
            </div>
            <div class="flex min-w-0 items-center gap-2">
                <span id="{{ $uid }}-person" class="shrink-0 text-body-sm text-muted-foreground">{{ $t['feedPerson'] }}</span>
                <x-nq::select value="all" x-model="feedActor">
                    <x-nq::select.trigger aria-labelledby="{{ $uid }}-person" class="min-w-32"><x-nq::select.value /></x-nq::select.trigger>
                    <x-nq::select.content>
                        <x-nq::select.item value="all">{{ $t['feedAllPeople'] }}</x-nq::select.item>
                        @foreach ($people as $p)
                            <x-nq::select.item :value="$p">{{ $p }}</x-nq::select.item>
                        @endforeach
                    </x-nq::select.content>
                </x-nq::select>
            </div>
            <x-nq::button size="sm" variant="ghost" x-show="feedKind !== 'all' || feedActor !== 'all'" x-cloak style="display: none" x-on:click="clearFeed()"><x-lucide-x aria-hidden="true" />{{ $t['feedClear'] }}</x-nq::button>
        </div>
    </div>

    @if (count($items) === 0)
        <x-nq::states.empty :title="$t['feedEmpty']" :description="$t['feedEmptyHint']" icon="activity" />
    @else
        <div data-feed-nomatch hidden>
            <x-nq::states.empty :title="$t['feedNoMatch']" :description="$t['feedNoMatchHint']" icon="activity" />
        </div>
        <div data-feed-groups x-effect="applyFeed()" class="flex min-w-0 flex-col gap-5">
            @foreach ($groups as $g)
                <section data-feed-group aria-label="{{ $heading($g['day']) }}" class="flex min-w-0 flex-col gap-2">
                    <h3 class="m-0 flex items-center gap-2 text-label text-muted-foreground">
                        {{ $heading($g['day']) }}
                        <span class="font-normal" data-feed-group-count><x-nq::numeric :value="count($g['items'])" :locale="$locale" /></span>
                    </h3>
                    <x-nq::timeline aria-label="{{ $heading($g['day']) }}">
                        @foreach ($g['items'] as $a)
                            <x-nq::timeline.item data-feed-item data-kind="{{ $a['kind'] ?? 'other' }}" data-actor="{{ $a['actor']['name'] ?? '' }}" :actor="$a['actor'] ?? null" :title="$a['title']" :description="$a['description'] ?? null" :time="$a['at']">
                                @if (empty($a['actor']))
                                    <x-slot:icon><x-dynamic-component :component="'lucide-'.$icons[$a['kind'] ?? 'other']" /></x-slot:icon>
                                @endif
                            </x-nq::timeline.item>
                        @endforeach
                    </x-nq::timeline>
                </section>
            @endforeach
        </div>
    @endif
</div>
