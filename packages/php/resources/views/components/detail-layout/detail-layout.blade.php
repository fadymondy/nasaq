{{-- <x-nq::detail-layout :tabs="[['key' => 'overview', 'label' => 'Overview', 'icon' => 'layout-dashboard', 'section' => 'General'], ['key' => 'logs', 'label' => 'Logs', 'badge' => 12]]" active-tab="overview" :identity="['name' => 'Postgres', 'kind' => 'Source']">
         <x-nq::detail-layout.panel key="overview">...</x-nq::detail-layout.panel> <x-nq::detail-layout.panel key="logs">...</x-nq::detail-layout.panel>
     </x-nq::detail-layout>
     A detail page for one thing (a plugin, a customer, a server): a sub-sidebar of tabs grouped in sections (a scrolling tab bar on small screens), a header with its identity and recent
     activity, and the active tab content. Needs the Alpine runtime (@nasaqScripts); active-tab is x-modelable (x-model / wire:model) and fires nq-change { value }.
     tabs: key, label, icon (lucide or Boxicons name, or an image URL), badge, section, disabled. active-tab: default the first tab.
     identity: name, description, version, kind, status ['label', 'tone' => success | warning | danger | info | neutral], icon, hue (a tag hue, default gray), slug.
     activity: count, countLabel, series (oldest first), lastActiveAt (DateTime, timestamp or string; null = none yet). Slot actions: buttons at the end of the header.
     loading shows skeletons and a loading state; error (true or a message) replaces the page with an error state, and retry-click (an Alpine expression, no apostrophes) adds Try again.
     heading-as: tag for the name (default h1). labels: array overriding the words. The default slot holds the panels (or any content). --}}
@props(['tabs' => [], 'activeTab' => null, 'identity' => null, 'activity' => null, 'loading' => false, 'error' => false, 'retryClick' => null, 'headingAs' => 'h1', 'labels' => []])
@php
    $strings = [
        'en' => ['nav' => 'Sections', 'lastActive' => 'Last active', 'never' => 'No activity yet', 'activity' => '{name} activity', 'errorTitle' => 'This page could not load', 'errorBody' => 'Check your connection and try again.', 'retry' => 'Try again', 'loading' => 'Loading'],
        'ar' => ['nav' => 'الأقسام', 'lastActive' => 'آخر نشاط', 'never' => 'لا نشاط بعد', 'activity' => 'نشاط {name}', 'errorTitle' => 'تعذر تحميل هذه الصفحة', 'errorBody' => 'تحقق من اتصالك ثم أعد المحاولة.', 'retry' => 'إعادة المحاولة', 'loading' => 'جارٍ التحميل'],
    ];
    $t = array_merge($strings[\Nasaq\Nasaq::rtl() ? 'ar' : 'en'], $labels);
    $fill = fn (string $text, array $values) => preg_replace_callback('/\{(\w+)\}/', fn ($m) => $values[$m[1]] ?? '', $text);
    $tabs = array_values($tabs);
    $active = (string) ($activeTab ?? ($tabs[0]['key'] ?? ''));
    // Group by section in order of first appearance; tabs without a section lead.
    $unsectioned = [];
    $bySection = [];
    foreach ($tabs as $tab) {
        if (empty($tab['section'])) {
            $unsectioned[] = $tab;
        } else {
            $bySection[$tab['section']][] = $tab;
        }
    }
    $groups = array_merge($unsectioned ? [['section' => null, 'tabs' => $unsectioned]] : [], array_map(fn ($s, $list) => ['section' => $s, 'tabs' => $list], array_keys($bySection), array_values($bySection)));
    $ordered = array_merge(...array_map(fn ($g) => $g['tabs'], $groups ?: [['tabs' => []]]));
    $meta = array_map(fn ($tab) => array_filter(['key' => (string) $tab['key'], 'section' => $tab['section'] ?? null, 'disabled' => ! empty($tab['disabled']) ?: null], fn ($v) => $v !== null), $tabs);
    $uid = substr(md5(json_encode($meta)), 0, 8);
    $panelId = 'nq-detail-'.$uid.'-panel';
    $heading = preg_match('/^[a-z][a-z0-9]*$/i', (string) $headingAs) ? $headingAs : 'h1';
    $tabButton = function (array $tab, bool $compact) use ($active, $panelId) {
        $on = (string) $tab['key'] === $active;
        $cls = \Nasaq\Cn::merge(
            'flex items-center gap-2 rounded-control text-start outline-none transition-colors duration-150 ease-nq',
            'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50',
            '[&_svg]:size-4 [&_svg]:shrink-0',
            $compact ? 'h-control-sm shrink-0 whitespace-nowrap px-3 text-label' : 'h-control w-full px-3 text-label',
            $on ? 'bg-nq-selected text-foreground' : 'text-muted-foreground hover:bg-nq-hover hover:text-foreground',
        );

        return [$on, $cls];
    };
    $tone = ['success' => 'success', 'warning' => 'warning', 'danger' => 'danger', 'info' => 'info'];
    $hue = $identity['hue'] ?? 'gray';
    $series = ! empty($activity['series']) ? array_values($activity['series']) : null;
    $count = $activity['count'] ?? null;
    $at = $activity['lastActiveAt'] ?? null;
    if ($at instanceof \DateTimeInterface) {
        $at = \Carbon\Carbon::instance($at);
    } elseif (is_numeric($at)) {
        $at = \Carbon\Carbon::createFromTimestamp($at > 1e11 ? $at / 1000 : $at);
    } elseif (is_string($at) && trim($at) !== '') {
        try { $at = \Carbon\Carbon::parse($at); } catch (\Throwable) { $at = null; }
    } else {
        $at = null;
    }
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'detail-layout') }}" x-data="nqDetailLayout(@js($active), @js($meta))" x-modelable="active"
    {{ $attributes->except('data-slot')->cn('flex min-h-0 flex-col md:flex-row') }}>
    <aside data-slot="detail-sidebar" class="hidden w-56 shrink-0 border-e border-border bg-card md:block">
        <nav aria-label="{{ $t['nav'] }}" class="flex flex-col gap-4 p-3">
            @foreach ($groups as $group)
                <div class="flex flex-col gap-0.5">
                    @if ($group['section'])<p dir="auto" class="px-3 pb-1 text-caption text-muted-foreground">{{ $group['section'] }}</p>@endif
                    @foreach ($group['tabs'] as $tab)
                        @php([$on, $cls] = $tabButton($tab, false))
                        <button type="button" data-slot="detail-tab" x-bind="tab(@js((string) $tab['key']), false)" aria-controls="{{ $panelId }}" tabindex="{{ $on ? 0 : -1 }}"
                            @if ($on) data-active="true" aria-current="page" @endif @if (! empty($tab['disabled'])) disabled @endif class="{{ $cls }}">
                            @if (is_string($tab['icon'] ?? null))<x-nq::icon-picker.by-name :name="$tab['icon']" class="size-4" />@endif
                            <span class="min-w-0 flex-1 truncate">{{ $tab['label'] }}</span>
                            @if (isset($tab['badge']) && $tab['badge'] !== null)<span class="text-caption tabular-nums text-muted-foreground">{{ $tab['badge'] }}</span>@endif
                        </button>
                    @endforeach
                </div>
            @endforeach
        </nav>
    </aside>
    <div class="flex min-w-0 flex-1 flex-col">
        <nav aria-label="{{ $t['nav'] }}" data-slot="detail-tabbar" class="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
            @foreach ($ordered as $tab)
                @php([$on, $cls] = $tabButton($tab, true))
                <button type="button" data-slot="detail-tab" x-bind="tab(@js((string) $tab['key']), true)" aria-controls="{{ $panelId }}" tabindex="{{ $on ? 0 : -1 }}"
                    @if ($on) data-active="true" aria-current="page" @endif @if (! empty($tab['disabled'])) disabled @endif class="{{ $cls }}">
                    @if (is_string($tab['icon'] ?? null))<x-nq::icon-picker.by-name :name="$tab['icon']" class="size-4" />@endif
                    <span class="min-w-0 flex-1 truncate">{{ $tab['label'] }}</span>
                    @if (isset($tab['badge']) && $tab['badge'] !== null)<span class="text-caption tabular-nums text-muted-foreground">{{ $tab['badge'] }}</span>@endif
                </button>
            @endforeach
        </nav>
        @if ($error)
            <x-nq::states.error :title="$t['errorTitle']" :description="$error === true ? $t['errorBody'] : $error" class="m-6">
                @if ($retryClick)
                    <x-slot:actions><x-nq::button x-on:click="{{ $retryClick }}"><x-lucide-rotate-cw aria-hidden="true" />{{ $t['retry'] }}</x-nq::button></x-slot:actions>
                @endif
            </x-nq::states.error>
        @else
            @if ($loading)
                <div data-slot="detail-hero" aria-hidden="true" class="flex flex-wrap items-center gap-4 border-b border-border bg-card px-6 py-6">
                    <x-nq::states.skeleton class="size-16 rounded-card" />
                    <div class="flex min-w-48 flex-1 flex-col gap-2">
                        <x-nq::states.skeleton class="h-6 w-56 max-w-full" />
                        <x-nq::states.skeleton class="h-4 w-80 max-w-full" />
                        <x-nq::states.skeleton class="h-4 w-32" />
                    </div>
                    <x-nq::states.skeleton class="h-16 w-48 rounded-card" />
                </div>
            @elseif ($identity)
                <header data-slot="detail-hero" class="flex flex-wrap items-start gap-4 border-b border-border bg-card px-6 py-6">
                    <span aria-hidden="true" class="flex size-16 shrink-0 items-center justify-center rounded-card bg-[var(--tile-soft)] text-[var(--tile-solid)]" style="--tile-solid: var(--nq-tag-{{ $hue }}); --tile-soft: var(--nq-tag-{{ $hue }}-soft)">
                        @if (is_string($identity['icon'] ?? null))<x-nq::icon-picker.by-name :name="$identity['icon']" class="size-7"><x-nq::icon name="puzzle" aria-hidden="true" class="size-7" /></x-nq::icon-picker.by-name>
                        @else<x-nq::icon name="puzzle" aria-hidden="true" class="size-7" />@endif
                    </span>
                    <div class="flex min-w-48 flex-1 flex-col gap-1.5">
                        <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <{{ $heading }} dir="auto" class="text-h2 text-foreground">{{ $identity['name'] ?? '' }}</{{ $heading }}>
                            @if (! empty($identity['version']))<bdi dir="ltr" class="font-mono text-caption text-muted-foreground">{{ $identity['version'] }}</bdi>@endif
                        </div>
                        @if (! empty($identity['kind']) || ! empty($identity['status']))
                            <div class="flex flex-wrap items-center gap-1.5">
                                @if (! empty($identity['kind']))<x-nq::badge variant="neutral">{{ $identity['kind'] }}</x-nq::badge>@endif
                                @if (! empty($identity['status']))<x-nq::badge :variant="$tone[$identity['status']['tone'] ?? 'neutral'] ?? 'neutral'">{{ $identity['status']['label'] }}</x-nq::badge>@endif
                            </div>
                        @endif
                        @if (! empty($identity['description']))<p dir="auto" class="max-w-prose text-body-sm text-muted-foreground">{{ $identity['description'] }}</p>@endif
                        @if (! empty($identity['slug']))<bdi dir="ltr" class="w-fit font-mono text-caption text-muted-foreground">{{ $identity['slug'] }}</bdi>@endif
                    </div>
                    @if ($activity)
                        <div data-slot="detail-activity" class="flex items-end gap-4 rounded-card border border-border bg-background px-4 py-3">
                            <div class="flex flex-col">
                                @if (! empty($activity['countLabel']))<span class="text-caption text-muted-foreground">{{ $activity['countLabel'] }}</span>@endif
                                @if ($count !== null)<x-nq::numeric :value="$count" compact :max-fraction="1" class="text-h3" title="{{ number_format($count) }}" />@endif
                                <span class="text-caption text-muted-foreground">
                                    <span class="sr-only">{{ $t['lastActive'] }}: </span>
                                    @if ($at)<x-nq::numeric.date-time :value="$at" relative />@else{{ $t['never'] }}@endif
                                </span>
                            </div>
                            @if ($series)<x-nq::chart.sparkline :data="$series" :color="'var(--nq-tag-'.$hue.')'" :label="$fill($t['activity'], ['name' => $identity['name'] ?? ''])" class="h-12 w-32" />@endif
                        </div>
                    @endif
                    @isset($actions)<div class="flex shrink-0 flex-wrap items-center gap-2">{{ $actions }}</div>@endisset
                </header>
            @endif
            <div id="{{ $panelId }}" data-slot="detail-content" class="min-w-0 flex-1 p-6">
                @if ($loading)<x-nq::states.loading :label="$t['loading']" />@else{{ $slot }}@endif
            </div>
        @endif
    </div>
</div>
