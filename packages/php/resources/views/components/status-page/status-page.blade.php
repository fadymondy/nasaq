{{-- <x-nq::status-page title="Acme status" :services="$services" :incidents="$incidents" :maintenance="$maintenance" :updated-at="now()"><x-slot:footer><a href="/subscribe">Subscribe</a></x-slot:footer></x-nq::status-page>
     The public status page: an overall banner, each service with its daily history bar and uptime, active and past incidents, and scheduled maintenance. No admin controls, no sign-in.
     services: [['id', 'name', 'description', 'status' => up | degraded | down | paused | unknown, 'days' => [up | degraded | down | none, oldest first], 'uptime' => 99.9]].
     incidents: as uptime-monitors.incident-list. maintenance: [['id', 'title', 'startsAt', 'endsAt', 'description']]. updated-at: DateTime | ISO string | unix seconds.
     Slots: logo (your own mark), footer. Static: no Alpine needed. --}}
@props(['title' => null, 'services' => [], 'incidents' => [], 'maintenance' => [], 'updatedAt' => null, 'logo' => null, 'footer' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $carbon = fn ($v) => $v instanceof \DateTimeInterface ? \Carbon\Carbon::instance($v) : (is_numeric($v) ? \Carbon\Carbon::createFromTimestamp($v) : \Carbon\Carbon::parse($v));
    // numeric.date-time wants IANA names: hand it UTC for "Z" strings.
    $date = function ($v) use ($carbon) {
        $c = $carbon($v);
        return $c->getTimezone()->getName() === 'Z' ? $c->setTimezone('UTC') : $c;
    };
    $now = now()->getTimestamp();
    $running = collect($maintenance)->contains(fn ($m) => $carbon($m['startsAt'])->getTimestamp() <= $now && $carbon($m['endsAt'])->getTimestamp() >= $now);
    $statuses = collect($services)->pluck('status')->filter(fn ($s) => ! in_array($s, ['paused', 'unknown'], true))->values();
    if ($statuses->isEmpty()) {
        $overall = $running ? 'maintenance' : 'operational';
    } else {
        $down = $statuses->filter(fn ($s) => $s === 'down')->count();
        $overall = $down === $statuses->count() ? 'major-outage' : ($down > 0 ? 'partial-outage' : ($statuses->contains('degraded') ? 'degraded' : ($running ? 'maintenance' : 'operational')));
    }
    $overallText = [
        'operational' => $t::t('All systems operational', 'كل الأنظمة تعمل'),
        'degraded' => $t::t('Degraded performance', 'أداء متدهور'),
        'partial-outage' => $t::t('Partial outage', 'انقطاع جزئي'),
        'major-outage' => $t::t('Major outage', 'انقطاع كبير'),
        'maintenance' => $t::t('Maintenance in progress', 'صيانة جارية'),
    ];
    $tone = [
        'operational' => ['border-nq-success/30 bg-nq-success/10 [&_svg]:text-nq-success', 'circle-check'],
        'degraded' => ['border-nq-warning/30 bg-nq-warning/10 [&_svg]:text-nq-warning', 'circle-alert'],
        'partial-outage' => ['border-nq-warning/30 bg-nq-warning/10 [&_svg]:text-nq-warning', 'circle-alert'],
        'major-outage' => ['border-nq-danger/30 bg-nq-danger/10 [&_svg]:text-nq-danger', 'circle-x'],
        'maintenance' => ['border-nq-info/30 bg-nq-info/10 [&_svg]:text-nq-info', 'wrench'],
    ][$overall];
    $statusText = [
        'up' => $t::t('Operational', 'تعمل'), 'degraded' => $t::t('Degraded', 'متدهورة'), 'down' => $t::t('Outage', 'متوقفة'),
        'paused' => $t::t('Paused', 'موقوفة'), 'unknown' => $t::t('No data', 'لا بيانات'),
    ];
    $statusVariant = ['up' => 'success', 'degraded' => 'warning', 'down' => 'danger', 'paused' => 'neutral', 'unknown' => 'neutral'];
    $active = collect($incidents)->filter(fn ($i) => $i['status'] !== 'resolved')->values()->all();
    $past = collect($incidents)->filter(fn ($i) => $i['status'] === 'resolved')->values()->all();
    $upcoming = collect($maintenance)->filter(fn ($m) => $carbon($m['endsAt'])->getTimestamp() >= $now)->values();
    $filled = fn ($v) => $v !== null && ! ($v instanceof \Illuminate\View\ComponentSlot && $v->isEmpty());
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'status-page') }}" data-overall="{{ $overall }}" {{ $attributes->except('data-slot')->cn('mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 sm:py-12') }}>
    <header class="flex items-center gap-3">
        @if ($filled($logo)){{ $logo }}@endif
        <h1 class="text-h1 text-foreground" dir="auto">{{ $title }}</h1>
    </header>

    <div role="status" class="flex items-center gap-3 rounded-card border p-4 {{ $tone[0] }}">
        <x-dynamic-component :component="'lucide-'.$tone[1]" aria-hidden="true" class="size-6 shrink-0" />
        <div class="grid min-w-0 gap-0.5">
            <p class="text-h4 text-foreground">{{ $overallText[$overall] }}</p>
            @if ($updatedAt)
                <p class="text-body-sm text-muted-foreground">{{ $t::t('Updated', 'آخر تحديث') }} <x-nq::numeric.date-time :value="$date($updatedAt)" relative /></p>
            @endif
        </div>
    </div>

    @if (count($active))
        <section aria-labelledby="sp-active" class="grid gap-3">
            <h2 id="sp-active" class="text-h3 text-foreground">{{ $t::t('Active incidents', 'حوادث جارية') }}</h2>
            <x-nq::uptime-monitors.incident-list :incidents="$active" />
        </section>
    @endif

    <section aria-labelledby="sp-services" class="grid gap-3">
        <h2 id="sp-services" class="text-h3 text-foreground">{{ $t::t('Services', 'الخدمات') }}</h2>
        <ul class="divide-y divide-border rounded-card border border-border bg-card">
            @foreach ($services as $s)
                @php $n = count($s['days'] ?? []); @endphp
                <li data-slot="status-page-service" class="grid gap-2 p-4">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="grid min-w-0">
                            <span class="text-label text-foreground" dir="auto">{{ $s['name'] }}</span>
                            @if (! empty($s['description']))
                                <span class="text-body-sm text-muted-foreground" dir="auto">{{ $s['description'] }}</span>
                            @endif
                        </div>
                        <x-nq::badge :variant="$statusVariant[$s['status']] ?? 'neutral'">{{ $statusText[$s['status']] ?? $s['status'] }}</x-nq::badge>
                    </div>
                    @if ($n)
                        <x-nq::uptime-monitors.uptime-bar :checks="$s['days']" :label="$t::t($s['name'].', daily status', $s['name'].'، الحالة اليومية')" class="h-8" />
                        <div class="flex items-center justify-between text-caption text-muted-foreground">
                            <span>{{ $t::t("{$n} days ago", "قبل {$n} يومًا") }}</span>
                            @if (array_key_exists('uptime', $s))
                                <x-nq::uptime-monitors.uptime-badge :percent="$s['uptime']" :period="$t::t("{$n}-day uptime", "وقت التشغيل خلال {$n} يومًا")" />
                            @endif
                            <span>{{ $t::t('Today', 'اليوم') }}</span>
                        </div>
                    @endif
                </li>
            @endforeach
        </ul>
    </section>

    <section aria-labelledby="sp-maint" class="grid gap-3">
        <h2 id="sp-maint" class="text-h3 text-foreground">{{ $t::t('Scheduled maintenance', 'صيانة مجدولة') }}</h2>
        @if ($upcoming->isNotEmpty())
            <x-nq::timeline>
                @foreach ($upcoming as $m)
                    <x-nq::timeline.item :title="$m['title']" :description="$m['description'] ?? null" :time="$m['startsAt']">
                        <x-slot:icon><x-lucide-wrench aria-hidden="true" /></x-slot:icon>
                        <p class="text-caption text-muted-foreground">{{ $t::t('From', 'من') }} <x-nq::numeric.date-time :value="$date($m['startsAt'])" date-style="medium" time-style="short" /> {{ $t::t('Until', 'إلى') }} <x-nq::numeric.date-time :value="$date($m['endsAt'])" date-style="medium" time-style="short" /></p>
                    </x-nq::timeline.item>
                @endforeach
            </x-nq::timeline>
        @else
            <p class="text-body-sm text-muted-foreground">{{ $t::t('No maintenance is scheduled.', 'لا توجد صيانة مجدولة.') }}</p>
        @endif
    </section>

    <section aria-labelledby="sp-past" class="grid gap-3">
        <h2 id="sp-past" class="text-h3 text-foreground">{{ $t::t('Past incidents', 'حوادث سابقة') }}</h2>
        @if (count($past))
            <x-nq::uptime-monitors.incident-list :incidents="$past" />
        @else
            <p class="text-body-sm text-muted-foreground">{{ $t::t('No incidents reported.', 'لا توجد حوادث مُبلَّغ عنها.') }}</p>
        @endif
    </section>

    <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-caption text-muted-foreground">
        @if ($filled($footer)){{ $footer }}@else<span></span>@endif
        <span>{{ $t::t('Powered by Nasaq', 'بدعم من نسق') }}</span>
    </footer>
</div>
