{{-- Internal: the small PHP helpers shared by the store-cart parts (the cart itself is worked out in the browser by nqStoreCart).
     Included with @include('nasaq::components.store-cart._logic'); every function is defined once.
     A cart line is a plain array: id, productId, variantId, name, variantLabel?, image?, unitPrice (minor units), compareAt?, quantity, maxQuantity?, sku?, saved?.
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
