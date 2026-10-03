{{-- <x-nq::time-fields.time-zone-clock time-zone="Asia/Riyadh" reference="Africa/Cairo" />   <x-nq::time-fields.time-zone-clock time-zone="Europe/London" label="Head office" seconds size="lg" />
     A live clock for one IANA time zone: the city, the time ticking, the date and the UTC offset, optionally compared with a reference zone ("+2h from Cairo", "Tomorrow").
     It uses Intl in the browser, so daylight saving is right without a table; the digits are Latin in Arabic too. The server renders the first frame; Alpine ticks it every second.
     time-zone (required), label (replaces the city), seconds (default false), hour-cycle: 12 | 24 (default: the language's), reference, show-date / show-offset (default true),
     now: freeze the clock at this instant (DateTime, timestamp or string; for docs and tests), size: sm | md | lg (default md), labels, locale.
     Needs the Alpine runtime (@nasaqScripts) to tick. --}}
@props(['timeZone', 'label' => null, 'seconds' => false, 'hourCycle' => null, 'reference' => null, 'showDate' => true, 'showOffset' => true, 'now' => null, 'size' => 'md', 'labels' => [], 'locale' => null])
@php
    $N = \Nasaq\Nasaq::class;
    $ar = $N::rtl();
    $locale ??= $ar ? 'ar' : str_replace('_', '-', app()->getLocale());
    $isAr = str_starts_with($locale, 'ar');
    $L = array_merge([
        'unknownZone' => $N::t('Unknown time zone', 'منطقة زمنية غير معروفة'),
        'tomorrow' => $N::t('Tomorrow', 'غدًا'),
        'yesterday' => $N::t('Yesterday', 'أمس'),
        'ahead' => $N::t('from', 'عن'),
    ], (array) $labels);
    $zoneOf = function ($name) { try { return $name ? new \DateTimeZone($name) : null; } catch (\Throwable) { return null; } };
    $zone = $zoneOf($timeZone);
    $ref = $zoneOf($reference);
    $instant = $now === null ? \DateTimeImmutable::createFromInterface(now()) : ($now instanceof \DateTimeInterface ? \DateTimeImmutable::createFromInterface($now) : (is_numeric($now) ? new \DateTimeImmutable('@'.(int) $now) : new \DateTimeImmutable($now)));
    $clockSize = ['sm' => 'text-h3', 'md' => 'text-h2', 'lg' => 'text-display'][$size] ?? 'text-h2';
@endphp
@if (! $zone)
    <div data-slot="{{ $attributes->get('data-slot', 'time-zone-clock') }}" {{ $attributes->except('data-slot')->cn('text-body-sm text-muted-foreground') }}>{{ $L['unknownZone'] }}: <bdi dir="ltr">{{ $timeZone }}</bdi></div>
@else
    @php
        $local = $instant->setTimezone($zone);
        $offset = $zone->getOffset($instant) / 60;
        $diff = $ref ? $offset - $ref->getOffset($instant) / 60 : null;
        $dayShift = $ref ? ($local->format('Y-m-d') <=> $instant->setTimezone($ref)->format('Y-m-d')) : 0;
        $sign = $offset < 0 ? '-' : '+';
        $abs = (int) abs($offset);
        $offsetLabel = sprintf('UTC%s%02d:%02d', $sign, intdiv($abs, 60), $abs % 60);
        $span = function ($minutes) use ($isAr) {
            $h = intdiv($minutes, 60);
            $m = $minutes % 60;
            return implode(' ', array_filter([$h ? $h.($isAr ? ' س' : 'h') : null, ($m || ! $h) ? $m.($isAr ? ' د' : 'm') : null]));
        };
        $diffText = $diff === null ? '' : ($diff == 0 ? ($isAr ? 'الوقت نفسه' : 'same time') : ($diff < 0 ? '-' : '+').$span((int) abs($diff)));
        $pattern = $hourCycle === 24 ? 'HH:mm' : 'h:mm';
        $pattern .= $seconds ? ':ss' : '';
        $pattern .= $hourCycle === 24 ? '' : ' a';
        $time = class_exists(\IntlDateFormatter::class)
            ? (new \IntlDateFormatter($locale.'@numbers=latn', \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, $zone->getName(), null, $pattern))->format($instant)
            : $local->format($hourCycle === 24 ? 'H:i' : 'g:i A');
        $date = class_exists(\IntlDateFormatter::class)
            ? (new \IntlDateFormatter($locale.'@numbers=latn', \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, $zone->getName(), null, $isAr ? 'EEE d MMM' : 'EEE, MMM d'))->format($instant)
            : $local->format('D, M j');
        $dayShiftText = $dayShift === 0 ? '' : ($dayShift > 0 ? $L['tomorrow'] : $L['yesterday']);
        $options = array_filter([
            'timeZone' => $zone->getName(),
            'label' => $label,
            'seconds' => $seconds ? true : null,
            'hourCycle' => $hourCycle,
            'reference' => $ref ? $reference : null,
            'showDate' => $showDate ? null : false,
            'showOffset' => $showOffset ? null : false,
            'now' => $now === null ? null : $instant->getTimestamp() * 1000,
            'locale' => $locale,
            'labels' => $labels ?: null,
        ], fn ($v) => $v !== null);
        $city = $label ?? str_replace('_', ' ', collect(explode('/', $zone->getName()))->last());
    @endphp
    <div data-slot="{{ $attributes->get('data-slot', 'time-zone-clock') }}" x-data="nqTimeZoneClock({!! \Illuminate\Support\Js::from((object) $options) !!})"
        {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-0.5') }}>
        <div class="flex items-baseline justify-between gap-3">
            <span class="min-w-0 truncate text-label text-foreground" x-text="city">{{ $city }}</span>
            @if ($showOffset)<bdi dir="ltr" class="shrink-0 font-mono text-caption text-muted-foreground" x-text="offsetLabel">{{ $offsetLabel }}</bdi>@endif
        </div>
        <time x-bind:datetime="iso" datetime="{{ $instant->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z') }}" dir="ltr" x-text="clock" class="font-semibold tabular-nums text-foreground {{ $clockSize }} {{ $isAr ? 'text-start' : '' }}">{{ $time }}</time>
        <div x-show="showRow" @if (! $showDate && $diff === null) style="display: none" @endif class="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
            @if ($showDate)<span x-text="dateText">{{ $date }}</span>@endif
            <x-nq::badge variant="neutral" x-show="dayShiftText" x-text="dayShiftText" :style="$dayShift === 0 ? 'display: none' : null">{{ $dayShiftText }}</x-nq::badge>
            <span x-show="diffVisible" @if (! $diff) style="display: none" @endif><bdi dir="ltr" x-text="diffText">{{ $diffText }}</bdi> {{ $L['ahead'] }} {{ $ref ? str_replace('_', ' ', collect(explode('/', $reference))->last()) : '' }}</span>
        </div>
        <div x-show="! known" style="display: none" class="text-body-sm text-muted-foreground">{{ $L['unknownZone'] }}: <bdi dir="ltr" x-text="timeZone"></bdi></div>
    </div>
@endif
