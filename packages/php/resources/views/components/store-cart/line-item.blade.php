{{-- <template x-for="line in active" :key="line.id"><x-nq::store-cart.line-item /></template>
     One product in the cart: picture (with a placeholder), name, variant, stock warning, unit and line price, the quantity stepper and the row actions
     (Save for later or Move to cart, Remove). The same actions are on its context menu (context-click, long-press or Shift+F10): View product, Save for later
     or Move to cart, Remove. It reads the variable `line` from the surrounding x-for, so use it inside the cart page or mini cart.
     saved: a saved-for-later line (no stepper, "Move to cart" instead of "Save for later"). compact: the narrow mini-cart layout (a smaller picture, icon-only remove,
     only the Remove action). sku: show the SKU under the name. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['saved' => false, 'compact' => false, 'sku' => false])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $savedJs = $saved ? 'true' : 'false';
@endphp
<x-nq::context-menu>
    <x-nq::context-menu.trigger role="listitem" data-slot="{{ $attributes->get('data-slot', 'store-cart-line') }}" :data-saved="$saved ? '' : null" x-bind:data-stock="stockKind(line, {{ $savedJs }})"
        {{ $attributes->except('data-slot')->cn('flex gap-3 py-4 sm:gap-4') }}>
        <x-nq::store-cart.image src-expr="line.image" alt-expr="line.name" :size="$compact ? 64 : 88" x-bind:class="outClass(line)" />
        <div class="flex min-w-0 flex-1 flex-col gap-2">
            <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 flex-col gap-0.5">
                    <p class="text-body font-medium text-foreground [overflow-wrap:anywhere]" x-text="line.name"></p>
                    <p x-show="line.variantLabel" style="display: none" class="text-caption text-muted-foreground" x-text="line.variantLabel"></p>
                    @if ($sku)
                        <p x-show="line.sku" style="display: none" class="text-caption text-muted-foreground">{{ $t('SKU', 'رمز المنتج') }} <bdi dir="ltr" x-text="line.sku"></bdi></p>
                    @endif
                </div>
                <div class="flex shrink-0 flex-col items-end gap-0.5 text-end">
                    @include('nasaq::components.store-cart._money', ['amount' => 'line.unitPrice * line.quantity', 'compare' => 'line.compareAt * line.quantity', 'compareShow' => 'hasCompare(line)', 'size' => 'sm'])
                    <span x-show="multi(line)" style="display: none" class="text-caption text-muted-foreground"><span class="text-muted-foreground" x-text="money(line.unitPrice)"></span> {{ $t('each', 'للقطعة') }}</span>
                </div>
            </div>
            <p data-slot="store-cart-stock" role="status" x-show="stockKind(line, {{ $savedJs }})" style="display: none" x-bind:class="stockClass(line, {{ $savedJs }})" class="flex items-center gap-1.5 text-caption">
                <x-lucide-triangle-alert aria-hidden="true" class="size-3.5 shrink-0" />
                <span x-text="stockText(line, {{ $savedJs }})"></span>
            </p>
            <div class="flex flex-wrap items-start gap-x-3 gap-y-2">
                @unless ($saved)
                    <x-nq::store-cart.quantity-stepper bind :value="1" />
                @endunless
                <div class="ms-auto flex flex-wrap items-center gap-1">
                    @if ($saved)
                        <x-nq::button variant="secondary" size="sm" x-bind:disabled="isOut(line)" x-on:click="moveToCart(line.id)">
                            <x-lucide-shopping-bag aria-hidden="true" />
                            {{ $t('Move to cart', 'انقل إلى السلة') }}
                        </x-nq::button>
                    @elseif (! $compact)
                        <x-nq::button variant="ghost" size="sm" x-on:click="saveForLater(line.id)">
                            <x-lucide-bookmark aria-hidden="true" />
                            {{ $t('Save for later', 'احفظ لوقت لاحق') }}
                        </x-nq::button>
                    @endif
                    @if ($compact)
                        <x-nq::button variant="ghost" size="icon-sm" x-bind:aria-label="removeLabel(line)" x-on:click="remove(line.id)">
                            <x-lucide-trash-2 aria-hidden="true" />
                        </x-nq::button>
                    @else
                        <x-nq::button variant="ghost" size="sm" x-bind:aria-label="removeLabel(line)" x-on:click="remove(line.id)">
                            <x-lucide-trash-2 aria-hidden="true" />
                            {{ $t('Remove', 'إزالة') }}
                        </x-nq::button>
                    @endif
                </div>
            </div>
        </div>
    </x-nq::context-menu.trigger>
    <x-nq::context-menu.content class="min-w-44">
        @unless ($compact)
            <x-nq::context-menu.item x-on:click="openProduct(line)">
                <x-lucide-eye aria-hidden="true" />
                {{ $t('View product', 'عرض المنتج') }}
            </x-nq::context-menu.item>
            @if ($saved)
                <x-nq::context-menu.item x-bind:aria-disabled="isOut(line)" x-on:click="isOut(line) ? null : moveToCart(line.id)">
                    <x-lucide-shopping-bag aria-hidden="true" />
                    {{ $t('Move to cart', 'انقل إلى السلة') }}
                </x-nq::context-menu.item>
            @else
                <x-nq::context-menu.item x-on:click="saveForLater(line.id)">
                    <x-lucide-bookmark aria-hidden="true" />
                    {{ $t('Save for later', 'احفظ لوقت لاحق') }}
                </x-nq::context-menu.item>
            @endif
            <x-nq::context-menu.separator />
        @endunless
        <x-nq::context-menu.item variant="danger" x-on:click="remove(line.id)">
            <x-lucide-trash-2 aria-hidden="true" />
            {{ $t('Remove', 'إزالة') }}
        </x-nq::context-menu.item>
    </x-nq::context-menu.content>
</x-nq::context-menu>
