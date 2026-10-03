{{-- <x-nq::marketplace :listings="$listings" :categories="$categories" :templates="$templates" :template-categories="$cats" :permission-options="$perms" publishable />
     A store with a featured strip, categories and search (built on <x-nq::catalog-store>), a page for each extension, a publish form and a template gallery. It calls no backend: listen for events.
     listings: arrays of ['id', 'name', 'summary', 'category'] plus everything <x-nq::marketplace.detail> reads (icon, publisher, version, badge, installs, rating, price, installed, permissions, changelog, reviews, links, tags, featured: true to show in the strip).
     categories: ['id', 'label', 'icon']. templates (adds the Templates view) with template-categories: see <x-nq::marketplace.template-gallery>. permission-options: what the publish form lets an author declare.
     publishable: shows the Publish button and its form. uninstallable: false hides Uninstall on the pages. labels: overrides for the built-in strings; labels['store'] holds the catalog store's.
     Events (all bubble from the root; call event.detail.wait(promise) to keep a button busy, resolve to ['error' => 'why'] to show a failure):
     `nq-install` / `nq-uninstall` ({ id, item, wait }), `nq-open` ({ id }), `nq-publish` ({ draft, wait }), `nq-use-template` ({ id, template, wait }), `nq-selected-change` ({ id | null }) when a page opens or closes.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['listings' => [], 'categories' => [], 'templates' => null, 'templateCategories' => [], 'permissionOptions' => [], 'publishable' => false, 'uninstallable' => true, 'labels' => []])
@include('nasaq::components.marketplace._strings')
@include('nasaq::components.catalog-store._strings')
@php
    $own = (array) $labels;
    $storeLabels = (array) ($own['store'] ?? []);
    unset($own['store']);
    $t = nq_marketplace_labels($own);
    $listings = array_values((array) $listings);
    $featured = array_values(array_filter($listings, fn ($l) => ! empty($l['featured'])));
    usort($featured, fn ($a, $b) => ($b['installs'] ?? 0) <=> ($a['installs'] ?? 0));
    $featured = array_slice($featured, 0, 3);
    $hasTemplates = $templates !== null;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'marketplace') }}" x-data="nqMarketplace()"
    x-on:nq-select="pick($event.detail.id)"
    x-on:nq-back="pick(null)"
    x-on:nq-cancel="publishing = false"
    x-on:nq-marketplace-state="sync($event.detail.id, $event.detail.installed)"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col') }}>
    <div class="flex min-w-0 flex-col gap-5" x-show="!selected">
        @if ($hasTemplates || $publishable)
            <div class="flex flex-wrap items-center justify-between gap-2">
                @if ($hasTemplates)
                    <x-nq::toggle-group :default-value="['extensions']" x-model="viewSel" aria-label="{{ $t['view'] }}">
                        <x-nq::toggle-group.toggle value="extensions"><x-lucide-store aria-hidden="true" />{{ $t['extensions'] }}</x-nq::toggle-group.toggle>
                        <x-nq::toggle-group.toggle value="templates"><x-lucide-layout-template aria-hidden="true" />{{ $t['templates'] }}</x-nq::toggle-group.toggle>
                    </x-nq::toggle-group>
                @else
                    <span></span>
                @endif
                @if ($publishable)
                    <x-nq::button variant="primary" x-on:click="publishing = true"><x-lucide-upload aria-hidden="true" />{{ $t['publish'] }}</x-nq::button>
                @endif
            </div>
        @endif
        @if ($hasTemplates)
            <div x-show="view === 'templates'" style="display: none">
                <x-nq::marketplace.template-gallery :templates="$templates" :categories="$templateCategories" use :labels="$own" />
            </div>
        @endif
        <div class="flex min-w-0 flex-col gap-5" x-show="view === 'extensions'">
            @if (count($featured))
                <section aria-label="{{ $t['featured'] }}" class="flex flex-col gap-2">
                    <h2 class="eyebrow">{{ $t['featured'] }}</h2>
                    <ul class="grid gap-3 md:grid-cols-3">
                        @foreach ($featured as $f)
                            <li class="min-w-0">
                                <article data-featured="{{ $f['id'] }}" class="relative flex h-full items-start gap-3 rounded-card border border-border bg-secondary p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nq-focus hover:bg-nq-hover">
                                    <x-nq::catalog-store.icon :icon="$f['icon'] ?? null" class="size-12" />
                                    <div class="min-w-0 flex-1">
                                        <h3 class="text-label text-foreground">
                                            <button type="button" class="text-start outline-none after:absolute after:inset-0 after:content-['']" x-on:click="pick('{{ $f['id'] }}')">{{ $f['name'] }}</button>
                                        </h3>
                                        <p dir="auto" class="line-clamp-2 text-body-sm text-muted-foreground">{{ $f['summary'] }}</p>
                                        @if (isset($f['rating']))<x-nq::rating :value="$f['rating']" :count="$f['ratingCount'] ?? null" class="mt-1" />@endif
                                    </div>
                                </article>
                            </li>
                        @endforeach
                    </ul>
                </section>
            @endif
            <x-nq::catalog-store :items="$listings" :categories="$categories" :select="true" :labels="$storeLabels" />
        </div>
    </div>
    @foreach ($listings as $l)
        <template x-if="selected === '{{ $l['id'] }}'">
            <x-nq::marketplace.detail :listing="$l" back :uninstallable="$uninstallable" :labels="$own" />
        </template>
    @endforeach
    @if ($publishable)
        <x-nq::dialog x-model="publishing">
            <x-nq::dialog.content class="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['publishTitle'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['publishBody'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <x-nq::marketplace.publish-form :categories="$categories" :permission-options="$permissionOptions" cancelable :labels="$own" />
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
</div>
