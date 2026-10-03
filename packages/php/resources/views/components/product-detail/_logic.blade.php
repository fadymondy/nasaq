{{-- Internal: the pure product model shared by the product-detail parts (port of web lib/commerce.ts and pdp-logic.ts).
     Included with @include('nasaq::components.product-detail._logic'); every function is defined once.
     A product is a plain array: id, name, brand?, category?, description?, badges?, rating? [average, count],
     images [[src, alt?]], options [[id, name, display?, values [[id, label, color?, image?]]]],
     variants [[id, sku?, options [optionId => valueId], price (minor units), compareAt?, stock?, allowBackorder?, image?]]. --}}
@php
    if (! function_exists('nq_pdp_in_stock')) {
        function nq_pdp_in_stock(?array $variant, int $quantity = 1): bool
        {
            if (! $variant) {
                return false;
            }
            if (! array_key_exists('stock', $variant) || $variant['stock'] === null || ! empty($variant['allowBackorder'])) {
                return true;
            }

            return $variant['stock'] >= $quantity;
        }

        function nq_pdp_find_variant(array $product, array $selection): ?array
        {
            foreach ($product['options'] ?? [] as $o) {
                if (empty($selection[$o['id']])) {
                    return count($product['variants']) === 1 && count($product['options'] ?? []) === 0 ? $product['variants'][0] : null;
                }
            }
            foreach ($product['variants'] as $v) {
                $all = true;
                foreach ($product['options'] ?? [] as $o) {
                    if (($v['options'][$o['id']] ?? null) !== $selection[$o['id']]) {
                        $all = false;
                        break;
                    }
                }
                if ($all) {
                    return $v;
                }
            }

            return null;
        }

        /** "available" | "out" | "none" for each value of one axis, given the other picks. */
        function nq_pdp_availability(array $product, array $selection, string $optionId): array
        {
            $out = [];
            $option = collect($product['options'] ?? [])->firstWhere('id', $optionId);
            foreach ($option['values'] ?? [] as $value) {
                $matches = array_filter($product['variants'], function ($v) use ($product, $selection, $optionId, $value) {
                    if (($v['options'][$optionId] ?? null) !== $value['id']) {
                        return false;
                    }
                    foreach ($product['options'] as $o) {
                        if ($o['id'] !== $optionId && ! empty($selection[$o['id']]) && ($v['options'][$o['id']] ?? null) !== $selection[$o['id']]) {
                            return false;
                        }
                    }

                    return true;
                });
                $out[$value['id']] = ! $matches ? 'none' : (collect($matches)->contains(fn ($v) => nq_pdp_in_stock($v)) ? 'available' : 'out');
            }

            return $out;
        }

        /** Picks the lone reachable value of every axis that has only one. */
        function nq_pdp_auto_select(array $product, array $selection): array
        {
            for ($guard = 0; $guard <= count($product['options'] ?? []); $guard++) {
                $changed = false;
                foreach ($product['options'] ?? [] as $o) {
                    if (! empty($selection[$o['id']])) {
                        continue;
                    }
                    $reachable = array_keys(array_filter(nq_pdp_availability($product, $selection, $o['id']), fn ($a) => $a !== 'none'));
                    if (count($reachable) === 1) {
                        $selection[$o['id']] = $reachable[0];
                        $changed = true;
                    }
                }
                if (! $changed) {
                    break;
                }
            }

            return $selection;
        }

        /** The first in-stock variant (or the preferred one), or nothing picked when blank. */
        function nq_pdp_initial_selection(array $product, ?string $variantId = null, bool $blank = false): array
        {
            if ($blank) {
                return nq_pdp_auto_select($product, []);
            }
            $variant = $variantId ? collect($product['variants'])->firstWhere('id', $variantId) : null;
            $variant ??= collect($product['variants'])->first(fn ($v) => nq_pdp_in_stock($v)) ?? ($product['variants'][0] ?? null);
            $selection = [];
            foreach ($product['options'] ?? [] as $o) {
                $selection[$o['id']] = $variant['options'][$o['id']] ?? null;
            }

            return $variant ? $selection : [];
        }

        /** ['kind' => untracked|backorder|out|unavailable|in-stock|low, 'left' => int] */
        function nq_pdp_stock_state(?array $v, int $low = 5): array
        {
            if (! $v) {
                return ['kind' => 'unavailable'];
            }
            if (! array_key_exists('stock', $v) || $v['stock'] === null) {
                return ['kind' => 'untracked'];
            }
            if ($v['stock'] <= 0) {
                return ['kind' => ! empty($v['allowBackorder']) ? 'backorder' : 'out'];
            }

            return ['kind' => $v['stock'] <= $low ? 'low' : 'in-stock', 'left' => $v['stock']];
        }

        function nq_pdp_discount(int|float $price, int|float|null $compareAt): int
        {
            return ! $compareAt || $compareAt <= $price ? 0 : (int) floor((($compareAt - $price) * 100) / $compareAt);
        }

        /** ['price', 'compareAt', 'percentOff', 'from'] for a variant, or the cheapest one while nothing is picked. */
        function nq_pdp_display_price(array $product, ?array $v): array
        {
            if ($v) {
                $off = nq_pdp_discount($v['price'], $v['compareAt'] ?? null);

                return ['price' => $v['price'], 'compareAt' => $off ? $v['compareAt'] : null, 'percentOff' => $off, 'from' => false];
            }
            $prices = array_column($product['variants'], 'price');
            $min = $prices ? min($prices) : 0;
            $max = $prices ? max($prices) : 0;
            $cheapest = collect($product['variants'])->firstWhere('price', $min);
            $off = $cheapest ? nq_pdp_discount($cheapest['price'], $cheapest['compareAt'] ?? null) : 0;

            return ['price' => $min, 'compareAt' => $off ? $cheapest['compareAt'] : null, 'percentOff' => $off, 'from' => $max > $min];
        }

        /** Most units one order may hold: stock (unless backorder or untracked), then the cap. null = no limit. */
        function nq_pdp_max_purchasable(?array $v, ?int $cap = null): ?int
        {
            $stock = $v && array_key_exists('stock', $v) && $v['stock'] !== null && empty($v['allowBackorder']) ? max($v['stock'], 0) : null;
            if ($stock === null) {
                return $cap;
            }

            return $cap === null ? $stock : min($stock, $cap);
        }

        /** [fromTimestamp, toTimestamp] (UTC midnight) of an order placed now, skipping weekdays (0 = Sunday). */
        function nq_pdp_delivery_window(\DateTimeInterface|string|int $now, array $days, array $skip = [], ?int $cutoffHour = null): array
        {
            $at = $now instanceof \DateTimeInterface ? \DateTimeImmutable::createFromInterface($now) : (is_int($now) ? (new \DateTimeImmutable('@'.$now)) : new \DateTimeImmutable($now));
            $at = $at->setTimezone(new \DateTimeZone('UTC'));
            $day = $at->setTime(0, 0)->getTimestamp();
            if ($cutoffHour !== null && (int) $at->format('G') >= $cutoffHour) {
                $day += 86400;
            }
            $add = function (int $n) use ($day, $skip): int {
                $cursor = $day;
                $left = max(0, $n);
                $guard = 0;
                while ($left > 0 && $guard++ < 400) {
                    $cursor += 86400;
                    if (! in_array((int) gmdate('w', $cursor), $skip, true)) {
                        $left--;
                    }
                }
                while (in_array((int) gmdate('w', $cursor), $skip, true) && count($skip) < 7 && $guard++ < 800) {
                    $cursor += 86400;
                }

                return $cursor;
            };

            return [$add(min($days)), $add(max($days))];
        }

        /** Formats minor units: whole amounts without decimals, a Latin currency symbol isolated in RTL. */
        function nq_pdp_money(int|float $minor, int $exponent, ?string $currency = null): string
        {
            $amount = $minor / (10 ** $exponent);
            $locale = app()->getLocale();
            $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
            $digits = floor($amount) == $amount ? 0 : $exponent;
            if (! class_exists(\NumberFormatter::class)) {
                return $code.' '.number_format($amount, $digits);
            }
            $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::CURRENCY);
            $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, $digits);
            $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $digits);
            $text = $f->formatCurrency($amount, $code);
            $symbol = $f->getSymbol(\NumberFormatter::CURRENCY_SYMBOL);
            if (preg_match('/[A-Za-z]/', $symbol)) {
                $text = preg_replace('/'.preg_quote($symbol, '/').'/u', "\u{2066}".$symbol."\u{2069}", $text, 1);
            }

            return $text;
        }

        /** "Mon, Jan 5 – Wed, Jan 7" in the app locale, Latin digits. */
        function nq_pdp_date_range(int $from, int $to): string
        {
            $locale = str_replace('_', '-', app()->getLocale());
            if (! class_exists(\IntlDateFormatter::class)) {
                return gmdate('D j M', $from).' - '.gmdate('D j M', $to);
            }
            $f = new \IntlDateFormatter($locale.'@numbers=latn', \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, 'UTC', null, 'EEE d MMM');

            return $from === $to ? $f->format($from) : $f->format($from).' – '.$f->format($to);
        }
    }
@endphp
