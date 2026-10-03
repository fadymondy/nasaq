{{-- <x-nq::trends-feed.sources-catalogue :sources="$sources" @nq-source-toggle="$event.detail.waitUntil(setEnabled($event.detail.id, $event.detail.enabled))" />
     The news sources in three tiers. Tier 1 feeds the trends while it has a working source; when it has none the feed falls back to tier 2, then tier 3,
     and the catalogue says so. Each source has a switch, its health and its last fetch, and its actions also open as a context menu (or the Ellipsis button).
     It stores nothing: it fires events on the root with detail.waitUntil(promise). A rejection puts the switch back and shows an error.
       nq-source-toggle  detail { id, enabled, waitUntil }
       nq-source-retry   detail { id, waitUntil }          offered for enabled sources that are not working
     sources: [['id', 'name', 'url', 'tier' => 1|2|3, 'enabled', 'health' => ok|degraded|down, 'lastFetchedAt', 'perDay']].
     togglable and retryable (both true) turn the switch and "Retry now" off. labels: override any string. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['sources' => [], 'togglable' => true, 'retryable' => true, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $ar = str_starts_with(app()->getLocale(), 'ar');
    $s = array_merge([
        'active' => $t::t('Active', 'نشط'),
        'noneWorking' => $t::t('No source is working, so no new topics will arrive.', 'لا يعمل أي مصدر، فلن تصل مواضيع جديدة.'),
        'lastFetched' => $t::t('Last fetched', 'آخر جلب'),
        'never' => $t::t('Never', 'لم يُجلب بعد'),
        'enable' => $t::t('Enable', 'تفعيل'),
        'disable' => $t::t('Disable', 'تعطيل'),
        'retry' => $t::t('Retry now', 'أعد المحاولة الآن'),
        'visit' => $t::t('Open the site', 'فتح الموقع'),
        'empty' => $t::t('No sources yet.', 'لا مصادر بعد.'),
        'toggleFailed' => $t::t('Could not change the source. Try again.', 'تعذّر تغيير المصدر. حاول مرة أخرى.'),
    ], (array) $labels);
    $tier = fn (int $n): string => $ar ? 'المستوى '.$n : 'Tier '.$n;
    $hints = [
        1 => $t::t('Primary sources. Preferred whenever one is working.', 'المصادر الأساسية. تُفضَّل متى عمل أحدها.'),
        2 => $t::t('Backup sources. Used when tier 1 has nothing working.', 'مصادر احتياطية. تُستخدم عندما لا يعمل شيء في المستوى 1.'),
        3 => $t::t('Last resort. Used when tiers 1 and 2 have nothing working.', 'الملاذ الأخير. يُستخدم عندما لا يعمل شيء في المستويين 1 و2.'),
    ];
    $health = [
        'ok' => ['variant' => 'success', 'icon' => 'circle-check', 'label' => $t::t('Working', 'يعمل')],
        'degraded' => ['variant' => 'warning', 'icon' => 'triangle-alert', 'label' => $t::t('Slow', 'بطيء')],
        'down' => ['variant' => 'danger', 'icon' => 'circle-x', 'label' => $t::t('Down', 'متوقف')],
    ];
    $moreFor = fn (string $name): string => $ar ? 'إجراءات '.$name : 'Actions for '.$name;
    $enabledLabel = fn (string $name): string => $ar ? 'تفعيل '.$name : $name.' enabled';
    $perDay = fn ($n): string => $ar ? number_format($n).' يوميًا' : number_format($n).' a day';
    $usable = fn ($x): bool => ! empty($x['enabled']) && $x['health'] !== 'down';

    $list = collect($sources)->values()->map(fn ($x, $n) => $x + ['_n' => $n])->all();
    // Tier 1 is preferred; when it has no usable source the feed falls back to tier 2, then tier 3. Empty tiers are not skipped.
    $activeTier = null;
    $skipped = [];
    foreach ([1, 2, 3] as $n) {
        $inTier = array_filter($list, fn ($x) => (int) $x['tier'] === $n);
        if (! $inTier) continue;
        if (array_filter($inTier, $usable)) { $activeTier = $n; break; }
        $skipped[] = $n;
    }
    $fellBack = $activeTier !== null && count($skipped) > 0;
    $fellBackText = $activeTier === null ? '' : ($ar
        ? 'لا يعمل أي مصدر في '.implode(', ', array_map($tier, $skipped)).'، لذا يُستخدم المستوى '.$activeTier.'.'
        : implode(', ', array_map($tier, $skipped)).' has no working source, so tier '.$activeTier.' is being used.');
    $config = [
        'sources' => array_map(fn ($x) => ['id' => (string) $x['id'], 'enabled' => (bool) $x['enabled'], 'url' => $x['url'] ?? null], $list),
        'failed' => $s['toggleFailed'],
    ];
@endphp
<section data-slot="sources-catalogue" x-data="nqSourcesCatalogue(@js($config))" {{ $attributes->cn('flex flex-col gap-4') }}>
    @if ($activeTier === null && count($list))
        <p role="status" class="flex items-center gap-2 rounded-control border border-nq-danger/40 bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">
            <x-lucide-circle-x aria-hidden="true" class="size-4 shrink-0" />
            {{ $s['noneWorking'] }}
        </p>
    @elseif ($fellBack)
        <p role="status" class="flex items-center gap-2 rounded-control border border-nq-warning/40 bg-nq-warning-soft px-3 py-2 text-body-sm text-nq-warning-text">
            <x-lucide-triangle-alert aria-hidden="true" class="size-4 shrink-0" />
            {{ $fellBackText }}
        </p>
    @endif
    @if (! count($list))
        <x-nq::states.empty :title="$s['empty']" />
    @endif
    @foreach ([1, 2, 3] as $n)
        @php $inTier = array_values(array_filter($list, fn ($x) => (int) $x['tier'] === $n)); @endphp
        @if (count($inTier))
            <div class="flex flex-col gap-2">
                <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-label font-medium">{{ $tier($n) }}</h3>
                    @if ($activeTier === $n)
                        <x-nq::badge variant="success"><x-lucide-circle-check aria-hidden="true" />{{ $s['active'] }}</x-nq::badge>
                    @endif
                    <p class="text-caption text-muted-foreground">{{ $hints[$n] }}</p>
                </div>
                <ul class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
                    @foreach ($inTier as $x)
                        @php
                            $i = $x['_n'];
                            $h = $health[$x['health']] ?? $health['ok'];
                            $canRetry = $retryable && ! empty($x['enabled']) && $x['health'] !== 'ok';
                            $hasMenu = $togglable || $canRetry || ! empty($x['url']);
                        @endphp
                        <li class="min-w-0">
                            <x-nq::context-menu>
                                <x-nq::context-menu.trigger class="{{ \Nasaq\Cn::merge('flex flex-wrap items-center gap-3 px-4 py-3', $usable($x) ? '' : 'opacity-90') }}">
                                    @if ($togglable)
                                        <x-nq::switch :checked="(bool) $x['enabled']" x-model="enabled[{{ $i }}]" aria-label="{{ $enabledLabel($x['name']) }}"
                                            x-bind:disabled="isBusy({{ $i }}) ? '' : null" x-bind:data-disabled="isBusy({{ $i }}) ? '' : null" />
                                    @else
                                        <x-nq::switch :checked="(bool) $x['enabled']" aria-label="{{ $enabledLabel($x['name']) }}" disabled />
                                    @endif
                                    <div class="min-w-0 flex-1">
                                        <p class="truncate text-body font-medium">{{ $x['name'] }}</p>
                                        <p class="text-caption text-muted-foreground">
                                            {{ $s['lastFetched'] }}: @if (! empty($x['lastFetchedAt']))<x-nq::numeric.date-time :value="$x['lastFetchedAt']" relative />@else{{ $s['never'] }}@endif
                                            @if (isset($x['perDay'])) · {{ $perDay($x['perDay']) }}@endif
                                        </p>
                                        <p role="alert" class="text-caption text-nq-danger-text" x-show="failed[{{ $i }}]" style="display: none" x-text="failed[{{ $i }}]"></p>
                                    </div>
                                    <x-nq::badge :variant="$h['variant']"><x-dynamic-component :component="'lucide-'.$h['icon']" aria-hidden="true" />{{ $h['label'] }}</x-nq::badge>
                                    @if ($hasMenu)
                                        <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $moreFor($x['name']) }}" x-on:click="menuAt($el)"><x-lucide-ellipsis aria-hidden="true" /></x-nq::button>
                                    @endif
                                </x-nq::context-menu.trigger>
                                @if ($hasMenu)
                                    <x-nq::context-menu.content>
                                        @if ($togglable)
                                            <x-nq::context-menu.item x-on:click="toggle({{ $i }})">{{ ! empty($x['enabled']) ? $s['disable'] : $s['enable'] }}</x-nq::context-menu.item>
                                        @endif
                                        @if ($canRetry)
                                            <x-nq::context-menu.item x-on:click="retry({{ $i }})">{{ $s['retry'] }}</x-nq::context-menu.item>
                                        @endif
                                        @if (! empty($x['url']))
                                            @if ($togglable || $canRetry)<x-nq::context-menu.separator />@endif
                                            <x-nq::context-menu.item x-on:click="visit({{ $i }})">{{ $s['visit'] }}</x-nq::context-menu.item>
                                        @endif
                                    </x-nq::context-menu.content>
                                @endif
                            </x-nq::context-menu>
                        </li>
                    @endforeach
                </ul>
            </div>
        @endif
    @endforeach
</section>
