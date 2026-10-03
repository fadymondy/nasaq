{{-- <x-nq::store-products-admin.product-editor :product="$product" currency="USD" load-editor="() => import('/assets/tiptap.js')" @nq-save="$event.detail.wait(save($event.detail.draft))" />
     The add / edit page of one product: title and rich description, pictures (drag to reorder), price with a live margin, stock, options and the variant table, organisation (brand, category, tags),
     the search listing (with a live preview), status and visibility, and a sticky Save / Discard bar that enables only once something changed and lists what blocks saving.
     product: the CommerceProduct shape to edit (omit it for a new product). extra: ['cost' => minor units, 'visibility' => visible | hidden, 'seoTitle', 'seoDescription'] for what the shared model leaves out.
     draft: an already built draft (instead of product). currency: ISO 4217 (USD, or SAR in Arabic). loading: a skeleton. can-cancel: Discard on an unchanged form fires "nq-cancel".
     load-editor: a JS expression returning a promise of the Tiptap modules for the description editor (see rich-text-editor); without it the description toolbar stays disabled.
     labels: override any built-in string by key. Money is integer minor units.
     Events from the root: nq-save { draft, wait }, nq-cancel. Hand wait(promise) a promise that resolves, or resolves { error } to keep the edits and show the message; with no listener the save is kept locally.
     The search preview shows the title and description as they were when the page loaded; it does not follow the title live. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-products-admin._strings')
@props(['product' => null, 'draft' => null, 'extra' => [], 'currency' => null, 'loading' => false, 'canCancel' => false, 'loadEditor' => null, 'labels' => []])
@php
    $t = nq_product_admin_t($labels);
    $currency ??= \Nasaq\Nasaq::currency();
    $config = [
        'product' => $product, 'draft' => $draft, 'extra' => (object) $extra, 'currency' => $currency, 'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 't' => $t,
        'loading' => (bool) $loading, 'canCancel' => (bool) $canCancel,
    ];
    $source = $draft ?? [];
    $seo = [
        'title' => $extra['seoTitle'] ?? ($product['seoTitle'] ?? ($source['seoTitle'] ?? ($source['title'] ?? ($product['name'] ?? '')))),
        'description' => $extra['seoDescription'] ?? ($product['seoDescription'] ?? ($source['seoDescription'] ?? '')),
        'url' => '',
    ];
    $statuses = collect(['active', 'draft', 'archived'])->map(fn ($s) => ['value' => $s, 'label' => $t['statuses.'.$s]])->all();
    $visibilities = [['value' => 'visible', 'label' => $t['visible']], ['value' => 'hidden', 'label' => $t['hidden']]];
    $card = 'grid gap-4 rounded-card border border-border bg-card p-4';
    $legend = 'text-h4 text-foreground';
    $err = 'text-body-sm text-nq-danger-text';
@endphp
<form data-slot="{{ $attributes->get('data-slot', 'product-editor') }}" novalidate x-data="nqProductEditor(@js($config))" x-on:submit.prevent="save()" x-bind:aria-busy="loading ? `true` : null"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <div x-show="loading" class="grid gap-3">
        <x-nq::states.skeleton class="h-10" /><x-nq::states.skeleton class="h-40" /><x-nq::states.skeleton class="h-40" />
    </div>

    <div x-show="! loading" class="grid min-w-0 gap-4">
        <h2 class="text-h3 text-foreground" x-text="isNew ? t.newProductTitle : t.editProduct"></h2>

        <section class="{{ $card }}" aria-label="{{ $t['general'] }}">
            <h3 class="{{ $legend }}">{{ $t['general'] }}</h3>
            <div class="grid gap-1">
                <label class="text-label text-foreground" for="product-title">{{ $t['title'] }}</label>
                <x-nq::field.input id="product-title" x-model="draft.title" x-bind:aria-invalid="showTitleError ? `true` : null" />
                <p x-show="showTitleError" class="{{ $err }}">{{ $t['issues.title'] }}</p>
            </div>
            <div class="grid gap-1">
                <span class="text-label text-foreground">{{ $t['description'] }}</span>
                @if ($loadEditor)
                    <x-nq::rich-text-editor x-model="draft.description" aria-label="{{ $t['descriptionLabel'] }}" :load="$loadEditor" />
                @else
                    <x-nq::rich-text-editor x-model="draft.description" aria-label="{{ $t['descriptionLabel'] }}" />
                @endif
            </div>
        </section>

        <section class="{{ $card }}" aria-label="{{ $t['media'] }}">
            <x-nq::store-products-admin.media-manager x-model="draft.images" :images="[]" />
        </section>

        <template x-if="showSingle">
            <section class="{{ $card }}" aria-label="{{ $t['pricing'] }}">
                <h3 class="{{ $legend }}">{{ $t['pricing'] }}</h3>
                <div class="grid gap-4 sm:grid-cols-3">
                    <div class="grid gap-1">
                        <span class="text-label text-foreground">{{ $t['price'] }}</span>
                        <x-nq::currency-input :currency="$currency" aria-label="{{ $t['price'] }}" x-model="single.price" />
                        <p x-show="showPriceError" class="{{ $err }}">{{ $t['issues.price'] }}</p>
                    </div>
                    <div class="grid gap-1">
                        <span class="text-label text-foreground">{{ $t['compareAt'] }}</span>
                        <x-nq::currency-input :currency="$currency" aria-label="{{ $t['compareAt'] }}" x-model="single.compareAt" />
                        <p class="text-caption text-muted-foreground" x-show="! has(`compare-at`)">{{ $t['compareAtHint'] }}</p>
                        <p x-show="has(`compare-at`)" class="{{ $err }}">{{ $t['issues.compare-at'] }}</p>
                    </div>
                    <div class="grid gap-1">
                        <span class="text-label text-foreground">{{ $t['cost'] }}</span>
                        <x-nq::currency-input :currency="$currency" aria-label="{{ $t['cost'] }}" x-model="draft.cost" />
                        <p class="text-caption text-muted-foreground">{{ $t['costHint'] }}</p>
                    </div>
                </div>
                <div data-slot="product-margin" role="status" aria-live="polite" class="grid gap-1 rounded-control bg-nq-surface-soft p-3 text-body-sm">
                    <p class="text-muted-foreground" x-show="! hasMargin">{{ $t['noMargin'] }}</p>
                    <dl class="grid grid-cols-3 gap-3" x-show="hasMargin">
                        <div><dt class="text-caption text-muted-foreground">{{ $t['profit'] }}</dt><dd class="tabular-nums" dir="ltr" x-text="profitText"></dd></div>
                        <div><dt class="text-caption text-muted-foreground">{{ $t['margin'] }}</dt><dd class="tabular-nums" dir="ltr" x-bind:class="marginNegative ? `text-nq-danger-text` : ``" x-text="marginText"></dd></div>
                        <div><dt class="text-caption text-muted-foreground">{{ $t['markup'] }}</dt><dd class="tabular-nums" dir="ltr" x-text="markupText"></dd></div>
                    </dl>
                </div>
            </section>
        </template>

        <template x-if="showSingle">
            <section class="{{ $card }}" aria-label="{{ $t['inventory'] }}">
                <h3 class="{{ $legend }}">{{ $t['inventory'] }}</h3>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="grid gap-1">
                        <label class="text-label text-foreground" for="product-sku">{{ $t['sku'] }}</label>
                        <x-nq::field.input id="product-sku" dir="ltr" x-model="single.sku" />
                    </div>
                    <div class="grid gap-1">
                        <label class="text-label text-foreground" for="product-weight">{{ $t['weight'] }}</label>
                        <input id="product-weight" type="text" inputmode="numeric" x-bind:value="single.weightGrams ?? ''" x-on:input="setWeight($event.target.value)"
                            class="h-control w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground outline-none focus-visible:border-nq-focus" />
                    </div>
                </div>
                <label class="flex items-center gap-2 text-body text-foreground">
                    <x-nq::switch x-model="tracked" />
                    {{ $t['trackStock'] }}
                </label>
                <div class="grid gap-4 sm:grid-cols-2" x-show="tracked">
                    <div class="grid gap-1">
                        <label class="text-label text-foreground" for="product-stock">{{ $t['stockQty'] }}</label>
                        <input id="product-stock" type="text" inputmode="numeric" x-bind:value="single.stock ?? ''" x-on:input="setStock($event.target.value)"
                            class="h-control w-full min-w-0 rounded-control border border-input bg-card px-3 text-body tabular-nums text-foreground outline-none focus-visible:border-nq-focus" />
                    </div>
                    <label class="flex items-center gap-2 self-end pb-2 text-body text-foreground">
                        <x-nq::switch x-model="single.allowBackorder" />
                        {{ $t['backorder'] }}
                    </label>
                </div>
            </section>
        </template>

        <section class="{{ $card }}" aria-label="{{ $t['optionsTitle'] }}">
            <x-nq::store-products-admin.options-editor x-model="draft.options" x-on:nq-options-change="changeOptions($event.detail.options)" />
            <p class="text-body-sm text-muted-foreground" x-show="note" role="status" x-text="note"></p>
            <div x-show="hasOptions" class="grid gap-2">
                <p class="text-caption text-muted-foreground" x-text="variantsSummary"></p>
                <x-nq::store-products-admin.variant-matrix :currency="$currency" x-model="draft.variants" x-effect="setContext(activeOptions, draft.images)" />
            </div>
            <p x-show="has(`no-variants`)" class="{{ $err }}">{{ $t['issues.no-variants'] }}</p>
        </section>

        <section class="{{ $card }}" aria-label="{{ $t['organization'] }}">
            <h3 class="{{ $legend }}">{{ $t['organization'] }}</h3>
            <div class="grid gap-4 sm:grid-cols-2">
                <div class="grid gap-1">
                    <label class="text-label text-foreground" for="product-brand">{{ $t['brand'] }}</label>
                    <x-nq::field.input id="product-brand" x-model="draft.brand" />
                </div>
                <div class="grid gap-1">
                    <label class="text-label text-foreground" for="product-category">{{ $t['category'] }}</label>
                    <x-nq::field.input id="product-category" x-model="draft.category" />
                </div>
            </div>
            <div class="grid gap-1">
                <span class="text-label text-foreground">{{ $t['tags'] }}</span>
                <x-nq::tag-input aria-label="{{ $t['tags'] }}" placeholder="{{ $t['tagsPlaceholder'] }}" x-model="draft.tags" />
            </div>
        </section>

        <section class="{{ $card }}" aria-label="{{ $t['seo'] }}">
            <h3 class="{{ $legend }}">{{ $t['seo'] }}</h3>
            <div class="grid gap-1">
                <label class="text-label text-foreground" for="product-slug">{{ $t['slug'] }}</label>
                <input id="product-slug" type="text" dir="ltr" x-model="draft.slug" x-bind:placeholder="slugHolder" x-bind:aria-invalid="has(`slug`) ? `true` : null"
                    class="h-control w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground outline-none focus-visible:border-nq-focus aria-invalid:border-nq-danger" />
                <p class="text-caption text-muted-foreground" x-show="! has(`slug`)">{{ $t['slugHint'] }}</p>
                <p class="{{ $err }}" x-show="has(`slug`)">{{ $t['issues.slug'] }}</p>
            </div>
            <x-nq::seo-preview editable :meta="$seo" :title="$t['seo']" x-on:nq-seo-preview-change="setSeo($event.detail)" />
        </section>

        <section class="{{ $card }}" aria-label="{{ $t['statusSection'] }}">
            <h3 class="{{ $legend }}">{{ $t['statusSection'] }}</h3>
            <div class="grid gap-4 sm:grid-cols-2">
                <div class="grid gap-1">
                    <label class="text-label text-foreground" for="product-status">{{ $t['bulkStatus'] }}</label>
                    <x-nq::native-select id="product-status" :options="$statuses" x-model="draft.status" />
                    <p class="text-caption text-muted-foreground" x-text="t[`statusHint.${draft.status}`]"></p>
                </div>
                <div class="grid gap-1">
                    <label class="text-label text-foreground" for="product-visibility">{{ $t['visibility'] }}</label>
                    <x-nq::native-select id="product-visibility" :options="$visibilities" x-model="draft.visibility" />
                </div>
            </div>
        </section>

        <div data-slot="product-editor-bar" class="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-card p-3 shadow-floating">
            <p role="status" aria-live="polite" class="min-w-0 text-body-sm text-muted-foreground">
                <span x-show="error" class="{{ $err }}" x-text="error"></span>
                <span x-show="showFix" class="{{ $err }}" x-text="fixText"></span>
                <span x-show="showUnsaved" x-text="t.unsaved"></span>
                <span x-show="showSaved" class="text-nq-success-text" x-text="t.allSaved"></span>
            </p>
            <div class="flex gap-2">
                <x-nq::button type="button" variant="ghost" x-bind:disabled="discardOff" x-on:click="discard()">{{ $t['discard'] }}</x-nq::button>
                <x-nq::button type="submit" variant="primary" x-bind:disabled="saveOff ? true : saving">
                    <span x-text="saving ? t.saving : t.save"></span>
                </x-nq::button>
            </div>
        </div>
    </div>
</form>
