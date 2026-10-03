{{-- <x-nq::numeric.date-time :value="$post->published_at" />   <x-nq::numeric.date-time :value="$at" relative />
     A date as <time>: machine-readable datetime, locale formatting with Latin digits, its own bidi isolate.
     value: DateTime, timestamp or string. date-style / time-style: short | medium | long | full (default date-style medium).
     relative shows "3 hours ago" and moves the absolute date to the title. --}}
@props(['value', 'dateStyle' => null, 'timeStyle' => null, 'relative' => false, 'locale' => null, 'title' => null])
@php
    $locale ??= app()->getLocale();
    $date = $value instanceof \DateTimeInterface ? \Carbon\Carbon::instance($value) : (is_numeric($value) ? \Carbon\Carbon::createFromTimestamp($value) : \Carbon\Carbon::parse($value));
    // ICU wants an IANA name or GMT±hh:mm; ISO strings parse to "Z" or "+03:00".
    $tz = $date->getTimezone()->getName();
    $tz = $tz === 'Z' ? 'UTC' : (preg_match('/^[+-]\d/', $tz) ? 'GMT'.$tz : $tz);
    $style = ['none' => \IntlDateFormatter::NONE, 'short' => \IntlDateFormatter::SHORT, 'medium' => \IntlDateFormatter::MEDIUM, 'long' => \IntlDateFormatter::LONG, 'full' => \IntlDateFormatter::FULL];
    if (class_exists(\IntlDateFormatter::class)) {
        $absolute = (new \IntlDateFormatter(
            str_replace('_', '-', $locale).'@numbers=latn',
            $style[$dateStyle ?? ($timeStyle === null ? 'medium' : 'none')] ?? \IntlDateFormatter::MEDIUM,
            $style[$timeStyle ?? 'none'] ?? \IntlDateFormatter::NONE,
            $tz,
        ))->format($date);
    } else {
        $absolute = $date->format('M j, Y');
    }
    $text = $relative ? $date->copy()->locale(substr($locale, 0, 2))->diffForHumans() : $absolute;
@endphp
<time data-slot="{{ $attributes->get('data-slot', 'date-time') }}" datetime="{{ $date->toIso8601String() }}" dir="auto" @if ($title ?? $relative) title="{{ $title ?? $absolute }}" @endif
    {{ $attributes->except('data-slot')->cn('tabular-nums [unicode-bidi:isolate]') }}>{{ $text }}</time>
