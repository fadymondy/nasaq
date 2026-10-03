{{-- <x-nq::realtime-counter :value="87" :per-minute="[62, 70, 66, 81, 79, 87]"
         :sections="[['id' => 'pages', 'title' => 'Top active pages', 'ltr' => true, 'rows' => [['id' => 'a', 'label' => '/pricing', 'value' => 14]]]]" />
     The "right now" tile of an analytics page: a large live figure with a pulsing indicator, a per-minute bar strip and short top lists. The indicator is a dot
     plus the word Live, so it does not depend on colour, and the pulse stops under reduced motion. value: people active right now. per-minute: active users
     for each of the last minutes, oldest first. sections: lists under the counter, each ['id', 'title', 'rows' => [['id', 'label', 'value']], 'ltr' => paths or
     URLs stay left to right inside RTL]. updated-at: when the figure was refreshed (DateTime, timestamp in seconds or milliseconds, or a string), shown as
     relative time. live: false shows "Paused" and stops the pulse. title, description: replace the defaults. labels: array overriding the built-in words.
     Static markup, no Alpine. --}}
@props(['value' => 0, 'perMinute' => [], 'sections' => [], 'updatedAt' => null, 'live' => true, 'title' => null, 'description' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? [
        'title' => 'الآن', 'description' => 'الأشخاص النشطون في آخر 30 دقيقة', 'live' => 'مباشر', 'paused' => 'متوقف مؤقتًا',
        'perMinute' => 'المستخدمون في الدقيقة، آخر 30 دقيقة', 'updated' => 'آخر تحديث', 'empty' => 'لا أحد نشط الآن',
        'userOne' => 'مستخدم نشط واحد', 'users' => '%d مستخدمين نشطين',
    ] : [
        'title' => 'Right now', 'description' => 'People active in the last 30 minutes', 'live' => 'Live', 'paused' => 'Paused',
        'perMinute' => 'Users per minute, last 30 minutes', 'updated' => 'Updated', 'empty' => 'Nobody is active right now',
        'userOne' => '1 active user', 'users' => '%d active users',
    ], $labels);
    $live = (bool) $live;
    $perMinute = array_values($perMinute);
    $sections = array_values($sections);
    if (is_numeric($updatedAt) && $updatedAt > 100000000000) {
        $updatedAt /= 1000;
    }
    $anyRows = collect($sections)->contains(fn ($s) => count($s['rows'] ?? []) > 0);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'realtime-counter') }}" data-live="{{ $live ? 'true' : 'false' }}"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground') }}>
    <x-nq::card.header>
        <x-nq::card.title as="h3">
            <span class="inline-flex items-center gap-2">
                <span aria-hidden="true" class="relative flex size-2.5">
                    @if ($live)<span class="absolute inline-flex size-full rounded-full bg-nq-success opacity-60 motion-safe:animate-ping"></span>@endif
                    <span class="relative inline-flex size-2.5 rounded-full {{ $live ? 'bg-nq-success' : 'bg-muted-foreground' }}"></span>
                </span>
                {{ $title ?? $t['title'] }}
                <span class="text-caption font-normal text-muted-foreground">{{ $live ? $t['live'] : $t['paused'] }}</span>
            </span>
        </x-nq::card.title>
        <x-nq::card.description>{{ $description ?? $t['description'] }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-4">
        <div class="flex flex-wrap items-end justify-between gap-4">
            <div role="status" aria-label="{{ $value == 1 ? $t['userOne'] : sprintf($t['users'], $value) }}" class="text-display text-foreground tabular-nums" data-slot="realtime-value">
                <x-nq::numeric :value="$value" :locale="$locale" />
            </div>
            @if (count($perMinute))
                <x-nq::chart.mini-bar :data="$perMinute" :highlight="count($perMinute) - 1" :label="$t['perMinute']" class="h-12 w-40" />
            @endif
        </div>
        @if ($updatedAt !== null)
            <p class="text-caption text-muted-foreground">{{ $t['updated'] }} <x-nq::numeric.date-time :value="$updatedAt" relative :locale="$locale" /></p>
        @endif
        @if ($value == 0 && ! $anyRows)
            <p class="text-body-sm text-muted-foreground">{{ $t['empty'] }}</p>
        @endif
        @if (count($sections))
            <div class="grid gap-4 sm:grid-cols-2">
                @foreach ($sections as $s)
                    <section aria-label="{{ $s['title'] }}" class="flex flex-col gap-2">
                        <h4 class="text-label text-muted-foreground">{{ $s['title'] }}</h4>
                        <ul class="flex flex-col gap-1.5">
                            @foreach ($s['rows'] ?? [] as $r)
                                <li class="flex items-center justify-between gap-3 text-body-sm">
                                    @if ($s['ltr'] ?? false)
                                        <bdi dir="ltr" class="min-w-0 truncate text-foreground">{{ $r['label'] }}</bdi>
                                    @else
                                        <span class="min-w-0 truncate text-foreground" dir="auto">{{ $r['label'] }}</span>
                                    @endif
                                    <x-nq::numeric :value="$r['value']" class="text-muted-foreground" :locale="$locale" />
                                </li>
                            @endforeach
                        </ul>
                    </section>
                @endforeach
            </div>
        @endif
    </x-nq::card.content>
</div>
