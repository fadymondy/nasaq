{{-- <x-nq::personal-widgets.weather-widget city="Riyadh" :temperature="38" condition="clear" :high="41" :low="27" />
     Presentational weather for the owner's city; pass the values from your own weather source, nothing is fetched here.
     temperature, high, low: degrees Celsius. condition: clear | partly-cloudy | cloudy | rain | storm | snow | fog | wind. unit: c (default) | f converts for display.
     labels: ['weather' => …, 'highLow' => 'High {high}, low {low}', 'condition' => ['clear' => …]]. --}}
@props(['city', 'temperature', 'condition' => 'clear', 'high' => null, 'low' => null, 'unit' => 'c', 'labels' => [], 'locale' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $locale ??= $ar ? 'ar' : str_replace('_', '-', app()->getLocale());
    $base = $ar
        ? ['weather' => 'الطقس', 'highLow' => 'العظمى {high}، الصغرى {low}', 'condition' => ['clear' => 'صافٍ', 'partly-cloudy' => 'غائم جزئيًا', 'cloudy' => 'غائم', 'rain' => 'مطر', 'storm' => 'عاصفة رعدية', 'snow' => 'ثلج', 'fog' => 'ضباب', 'wind' => 'رياح']]
        : ['weather' => 'Weather', 'highLow' => 'High {high}, low {low}', 'condition' => ['clear' => 'Clear', 'partly-cloudy' => 'Partly cloudy', 'cloudy' => 'Cloudy', 'rain' => 'Rain', 'storm' => 'Thunderstorm', 'snow' => 'Snow', 'fog' => 'Fog', 'wind' => 'Windy']];
    $labels = (array) $labels;
    $t = array_merge($base, $labels, ['condition' => array_merge($base['condition'], (array) ($labels['condition'] ?? []))]);
    $icons = ['clear' => 'sun', 'partly-cloudy' => 'cloud-sun', 'cloudy' => 'cloud', 'rain' => 'cloud-rain', 'storm' => 'cloud-lightning', 'snow' => 'snowflake', 'fog' => 'cloud-fog', 'wind' => 'wind'];
    $condition = isset($icons[$condition]) ? $condition : 'clear';
    $f = $unit === 'f';
    $show = function ($c) use ($f, $locale) {
        $v = (int) round($f ? ($c * 9) / 5 + 32 : $c);
        $unitName = $f ? 'fahrenheit' : 'celsius';
        if (class_exists(\NumberFormatter::class)) {
            $nf = new \NumberFormatter($locale.'@numbers=latn', \NumberFormatter::DECIMAL);
            $text = $nf->format($v);

            return $text.'°'.($f ? 'F' : 'C');
        }

        return $v.'°'.($f ? 'F' : 'C');
    };
@endphp
<div data-slot="weather-widget" data-condition="{{ $condition }}" {{ $attributes->cn('flex flex-col gap-2 rounded-card border border-border bg-card py-4 text-card-foreground') }}>
    <div data-slot="card-header" class="grid auto-rows-min items-start gap-1 px-4"><div data-slot="card-title" class="text-label text-foreground">{{ $t['weather'] }}</div></div>
    <div data-slot="card-content" class="flex items-center gap-3 px-4">
        <x-nq::icon :name="$icons[$condition]" class="size-9 shrink-0 text-nq-accent-text" />
        <div class="flex min-w-0 flex-col">
            <p class="text-h1 text-foreground" dir="ltr">{{ $show($temperature) }}</p>
            <p class="text-body-sm text-muted-foreground">{{ $t['condition'][$condition] }}, <bdi>{{ $city }}</bdi></p>
            @if ($high !== null && $low !== null)<p class="text-caption text-muted-foreground">{{ str_replace(['{high}', '{low}'], [$show($high), $show($low)], $t['highLow']) }}</p>@endif
        </div>
    </div>
</div>
