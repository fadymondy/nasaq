{{-- <x-nq::catalog-store :items="$items" :categories="$categories" />
     A store for installable things (plugins, apps, workflow steps): search, category chips, sort, a grid of cards and a detail sheet with the install action.
     items: arrays of ['id', 'name', 'summary', 'category' (a category id)] plus optional 'description', 'icon' (a lucide name, default package), 'publisher', 'version', 'badge', 'installs', 'rating', 'ratingCount',
       'price' => ['amount' => 9, 'currency' => 'USD', 'period' => 'month'] (omit or 0 for free), 'tags', 'installed', 'updatedAt', 'details' => [['label' => 'Inputs', 'value' => '1 item']].
     categories: ['id', 'label', 'icon' (a lucide name)]. default-sort: popular (default) | newest | name. labels: overrides for the built-in strings (templates take :n and :p).
     Everything is server-rendered; Alpine filters, sorts and counts in the browser. Install and uninstall fire the bubbling `nq-install` / `nq-uninstall` ({ id, item, wait(promise) }): call
     event.detail.wait(promise) to keep the button busy until it settles; resolve to ['error' => 'why'] (an object { error }) to show a failure. Without wait the change shows at once. `nq-open` ({ id }) is the "Open" action.
     select: cards fire `nq-select` ({ id }) instead of opening the sheet (a detail page of your own). uninstallable: false hides the Uninstall button (default true).
     detail: a closure fn (array $item) => HtmlString|string for extra sheet content. <x-slot:toolbarStart> holds controls after the search box.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'categories' => [], 'defaultSort' => 'popular', 'labels' => [], 'select' => false, 'uninstallable' => true, 'detail' => null, 'toolbarStart' => null])
@include('nasaq::components.catalog-store._strings')
@php
    $locale = app()->getLocale();
    $t = nq_catalog_labels((array) $labels, $locale);
    $items = array_values((array) $items);
    $categories = array_values((array) $categories);
    $defaultSort = in_array($defaultSort, ['popular', 'newest', 'name'], true) ? $defaultSort : 'popular';
    $time = fn ($v) => $v === null ? 0 : (int) (($v instanceof \DateTimeInterface ? $v->getTimestamp() : (is_numeric($v) ? $v / 1000 : strtotime((string) $v))) * 1000);
    $byName = fn ($a, $b) => strcmp((string) $a['name'], (string) $b['name']);
    $ordered = $items;
    usort($ordered, match ($defaultSort) {
        'name' => $byName,
        'newest' => fn ($a, $b) => $time($b['updatedAt'] ?? null) <=> $time($a['updatedAt'] ?? null) ?: $byName($a, $b),
        default => fn ($a, $b) => ($b['installs'] ?? 0) <=> ($a['installs'] ?? 0) ?: $byName($a, $b),
    });
    $rows = array_map(fn ($i) => [
        'id' => (string) $i['id'], 'name' => $i['name'], 'summary' => $i['summary'], 'description' => $i['description'] ?? '', 'category' => $i['category'],
        'publisher' => $i['publisher'] ?? '', 'tags' => array_values($i['tags'] ?? []), 'installs' => $i['installs'] ?? 0,
        'updatedAt' => $time($i['updatedAt'] ?? null), 'installed' => (bool) ($i['installed'] ?? false),
    ], $items);
    $counts = ['all' => count($items)];
    foreach ($items as $i) {
        $counts[$i['category']] = ($counts[$i['category']] ?? 0) + 1;
    }
    $installedCount = count(array_filter($items, fn ($i) => ! empty($i['installed'])));
    $options = ['items' => $rows, 'sort' => $defaultSort, 'select' => (bool) $select, 'results' => $t['results']];
    $hasToolbar = $toolbarStart && ! $toolbarStart->isEmpty();
    $chipCount = 'text-caption tabular-nums opacity-70';
@endphp
<div data-slot="catalog-store" x-data="nqCatalogStore({{ \Illuminate\Support\Js::from($options) }})" {{ $attributes->cn('flex min-w-0 flex-col gap-4') }}>
    <div class="flex flex-wrap items-center gap-2">
        <div class="relative min-w-48 flex-1 sm:max-w-sm">
            <x-lucide-search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <x-nq::field.input type="search" x-model="query" placeholder="{{ $t['search'] }}" aria-label="{{ $t['search'] }}" class="ps-8" />
        </div>
        @if ($hasToolbar){{ $toolbarStart }}@endif
        <x-nq::toggle-group :default-value="[$defaultSort]" x-model="sortSel" aria-label="{{ $t['sort'] }}" class="ms-auto">
            <x-nq::toggle-group.toggle value="popular">{{ $t['sortPopular'] }}</x-nq::toggle-group.toggle>
            <x-nq::toggle-group.toggle value="newest">{{ $t['sortNewest'] }}</x-nq::toggle-group.toggle>
            <x-nq::toggle-group.toggle value="name">{{ $t['sortName'] }}</x-nq::toggle-group.toggle>
        </x-nq::toggle-group>
    </div>
    <x-nq::chip-group default-value="all" x-model="category" aria-label="{{ $t['categories'] }}">
        <x-nq::chip-group.chip value="all">{{ $t['all'] }} <bdi class="{{ $chipCount }}" x-text="count('all')">{{ $counts['all'] }}</bdi></x-nq::chip-group.chip>
        @foreach ($categories as $c)
            <x-nq::chip-group.chip :value="$c['id']">
                @if (! empty($c['icon']))<x-dynamic-component :component="'lucide-'.$c['icon']" aria-hidden="true" />@endif
                {{ $c['label'] }} <bdi class="{{ $chipCount }}" x-text="count('{{ $c['id'] }}')">{{ $counts[$c['id']] ?? 0 }}</bdi>
            </x-nq::chip-group.chip>
        @endforeach
        <x-nq::chip-group.chip value="installed">{{ $t['installed'] }} <bdi class="{{ $chipCount }}" x-text="installedCount">{{ $installedCount }}</bdi></x-nq::chip-group.chip>
    </x-nq::chip-group>
    <p class="sr-only" role="status" x-text="resultsText">{{ str_replace(':n', (string) count($items), $t['results']) }}</p>

    <x-nq::states x-show="listed.length === 0" style="display: none" :title="$t['emptyTitle']" :description="$t['emptyBody']">
        <x-slot:actions><x-nq::button variant="secondary" x-show="query || category !== 'all'" x-on:click="clear()">{{ $t['clear'] }}</x-nq::button></x-slot:actions>
    </x-nq::states>
    <ul x-ref="grid" class="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
        @foreach ($ordered as $item)
            <li class="min-w-0" data-id="{{ $item['id'] }}" x-show="visible('{{ $item['id'] }}')">
                <x-nq::catalog-store.card :item="$item" :installed="! empty($item['installed'])" :labels="(array) $labels" />
            </li>
        @endforeach
    </ul>

    <x-nq::sheet x-model="detailOpen">
        <x-nq::sheet.content class="w-full sm:max-w-md">
            @foreach ($items as $item)
                @php
                    $price = $item['price'] ?? null;
                    $free = empty($price) || (float) ($price['amount'] ?? 0) === 0.0;
                    $extra = is_callable($detail) ? $detail($item) : null;
                @endphp
                <template x-if="detailId === '{{ $item['id'] }}'">
                    <div class="contents" data-slot="catalog-detail" data-item="{{ $item['id'] }}">
                        <x-nq::sheet.header>
                            <div class="flex items-start gap-3">
                                <x-nq::catalog-store.icon :icon="$item['icon'] ?? null" class="size-12" />
                                <div class="min-w-0">
                                    <x-nq::sheet.title class="text-h3">{{ $item['name'] }}</x-nq::sheet.title>
                                    <x-nq::sheet.description>
                                        {{ ! empty($item['publisher']) ? str_replace(':p', $item['publisher'], $t['by']) : $item['summary'] }}
                                        @if (! empty($item['version']))· <bdi>v{{ $item['version'] }}</bdi>@endif
                                    </x-nq::sheet.description>
                                </div>
                            </div>
                            <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                @if (! empty($item['badge']))<x-nq::badge variant="outline">{{ $item['badge'] }}</x-nq::badge>@endif
                                @if (isset($item['rating']))<x-nq::rating :value="$item['rating']" :count="$item['ratingCount'] ?? null" />@endif
                                @if (isset($item['installs']))<span class="text-caption text-muted-foreground"><bdi>{{ nq_catalog_compact($item['installs']) }}</bdi> {{ $t['installs'] }}</span>@endif
                                @if (! $free)
                                    <x-nq::price :amount="$price['amount']" :currency="$price['currency'] ?? null" :period="$price['period'] ?? 'once'" size="sm" />
                                @else
                                    <span class="text-caption text-muted-foreground">{{ $t['free'] }}</span>
                                @endif
                            </div>
                        </x-nq::sheet.header>
                        <x-nq::sheet.body class="flex flex-col gap-5 p-4">
                            <section class="flex flex-col gap-1.5">
                                <h4 class="eyebrow">{{ $t['about'] }}</h4>
                                <p class="text-body-sm text-foreground">{{ $item['description'] ?? $item['summary'] }}</p>
                            </section>
                            @if ($extra){{ $extra }}@endif
                            @if (! empty($item['details']) || isset($item['updatedAt']))
                                <section class="flex flex-col gap-1.5">
                                    <h4 class="eyebrow">{{ $t['details'] }}</h4>
                                    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
                                        @foreach ($item['details'] ?? [] as $d)
                                            <div class="col-span-2 grid grid-cols-subgrid">
                                                <dt class="text-muted-foreground">{{ $d['label'] }}</dt>
                                                <dd class="text-foreground">{{ $d['value'] }}</dd>
                                            </div>
                                        @endforeach
                                        @if (isset($item['updatedAt']))
                                            <div class="col-span-2 grid grid-cols-subgrid">
                                                <dt class="text-muted-foreground">{{ $t['updated'] }}</dt>
                                                <dd class="text-foreground"><x-nq::numeric.date-time :value="$item['updatedAt']" /></dd>
                                            </div>
                                        @endif
                                    </dl>
                                </section>
                            @endif
                            @if (! empty($item['tags']))
                                <section class="flex flex-col gap-1.5">
                                    <h4 class="eyebrow">{{ $t['tags'] }}</h4>
                                    <div class="flex flex-wrap gap-1.5">
                                        @foreach ($item['tags'] as $tag)<x-nq::badge variant="neutral">{{ $tag }}</x-nq::badge>@endforeach
                                    </div>
                                </section>
                            @endif
                        </x-nq::sheet.body>
                        <x-nq::sheet.footer class="flex-wrap">
                            <p role="alert" class="w-full text-body-sm text-nq-danger-text" x-show="error && error.id === '{{ $item['id'] }}'" style="display: none" x-text="error ? error.message : ''"></p>
                            <x-nq::catalog-store.install :id="$item['id']" :name="$item['name']" :free="$free" :installed="! empty($item['installed'])" variant="primary" size="md" />
                            @if ($uninstallable)
                                <x-nq::button variant="ghost" x-show="installed('{{ $item['id'] }}')" style="display: none"
                                    x-bind:disabled="busyOf('{{ $item['id'] }}') === 'uninstall'" x-bind:aria-busy="busyOf('{{ $item['id'] }}') === 'uninstall' ? 'true' : null"
                                    x-on:click="uninstall('{{ $item['id'] }}')"><span x-text="busyOf('{{ $item['id'] }}') === 'uninstall' ? @js($t['uninstalling']) : @js($t['uninstall'])">{{ $t['uninstall'] }}</span></x-nq::button>
                            @else
                                <span class="text-caption text-muted-foreground" x-show="installed('{{ $item['id'] }}')" style="display: none">{{ $t['installedNote'] }}</span>
                            @endif
                        </x-nq::sheet.footer>
                    </div>
                </template>
            @endforeach
        </x-nq::sheet.content>
    </x-nq::sheet>
</div>
