{{-- Internal: the small PHP helpers shared by the store-cart parts (the cart itself is worked out in the browser by nqStoreCart).
     Included with @include('nasaq::components.store-cart._logic'); every function is defined once.
     A cart line is a plain array: id, productId, variantId, name, variantLabel?, image?, unitPrice (minor units), compareAt?, quantity, maxQuantity?, sku?, savedForLater?.
     A product (for the cross-sell) is the product-detail shape: id, name, category?, images [[src, alt?]] or [['src' =>, 'alt' =>]],
     options [[id, name, values [[id, label]]]], variants [[id, options [optionId => valueId], price (minor units), compareAt?, stock?, allowBackorder?, image?]]. --}}
@php
    if (! function_exists('nq_cart_exponent')) {
        /** Decimal places of a currency (USD 2, JPY 0, KWD 3). */
        function nq_cart_exponent(string $currency): int
        {
            if (class_exists(\NumberFormatter::class)) {
                $f = new \NumberFormatter('en@numbers=latn', \NumberFormatter::CURRENCY);
                $f->setTextAttribute(\NumberFormatter::CURRENCY_CODE, strtoupper($currency));

                return (int) $f->getAttribute(\NumberFormatter::FRACTION_DIGITS);
            }

            return 2;
        }

        /** Minor units to a major-unit number for <x-nq::price>. */
        function nq_cart_major(int|float $minor, string $currency): int|float
        {
            $major = $minor / (10 ** nq_cart_exponent($currency));

            return floor($major) == $major ? (int) $major : $major;
        }

        /** True for a line saved for later (the same flag the Alpine cart reads). */
        function nq_cart_saved(array $line): bool
        {
            return ! empty($line['savedForLater']);
        }

        /** Server-side twin of the browser totals (no shipping chosen yet): subtotal, discount, tax, total, itemCount, savings (minor units). */
        function nq_cart_totals(array $lines, int $discount = 0, ?int $taxBps = null, bool $taxInclusive = false): array
        {
            $subtotal = $savings = $count = 0;
            foreach ($lines as $l) {
                if (nq_cart_saved($l)) {
                    continue;
                }
                $q = (int) $l['quantity'];
                $subtotal += (int) $l['unitPrice'] * $q;
                $count += $q;
                if (! empty($l['compareAt']) && $l['compareAt'] > $l['unitPrice']) {
                    $savings += ((int) $l['compareAt'] - (int) $l['unitPrice']) * $q;
                }
            }
            $applied = min(max($discount, 0), $subtotal);
            $base = $subtotal - $applied;
            $tax = $taxBps ? ($taxInclusive ? $base - (int) round(($base * 10000) / (10000 + $taxBps)) : (int) round(($base * $taxBps) / 10000)) : 0;

            return ['subtotal' => $subtotal, 'discount' => $applied, 'tax' => $tax, 'total' => $base + ($taxInclusive ? 0 : $tax), 'itemCount' => $count, 'savings' => $savings + $applied];
        }

        /** Minor units as money, like the browser's money(): whole amounts without decimals, Latin digits. */
        function nq_cart_money(int|float $minor, string $currency): string
        {
            $value = $minor / (10 ** nq_cart_exponent($currency));
            $digits = floor($value) == $value ? 0 : nq_cart_exponent($currency);
            if (! class_exists(\NumberFormatter::class)) {
                return strtoupper($currency).' '.number_format($value, $digits);
            }
            $f = new \NumberFormatter(str_replace('_', '-', app()->getLocale()).'@numbers=latn', \NumberFormatter::CURRENCY);
            $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, $digits);
            $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $digits);

            return (string) $f->formatCurrency($value, strtoupper($currency));
        }

        /** Like nq_cart_money(), but 0 reads "Free". */
        function nq_cart_price(int|float $minor, string $currency): string
        {
            return $minor == 0 ? \Nasaq\Nasaq::t('Free', 'مجاني') : nq_cart_money($minor, $currency);
        }

        /** "1 item", "2 items" (Arabic singular, dual and plural forms). */
        function nq_cart_items_text(int $n): string
        {
            return \Nasaq\Nasaq::t($n.' '.($n === 1 ? 'item' : 'items'), $n === 1 ? 'عنصر واحد' : ($n === 2 ? 'عنصران' : ($n >= 3 && $n <= 10 ? $n.' عناصر' : $n.' عنصرًا')));
        }

        /** The stock problem of a line: ['kind' => out|over|low, 'available' => n] or null. */
        function nq_cart_stock_issue(array $line): ?array
        {
            if (! array_key_exists('maxQuantity', $line) || $line['maxQuantity'] === null) {
                return null;
            }
            $max = (int) $line['maxQuantity'];
            if ($max <= 0) {
                return ['kind' => 'out', 'available' => 0];
            }
            if ((int) $line['quantity'] > $max) {
                return ['kind' => 'over', 'available' => $max];
            }

            return $max <= 5 ? ['kind' => 'low', 'available' => $max] : null;
        }

        function nq_cart_variant_in_stock(?array $variant): bool
        {
            if (! $variant) {
                return false;
            }
            if (! array_key_exists('stock', $variant) || $variant['stock'] === null || ! empty($variant['allowBackorder'])) {
                return true;
            }

            return $variant['stock'] >= 1;
        }

        function nq_cart_image_src(?array $image): ?string
        {
            return $image ? ($image['src'] ?? $image[0] ?? null) : null;
        }

        function nq_cart_image_alt(?array $image): ?string
        {
            return $image ? ($image['alt'] ?? $image[1] ?? null) : null;
        }

        /** The cheapest variant price of a product, minor units. */
        function nq_cart_min_price(array $product): int
        {
            $prices = array_map(fn ($v) => (int) $v['price'], $product['variants'] ?? []);

            return $prices ? min($prices) : 0;
        }

        /**
         * The cart line to add for a product: the given variant or the first one in stock; null when sold out.
         * The label joins the option values ("Black · M"); maxQuantity is the stock unless it can be backordered.
         */
        function nq_cart_item_from_product(array $product, ?string $variantId = null): ?array
        {
            $variants = $product['variants'] ?? [];
            $variant = null;
            if ($variantId !== null) {
                foreach ($variants as $v) {
                    if (($v['id'] ?? null) === $variantId) {
                        $variant = $v;
                    }
                }
            }
            if (! $variant) {
                foreach ($variants as $v) {
                    if (nq_cart_variant_in_stock($v)) {
                        $variant = $v;
                        break;
                    }
                }
            }
            if (! $variant || ! nq_cart_variant_in_stock($variant)) {
                return null;
            }
            $parts = [];
            foreach ($product['options'] ?? [] as $o) {
                foreach ($o['values'] ?? [] as $x) {
                    if (($x['id'] ?? null) === ($variant['options'][$o['id']] ?? null)) {
                        $parts[] = $x['label'];
                    }
                }
            }
            $image = $variant['image'] ?? nq_cart_image_src($product['images'][0] ?? null);
            $item = [
                'productId' => $product['id'],
                'variantId' => $variant['id'],
                'name' => $product['name'],
                'unitPrice' => (int) $variant['price'],
            ];
            if ($parts) {
                $item['variantLabel'] = implode(' · ', $parts);
            }
            if ($image) {
                $item['image'] = $image;
            }
            if (! empty($variant['compareAt']) && $variant['compareAt'] > $variant['price']) {
                $item['compareAt'] = (int) $variant['compareAt'];
            }
            if (array_key_exists('stock', $variant) && $variant['stock'] !== null && empty($variant['allowBackorder'])) {
                $item['maxQuantity'] = (int) $variant['stock'];
            }

            return $item;
        }
    }
@endphp
