{{-- <x-nq::icon-rail-sidebar :sections="[['id' => 'home', 'label' => 'Home', 'icon' => 'house', 'groups' => [['id' => 'g', 'label' => 'Main', 'items' => [['id' => 'dash', 'label' => 'Dashboard', 'icon' => 'layout-dashboard', 'href' => '/']]]]]]" section="home" active-item="dash"> page </x-nq::icon-rail-sidebar>
     Two-level navigation. A slim rail of icons picks the section; a sub-sidebar beside it lists that section's pages, in groups, with expandable parents (children). On narrow screens both fold into a sheet behind a menu button. The page is the default slot.
     sections: id, label, icon (a lucide name), href, badge, title (the sub-sidebar heading), groups: [id, label, items: [id, label, icon, href, badge, children: [id, label, href]]].
     section: the active section id (x-modelable: x-model). active-item: the active page id; a page chosen from outside moves the rail to the section that owns it. sub-open: show the sub-sidebar on wide screens (default true).
     Slots: brand, railFooter (bottom of the rail), subHeader, subFooter. labels: ['rail','sub','hide','show','menu','menuTitle'].
     Events from the root: "nq-select" { id, sectionId } (a page, or a section without a sub-sidebar), "nq-section-change" { id }, "nq-sub-open-change" { open }.
     Not ported: the tooltip on rail buttons (they carry a title). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['sections' => [], 'section' => null, 'activeItem' => null, 'subOpen' => true, 'labels' => [], 'brand' => null, 'railFooter' => null, 'subHeader' => null, 'subFooter' => null])
@php
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $t = fn (string $key, string $en, string $ar) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $ar);
    $current = $section ?? ($sections[0]['id'] ?? '');
    $subs = [];
    $owners = [];
    $walk = function (array $links, string $sid) use (&$walk, &$owners) {
        foreach ($links as $link) {
            $owners[$link['id']] = $sid;
            if (! empty($link['children'])) {
                $walk($link['children'], $sid);
            }
        }
    };
    foreach ($sections as $s) {
        if (! empty($s['groups'])) {
            $subs[$s['id']] = true;
            foreach ($s['groups'] as $g) {
                $walk($g['items'], $s['id']);
            }
        }
    }
    $options = ['section' => $current, 'item' => $activeItem ?? '', 'subOpen' => (bool) $subOpen, 'subs' => (object) $subs, 'owners' => (object) $owners];
    $railLabel = $t('rail', 'Sections', 'الأقسام');
    $subLabel = $t('sub', 'Section navigation', 'التنقل داخل القسم');
    $hide = $t('hide', 'Hide sub-menu', 'إخفاء القائمة الفرعية');
    $show = $t('show', 'Show sub-menu', 'إظهار القائمة الفرعية');
    $menu = $t('menu', 'Open navigation', 'فتح التنقل');
    $menuTitle = $t('menuTitle', 'Navigation', 'التنقل');
    $subId = 'nq-rail-sub-'.substr(md5(json_encode($sections)), 0, 6);
@endphp
<div data-slot="icon-rail-sidebar" x-data="nqIconRail({!! $js((object) $options) !!})" x-modelable="section"
    {{ $attributes->cn('flex h-full min-h-0 w-full bg-background text-foreground') }}>
    <div class="hidden shrink-0 md:flex">
        <x-nq::icon-rail-sidebar.rail :sections="$sections" :label="$railLabel" :sub-id="$subId" :brand="$brand" :footer="$railFooter" />
        <x-nq::icon-rail-sidebar.sub :sections="$sections" :label="$subLabel" :hide-label="$hide" :sub-id="$subId" :active-item="$activeItem" :header="$subHeader" :footer="$subFooter" />
    </div>
    <div class="flex min-w-0 flex-1 flex-col">
        <x-nq::sheet>
            <div data-slot="icon-rail-mobile-bar" class="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 md:hidden">
                <x-nq::sheet.trigger variant="ghost" size="icon-sm" aria-label="{{ $menu }}"><x-lucide-menu aria-hidden="true" /></x-nq::sheet.trigger>
                <span class="min-w-0 flex-1 truncate text-label" x-text="{!! $js(collect($sections)->mapWithKeys(fn ($s) => [$s['id'] => $s['title'] ?? $s['label']])->all()) !!}[section]"></span>
            </div>
            <x-nq::sheet.content side="start" :show-close="false" class="w-[min(20rem,90vw)] p-0">
                <x-nq::sheet.title class="sr-only">{{ $menuTitle }}</x-nq::sheet.title>
                <x-nq::sheet.body class="flex h-full min-h-0 p-0">
                    <x-nq::icon-rail-sidebar.rail :sections="$sections" :label="$railLabel" :sheet="true" :brand="$brand" :footer="$railFooter" />
                    <x-nq::icon-rail-sidebar.sub :sections="$sections" :label="$subLabel" :hide-label="$hide" :sheet="true" :active-item="$activeItem" :header="$subHeader" :footer="$subFooter" />
                </x-nq::sheet.body>
            </x-nq::sheet.content>
        </x-nq::sheet>
        <div x-show="hasSub && ! subOpen" class="hidden px-3 pt-3 md:block">
            <x-nq::button variant="ghost" size="icon-sm" type="button" aria-label="{{ $show }}" title="{{ $show }}" x-bind:aria-controls="{!! $js($subId.'-') !!} + section" x-bind:aria-expanded="subOpen" class="text-muted-foreground" x-on:click="setSub(true)">
                <x-lucide-panel-left-open aria-hidden="true" class="rtl:-scale-x-100" />
            </x-nq::button>
        </div>
        <div data-slot="icon-rail-content" class="min-h-0 flex-1 overflow-y-auto">{{ $slot }}</div>
    </div>
</div>
