{{-- <x-nq::map-view label="Fleet" :layers="[['id' => 'vans', 'label' => 'Vans', 'labelAr' => 'الشاحنات', 'tone' => 'info']]" :pins="[['id' => 'v1', 'lat' => 24.7136, 'lng' => 46.6753, 'label' => 'Van 12', 'layer' => 'vans', 'tone' => 'info', 'icon' => 'truck']]" :routes="[...]" tile-url="https://tile.example.com/{z}/{x}/{y}.png" attribution="© Example maps" />
     A map of places and routes without a map library: pins, route lines, zones, layer toggles, zoom and pan (drag, wheel, buttons or keyboard), pin clustering and a location card.
     Tiles come from tile-url ({z}/{x}/{y}); without one a latitude / longitude grid is drawn, so it works offline. The canvas is always left to right.
     pins: each ['id', 'lat', 'lng', 'label', 'labelAr', 'detail', 'detailAr', 'layer', 'tone' => brand|info|success|warning|danger|neutral, 'icon' => lucide name, 'live', 'status', 'statusAr', 'meta' => [['label', 'labelAr', 'value']], 'actions' => [['id', 'label', 'danger']]].
     routes: each ['id', 'points' => [['lat', 'lng']], 'label', 'labelAr', 'layer', 'tone', 'dashed']. areas: the same with a ring of 3+ points (zones).
     layers: each ['id', 'label', 'labelAr', 'tone', 'defaultHidden']. visible-layers: ids shown (default every layer not defaultHidden). layers-panel: collapsed (default) | expanded | hidden. legend="false" is the same as hidden.
     selected-id, view (['center' => ['lat','lng'], 'zoom']), min-zoom (1), max-zoom (19), cluster (default on above 30 visible pins), cluster-radius (60), picked (['lat','lng'], a draggable pin), editing + edit-points + edit-tone (area drawing), label, locale, labels (override any string).
     Events (bubbling): nq-map-select { id }, nq-map-pin-click { pin }, nq-map-click { point }, nq-map-area-click { area }, nq-map-view { view }, nq-map-layers { visible }, nq-map-picked { point }, nq-map-area-change { points }, nq-map-area-done { points }, nq-map-action { pin, action }.
     The pin context menu of the Vue and React versions is not ported: pin actions show in the card and fire nq-map-action. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['pins' => [], 'routes' => [], 'areas' => [], 'layers' => [], 'visibleLayers' => null, 'tileUrl' => null, 'attribution' => null, 'selectedId' => null, 'view' => null, 'minZoom' => 1, 'maxZoom' => 19, 'cluster' => null, 'clusterRadius' => 60, 'legend' => true, 'layersPanel' => 'collapsed', 'picked' => null, 'editing' => false, 'editPoints' => [], 'editTone' => 'brand', 'label' => null, 'locale' => null, 'labels' => []])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $strings = [
        'en' => [
            'map' => 'Map', 'layers' => 'Layers', 'routes' => 'Routes', 'areas' => 'Areas', 'zoomIn' => 'Zoom in', 'zoomOut' => 'Zoom out', 'fit' => 'Show everything', 'close' => 'Close',
            'copyCoordinates' => 'Copy coordinates', 'coordinates' => 'Coordinates', 'hint' => 'Drag to move. Use the arrow keys to pan, plus and minus to zoom, Home to show everything.',
            'routeLength' => '{km} km', 'showLayer' => 'Show {name}', 'noPins' => 'Nothing to show on the map', 'selected' => '{name}, selected',
            'clusterZoom' => '{n}, zoom in', 'clusterList' => '{n}, show the list', 'clusterHint' => 'These pins share one spot. Choose one to see it.',
            'pickedPoint' => 'Chosen location', 'pickedHint' => 'Drag to move. Arrow keys nudge it, Shift for bigger steps.', 'vertex' => 'Point {n}', 'vertexHint' => 'Drag to move. Arrow keys nudge it. Delete removes it.',
            'shape' => 'Shape being edited', 'removeLast' => 'Remove last point', 'finishShape' => 'Finish shape', 'editHint' => 'Click the map, or press Enter, to add a point.',
        ],
        'ar' => [
            'map' => 'الخريطة', 'layers' => 'الطبقات', 'routes' => 'المسارات', 'areas' => 'المناطق', 'zoomIn' => 'تكبير', 'zoomOut' => 'تصغير', 'fit' => 'عرض كل شيء', 'close' => 'إغلاق',
            'copyCoordinates' => 'نسخ الإحداثيات', 'coordinates' => 'الإحداثيات', 'hint' => 'اسحب للتحريك. استخدم الأسهم للتنقل، وعلامتي الزائد والناقص للتكبير، وHome لعرض كل شيء.',
            'routeLength' => '{km} كم', 'showLayer' => 'إظهار {name}', 'noPins' => 'لا شيء لعرضه على الخريطة', 'selected' => '{name}، محدد',
            'clusterZoom' => '{n}، كبّر للتفصيل', 'clusterList' => '{n}، عرض القائمة', 'clusterHint' => 'هذه الأماكن في نقطة واحدة. اختر مكانًا لعرضه.',
            'pickedPoint' => 'الموقع المختار', 'pickedHint' => 'اسحب للتحريك. الأسهم تحرّكه خطوة خطوة، ومع Shift خطوة أكبر.', 'vertex' => 'النقطة {n}', 'vertexHint' => 'اسحب للتحريك. الأسهم تحرّكها. Delete يحذفها.',
            'shape' => 'الشكل قيد التعديل', 'removeLast' => 'حذف آخر نقطة', 'finishShape' => 'إنهاء الشكل', 'editHint' => 'انقر على الخريطة، أو اضغط Enter، لإضافة نقطة.',
        ],
    ];
    $t = array_merge($strings[$ar ? 'ar' : 'en'], (array) $labels);
    $pinList = array_values(array_map(fn ($p) => (array) $p, (array) $pins));
    $icons = ['default' => \Illuminate\Support\Facades\Blade::render('<x-nq::icon name="map-pin" />')];
    foreach ($pinList as $p) {
        if (! empty($p['icon']) && ! isset($icons[$p['icon']])) {
            $icons[$p['icon']] = \Illuminate\Support\Facades\Blade::render('<x-nq::icon name="'.e($p['icon']).'" />');
        }
    }
    $classes = [
        'pin' => [
            'brand' => 'border-primary bg-primary text-primary-foreground', 'info' => 'border-nq-info bg-nq-info-soft text-nq-info-text', 'success' => 'border-nq-success bg-nq-success-soft text-nq-success-text',
            'warning' => 'border-nq-warning bg-nq-warning-soft text-nq-warning-text', 'danger' => 'border-nq-danger bg-nq-danger-soft text-nq-danger-text', 'neutral' => 'border-nq-line-strong bg-secondary text-foreground',
        ],
        'stroke' => ['brand' => 'stroke-primary', 'info' => 'stroke-nq-info', 'success' => 'stroke-nq-success', 'warning' => 'stroke-nq-warning', 'danger' => 'stroke-nq-danger', 'neutral' => 'stroke-muted-foreground'],
        'fill' => ['brand' => 'fill-primary/15', 'info' => 'fill-nq-info/15', 'success' => 'fill-nq-success/15', 'warning' => 'fill-nq-warning/15', 'danger' => 'fill-nq-danger/15', 'neutral' => 'fill-muted-foreground/15'],
        'swatch' => ['brand' => 'bg-primary', 'info' => 'bg-nq-info', 'success' => 'bg-nq-success', 'warning' => 'bg-nq-warning', 'danger' => 'bg-nq-danger', 'neutral' => 'bg-muted-foreground'],
        'badge' => [
            'brand' => 'border-nq-brand/40 bg-[color-mix(in_oklab,var(--nq-brand)_14%,transparent)] text-foreground', 'info' => 'border-nq-info/40 bg-nq-info-soft text-nq-info-text',
            'success' => 'border-nq-success/40 bg-nq-success-soft text-nq-success-text', 'warning' => 'border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text',
            'danger' => 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text', 'neutral' => 'border-border bg-secondary text-foreground',
        ],
    ];
    $options = array_filter([
        'pins' => $pinList,
        'routes' => array_values(array_map(fn ($r) => (array) $r, (array) $routes)),
        'areas' => array_values(array_map(fn ($a) => (array) $a, (array) $areas)),
        'layers' => array_values(array_map(fn ($l) => (array) $l, (array) $layers)),
        'visibleLayers' => $visibleLayers,
        'tileUrl' => $tileUrl,
        'selectedId' => $selectedId,
        'view' => $view,
        'minZoom' => (int) $minZoom,
        'maxZoom' => (int) $maxZoom,
        'cluster' => $cluster,
        'clusterRadius' => (int) $clusterRadius,
        'picked' => $picked,
        'editing' => $editing ? true : null,
        'editPoints' => $editPoints ?: null,
        'editTone' => $editTone,
        'locale' => $locale ?? ($ar ? 'ar' : 'en'),
        'labels' => $t,
        'classes' => $classes,
        'icons' => $icons,
    ], fn ($v) => $v !== null);
    $hide = 'style="display: none"';
    $btn = 'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0';
    $ghost = $btn.' border-transparent text-foreground hover:bg-nq-hover';
    $showLegend = $legend && $layersPanel !== 'hidden';
    $dir = $ar ? 'rtl' : 'ltr';
    $card = 'absolute inset-x-3 bottom-8 z-30 flex max-h-[70%] cursor-default flex-col overflow-auto rounded-card border border-border bg-card p-4 shadow-lg sm:inset-x-auto sm:bottom-8 sm:start-3 sm:w-80';
    $handle = 'absolute z-20 flex cursor-move touch-none items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus';
@endphp
<div x-data="nqMapView({!! \Illuminate\Support\Js::from((object) $options) !!})" x-ref="canvas" dir="ltr" role="group" aria-roledescription="map" aria-label="{{ $label ?? $t['map'] }}" tabindex="0" data-slot="map-view" title="{{ $t['hint'] }}"
    x-bind:data-dragging="drag ? '' : null" x-bind:class="drag ? 'cursor-grabbing' : 'cursor-grab'"
    x-on:keydown="keyDown($event)" x-on:pointerdown="pointerDown($event)" x-on:pointermove="pointerMove($event)" x-on:pointerup="pointerUp($event)" x-on:pointercancel="pointerUp($event)" x-on:dblclick="dblClick($event)"
    {{ $attributes->cn('relative isolate h-[28rem] min-h-64 w-full touch-none select-none overflow-hidden rounded-card border border-border bg-secondary outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus') }}>
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden" x-show="tiles.length > 0" {!! $hide !!}>
        <template x-for="tile in tiles" :key="tile.key">
            <img x-bind:src="tile.src" alt="" draggable="false" referrerpolicy="no-referrer" class="absolute max-w-none" x-bind:style="tile.style" x-on:error="$event.target.style.visibility = 'hidden'">
        </template>
    </div>
    <svg aria-hidden="true" data-slot="map-grid" class="pointer-events-none absolute inset-0 size-full stroke-border" x-html="gridSvg"></svg>
    <svg aria-hidden="true" data-slot="map-areas" class="pointer-events-none absolute inset-0 size-full" x-html="areasSvg"></svg>
    <svg aria-hidden="true" data-slot="map-routes" class="pointer-events-none absolute inset-0 size-full" x-html="routesSvg"></svg>
    <svg aria-hidden="true" data-slot="map-edit-shape" class="pointer-events-none absolute inset-0 size-full" x-html="editSvg"></svg>

    <template x-for="c in clusterItems" :key="c.key">
        <button type="button" data-map-control x-bind:data-cluster="c.id" x-bind:data-count="c.count" x-bind:aria-label="str(view.zoom >= clusterMax ? 'clusterList' : 'clusterZoom', { n: countText(c.count) })"
            x-on:click="expand(c)" x-bind:style="`left:${c.x}px;top:${c.y}px;width:${c.d}px;height:${c.d}px`"
            class="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-card bg-primary text-label tabular-nums text-primary-foreground shadow-md ring-4 ring-primary/25 outline-none transition-transform duration-150 ease-nq hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
            <bdi x-text="c.count"></bdi>
        </button>
    </template>
    <template x-for="item in pinItems" :key="item.key">
        <button type="button" data-map-control x-bind:data-pin="item.pin.id" x-bind:data-selected="item.pin.id === selectedId ? '' : null" x-bind:data-live="item.pin.live ? '' : null"
            x-bind:aria-label="item.pin.id === selectedId ? str('selected', { name: name(item.pin) }) : name(item.pin)" x-bind:aria-pressed="String(item.pin.id === selectedId)"
            x-on:click="pinClick(item.pin)" x-bind:style="`left:${item.x}px;top:${item.y}px`"
            x-bind:class="(item.pin.id === selectedId ? 'z-20' : 'z-10') + (item.pin.live && !drag ? ' motion-safe:transition-[left,top] motion-safe:duration-1000 motion-safe:ease-linear' : '')"
            class="absolute flex -translate-x-1/2 -translate-y-full cursor-pointer flex-col items-center outline-none focus-visible:[&>span:first-child]:outline-2 focus-visible:[&>span:first-child]:outline-offset-2 focus-visible:[&>span:first-child]:outline-nq-focus">
            <span x-bind:class="(item.pin.id === selectedId ? 'size-10 scale-110 ring-4 ring-nq-focus/30 ' : 'size-8 ') + cls('pin', item.pin.tone)" x-html="icon(item.pin)"
                class="flex items-center justify-center rounded-full border-2 shadow-sm transition-transform duration-150 ease-nq [&_svg]:size-4"></span>
            <span x-show="item.pin.live" aria-hidden="true" x-bind:class="(item.pin.id === selectedId ? 'size-10 ' : 'size-8 ') + cls('swatch', item.pin.tone)" class="pointer-events-none absolute top-0 rounded-full opacity-25 motion-safe:animate-ping" {!! $hide !!}></span>
            <span aria-hidden="true" x-bind:class="cls('swatch', item.pin.tone)" class="-mt-0.5 h-2 w-0.5"></span>
            <bdi dir="auto" x-show="item.pin.id === selectedId" x-text="name(item.pin)" class="pointer-events-none absolute top-full mt-0.5 max-w-40 truncate rounded-[4px] border border-border bg-card px-1.5 text-caption text-foreground shadow-sm" {!! $hide !!}></bdi>
        </button>
    </template>

    <template x-for="v in vertices" :key="v.i">
        <button type="button" data-map-control x-bind:data-vertex="v.i" x-bind:aria-label="str('vertex', { n: v.i + 1 })" title="{{ $t['vertexHint'] }}" x-bind:style="`left:${v.x}px;top:${v.y}px`"
            x-bind:class="cls('swatch', editTone)" x-on:pointerdown="handleDown($event, v.x, v.y)" x-on:pointermove="handleMove($event, 'vertex', v.i)" x-on:pointerup="handleUp($event)" x-on:pointercancel="grab = null" x-on:keydown="handleKey($event, 'vertex', v.i, v.x, v.y)"
            class="{{ $handle }} size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-sm"></button>
    </template>
    <button type="button" data-map-control data-picked-point aria-label="{{ $t['pickedPoint'] }}" title="{{ $t['pickedHint'] }}" x-show="picked && ready" x-bind:style="`left:${pickedAt.x}px;top:${pickedAt.y}px`"
        x-on:pointerdown="handleDown($event, pickedAt.x, pickedAt.y)" x-on:pointermove="handleMove($event, 'picked', 0)" x-on:pointerup="handleUp($event)" x-on:pointercancel="grab = null" x-on:keydown="handleKey($event, 'picked', 0, pickedAt.x, pickedAt.y)"
        class="{{ $handle }} -translate-x-1/2 -translate-y-full flex-col" {!! $hide !!}>
        <span class="flex size-10 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground shadow-md ring-4 ring-nq-focus/30 [&_svg]:size-5"><x-nq::icon name="map-pin" /></span>
        <span aria-hidden="true" class="-mt-0.5 h-2 w-0.5 bg-primary"></span>
    </button>
    <p x-show="empty" class="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-body-sm text-muted-foreground" {!! $hide !!}>{{ $t['noPins'] }}</p>

    @if ($showLegend)
        <div data-map-control data-slot="map-legend" dir="{{ $dir }}" x-show="hasLegend" x-init="legendOpen = {{ $layersPanel === 'expanded' ? 'true' : 'false' }}" class="absolute start-3 top-3 z-30 flex max-w-[calc(100%-6rem)] cursor-default flex-col items-start gap-1.5" {!! $hide !!}>
            <x-nq::button variant="secondary" size="sm" class="shadow-sm" x-bind:aria-expanded="String(legendOpen)" x-on:click="legendOpen = !legendOpen"><x-nq::icon name="layers" />{{ $t['layers'] }}</x-nq::button>
            <div x-show="legendOpen" class="flex w-56 max-w-full flex-col gap-2 rounded-card border border-border bg-card p-3 text-body-sm shadow-md" {!! $hide !!}>
                <ul role="list" class="flex flex-col gap-1.5" x-show="layers.length > 0" {!! $hide !!}>
                    <template x-for="layer in layers" :key="layer.id">
                        <li>
                            <label class="flex cursor-pointer items-center gap-2">
                                <input type="checkbox" x-bind:checked="isOn(layer.id)" x-on:change="toggleLayer(layer.id, $event.target.checked)" x-bind:aria-label="str('showLayer', { name: name(layer) })" class="size-4 shrink-0 cursor-pointer accent-primary">
                                <span aria-hidden="true" x-bind:class="cls('swatch', layer.tone)" class="size-2.5 shrink-0 rounded-full"></span>
                                <span class="min-w-0 flex-1 truncate text-foreground" x-text="name(layer)"></span>
                                <span class="text-caption tabular-nums text-muted-foreground" x-text="layerCount(layer.id)"></span>
                            </label>
                        </li>
                    </template>
                </ul>
                <div class="flex flex-col gap-1.5" x-show="vAreas.length > 0" x-bind:class="layers.length > 0 ? 'border-t border-border pt-2' : ''" {!! $hide !!}>
                    <span class="text-caption text-muted-foreground">{{ $t['areas'] }}</span>
                    <ul role="list" class="flex flex-col gap-1.5">
                        <template x-for="area in vAreas" :key="area.id">
                            <li>
                                <button type="button" x-bind:data-area-item="area.id" x-on:click="areaClick(area)" class="flex w-full cursor-pointer items-center gap-2 rounded-control text-start outline-none hover:bg-accent focus-visible:outline-2 focus-visible:outline-nq-focus">
                                    <span aria-hidden="true" x-bind:class="cls('swatch', area.tone)" class="size-3 shrink-0 rounded-[3px] opacity-70"></span>
                                    <span class="min-w-0 flex-1 truncate text-foreground" x-text="name(area)"></span>
                                </button>
                            </li>
                        </template>
                    </ul>
                </div>
                <div class="flex flex-col gap-1.5" x-show="vRoutes.length > 0" x-bind:class="(layers.length > 0 || vAreas.length > 0) ? 'border-t border-border pt-2' : ''" {!! $hide !!}>
                    <span class="text-caption text-muted-foreground">{{ $t['routes'] }}</span>
                    <ul role="list" class="flex flex-col gap-1.5">
                        <template x-for="route in vRoutes" :key="route.id">
                            <li class="flex items-center gap-2">
                                <span aria-hidden="true" x-bind:class="cls('swatch', route.tone ?? 'info') + (route.dashed ? ' opacity-60' : '')" class="h-0.5 w-4 shrink-0 rounded-full"></span>
                                <span class="min-w-0 flex-1 truncate text-foreground" x-text="name(route)"></span>
                                <bdi class="text-caption tabular-nums text-muted-foreground" x-text="str('routeLength', { km: fmtKm(route.points) })"></bdi>
                            </li>
                        </template>
                    </ul>
                </div>
            </div>
        </div>
    @endif

    <div data-map-control dir="{{ $dir }}" class="absolute end-3 top-3 z-30 flex cursor-default flex-col gap-1.5">
        <x-nq::button variant="secondary" size="icon" class="shadow-sm" aria-label="{{ $t['zoomIn'] }}" title="{{ $t['zoomIn'] }}" x-bind:disabled="view.zoom >= maxZoom ? '' : null" x-on:click="zoomBy(1)"><x-nq::icon name="plus" /></x-nq::button>
        <x-nq::button variant="secondary" size="icon" class="shadow-sm" aria-label="{{ $t['zoomOut'] }}" title="{{ $t['zoomOut'] }}" x-bind:disabled="view.zoom <= minZoom ? '' : null" x-on:click="zoomBy(-1)"><x-nq::icon name="minus" /></x-nq::button>
        <x-nq::button variant="secondary" size="icon" class="shadow-sm" aria-label="{{ $t['fit'] }}" title="{{ $t['fit'] }}" x-on:click="fit()"><x-nq::icon name="crosshair" /></x-nq::button>
    </div>

    <div data-map-control data-slot="map-edit-toolbar" role="toolbar" aria-label="{{ $t['shape'] }}" dir="{{ $dir }}" x-show="editing"
        class="absolute inset-x-0 top-3 z-30 mx-auto flex w-fit max-w-[calc(100%-9rem)] cursor-default flex-wrap items-center justify-center gap-1.5 rounded-card border border-border bg-card p-1.5 shadow-md" {!! $hide !!}>
        <span class="px-1.5 text-caption text-muted-foreground">{{ $t['editHint'] }}</span>
        <x-nq::button variant="secondary" size="sm" x-bind:disabled="ring.length === 0 ? '' : null" x-on:click="changeRing(ring.slice(0, -1))"><x-nq::icon name="undo-2" />{{ $t['removeLast'] }}</x-nq::button>
        <x-nq::button variant="primary" size="sm" x-bind:disabled="ring.length < 3 ? '' : null" x-on:click="done()"><x-nq::icon name="check" />{{ $t['finishShape'] }}</x-nq::button>
    </div>

    <div class="pointer-events-none absolute inset-x-3 bottom-2 z-10 flex items-end justify-between gap-3 text-caption text-muted-foreground">
        <span aria-hidden="true" class="flex flex-col items-start gap-0.5" x-bind:class="selected ? 'max-sm:invisible' : ''">
            <span class="h-1.5 border-x border-b border-foreground/60" x-bind:style="`width:${scale.px}px`"></span>
            <span class="tabular-nums" x-text="scaleText"></span>
        </span>
        @if ($attribution)
            <span class="pointer-events-auto max-w-[70%] rounded-[4px] bg-card/80 px-1.5 text-end">{{ $attribution }}</span>
        @endif
    </div>

    <template x-if="listed.length > 0 && !selected">
        <section data-map-control data-slot="map-cluster-card" x-bind:aria-label="countText(listed.length)" dir="{{ $dir }}" class="{{ $card }} gap-2">
            <header class="flex items-start gap-2">
                <div class="flex min-w-0 flex-1 flex-col gap-1">
                    <span class="text-label text-foreground" x-text="countText(listed.length)"></span>
                    <span class="text-body-sm text-muted-foreground">{{ $t['clusterHint'] }}</span>
                </div>
                <button type="button" aria-label="{{ $t['close'] }}" x-on:click="clusterIds = null" class="{{ $ghost }} size-control-sm p-0"><x-nq::icon name="x" /></button>
            </header>
            <ul role="list" class="flex flex-col gap-1">
                <template x-for="pin in listed" :key="pin.id">
                    <li>
                        <button type="button" x-bind:data-cluster-pin="pin.id" x-on:click="select(pin.id)" class="flex w-full cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-start text-body-sm text-foreground outline-none hover:bg-accent focus-visible:outline-2 focus-visible:outline-nq-focus">
                            <span aria-hidden="true" x-bind:class="cls('pin', pin.tone)" x-html="icon(pin)" class="flex size-6 shrink-0 items-center justify-center rounded-full border [&_svg]:size-3.5"></span>
                            <bdi dir="auto" class="min-w-0 flex-1 truncate" x-text="name(pin)"></bdi>
                        </button>
                    </li>
                </template>
            </ul>
        </section>
    </template>

    <template x-if="selected">
        <section data-map-control data-slot="map-card" x-bind:aria-label="name(selected)" dir="{{ $dir }}" class="{{ $card }} gap-3">
            <header class="flex items-start gap-2">
                <div class="flex min-w-0 flex-1 flex-col gap-1">
                    <bdi dir="auto" class="truncate text-label text-foreground" x-text="name(selected)"></bdi>
                    <bdi dir="auto" x-show="selected.detail || selected.detailAr" class="text-body-sm text-muted-foreground" x-text="pick(selected.detail, selected.detailAr)" {!! $hide !!}></bdi>
                </div>
                <span data-slot="badge" x-show="selected.status || selected.statusAr" x-text="pick(selected.status, selected.statusAr)" x-bind:class="cls('badge', selected.tone ?? 'neutral')"
                    class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium" {!! $hide !!}></span>
                <button type="button" aria-label="{{ $t['close'] }}" x-on:click="select(null)" class="{{ $ghost }} size-control-sm p-0"><x-nq::icon name="x" /></button>
            </header>
            <dl x-show="selected.meta && selected.meta.length > 0" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm" {!! $hide !!}>
                <template x-for="(m, i) in (selected.meta || [])" :key="i">
                    <div class="contents">
                        <dt class="text-muted-foreground" x-text="pick(m.label, m.labelAr)"></dt>
                        <dd class="min-w-0 text-foreground"><bdi dir="auto" x-text="m.value"></bdi></dd>
                    </div>
                </template>
            </dl>
            <div class="flex items-center gap-1 text-caption text-muted-foreground">
                <span class="sr-only">{{ $t['coordinates'] }}</span>
                <bdi dir="ltr" class="tabular-nums" x-text="coords()"></bdi>
                <button type="button" aria-label="{{ $t['copyCoordinates'] }}" title="{{ $t['copyCoordinates'] }}" x-on:click="copyCoords()" class="{{ $ghost }} size-control-sm p-0"><x-nq::icon name="copy" /></button>
            </div>
            <div x-show="selected.actions && selected.actions.length > 0" class="flex flex-wrap gap-2" {!! $hide !!}>
                <template x-for="action in (selected.actions || [])" :key="action.id">
                    <button type="button" x-on:click="runAction(action)" x-text="action.label" x-bind:class="action.danger ? 'border-transparent bg-destructive text-destructive-foreground' : 'border-border bg-card text-foreground hover:bg-nq-hover'"
                        class="{{ $btn }} h-control-sm px-2.5"></button>
                </template>
            </div>
        </section>
    </template>
</div>
