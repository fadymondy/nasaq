{{-- <x-nq::personal-widgets.local-clock time-zone="Asia/Riyadh" city="Riyadh" :working-hours="['start' => 9, 'end' => 17, 'days' => [0, 1, 2, 3, 4]]" />
     The owner's local time, whether it is working time there, and the offset from the visitor's clock. Needs the Alpine runtime (@nasaqScripts) to tick.
     time-zone: IANA zone of the owner. city: place name. viewer-time-zone: the visitor's zone (default the browser's).
     working-hours: ['start' => 9, 'end' => 17, 'days' => [0 = Sunday ...]] (default Sunday to Thursday, 9 to 17).
     now: freeze the clock at this instant (DateTime, timestamp or string); otherwise it updates every 15 seconds.
     labels: ['localTime' => …, 'inTimezone' => '… {city}', 'working' => …, 'offHours' => …, 'sameTime' => …, 'ahead' => '{n}h …', 'behind' => '{n}h …']. --}}
@props(['timeZone', 'city' => null, 'viewerTimeZone' => null, 'workingHours' => [], 'now' => null, 'labels' => [], 'locale' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $locale ??= $ar ? 'ar' : str_replace('_', '-', app()->getLocale());
    $t = array_merge($ar
        ? ['localTime' => 'الوقت المحلي', 'inTimezone' => 'في {city}', 'working' => 'ضمن ساعات العمل', 'offHours' => 'خارج ساعات العمل', 'sameTime' => 'نفس توقيتك', 'ahead' => 'يسبقك بـ {n} س', 'behind' => 'يتأخر عنك بـ {n} س']
        : ['localTime' => 'Local time', 'inTimezone' => 'in {city}', 'working' => 'Working hours', 'offHours' => 'Outside working hours', 'sameTime' => 'Same time as you', 'ahead' => '{n}h ahead of you', 'behind' => '{n}h behind you'],
        (array) $labels);
    $zone = function ($name, $fallback = 'UTC') { try { return new \DateTimeZone($name); } catch (\Throwable) { return new \DateTimeZone($fallback); } };
    $owner = $zone($timeZone);
    $viewer = $zone($viewerTimeZone ?? config('app.timezone', 'UTC'));
    $instant = $now === null ? new \DateTimeImmutable('now') : ($now instanceof \DateTimeInterface ? \DateTimeImmutable::createFromInterface($now) : (is_numeric($now) ? (new \DateTimeImmutable('@'.(int) $now)) : new \DateTimeImmutable($now)));
    $local = $instant->setTimezone($owner);
    $hours = (array) $workingHours;
    $h = (int) $local->format('G') + (int) $local->format('i') / 60;
    $working = in_array((int) $local->format('w'), $hours['days'] ?? [0, 1, 2, 3, 4], true) && $h >= ($hours['start'] ?? 9) && $h < ($hours['end'] ?? 17);
    $diff = round((($owner->getOffset($instant) - $viewer->getOffset($instant)) / 3600) * 2) / 2;
    $time = class_exists(\IntlDateFormatter::class)
        ? (new \IntlDateFormatter($locale.'@numbers=latn', \IntlDateFormatter::NONE, \IntlDateFormatter::SHORT, $owner->getName()))->format($instant)
        : $local->format('g:i A');
    $n = rtrim(rtrim(number_format(abs($diff), 1, '.', ''), '0'), '.');
    $offset = $diff == 0 ? $t['sameTime'] : str_replace('{n}', $n, $diff > 0 ? $t['ahead'] : $t['behind']);
    $options = array_filter([
        'timeZone' => $owner->getName(),
        'viewerTimeZone' => $viewerTimeZone,
        'workingHours' => $hours ?: null,
        'locale' => $locale,
        'now' => $now === null ? null : $instant->getTimestamp() * 1000,
        'labels' => ['working' => $t['working'], 'offHours' => $t['offHours'], 'sameTime' => $t['sameTime'], 'ahead' => $t['ahead'], 'behind' => $t['behind']],
    ], fn ($v) => $v !== null);
@endphp
<div data-slot="local-clock" x-data="nqLocalClock({!! \Illuminate\Support\Js::from((object) $options) !!})"
    {{ $attributes->cn('flex flex-col gap-2 rounded-card border border-border bg-card py-4 text-card-foreground') }}>
    <div data-slot="card-header" class="grid auto-rows-min items-start gap-1 px-4"><div data-slot="card-title" class="text-label text-foreground">{{ $t['localTime'] }}</div></div>
    <div data-slot="card-content" class="flex flex-col gap-1 px-4">
        <p class="flex items-baseline gap-2">
            <time x-bind:datetime="iso" x-text="time" datetime="{{ $instant->format('c') }}" class="text-h1 tabular-nums text-foreground" dir="ltr">{{ $time }}</time>
            @if ($city !== null)<span class="text-body-sm text-muted-foreground">{{ str_replace('{city}', $city, $t['inTimezone']) }}</span>@endif
        </p>
        <p class="flex items-center gap-1.5 text-body-sm text-muted-foreground">
            <span aria-hidden="true" x-bind:class="working ? 'bg-nq-success' : 'bg-nq-line-strong'" class="size-2 rounded-full {{ $working ? 'bg-nq-success' : 'bg-nq-line-strong' }}"></span>
            <span x-text="statusText">{{ $working ? $t['working'] : $t['offHours'] }}</span>
        </p>
        <p class="text-caption text-muted-foreground" x-text="offsetText">{{ $offset }}</p>
    </div>
</div>
