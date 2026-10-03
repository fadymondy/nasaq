{{-- <x-nq::store-products-admin.media-manager :images="$product['images']" x-model="draft.images" />
     The pictures of one product: add by URL, drag a tile (pointer) or use the arrow keys on its handle to reorder, edit the alt text, remove. The first picture is the main image.
     images: [['src', 'alt']] (x-modelable: x-model reads and writes the array). max-images: 12. disabled: read only. labels: override any built-in string by key.
     Fires "nq-images-change" ({ images }) after every change. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-products-admin._strings')
@props(['images' => [], 'maxImages' => 12, 'disabled' => false, 'labels' => []])
@php
    $t = nq_product_admin_t($labels);
    $config = ['images' => array_values($images), 'maxImages' => $maxImages, 'disabled' => (bool) $disabled, 'currency' => \Nasaq\Nasaq::currency(), 'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 't' => $t];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'media-manager') }}" aria-label="{{ $t['mediaLabel'] }}" x-data="nqMediaManager(@js($config))" x-modelable="images"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-label text-foreground">{{ $t['media'] }}</h3>
        <span class="inline-flex items-center gap-1 text-caption text-nq-warning-text" x-show="missing > 0">
            <x-lucide-triangle-alert aria-hidden="true" class="size-3.5" />
            <span x-text="`${num(missing)} · {{ $t['missingAlt'] }}`"></span>
        </span>
    </div>

    <template x-if="images.length === 0">
        <x-nq::states.empty icon="image" :title="$t['noImages']" :description="$t['noImagesHint']" class="border-dashed" />
    </template>

    <ol x-show="images.length > 0" aria-label="{{ $t['mediaLabel'] }}" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <template x-for="(im, i) in images" x-bind:key="im.src">
            <li data-slot="media-tile" x-bind:data-dragging="isDragging(i) ? '' : null" x-bind:style="tileStyle(i)" x-bind:class="tileClass(i)"
                class="grid min-w-0 gap-2 rounded-card border border-border bg-card p-2 transition-colors">
                <div class="relative aspect-square w-full overflow-hidden rounded-control bg-secondary">
                    <img alt="" x-show="imgOk(im.src)" x-bind:src="im.src" x-on:error="broken[im.src] = true" class="size-full object-cover" draggable="false" />
                    <div x-show="! imgOk(im.src)" class="flex size-full flex-col items-center justify-center gap-1 text-caption text-muted-foreground">
                        <x-lucide-image-off aria-hidden="true" class="size-5" />
                        {{ $t['imageFailed'] }}
                    </div>
                    <span x-show="i === 0" data-slot="badge" class="absolute start-1.5 top-1.5 inline-flex h-5 items-center rounded-[4px] border border-primary bg-card px-1.5 text-caption font-medium text-foreground">{{ $t['primary'] }}</span>
                    <button type="button" data-slot="media-drag-handle" x-bind:disabled="off" x-bind:aria-label="tt(`dragHandle`, i + 1)"
                        x-on:pointerdown="dragStart(i, $event)" x-on:keydown="handleKey(i, $event)"
                        class="absolute end-1.5 top-1.5 inline-flex size-7 cursor-grab touch-none items-center justify-center rounded-control border border-border bg-card text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus active:cursor-grabbing">
                        <x-lucide-grip-vertical aria-hidden="true" class="size-4" />
                    </button>
                </div>
                <div class="flex items-center gap-1">
                    <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:disabled="off ? true : i === 0" x-bind:aria-label="`{{ $t['moveEarlier'] }}`" x-on:click="move(i, i - 1)">
                        <x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" />
                    </x-nq::button>
                    <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:disabled="off ? true : i === images.length - 1" x-bind:aria-label="`{{ $t['moveLater'] }}`" x-on:click="move(i, i + 1)">
                        <x-lucide-arrow-right aria-hidden="true" class="rtl:-scale-x-100" />
                    </x-nq::button>
                    <x-nq::button type="button" size="icon-sm" variant="ghost" class="ms-auto" x-bind:disabled="off" x-bind:aria-label="`{{ $t['removeImage'] }}`" x-on:click="remove(i)">
                        <x-lucide-trash-2 aria-hidden="true" />
                    </x-nq::button>
                </div>
                <input type="text" aria-label="{{ $t['altText'] }}" placeholder="{{ $t['altText'] }}" x-bind:value="im.alt" x-bind:disabled="off" x-on:input="setAlt(i, $event.target.value)"
                    x-bind:aria-invalid="im.alt ? null : `true`"
                    class="h-control-sm w-full min-w-0 rounded-control border border-input bg-card px-2 text-body-sm text-foreground outline-none focus-visible:border-nq-focus aria-invalid:border-nq-warning" />
            </li>
        </template>
    </ol>

    <div class="flex flex-wrap items-end gap-2" x-on:keydown.enter.prevent="add()">
        <div class="grid min-w-48 flex-1 gap-1">
            <label class="text-caption text-muted-foreground" for="{{ $attributes->get('id', 'media-url') }}-url">{{ $t['imageUrl'] }}</label>
            <input id="{{ $attributes->get('id', 'media-url') }}-url" type="url" dir="ltr" placeholder="{{ $t['imageUrlPlaceholder'] }}" x-model="url" x-bind:disabled="off ? true : full"
                class="h-control w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground outline-none focus-visible:border-nq-focus" />
        </div>
        <x-nq::button type="button" variant="secondary" x-bind:disabled="! canAdd" x-on:click="add()">
            <x-lucide-plus aria-hidden="true" />
            {{ $t['addImage'] }}
        </x-nq::button>
    </div>
    <p role="status" aria-live="polite" class="sr-only" x-text="announce"></p>
</section>
