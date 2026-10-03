{{-- <x-nq::marketplace.detail :listing="$listing" back />
     An extension page: install header, tabs for overview (with screenshots), changelog and reviews, and a side column with details, permissions, links and tags.
     listing: ['id', 'name', 'summary', 'category'] plus optional 'description' (paragraphs split on a blank line), 'icon' (a lucide name), 'publisher', 'version', 'badge', 'installs', 'rating', 'ratingCount',
       'price' => ['amount', 'currency', 'period'], 'installed', 'updatedAt', 'compatibility', 'size', 'license', 'permissions' => [['id', 'label', 'description', 'risk']], 'screenshots' => [['src', 'alt']],
       'changelog' => [['version', 'date', 'notes' => []]], 'reviews' => [['id', 'author', 'rating', 'date', 'body']], 'links' => [['label', 'href']], 'tags'.
     back: shows the back link (it fires `nq-back`). state: force the install state (available | installing | installed). uninstallable: false hides Uninstall. labels: overrides for the built-in strings.
     Install and uninstall fire the bubbling `nq-install` / `nq-uninstall` ({ id, item, wait(promise) }): call event.detail.wait(promise) to keep the button busy until it settles; resolve to ['error' => 'why'] (an object { error })
     to show a failure. Without wait the change shows at once. `nq-open` ({ id }) is the "Open" action. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['listing', 'back' => false, 'state' => null, 'uninstallable' => true, 'labels' => []])
@include('nasaq::components.marketplace._strings')
@include('nasaq::components.catalog-store._strings')
@php
    $t = nq_marketplace_labels((array) $labels);
    $l = $listing;
    $id = (string) $l['id'];
    $price = $l['price'] ?? null;
    $free = empty($price) || (float) ($price['amount'] ?? 0) === 0.0;
    $perms = array_values($l['permissions'] ?? []);
    $risk = nq_marketplace_risk($perms);
    $paragraphs = explode("\n\n", (string) ($l['description'] ?? $l['summary']));
    $installed = ! empty($l['installed']);
    $current = $state ?? ($installed ? 'installed' : 'available');
    $reviews = array_values($l['reviews'] ?? []);
    $options = ['id' => $id, 'name' => $l['name'], 'installed' => $installed, 'state' => $state, 'failed' => $t['failed']];
    $rtl = \Nasaq\Nasaq::rtl();
    $installLabel = $free ? \Nasaq\Nasaq::t('Get', 'احصل عليه') : $t['install'];
    $by = fn ($p) => str_replace(':p', $p, $t['by']);
@endphp
<div data-slot="marketplace-detail" data-listing="{{ $id }}" x-data="nqMarketplaceDetail({!! \Illuminate\Support\Js::from($options) !!})" {{ $attributes->cn('flex min-w-0 flex-col gap-5') }}>
    @if ($back)
        <div>
            <x-nq::button variant="ghost" size="sm" x-on:click="goBack()">
                @if ($rtl)<x-lucide-arrow-right aria-hidden="true" />@else<x-lucide-arrow-left aria-hidden="true" />@endif
                {{ $t['back'] }}
            </x-nq::button>
        </div>
    @endif
    <header class="flex flex-wrap items-start gap-4">
        <x-nq::catalog-store.icon :icon="$l['icon'] ?? null" class="size-16 [&_svg]:size-8" />
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-title-lg text-foreground">{{ $l['name'] }}</h1>
                @if (! empty($l['badge']))<x-nq::badge variant="outline">{{ $l['badge'] }}</x-nq::badge>@endif
            </div>
            <p dir="auto" class="text-body text-muted-foreground">{{ $l['summary'] }}</p>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
                @if (! empty($l['publisher']))<span>{{ $by($l['publisher']) }}</span>@endif
                @if (isset($l['rating']))<x-nq::rating :value="$l['rating']" :count="$l['ratingCount'] ?? null" />@endif
                @if (isset($l['installs']))<span><bdi>{{ nq_catalog_compact($l['installs']) }}</bdi> {{ $t['installs'] }}</span>@endif
                @if ($free)
                    <span>{{ $t['free'] }}</span>
                @else
                    <x-nq::price :amount="$price['amount']" :currency="$price['currency'] ?? null" :period="$price['period'] ?? 'once'" size="sm" />
                @endif
            </div>
        </div>
        <div class="flex flex-col items-stretch gap-2 max-sm:w-full sm:items-end">
            <div class="flex flex-wrap items-center gap-2">
                @if ($state === null)
                    <x-nq::button data-slot="install-button" data-state="{{ $current }}" variant="primary" size="lg" aria-label="{{ $installLabel }} {{ $l['name'] }}"
                        :style="$installed ? 'display: none' : null"
                        x-show="!installed"
                        x-bind:data-state="current"
                        x-bind:disabled="busy === 'install'"
                        x-bind:aria-busy="busy === 'install' ? 'true' : null"
                        x-on:click="install()">{{ $installLabel }}</x-nq::button>
                    <x-nq::button data-slot="install-button" data-state="installed" variant="ghost" size="lg" aria-label="{{ \Nasaq\Nasaq::t('Open', 'فتح') }} {{ $l['name'] }}"
                        :style="! $installed ? 'display: none' : null"
                        x-show="installed"
                        x-on:click="openApp()"><x-lucide-check aria-hidden="true" class="text-nq-success-text" />{{ \Nasaq\Nasaq::t('Open', 'فتح') }}</x-nq::button>
                @else
                    <x-nq::button data-slot="install-button" data-state="{{ $state }}" variant="primary" size="lg" aria-label="{{ $installLabel }} {{ $l['name'] }}" x-on:click="install()">{{ $state === 'installed' ? \Nasaq\Nasaq::t('Open', 'فتح') : $installLabel }}</x-nq::button>
                @endif
                @if ($uninstallable)
                    <x-nq::button variant="ghost" size="lg" :style="! $installed ? 'display: none' : null" x-show="installed"
                        x-bind:disabled="busy === 'uninstall'" x-bind:aria-busy="busy === 'uninstall' ? 'true' : null"
                        x-on:click="uninstall()"><span x-text="busy === 'uninstall' ? @js($t['uninstalling']) : @js($t['uninstall'])">{{ $t['uninstall'] }}</span></x-nq::button>
                @endif
            </div>
            <p role="alert" class="text-caption text-nq-danger-text" x-show="error" style="display: none" x-text="error"></p>
        </div>
    </header>

    <div class="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <x-nq::tabs default-value="overview" class="min-w-0">
            <x-nq::tabs.list variant="underline">
                <x-nq::tabs.tab value="overview">{{ $t['overview'] }}</x-nq::tabs.tab>
                <x-nq::tabs.tab value="changelog">{{ $t['changelog'] }}</x-nq::tabs.tab>
                <x-nq::tabs.tab value="reviews">
                    {{ $t['reviews'] }}
                    @if (count($reviews))<bdi class="text-caption tabular-nums opacity-70">{{ count($reviews) }}</bdi>@endif
                </x-nq::tabs.tab>
                <x-nq::tabs.indicator />
            </x-nq::tabs.list>
            <x-nq::tabs.panel value="overview" class="flex flex-col gap-5">
                @foreach ($paragraphs as $para)
                    <p dir="auto" class="text-body text-foreground">{{ $para }}</p>
                @endforeach
                @if (! empty($l['screenshots']))
                    <section class="flex flex-col gap-2" aria-label="{{ $t['screenshots'] }}">
                        <h2 class="eyebrow">{{ $t['screenshots'] }}</h2>
                        <ul class="grid gap-3 sm:grid-cols-2">
                            @foreach ($l['screenshots'] as $s)
                                <li class="overflow-hidden rounded-card border border-border bg-muted"><img src="{{ $s['src'] }}" alt="{{ $s['alt'] ?? '' }}" class="block h-auto w-full" /></li>
                            @endforeach
                        </ul>
                    </section>
                @endif
            </x-nq::tabs.panel>
            <x-nq::tabs.panel value="changelog">
                @if (! empty($l['changelog']))
                    <ol class="flex flex-col gap-4">
                        @foreach ($l['changelog'] as $r)
                            <li class="flex flex-col gap-1.5 rounded-card border border-border bg-card p-4">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="text-label text-foreground"><bdi dir="ltr">v{{ $r['version'] }}</bdi></span>
                                    <span class="text-caption text-muted-foreground"><x-nq::numeric.date-time :value="$r['date']" /></span>
                                </div>
                                <ul class="list-disc ps-5 text-body-sm text-foreground">
                                    @foreach ($r['notes'] ?? [] as $n)<li dir="auto">{{ $n }}</li>@endforeach
                                </ul>
                            </li>
                        @endforeach
                    </ol>
                @else
                    <p class="text-body-sm text-muted-foreground">{{ $t['noChangelog'] }}</p>
                @endif
            </x-nq::tabs.panel>
            <x-nq::tabs.panel value="reviews">
                @if (count($reviews))
                    <ul class="flex flex-col gap-3">
                        @foreach ($reviews as $r)
                            <li class="flex flex-col gap-1.5 rounded-card border border-border bg-card p-4">
                                <div class="flex items-center gap-2">
                                    <x-nq::avatar :name="$r['author']" size="sm" />
                                    <span class="text-label text-foreground">{{ $r['author'] }}</span>
                                    <x-nq::rating :value="$r['rating']" class="ms-auto" />
                                </div>
                                <p dir="auto" class="text-body-sm text-foreground">{{ $r['body'] }}</p>
                                <span class="text-caption text-muted-foreground"><x-nq::numeric.date-time :value="$r['date']" relative /></span>
                            </li>
                        @endforeach
                    </ul>
                @else
                    <p class="text-body-sm text-muted-foreground">{{ $t['noReviews'] }}</p>
                @endif
            </x-nq::tabs.panel>
        </x-nq::tabs>

        <aside class="flex min-w-0 flex-col gap-5 self-start">
            <section class="flex flex-col gap-2" aria-label="{{ $t['details'] }}">
                <h2 class="eyebrow">{{ $t['details'] }}</h2>
                <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-card border border-border bg-card p-3 text-body-sm">
                    @if (! empty($l['publisher']))
                        <div class="col-span-2 grid grid-cols-subgrid"><dt class="text-muted-foreground">{{ $t['publisher'] }}</dt><dd class="min-w-0 truncate text-foreground">{{ $l['publisher'] }}</dd></div>
                    @endif
                    @if (! empty($l['version']))
                        <div class="col-span-2 grid grid-cols-subgrid"><dt class="text-muted-foreground">{{ $t['version'] }}</dt><dd class="min-w-0 truncate text-foreground"><bdi dir="ltr">{{ $l['version'] }}</bdi></dd></div>
                    @endif
                    @if (isset($l['updatedAt']))
                        <div class="col-span-2 grid grid-cols-subgrid"><dt class="text-muted-foreground">{{ $t['updated'] }}</dt><dd class="min-w-0 truncate text-foreground"><x-nq::numeric.date-time :value="$l['updatedAt']" /></dd></div>
                    @endif
                    @if (! empty($l['compatibility']))
                        <div class="col-span-2 grid grid-cols-subgrid"><dt class="text-muted-foreground">{{ $t['compatibility'] }}</dt><dd class="min-w-0 truncate text-foreground"><bdi dir="ltr">{{ $l['compatibility'] }}</bdi></dd></div>
                    @endif
                    @if (! empty($l['size']))
                        <div class="col-span-2 grid grid-cols-subgrid"><dt class="text-muted-foreground">{{ $t['size'] }}</dt><dd class="min-w-0 truncate text-foreground"><bdi dir="ltr">{{ $l['size'] }}</bdi></dd></div>
                    @endif
                    @if (! empty($l['license']))
                        <div class="col-span-2 grid grid-cols-subgrid"><dt class="text-muted-foreground">{{ $t['license'] }}</dt><dd class="min-w-0 truncate text-foreground"><bdi dir="ltr">{{ $l['license'] }}</bdi></dd></div>
                    @endif
                </dl>
            </section>
            <section class="flex flex-col gap-2" aria-label="{{ $t['permissions'] }}">
                <h2 class="eyebrow flex items-center gap-2">
                    {{ $t['permissions'] }}
                    @if ($risk)<x-nq::badge :variant="nq_marketplace_risk_tone($risk)">{{ $t['risk'][$risk] }}</x-nq::badge>@endif
                </h2>
                <x-nq::marketplace.permission-list :permissions="$perms" :labels="(array) $labels" />
            </section>
            @if (! empty($l['links']))
                <section class="flex flex-col gap-2" aria-label="{{ $t['links'] }}">
                    <h2 class="eyebrow">{{ $t['links'] }}</h2>
                    <ul class="flex flex-col gap-1">
                        @foreach ($l['links'] as $link)
                            <li>
                                <a href="{{ $link['href'] }}" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1.5 text-body-sm text-nq-info-text underline-offset-2 hover:underline">
                                    {{ $link['label'] }}
                                    <x-lucide-external-link aria-hidden="true" class="size-3.5 rtl:-scale-x-100" />
                                </a>
                            </li>
                        @endforeach
                    </ul>
                </section>
            @endif
            @if (! empty($l['tags']))
                <section class="flex flex-col gap-2" aria-label="{{ $t['tags'] }}">
                    <h2 class="eyebrow">{{ $t['tags'] }}</h2>
                    <div class="flex flex-wrap gap-1.5">
                        @foreach ($l['tags'] as $tag)<x-nq::badge variant="neutral">{{ $tag }}</x-nq::badge>@endforeach
                    </div>
                </section>
            @endif
        </aside>
    </div>
</div>
