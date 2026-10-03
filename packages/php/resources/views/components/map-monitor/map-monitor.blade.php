{{-- <x-nq::map-monitor :regions="[['id' => 'riyadh', 'label' => 'Riyadh', 'labelAr' => 'الرياض', 'center' => ['lat' => 24.71, 'lng' => 46.67], 'zoom' => 10]]" :alerts="[['id' => 'a1', 'lat' => 24.71, 'lng' => 46.68, 'title' => 'Road closed', 'severity' => 'critical', 'at' => now()->subHour()]]" default-range="24h" />
     A map for watching live events: region presets that jump between places, a time-range filter, and an alerts panel that lists the alerts by severity in step with the pins.
     alerts: each ['id', 'lat', 'lng', 'title', 'titleAr', 'severity' => critical|high|medium (default)|low, 'at' => a date, epoch ms or ISO string, 'detail', 'detailAr', 'layer'] (ids must not clash with pins).
     regions: each ['id', 'label', 'labelAr', 'center' => ['lat', 'lng'], 'zoom'], default-region: the one the map starts on. time-ranges: each ['id', 'ms' => number|null] (default 24h, 7d, 30d, all); name custom ids in labels['ranges'].
     default-range: default "all", or the last range. alerts-open: false starts with the panel closed. selected-id. now: epoch ms for the filter and the relative times (default the current time on the server).
     pins: the map's own pins besides the alerts. routes, areas, layers, visible-layers, tile-url, attribution, min-zoom, max-zoom, cluster, cluster-radius, layers-panel: passed to <x-nq::map-view>.
     title / heading-as: the heading (default "Live map", h2; false hides it). map-class: classes for the map, mainly its height (default h-[30rem]). <x-slot:actions> adds controls at the end of the toolbar. labels: an array that replaces strings.
     Events (bubbling): map-monitor-region { id }, map-monitor-range { id }, map-monitor-alerts { open }, map-monitor-visible { alerts }, plus the map's nq-map-select and nq-map-view.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'alerts' => [], 'pins' => [], 'regions' => [], 'defaultRegion' => null, 'timeRanges' => null, 'defaultRange' => null, 'alertsOpen' => true, 'selectedId' => null, 'now' => null,
    'routes' => [], 'areas' => [], 'layers' => [], 'visibleLayers' => null, 'tileUrl' => null, 'attribution' => null, 'minZoom' => 1, 'maxZoom' => 19, 'cluster' => null, 'clusterRadius' => 60, 'layersPanel' => 'collapsed',
    'title' => null, 'headingAs' => 'h2', 'mapClass' => null, 'labels' => [], 'locale' => null, 'actions' => null,
])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $strings = $ar ? [
        'title' => 'الخريطة المباشرة', 'regions' => 'المنطقة', 'timeRange' => 'النطاق الزمني',
        'ranges' => ['24h' => '24 ساعة', '7d' => '7 أيام', '30d' => '30 يومًا', 'all' => 'الكل'],
        'alerts' => 'التنبيهات', 'alertsList' => 'التنبيهات الحالية', 'showAlerts' => 'عرض التنبيهات', 'hideAlerts' => 'إخفاء التنبيهات',
        'noAlerts' => 'لا توجد تنبيهات في هذا النطاق الزمني.', 'when' => 'الوقت',
        'severity' => ['critical' => 'حرج', 'high' => 'مرتفع', 'medium' => 'متوسط', 'low' => 'منخفض'], 'summary' => '{n} تنبيهات',
    ] : [
        'title' => 'Live map', 'regions' => 'Region', 'timeRange' => 'Time range',
        'ranges' => ['24h' => '24h', '7d' => '7 days', '30d' => '30 days', 'all' => 'All'],
        'alerts' => 'Alerts', 'alertsList' => 'Current alerts', 'showAlerts' => 'Show alerts', 'hideAlerts' => 'Hide alerts',
        'noAlerts' => 'No alerts in this time range.', 'when' => 'When',
        'severity' => ['critical' => 'Critical', 'high' => 'High', 'medium' => 'Medium', 'low' => 'Low'], 'summary' => '{n} alerts',
    ];
    $t = array_replace_recursive($strings, (array) $labels);
    $heading = $title === null ? $t['title'] : ($title === false ? null : $title);
    $ranges = $timeRanges === null
        ? [['id' => '24h', 'ms' => 86400000], ['id' => '7d', 'ms' => 604800000], ['id' => '30d', 'ms' => 2592000000], ['id' => 'all', 'ms' => null]]
        : array_values(array_map(fn ($r) => (array) $r, (array) $timeRanges));
    $rangeId = $defaultRange ?? (collect($ranges)->first(fn ($r) => ($r['ms'] ?? null) === null)['id'] ?? (end($ranges)['id'] ?? 'all'));
    $regionList = array_values(array_map(fn ($r) => (array) $r, (array) $regions));
    $toMs = function ($at) {
        if ($at instanceof \DateTimeInterface) {
            return (int) ($at->getTimestamp() * 1000);
        }

        return is_numeric($at) ? (float) $at : (string) $at;
    };
    $alertList = array_values(array_map(function ($a) use ($toMs) {
        $a = (array) $a;
        $a['at'] = $toMs($a['at'] ?? null);

        return $a;
    }, (array) $alerts));
    $icons = [];
    foreach (['critical' => 'octagon-alert', 'high' => 'triangle-alert', 'medium' => 'circle-alert', 'low' => 'info'] as $sev => $icon) {
        $icons[$sev] = \Illuminate\Support\Facades\Blade::render('<x-nq::icon name="'.$icon.'" />');
    }
    $options = array_filter([
        'alerts' => $alertList,
        'pins' => array_values(array_map(fn ($p) => (array) $p, (array) $pins)),
        'regions' => $regionList,
        'defaultRegion' => $defaultRegion,
        'timeRanges' => $timeRanges === null ? null : $ranges,
        'defaultRange' => $rangeId,
        'defaultAlertsOpen' => (bool) $alertsOpen,
        'selectedId' => $selectedId,
        'now' => $now ?? \Illuminate\Support\Carbon::now()->getTimestamp() * 1000,
        'locale' => $locale ?? ($ar ? 'ar' : 'en'),
        'labels' => $t,
        'icons' => $icons,
    ], fn ($v) => $v !== null);
    $hide = 'style="display: none"';
    $sevBadge = ['critical' => 'danger', 'high' => 'warning', 'medium' => 'info', 'low' => 'neutral'];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'map-monitor') }}" x-data="nqMapMonitor({!! \Illuminate\Support\Js::from((object) $options) !!})" x-id="['nq-map-monitor']"
    x-on:nq-map-view="onMapView($event)" x-on:nq-map-select="onMapSelect($event)" @if ($heading) x-bind:aria-labelledby="uid(`title`)" @endif
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card') }}>
    <header class="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3">
        @if ($heading)
            <{{ $headingAs }} x-bind:id="uid(`title`)" class="me-auto text-h4 text-foreground">{{ $heading }}</{{ $headingAs }}>
        @endif
        @if (count($regionList))
            <x-nq::toggle-group :aria-label="$t['regions']" :default-value="$defaultRegion ? [$defaultRegion] : []" x-model="regionValue">
                @foreach ($regionList as $r)
                    <x-nq::toggle-group.toggle :value="$r['id']" data-region="{{ $r['id'] }}">{{ $ar && ! empty($r['labelAr']) ? $r['labelAr'] : $r['label'] }}</x-nq::toggle-group.toggle>
                @endforeach
            </x-nq::toggle-group>
        @endif
        @if (count($ranges) > 1)
            <x-nq::toggle-group :aria-label="$t['timeRange']" :default-value="[$rangeId]" x-model="rangeValue">
                @foreach ($ranges as $r)
                    <x-nq::toggle-group.toggle :value="$r['id']" data-range="{{ $r['id'] }}">{{ $t['ranges'][$r['id']] ?? $r['id'] }}</x-nq::toggle-group.toggle>
                @endforeach
            </x-nq::toggle-group>
        @endif
        <x-nq::button type="button" variant="secondary" x-bind:aria-expanded="open ? `true` : `false`" x-bind:aria-controls="uid(`alerts`)" x-bind:aria-label="alertsLabel()" x-on:click="toggleAlerts()">
            <x-lucide-bell aria-hidden="true" />
            {{ $t['alerts'] }}
            <x-nq::badge variant="danger" x-show="badgeIs(`danger`)" x-text="totalText()" style="display: none"></x-nq::badge>
            <x-nq::badge variant="warning" x-show="badgeIs(`warning`)" x-text="totalText()" style="display: none"></x-nq::badge>
            <x-nq::badge variant="neutral" x-show="badgeIs(`neutral`)" x-text="totalText()" style="display: none"></x-nq::badge>
        </x-nq::button>
        {{ $actions }}
    </header>

    <div class="flex min-w-0 flex-col lg:flex-row">
        <x-nq::map-view
            :label="is_string($heading) ? $heading : $t['title']"
            :pins="(array) $pins" :routes="$routes" :areas="$areas" :layers="$layers" :visible-layers="$visibleLayers" :tile-url="$tileUrl" :attribution="$attribution"
            :min-zoom="$minZoom" :max-zoom="$maxZoom" :cluster="$cluster" :cluster-radius="$clusterRadius" :layers-panel="$layersPanel" :locale="$locale ?? ($ar ? 'ar' : 'en')"
            class="h-[30rem] min-w-0 flex-1 rounded-none border-0 {{ $mapClass }}" />
        <aside x-bind:id="uid(`alerts`)" data-slot="map-monitor-alerts" x-bind:hidden="! open" x-bind:aria-labelledby="uid(`alerts-title`)"
            class="flex max-h-[30rem] min-w-0 flex-col border-t border-border lg:w-80 lg:border-s lg:border-t-0">
            <div class="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <h3 x-bind:id="uid(`alerts-title`)" class="me-auto text-label text-foreground">{{ $t['alertsList'] }}</h3>
                @foreach ($sevBadge as $sev => $variant)
                    <x-nq::badge :variant="$variant" title="{{ $t['severity'][$sev] }}" x-show="count(`{{ $sev }}`)" style="display: none">
                        <span class="sr-only">{{ $t['severity'][$sev] }}: </span><span x-text="countText(`{{ $sev }}`)"></span>
                    </x-nq::badge>
                @endforeach
            </div>
            <ul x-show="visible.length" class="flex flex-col overflow-y-auto" {!! $hide !!}>
                <template x-for="a in visible" x-bind:key="a.id">
                    <li data-slot="map-monitor-alert" x-bind:data-alert="a.id" x-bind:data-severity="severity(a)">
                        <button type="button" x-bind:aria-current="isSelected(a) ? `true` : null" x-on:click="focusAlert(a)" x-bind:class="rowClass(a)"
                            class="flex w-full items-start gap-2.5 border-b border-s-2 border-b-border px-4 py-3 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                            <span aria-hidden="true" class="mt-0.5 flex size-4 shrink-0 [&_svg]:size-4" x-bind:class="iconClass(a)" x-html="iconOf(a)"></span>
                            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span dir="auto" class="line-clamp-2 text-label text-foreground" x-text="titleOf(a)"></span>
                                <span dir="auto" x-show="hasDetail(a)" x-text="detailOf(a)" class="truncate text-caption text-muted-foreground" {!! $hide !!}></span>
                                <span class="text-caption text-muted-foreground" x-text="sub(a)"></span>
                            </span>
                        </button>
                    </li>
                </template>
            </ul>
            <p x-show="visible.length === 0" class="px-4 py-8 text-center text-body-sm text-muted-foreground">{{ $t['noAlerts'] }}</p>
        </aside>
    </div>
</section>
