{{-- <x-nq::graph-view :nodes="[['id' => 'a', 'label' => 'Sara', 'kind' => 'person']]" :links="[]" :kinds="[['id' => 'person', 'label' => 'People', 'hue' => 'blue', 'icon' => 'user']]" />
     One knowledge graph, four ways to look at it: a live force-directed graph you can drag, pan and zoom, a grid of cards, a sortable list, and a
     schema of columns (one per type) with connectors between related cards. Search and type filters apply to all of them, the selection follows you
     from one view to the next, and an inspector shows the selected node with everything it links to.
     nodes: [{ id, label, kind, description?, tags?, updatedAt?, shape?, weight?, icon?, labelPosition? }]. links: [{ source, target, label?, kind? }].
     kinds: [{ id, label, hue, icon?, shape?, labelPosition? }] (hue: gray red orange amber green teal blue violet pink; icon: a blade-lucide-icons name such as 'user';
     shape: circle square rounded diamond hexagon pill; label-position: bottom right inside none).
     link-kinds: [{ id, style?: solid|dashed|flow, arrow?, hue? }] for the line style of links with that kind.
     mode: graph (default) | grid | list | schema. selected-id: start with a node selected. animate: live simulation (default true; always off under reduced motion).
     arrows: arrowheads on every link. openable: adds an Open button to the inspector (listen for the "open" event). height: CSS length (default 100%, min 420px).
     Events (bubbling): "select" { id }, "mode" { mode }, "open" { node }, "pinned" { ids }. Bilingual toolbar and inspector; node, kind and link labels are yours to translate.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['nodes' => [], 'links' => [], 'kinds' => [], 'linkKinds' => [], 'mode' => 'graph', 'selectedId' => null, 'animate' => true, 'labelPosition' => 'bottom', 'arrows' => false, 'openable' => false, 'height' => '100%'])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $nodes = array_values(array_map(fn ($n) => (array) $n, (array) $nodes));
    $links = array_values(array_map(fn ($l) => (array) $l, (array) $links));
    $kinds = array_values(array_map(fn ($k) => (array) $k, (array) $kinds));
    $linkKinds = array_values(array_map(fn ($k) => (array) $k, (array) $linkKinds));
    // Icons are rendered here (blade-lucide-icons) and shipped as inner SVG markup, so the Alpine views can draw them.
    $names = array_values(array_unique(array_filter(array_merge(array_column($kinds, 'icon'), array_column($nodes, 'icon')))));
    $icons = [];
    foreach ($names as $name) {
        $svg = \Illuminate\Support\Facades\Blade::render('<x-dynamic-component :component="$c" />', ['c' => 'lucide-'.$name]);
        if (preg_match('/<svg[^>]*>(.*)<\/svg>/s', $svg, $m)) {
            $icons[$name] = trim($m[1]);
        }
    }
    $config = [
        'nodes' => $nodes, 'links' => $links, 'kinds' => $kinds, 'linkKinds' => $linkKinds, 'icons' => (object) $icons,
        'mode' => $mode, 'selectedId' => $selectedId, 'labelPosition' => $labelPosition,
    ];
    if (! $animate) {
        $config['animate'] = false;
    }
    if ($arrows) {
        $config['arrows'] = true;
    }
    if ($openable) {
        $config['openable'] = true;
    }
    $h = is_numeric($height) ? $height.'px' : $height;
    $views = [['graph', 'Graph', 'رسم', 'network'], ['schema', 'Schema', 'مخطط', 'columns-3'], ['grid', 'Grid', 'شبكة', 'layout-grid'], ['list', 'List', 'قائمة', 'list']];
@endphp
<div data-slot="graph-view" x-data="nqGraph(@js($config))" x-modelable="selectedId" :data-mode="mode" x-on:click="act($event)"
    style="height: {{ $h }}; min-height: 420px"
    {{ $attributes->cn('relative flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-background') }} data-mode="{{ $mode }}">
    <div class="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div class="relative min-w-40 flex-1 sm:max-w-72">
            <x-lucide-search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <x-nq::field.input type="search" x-model="query" placeholder="{{ $T('Search the graph', 'ابحث في الرسم') }}" aria-label="{{ $T('Search the graph', 'ابحث في الرسم') }}" class="ps-8" />
        </div>
        @if (count($kinds))
            <x-nq::toggle-group multiple x-model="picked" aria-label="{{ $T('Filter by type', 'تصفية حسب النوع') }}" class="flex-wrap">
                @foreach ($kinds as $k)
                    <x-nq::toggle-group.toggle :value="$k['id']" aria-label="{{ $k['label'] }}">
                        <span aria-hidden="true" class="size-2.5 rounded-full" style="background-color: var(--nq-tag-{{ $k['hue'] ?? 'gray' }})"></span>
                        {{ $k['label'] }}
                    </x-nq::toggle-group.toggle>
                @endforeach
            </x-nq::toggle-group>
        @endif
        <div class="ms-auto flex items-center gap-2">
            <span class="hidden text-caption text-muted-foreground sm:inline"><bdi x-text="countsText"></bdi></span>
            <x-nq::toggle-group x-model="modeValue" aria-label="{{ $T('View', 'العرض') }}" :default-value="[$mode]">
                @foreach ($views as [$id, $en, $ar, $icon])
                    <x-nq::toggle-group.toggle :value="$id" aria-label="{{ $T($en, $ar) }}" title="{{ $T($en, $ar) }}">
                        <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" /><span class="hidden md:inline">{{ $T($en, $ar) }}</span>
                    </x-nq::toggle-group.toggle>
                @endforeach
            </x-nq::toggle-group>
        </div>
    </div>
    <div class="relative flex min-h-0 flex-1">
        <div x-ref="stage" data-slot="graph-stage" class="relative min-w-0 flex-1"
            x-bind:class="isViewport ? 'touch-none select-none' : ''"
            x-on:pointerdown="down($event)" x-on:pointermove="move($event)" x-on:pointerup="up($event, false)" x-on:pointercancel="up($event, true)"
            x-on:keydown="key($event)" x-on:pointerover="over($event)" x-on:pointerout="out($event)" dir="ltr">
            <div x-ref="body" x-effect="paint()" dir="{{ \Nasaq\Nasaq::rtl() ? 'rtl' : 'ltr' }}" x-bind:dir="rtl && mode !== 'graph' ? 'rtl' : 'ltr'"
                x-bind:class="mode === 'graph' || mode === 'schema' ? 'bg-[radial-gradient(var(--nq-line)_1px,transparent_1px)] [background-size:20px_20px] overflow-hidden' : ''"
                class="relative h-full min-h-72"></div>
            <div x-show="isViewport" x-cloak data-role="zoom" class="absolute start-3 bottom-3 z-20 flex flex-col overflow-hidden rounded-control border border-border bg-card shadow-xs" role="group" aria-label="{{ $T('Zoom in', 'تكبير') }}">
                <x-nq::button variant="ghost" size="icon-sm" class="rounded-none" aria-label="{{ $T('Zoom in', 'تكبير') }}" title="{{ $T('Zoom in', 'تكبير') }}" x-on:click.stop="zoom(1.3)"><x-lucide-plus aria-hidden="true" /></x-nq::button>
                <x-nq::button variant="ghost" size="icon-sm" class="rounded-none border-t border-border" aria-label="{{ $T('Zoom out', 'تصغير') }}" title="{{ $T('Zoom out', 'تصغير') }}" x-on:click.stop="zoom(1 / 1.3)"><x-lucide-minus aria-hidden="true" /></x-nq::button>
                <x-nq::button variant="ghost" size="icon-sm" class="rounded-none border-t border-border" aria-label="{{ $T('Fit to view', 'ملاءمة العرض') }}" title="{{ $T('Fit to view', 'ملاءمة العرض') }}" x-on:click.stop="fit()"><x-lucide-maximize-2 aria-hidden="true" /></x-nq::button>
            </div>
            <p x-show="isViewport" x-cloak x-text="hint" class="pointer-events-none absolute end-3 bottom-3 hidden max-w-72 text-end text-caption text-muted-foreground md:block"></p>
        </div>
        <aside x-show="node" x-cloak style="display: none" x-ref="inspector" x-effect="paintInspector()" data-slot="graph-inspector" aria-label="{{ $T('Details', 'التفاصيل') }}"
            class="absolute inset-0 z-10 flex flex-col border-s border-border bg-card md:static md:inset-auto md:w-80 md:shrink-0"></aside>
    </div>
</div>
