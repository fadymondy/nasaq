{{-- <x-nq::plugin-card :plugin="['id' => 'postgres', 'name' => 'Postgres', 'kind' => 'source', 'icon' => 'database', 'hue' => 'blue', 'enabled' => true, 'lastActiveAt' => $at, 'count' => 128430, 'countLabel' => 'records', 'series' => [4, 6, 9]]" detail-href="/plugins/postgres" />
     A plugin in a catalogue or admin grid: icon, name, version, kind, enabled state and last activity, a description, a headline count with a sparkline, and Page and Details actions.
     plugin: id, name, description, kind (source, capability, ai_provider, tool ... translated when known), version, icon (a lucide or Boxicons name, or an image URL), hue (a tag hue, default gray),
       enabled (false shows Disabled; omit to show nothing), lastActiveAt (DateTime, timestamp or string; null = no activity), count, countLabel, series (oldest first), slug (default id).
     selectable shows a checkbox; clicking the card toggles it and a long press on touch selects it. selected is x-modelable: x-model="picked" or wire:model; it also fires nq-change { selected }.
     detail-href / page-href: links. detail-click / page-click: an Alpine expression (no apostrophes) for a button instead. heading-as: tag (default h3). now: the "current" time for the activity bucket (default now).
     labels: array overriding the words. Slots: icon (replaces the icon), badges (after kind and status), actions (before Page and Details). --}}
@props(['plugin', 'selectable' => false, 'selected' => false, 'detailHref' => null, 'detailClick' => null, 'pageHref' => null, 'pageClick' => null, 'headingAs' => 'h3', 'now' => null, 'labels' => []])
@php
    $strings = [
        'en' => [
            'enabled' => 'Enabled', 'disabled' => 'Disabled', 'never' => 'No activity', 'lastActive' => 'Last active', 'details' => 'Details', 'page' => 'Page',
            'openDetails' => 'Open {name} details', 'openPage' => 'Open {name} page', 'select' => 'Select {name}', 'noDescription' => 'No description.', 'activity' => '{name} activity',
            'kinds' => ['capability' => 'Capability', 'source' => 'Source', 'ai_provider' => 'AI provider', 'pipeline' => 'Pipeline', 'enrichment' => 'Enrichment', 'copilot' => 'Copilot', 'tool' => 'Tool', 'skill' => 'Skill', 'agent' => 'Agent', 'mcp' => 'MCP', 'memory' => 'Memory', 'persona' => 'Persona', 'core' => 'Core', 'system' => 'System'],
        ],
        'ar' => [
            'enabled' => 'مفعّلة', 'disabled' => 'معطّلة', 'never' => 'لا نشاط', 'lastActive' => 'آخر نشاط', 'details' => 'التفاصيل', 'page' => 'الصفحة',
            'openDetails' => 'فتح تفاصيل {name}', 'openPage' => 'فتح صفحة {name}', 'select' => 'تحديد {name}', 'noDescription' => 'لا يوجد وصف.', 'activity' => 'نشاط {name}',
            'kinds' => ['capability' => 'قدرة', 'source' => 'مصدر', 'ai_provider' => 'مزوّد ذكاء', 'pipeline' => 'خط معالجة', 'enrichment' => 'إثراء', 'copilot' => 'مساعد', 'tool' => 'أداة', 'skill' => 'مهارة', 'agent' => 'وكيل', 'mcp' => 'MCP', 'memory' => 'ذاكرة', 'persona' => 'شخصية', 'core' => 'أساس', 'system' => 'نظام'],
        ],
    ];
    $base = $strings[\Nasaq\Nasaq::rtl() ? 'ar' : 'en'];
    $t = array_merge($base, $labels, ['kinds' => array_merge($base['kinds'], $labels['kinds'] ?? [])]);
    $fill = fn (string $text, array $values) => preg_replace_callback('/\{(\w+)\}/', fn ($m) => $values[$m[1]] ?? '', $text);

    $name = (string) ($plugin['name'] ?? '');
    $id = (string) ($plugin['id'] ?? '');
    $kind = ! empty($plugin['kind']) ? ($t['kinds'][$plugin['kind']] ?? (($w = trim(preg_replace('/[_-]+/', ' ', $plugin['kind']))) === '' ? '' : mb_strtoupper(mb_substr($w, 0, 1)).mb_substr($w, 1))) : null;
    $hue = $plugin['hue'] ?? 'gray';
    $series = ! empty($plugin['series']) ? array_values($plugin['series']) : null;
    $count = $plugin['count'] ?? null;
    $enabled = $plugin['enabled'] ?? null;
    $titleId = 'nq-plugin-'.substr(md5($id.$name), 0, 8);

    // Activity bucket: within the hour (live), within the day (recent), longer ago (idle), or never. Numbers over 1e11 are milliseconds.
    $at = $plugin['lastActiveAt'] ?? null;
    if ($at instanceof \DateTimeInterface) {
        $at = \Carbon\Carbon::instance($at);
    } elseif (is_numeric($at)) {
        $at = \Carbon\Carbon::createFromTimestamp($at > 1e11 ? $at / 1000 : $at);
    } elseif (is_string($at) && trim($at) !== '') {
        try { $at = \Carbon\Carbon::parse($at); } catch (\Throwable) { $at = null; }
    } else {
        $at = null;
    }
    $nowAt = $now === null ? \Carbon\Carbon::now() : ($now instanceof \DateTimeInterface ? \Carbon\Carbon::instance($now) : \Carbon\Carbon::createFromTimestamp($now > 1e11 ? $now / 1000 : $now));
    $minutes = $at ? max(0, $nowAt->getTimestamp() - $at->getTimestamp()) / 60 : null;
    $activity = $minutes === null ? 'never' : ($minutes <= 60 ? 'live' : ($minutes <= 24 * 60 ? 'recent' : 'idle'));
    $activityBadge = ['live' => 'success', 'recent' => 'warning', 'idle' => 'outline', 'never' => 'outline'][$activity];
    $dot = ['live' => 'bg-nq-success', 'recent' => 'bg-nq-warning'][$activity] ?? 'bg-muted-foreground';
    $selectable = (bool) $selectable;
    $selected = (bool) $selected;
    $heading = preg_match('/^[a-z][a-z0-9]*$/i', (string) $headingAs) ? $headingAs : 'h3';
@endphp
<article data-slot="{{ $attributes->get('data-slot', 'plugin-card') }}" aria-labelledby="{{ $titleId }}" data-activity="{{ $activity }}"
    @if ($selectable) x-data="nqPluginCard(@js($selected))" x-modelable="selected" x-bind="root" @endif
    @if ($selected) data-selected="true" @endif
    {{ $attributes->except('data-slot')->cn([
        'flex h-full flex-col rounded-card border bg-card transition-colors duration-150 ease-nq',
        $selected ? 'border-primary bg-nq-selected' : 'border-border',
        'cursor-pointer select-none hover:border-nq-line-strong' => $selectable,
    ]) }}>
    <div class="flex flex-1 flex-col gap-3 p-4">
        <div class="flex items-start gap-3">
            @if ($selectable)<x-nq::checkbox :checked="$selected" x-model="selected" aria-label="{{ $fill($t['select'], ['name' => $name]) }}" class="mt-0.5" />@endif
            <span aria-hidden="true" data-slot="plugin-card-icon" class="flex size-11 shrink-0 items-center justify-center rounded-control bg-[var(--tile-soft)] text-[var(--tile-solid)]" style="--tile-solid: var(--nq-tag-{{ $hue }}); --tile-soft: var(--nq-tag-{{ $hue }}-soft)">
                @if (isset($icon) && ! $icon->isEmpty()){{ $icon }}
                @elseif (is_string($plugin['icon'] ?? null))<x-nq::icon-picker.by-name :name="$plugin['icon']" class="size-5"><x-nq::icon name="puzzle" aria-hidden="true" class="size-5" /></x-nq::icon-picker.by-name>
                @else<x-nq::icon name="puzzle" aria-hidden="true" class="size-5" />@endif
            </span>
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex min-w-0 items-baseline gap-2">
                        <{{ $heading }} id="{{ $titleId }}" dir="auto" class="truncate text-label text-foreground" title="{{ $name }}">{{ $name }}</{{ $heading }}>
                        @if (! empty($plugin['version']))<bdi dir="ltr" class="shrink-0 font-mono text-caption text-muted-foreground">{{ $plugin['version'] }}</bdi>@endif
                    </div>
                    <x-nq::badge :variant="$activityBadge" class="shrink-0" data-slot="plugin-card-activity">
                        <span aria-hidden="true" class="size-1.5 rounded-full {{ $dot }}"></span>
                        <span class="sr-only">{{ $t['lastActive'] }}: </span>
                        @if ($at){{-- --}}<x-nq::numeric.date-time :value="$at" relative />@else{{ $t['never'] }}@endif
                    </x-nq::badge>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                    @if ($kind)<x-nq::badge variant="neutral">{{ $kind }}</x-nq::badge>@endif
                    @if ($enabled === true)<x-nq::badge variant="success">{{ $t['enabled'] }}</x-nq::badge>
                    @elseif ($enabled === false)<x-nq::badge variant="outline">{{ $t['disabled'] }}</x-nq::badge>@endif
                    @isset($badges){{ $badges }}@endisset
                </div>
            </div>
        </div>
        <p dir="auto" class="line-clamp-2 text-body-sm {{ ! empty($plugin['description']) ? 'text-muted-foreground' : 'text-muted-foreground/70 italic' }}">{{ ! empty($plugin['description']) ? $plugin['description'] : $t['noDescription'] }}</p>
    </div>
    @if ($count !== null || $series)
        <div data-slot="plugin-card-metric" class="flex items-end justify-between gap-3 border-t border-border bg-secondary/40 px-4 py-3">
            <div class="flex min-w-0 flex-col">
                @if (! empty($plugin['countLabel']))<span class="truncate text-caption text-muted-foreground">{{ $plugin['countLabel'] }}</span>@endif
                @if ($count !== null)<x-nq::numeric :value="$count" compact :max-fraction="1" class="text-h3" title="{{ number_format($count) }}" />@endif
            </div>
            @if ($series)<x-nq::chart.sparkline :data="$series" :color="'var(--nq-tag-'.$hue.')'" :label="$fill($t['activity'], ['name' => $name])" class="h-10 w-28" />@endif
        </div>
    @endif
    <footer class="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <bdi dir="ltr" class="min-w-0 truncate font-mono text-caption text-muted-foreground" title="{{ $plugin['slug'] ?? $id }}">{{ $plugin['slug'] ?? $id }}</bdi>
        <div class="flex shrink-0 items-center gap-1">
            @isset($actions){{ $actions }}@endisset
            @if ($pageHref)
                <x-nq::button variant="ghost" size="sm" :href="$pageHref" aria-label="{{ $fill($t['openPage'], ['name' => $name]) }}"><x-lucide-external-link aria-hidden="true" />{{ $t['page'] }}</x-nq::button>
            @elseif ($pageClick)
                <x-nq::button variant="ghost" size="sm" aria-label="{{ $fill($t['openPage'], ['name' => $name]) }}" x-on:click="{{ $pageClick }}"><x-lucide-external-link aria-hidden="true" />{{ $t['page'] }}</x-nq::button>
            @endif
            @if ($detailHref)
                <x-nq::button variant="ghost" size="sm" :href="$detailHref" aria-label="{{ $fill($t['openDetails'], ['name' => $name]) }}"><x-lucide-settings-2 aria-hidden="true" />{{ $t['details'] }}</x-nq::button>
            @elseif ($detailClick)
                <x-nq::button variant="ghost" size="sm" aria-label="{{ $fill($t['openDetails'], ['name' => $name]) }}" x-on:click="{{ $detailClick }}"><x-lucide-settings-2 aria-hidden="true" />{{ $t['details'] }}</x-nq::button>
            @endif
        </div>
    </footer>
</article>
