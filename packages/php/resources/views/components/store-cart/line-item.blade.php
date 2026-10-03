{{-- <template x-for="line in active" :key="line.id"><x-nq::store-cart.line-item /></template>
     One product in the cart: picture (with a placeholder), name, variant, stock warning, unit and line price, the quantity stepper and the row actions
     (Save for later or Move to cart, Remove). The same actions are on its context menu (context-click, long-press or Shift+F10): View product, Save for later
     or Move to cart, Remove. It reads the variable `line` from the surrounding x-for, so use it inside the cart page or mini cart.
     saved: a saved-for-later line (no stepper, "Move to cart" instead of "Save for later"). compact: the narrow mini-cart layout (a smaller picture, icon-only remove,
     only the Remove action). sku: show the SKU under the name. Needs the Alpine runtime (@nasaqScripts).
     remove, save, open-product, quantity: false hides that control (React hides a control whose callback is not passed): Remove, Save for later / Move to cart,
     View product, the quantity stepper (the quantity then reads as plain text). All true by default.
     ssr: a line array; draws that line as static, inert markup (the cart page uses it so the first paint already has the lines, and drops it when Alpine starts; x-ignore keeps Alpine from walking it in between). --}}
@props(['saved' => false, 'compact' => false, 'sku' => false, 'remove' => true, 'save' => true, 'openProduct' => true, 'quantity' => true, 'ssr' => null, 'currency' => null])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $savedJs = $saved ? 'true' : 'false';
    $l = is_array($ssr) ? $ssr : null;
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency());
    $issue = $l ? nq_cart_stock_issue($l) : null;
    $kind = $issue && (! $saved || $issue['kind'] === 'out') ? $issue['kind'] : null;
    $avail = $issue ? $issue['available'] : 0;
    $stockText = match ($kind) {
        'out' => $t('Out of stock', 'غير متوفر'),
        'over' => $t('Only '.$avail.' left, lower the quantity', 'المتبقي '.$avail.' فقط، قلّل الكمية'),
        'low' => $t('Only '.$avail.' left', 'المتبقي '.$avail.' فقط'),
        default => '',
    };
    $qty = $l ? (int) $l['quantity'] : 0;
    $hasCompare = $l && ! empty($l['compareAt']) && $l['compareAt'] > $l['unitPrice'];
    $menu = $compact ? $remove : ($openProduct || $save || $remove);
@endphp
<x-nq::context-menu :data-ssr="$l ? '' : null" :x-ignore="$l ? '' : null">
    <x-nq::context-menu.trigger role="listitem" data-slot="{{ $attributes->get('data-slot', 'store-cart-line') }}" :data-saved="$saved ? '' : null" :data-stock="$kind" x-bind:data-stock="stockKind(line, {{ $savedJs }})"
        {{ $attributes->except('data-slot')->cn('flex gap-3 py-4 sm:gap-4') }}>
        @if ($l)
            <x-nq::store-cart.image :src="$l['image'] ?? null" :alt="$l['name']" :size="$compact ? 64 : 88" :class="$kind === 'out' ? 'opacity-60' : ''" />
        @else
            <x-nq::store-cart.image src-expr="line.image" alt-expr="line.name" :size="$compact ? 64 : 88" x-bind:class="outClass(line)" />
        @endif
        <div class="flex min-w-0 flex-1 flex-col gap-2">
            <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 flex-col gap-0.5">
                    <p class="text-body font-medium text-foreground [overflow-wrap:anywhere]" x-text="line.name">{{ $l['name'] ?? '' }}</p>
                    <p x-show="line.variantLabel" @if (empty($l['variantLabel'])) style="display: none" @endif class="text-caption text-muted-foreground" x-text="line.variantLabel">{{ $l['variantLabel'] ?? '' }}</p>
                    @if ($sku)
                        <p x-show="line.sku" @if (empty($l['sku'])) style="display: none" @endif class="text-caption text-muted-foreground">{{ $t('SKU', 'رمز المنتج') }} <bdi dir="ltr" x-text="line.sku">{{ $l['sku'] ?? '' }}</bdi></p>
                    @endif
                </div>
                <div class="flex shrink-0 flex-col items-end gap-0.5 text-end">
                    @include('nasaq::components.store-cart._money', [
                        'amount' => 'line.unitPrice * line.quantity', 'compare' => 'line.compareAt * line.quantity', 'compareShow' => 'hasCompare(line)', 'size' => 'sm',
                        'amountText' => $l ? nq_cart_price((int) $l['unitPrice'] * $qty, $code) : null,
                        'compareText' => $hasCompare ? nq_cart_money((int) $l['compareAt'] * $qty, $code) : null,
                    ])
                    <span x-show="multi(line)" @if (! $l || $qty <= 1) style="display: none" @endif class="text-caption text-muted-foreground"><span class="text-muted-foreground" x-text="money(line.unitPrice)">{{ $l ? nq_cart_money((int) $l['unitPrice'], $code) : '' }}</span> {{ $t('each', 'للقطعة') }}</span>
                </div>
            </div>
            <p data-slot="store-cart-stock" role="status" x-show="stockKind(line, {{ $savedJs }})" @unless ($kind) style="display: none" @endunless x-bind:class="stockClass(line, {{ $savedJs }})"
                class="flex items-center gap-1.5 text-caption {{ $kind === 'out' ? 'text-nq-danger-text' : ($kind === 'over' ? 'text-nq-warning-text' : 'text-muted-foreground') }}">
                <x-lucide-triangle-alert aria-hidden="true" class="size-3.5 shrink-0" />
                <span x-text="stockText(line, {{ $savedJs }})">{{ $stockText }}</span>
            </p>
            <div class="flex flex-wrap items-start gap-x-3 gap-y-2">
                @unless ($saved)
                    @if ($quantity)
                        <x-nq::store-cart.quantity-stepper bind :value="$l ? $qty : 1" :max="$l['maxQuantity'] ?? null" :name="$l['name'] ?? ''" />
                    @else
                        <p class="text-body-sm text-muted-foreground">{{ $t('Quantity', 'الكمية') }} <bdi dir="ltr" class="tabular-nums text-foreground" x-text="line.quantity">{{ $qty ?: '' }}</bdi></p>
                    @endif
                @endunless
                <div class="ms-auto flex flex-wrap items-center gap-1">
                    @if ($saved && $save)
                        <x-nq::button variant="secondary" size="sm" x-bind:disabled="isOut(line)" :disabled="$kind === 'out'" x-on:click="moveToCart(line.id)">
                            <x-lucide-shopping-bag aria-hidden="true" />
                            {{ $t('Move to cart', 'انقل إلى السلة') }}
                        </x-nq::button>
                    @elseif (! $saved && ! $compact && $save)
                        <x-nq::button variant="ghost" size="sm" x-on:click="saveForLater(line.id)">
                            <x-lucide-bookmark aria-hidden="true" />
                            {{ $t('Save for later', 'احفظ لوقت لاحق') }}
                        </x-nq::button>
                    @endif
                    @if ($remove)
                        @if ($compact)
                            <x-nq::button variant="ghost" size="icon-sm" :aria-label="$l ? $t('Remove '.$l['name'], 'إزالة '.$l['name']) : null" x-bind:aria-label="removeLabel(line)" x-on:click="remove(line.id)">
                                <x-lucide-trash-2 aria-hidden="true" />
                            </x-nq::button>
                        @else
                            <x-nq::button variant="ghost" size="sm" :aria-label="$l ? $t('Remove '.$l['name'], 'إزالة '.$l['name']) : null" x-bind:aria-label="removeLabel(line)" x-on:click="remove(line.id)">
                                <x-lucide-trash-2 aria-hidden="true" />
                                {{ $t('Remove', 'إزالة') }}
                            </x-nq::button>
                        @endif
                    @endif
                </div>
            </div>
        </div>
    </x-nq::context-menu.trigger>
    @if ($menu)
        <x-nq::context-menu.content class="min-w-44">
            @unless ($compact)
                @if ($openProduct)
                    <x-nq::context-menu.item x-on:click="openProduct(line)">
                        <x-lucide-eye aria-hidden="true" />
                        {{ $t('View product', 'عرض المنتج') }}
                    </x-nq::context-menu.item>
                @endif
                @if ($save)
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
                @endif
                @if (($openProduct || $save) && $remove)
                    <x-nq::context-menu.separator />
                @endif
            @endunless
            @if ($remove)
                <x-nq::context-menu.item variant="danger" x-on:click="remove(line.id)">
                    <x-lucide-trash-2 aria-hidden="true" />
                    {{ $t('Remove', 'إزالة') }}
                </x-nq::context-menu.item>
            @endif
        </x-nq::context-menu.content>
    @endif
</x-nq::context-menu>
