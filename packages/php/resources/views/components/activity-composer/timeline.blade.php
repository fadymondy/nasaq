{{-- <x-nq::activity-composer.timeline :activities="$items" toggle delete />
     The history of a record: open tasks first under Planned (soonest due first, overdue flagged), then everything that happened, newest first.
     Every entry has a context menu and a "…" menu (Mark done / Reopen for tasks, Delete).
     activities: ['id', 'kind' => note|call|meeting|task|event, 'body', 'at' (DateTime, ISO string or epoch), 'actor' => ['name'], 'durationMinutes', 'done', 'doneAt'].
     toggle, delete: switch the action on (off by default, like omitting the callback). now: Carbon or string, the clock for overdue (default now()). loading: the skeleton.
     labels: override of the built-in words. The empty slot replaces the empty state. locale: default the app locale.
     The page listens on the root; each event has detail.wait(promise), resolve { error } to show the message. The rows are server-rendered, so re-render the list on success.
       nq-activity-toggle { id, done, wait }, nq-activity-delete { id, wait }.
     Needs the Alpine module (nqActivityTimeline). --}}
@include('nasaq::components.activity-composer._words')
@props(['activities' => [], 'toggle' => false, 'delete' => false, 'now' => null, 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_ac_words($locale, $labels);
    $clock = $now === null ? now() : nq_ac_time($now);
    $all = array_values((array) $activities);
    $parts = nq_ac_split($all);
    $position = [];
    foreach ($all as $n => $a) {
        $position[(string) $a['id']] = $n;
    }
    $config = ['ids' => array_map(fn ($a) => (string) $a['id'], $all), 'labels' => ['failed' => $t['failed']]];
@endphp
@if ($loading)
    <div data-slot="{{ $attributes->get('data-slot', 'activity-timeline') }}" aria-busy="true" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
        @foreach ([0, 1, 2] as $_)
            <x-nq::states.skeleton class="h-12 w-full" />
        @endforeach
    </div>
@else
    <div data-slot="{{ $attributes->get('data-slot', 'activity-timeline') }}" x-data="nqActivityTimeline({{ \Illuminate\Support\Js::from($config) }})" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-5') }}>
        @if (count($all) === 0)
            @if (isset($empty) && $empty->isNotEmpty())
                {{ $empty }}
            @else
                <x-nq::states.empty icon="calendar-clock" :title="$t['empty']" :description="$t['emptyHint']" />
            @endif
        @else
            @if ($parts['open'])
                <section aria-label="{{ $t['plannedLabel'] }}" class="flex flex-col gap-2">
                    <h3 class="flex items-center gap-2 text-label text-foreground">
                        {{ $t['planned'] }}
                        <x-nq::badge variant="outline"><x-nq::numeric :value="count($parts['open'])" /></x-nq::badge>
                    </h3>
                    <x-nq::timeline>
                        @foreach ($parts['open'] as $a)
                            <x-nq::activity-composer.entry :activity="$a" :index="$position[(string) $a['id']]" :t="$t" :now="$clock" planned :toggle="$toggle" :delete="$delete" />
                        @endforeach
                    </x-nq::timeline>
                </section>
            @endif
            @if ($parts['history'])
                <section aria-label="{{ $t['listLabel'] }}" class="flex flex-col gap-2">
                    <h3 class="text-label text-foreground">{{ $t['history'] }}</h3>
                    <x-nq::timeline>
                        @foreach ($parts['history'] as $a)
                            <x-nq::activity-composer.entry :activity="$a" :index="$position[(string) $a['id']]" :t="$t" :now="$clock" :toggle="$toggle" :delete="$delete" />
                        @endforeach
                    </x-nq::timeline>
                </section>
            @endif
        @endif
        <p x-show="error" style="display: none" x-text="error" role="alert" class="text-body-sm text-nq-danger-text"></p>
    </div>
@endif
