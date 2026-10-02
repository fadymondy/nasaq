{{-- <x-nq::store-products-admin.collections-manager :collections="$collections" :products="$products" currency="USD" />
     The collections of the store as cards (with the matching products), each manual (products picked and ordered by hand) or rule-based (a rule builder over tag, brand, category,
     title, price, stock, sale and status). The dialog lists the products that match live, so a rule is checked before it is saved. Rule prices are typed in major units.
     collections: [['id', 'title', 'kind' => manual | rules, 'productIds' => [..], 'conditions' => rule group]]. products: the whole catalogue (CommerceProduct shape).
     currency: ISO 4217 (USD, or SAR in Arabic). loading / error: states. labels: override any built-in string by key.
     Events from the root: nq-collection-save { collection, isNew, wait }, nq-collection-delete { collection, wait }, nq-retry. Hand wait(promise) a promise that resolves,
     or resolves { error } to keep the dialog open and show the message; with no listener the change is applied locally. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-products-admin._strings')
@props(['collections' => [], 'products' => [], 'currency' => null, 'loading' => false, 'error' => false, 'labels' => []])
@php
    $t = nq_product_admin_t($labels);
    $currency ??= \Nasaq\Nasaq::currency();
    $config = [
        'collections' => array_values($collections), 'products' => array_values($products), 'currency' => $currency, 'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 't' => $t,
        'loading' => (bool) $loading, 'error' => $error ? ($error === true ? true : (string) $error) : false,
    ];
    $ruleFields = [
        ['id' => 'tag', 'label' => $t['fields.tag'], 'kind' => 'text'],
        ['id' => 'brand', 'label' => $t['fields.brand'], 'kind' => 'text'],
        ['id' => 'category', 'label' => $t['fields.category'], 'kind' => 'text'],
        ['id' => 'title', 'label' => $t['fields.title'], 'kind' => 'text'],
        ['id' => 'price', 'label' => $t['fields.price'], 'kind' => 'number'],
        ['id' => 'stock', 'label' => $t['fields.stock'], 'kind' => 'number'],
        ['id' => 'onSale', 'label' => $t['fields.onSale'], 'kind' => 'boolean'],
        ['id' => 'status', 'label' => $t['fields.status'], 'kind' => 'select', 'options' => collect(['active', 'draft', 'archived'])->map(fn ($s) => ['value' => $s, 'label' => $t['statuses.'.$s]])->all()],
    ];
    $ruleLabels = [
        'when' => $t['ruleEventLabel'], 'whenHelp' => $t['ruleEventHelp'], 'ifTitle' => $t['ruleIfTitle'], 'ifHelp' => $t['ruleIfHelp'],
        'thenTitle' => $t['ruleThenTitle'], 'thenHelp' => $t['ruleThenHelp'], 'noConditions' => $t['rulesHint'],
        'sentence' => ['when' => $t['ruleEventLabel'].' {event}', 'ifWord' => $t['ruleWhere'], 'then' => $t['ruleSo'], 'noConditions' => $t['matchNone'], 'and' => $t['and'], 'or' => $t['or']],
    ];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'collections-manager') }}" aria-label="{{ $t['collectionsLabel'] }}" x-data="nqCollectionsManager(@js($config))"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-h3 text-foreground">{{ $t['collections'] }}</h2>
        <x-nq::button type="button" variant="primary" x-on:click="create()">
            <x-lucide-plus aria-hidden="true" />
            {{ $t['newCollection'] }}
        </x-nq::button>
    </div>

    <p x-show="notice ? ! (editOpen || delOpen) : false" role="alert" class="text-body-sm text-nq-danger-text" x-text="notice"></p>

    <template x-if="failed">
        <x-nq::states.empty icon="triangle-alert" :title="$t['loadFailed']" :description="null" />
    </template>
    <div x-show="loading" aria-busy="true" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <x-nq::states.skeleton class="h-28" /><x-nq::states.skeleton class="h-28" /><x-nq::states.skeleton class="h-28" />
    </div>
    <template x-if="showEmpty">
        <div class="flex flex-col items-center gap-3">
            <x-nq::states.empty icon="layers" :title="$t['collectionsEmpty']" :description="$t['collectionsEmptyHint']" />
            <x-nq::button type="button" variant="secondary" x-on:click="create()">{{ $t['newCollection'] }}</x-nq::button>
        </div>
    </template>

    <ul x-show="showList" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <template x-for="c in collections" x-bind:key="c.id">
            <li data-slot="collection-card" x-data="nqContextMenu()" x-bind="trigger" class="min-w-0">
                <x-nq::card class="h-full w-full">
                    <x-nq::card.header>
                        <x-nq::card.title as="h3" class="flex min-w-0 items-center justify-between gap-2">
                            <span class="truncate" x-text="c.title"></span>
                            <span class="flex shrink-0 items-center gap-1">
                                <span data-slot="badge" class="inline-flex h-5 items-center whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium"
                                    x-bind:class="chip(c.kind === 'rules' ? 'info' : 'neutral')" x-text="c.kind === 'rules' ? t.rules : t.manual"></span>
                                <x-nq::dropdown-menu>
                                    <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="row-actions" x-bind:aria-label="`{{ $t['actions'] }}, ${c.title}`" class="text-muted-foreground data-popup-open:text-foreground">
                                        <x-lucide-ellipsis aria-hidden="true" />
                                    </x-nq::dropdown-menu.trigger>
                                    <x-nq::dropdown-menu.content align="end" class="min-w-44">
                                        <x-nq::dropdown-menu.item x-on:click="edit(c)"><x-lucide-pencil aria-hidden="true" />{{ $t['edit'] }}</x-nq::dropdown-menu.item>
                                        <x-nq::dropdown-menu.separator />
                                        <x-nq::dropdown-menu.item variant="danger" x-on:click="askDelete(c)"><x-lucide-trash-2 aria-hidden="true" />{{ $t['deleteCollection'] }}</x-nq::dropdown-menu.item>
                                    </x-nq::dropdown-menu.content>
                                </x-nq::dropdown-menu>
                            </span>
                        </x-nq::card.title>
                    </x-nq::card.header>
                    <x-nq::card.content class="grid gap-3">
                        <div class="flex -space-x-2 rtl:space-x-reverse" aria-hidden="true">
                            <template x-for="m in cardMatches(c).slice(0, 5)" x-bind:key="m.id">
                                <x-nq::store-products-admin.thumb src="m.images[0]?.src" :size="32" class="rounded-full ring-2 ring-card" />
                            </template>
                        </div>
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-body-sm text-muted-foreground" x-text="countText(c)"></span>
                            <x-nq::button type="button" size="sm" variant="secondary" x-on:click="edit(c)">
                                <x-lucide-pencil aria-hidden="true" />
                                {{ $t['edit'] }}
                            </x-nq::button>
                        </div>
                    </x-nq::card.content>
                </x-nq::card>
                <template x-teleport="body">
                    <div data-slot="context-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open"
                        class="fixed z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none max-h-[var(--available-height)] overflow-y-auto transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
                        <x-nq::context-menu.item x-on:click="edit(c)"><x-lucide-pencil aria-hidden="true" />{{ $t['edit'] }}</x-nq::context-menu.item>
                        <x-nq::context-menu.separator />
                        <x-nq::context-menu.item variant="danger" x-on:click="askDelete(c)"><x-lucide-trash-2 aria-hidden="true" />{{ $t['deleteCollection'] }}</x-nq::context-menu.item>
                    </div>
                </template>
            </li>
        </template>
    </ul>

    <x-nq::dialog x-model="editOpen">
        <x-nq::dialog.content data-slot="collection-editor" class="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
            <form class="grid gap-4" novalidate x-on:submit.prevent="saveCollection()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="dialogTitle"></span></x-nq::dialog.title>
                    <x-nq::dialog.description><span x-text="dialogHint"></span></x-nq::dialog.description>
                </x-nq::dialog.header>

                <div class="grid gap-1">
                    <label class="text-label text-foreground" for="collection-title">{{ $t['collectionTitle'] }}</label>
                    <x-nq::field.input id="collection-title" x-model="ctitle" x-bind:aria-invalid="titleBad ? `true` : null" />
                </div>

                <x-nq::tabs x-model="kind">
                    <x-nq::tabs.list aria-label="{{ $t['kindLabel'] }}">
                        <x-nq::tabs.tab value="manual">{{ $t['manual'] }}</x-nq::tabs.tab>
                        <x-nq::tabs.tab value="rules">{{ $t['rules'] }}</x-nq::tabs.tab>
                    </x-nq::tabs.list>
                    <x-nq::tabs.panel value="manual" class="grid gap-3 pt-3">
                        <x-nq::dropdown-menu>
                            <x-nq::dropdown-menu.trigger variant="secondary" aria-label="{{ $t['addProduct'] }}" data-slot="collection-pick">
                                <x-lucide-plus aria-hidden="true" />
                                {{ $t['pickProduct'] }}
                            </x-nq::dropdown-menu.trigger>
                            <x-nq::dropdown-menu.content align="start" class="max-h-64 min-w-56 overflow-y-auto">
                                <template x-for="pr in available" x-bind:key="pr.id">
                                    <x-nq::dropdown-menu.item x-on:click="addProduct(pr.id)"><span x-text="pr.name"></span></x-nq::dropdown-menu.item>
                                </template>
                            </x-nq::dropdown-menu.content>
                        </x-nq::dropdown-menu>
                        <p x-show="ids.length === 0" class="rounded-card border border-dashed border-border p-3 text-center text-body-sm text-muted-foreground">{{ $t['matchNone'] }}</p>
                        <ol x-show="ids.length > 0" aria-label="{{ $t['matchPreviewLabel'] }}" class="grid gap-1.5">
                            <template x-for="(it, i) in picked" x-bind:key="it.id">
                                <li class="flex min-w-0 items-center gap-2 rounded-control border border-border bg-card p-1.5">
                                    <x-nq::store-products-admin.thumb src="it.src" :size="32" />
                                    <span class="min-w-0 flex-1 truncate text-body-sm" x-text="it.name"></span>
                                    <x-nq::button type="button" size="icon-sm" variant="ghost" aria-label="{{ $t['moveUp'] }}" x-bind:disabled="i === 0" x-on:click="moveBy(i, -1)"><x-lucide-arrow-up aria-hidden="true" /></x-nq::button>
                                    <x-nq::button type="button" size="icon-sm" variant="ghost" aria-label="{{ $t['moveDown'] }}" x-bind:disabled="i === ids.length - 1" x-on:click="moveBy(i, 1)"><x-lucide-arrow-down aria-hidden="true" /></x-nq::button>
                                    <x-nq::button type="button" size="icon-sm" variant="ghost" aria-label="{{ $t['removeFromCollection'] }}" x-on:click="removeId(it.id)"><x-lucide-x aria-hidden="true" /></x-nq::button>
                                </li>
                            </template>
                        </ol>
                    </x-nq::tabs.panel>
                    <x-nq::tabs.panel value="rules" class="grid gap-3 pt-3">
                        <x-nq::rule-builder :events="[['id' => 'product', 'label' => $t['ruleAnyProduct']]]" :fields="$ruleFields" :action-types="[['id' => 'add', 'label' => $t['ruleAction']]]" :labels="$ruleLabels" x-model="ruleDoc" />
                    </x-nq::tabs.panel>
                </x-nq::tabs>

                <div role="status" aria-live="polite" data-slot="collection-preview" class="grid gap-2 rounded-card border border-border bg-nq-surface-soft p-3">
                    <p class="text-label text-foreground" x-text="matchText"></p>
                    <ul x-show="matches.length > 0" aria-label="{{ $t['matchPreviewLabel'] }}" class="grid gap-1 sm:grid-cols-2">
                        <template x-for="m in matchShown" x-bind:key="m.id">
                            <li class="flex min-w-0 items-center gap-2 text-body-sm">
                                <x-nq::store-products-admin.thumb src="m.images[0]?.src" :size="24" />
                                <span class="min-w-0 flex-1 truncate" x-text="m.name"></span>
                                <span class="text-caption text-muted-foreground" dir="ltr" x-text="priceOf(m)"></span>
                            </li>
                        </template>
                        <li class="text-caption text-muted-foreground" x-show="matchMore > 0" x-text="`+` + num(matchMore)"></li>
                    </ul>
                </div>

                <p x-show="notice" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text" x-text="notice"></p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-bind:disabled="busy" x-on:click="editOpen = false">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="busy">{{ $t['saveCollection'] }}</x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    <x-nq::dialog x-model="delOpen">
        <x-nq::dialog.content data-slot="collection-delete" class="max-w-md">
            <x-nq::dialog.header>
                <x-nq::dialog.title>{{ $t['deleteCollectionTitle'] }}</x-nq::dialog.title>
                <x-nq::dialog.description><span x-text="tt(`deleteCollectionDescription`, deleting ? deleting.title : ``)"></span></x-nq::dialog.description>
            </x-nq::dialog.header>
            <p x-show="notice" role="alert" class="text-body-sm text-nq-danger-text" x-text="notice"></p>
            <x-nq::dialog.footer>
                <x-nq::button type="button" variant="ghost" x-bind:disabled="busy" x-on:click="delOpen = false">{{ $t['cancel'] }}</x-nq::button>
                <x-nq::button type="button" variant="danger" x-bind:disabled="busy" x-on:click="confirmDelete()">{{ $t['deleteCollection'] }}</x-nq::button>
            </x-nq::dialog.footer>
        </x-nq::dialog.content>
    </x-nq::dialog>
</section>
