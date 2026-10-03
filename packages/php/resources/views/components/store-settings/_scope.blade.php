{{-- Internal: pick products and collections for a discount scope. @include('nasaq::components.store-settings._scope', ['model' => 'd.scope', 'label' => 'Applies to', 't' => $t])
     The model holds { p: {productId: bool}, c: {collectionId: bool} }; an empty selection means everything. Used inside the discounts manager (it reads products and collections from the Alpine scope). --}}
<div data-slot="discount-scope" class="flex flex-col gap-2">
    <span class="text-label text-foreground">{{ $label }} <span class="text-caption text-muted-foreground" x-text="scopeText({{ $model }})"></span></span>
    <div class="grid max-h-40 gap-1.5 overflow-y-auto rounded-control border border-border p-2 sm:grid-cols-2">
        <template x-for="p in products" :key="p.id">
            <label class="flex min-w-0 items-center gap-2 text-body-sm"><x-nq::checkbox x-model="{{ $model }}.p[p.id]" /><span class="truncate" x-text="p.name"></span></label>
        </template>
        <template x-for="c in collections" :key="c.id">
            <label class="flex min-w-0 items-center gap-2 text-body-sm"><x-nq::checkbox x-model="{{ $model }}.c[c.id]" /><span class="truncate"><span class="text-muted-foreground">{{ $t['collection'] }}:</span> <span x-text="c.name"></span></span></label>
        </template>
    </div>
</div>
