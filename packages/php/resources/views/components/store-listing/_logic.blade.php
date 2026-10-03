{{-- Internal: the pure listing model shared by the store-listing parts (PHP port of the web listing-model.ts, server side only:
     filter, sort, disjunctive facet counts, chips, paging). It renders the first state; the Alpine model in
     html/src/alpine/store-listing-model.ts keeps the same rules live. Included once with
     @include('nasaq::components.store-listing._logic'); every function is defined once.
     Filters: ['query' => '', 'category' => null, 'brands' => [], 'options' => [optionId => [valueId]], 'price' => [min, max] (minor units) | null,
     'minRating' => null, 'inStock' => false, 'onSale' => false]. A product is the same array product-detail takes, plus tags?, badges?, slug?. --}}
@php
    if (! function_exists('nq_sl_filters')) {
        function nq_sl_filters(?array $f = null): array
        {
            return array_merge(['query' => '', 'category' => null, 'brands' => [], 'options' => [], 'price' => null, 'minRating' => null, 'inStock' => false, 'onSale' => false], $f ?? []);
        }

        function nq_sl_normalize(string $text): string
        {
            $text = class_exists(\Normalizer::class) ? (\Normalizer::normalize($text, \Normalizer::FORM_KD) ?: $text) : $text;
            $text = preg_replace('/[\x{0300}-\x{036F}\x{064B}-\x{065F}\x{0670}\x{0640}]/u', '', $text);
            $text = preg_replace(['/[آأإ]/u', '/ى/u', '/ة/u'], ['ا', 'ي', 'ه'], $text);

            return trim(mb_strtolower($text));
        }

        function nq_sl_tokens(string $text): array
        {
            return array_values(array_filter(preg_split('/[\s,.;:\/\\\\|-]+/u', nq_sl_normalize($text)), fn ($t) => $t !== ''));
        }

        function nq_sl_in_stock(array $v): bool
        {
            return ! array_key_exists('stock', $v) || $v['stock'] === null || ! empty($v['allowBackorder']) || $v['stock'] >= 1;
        }

        function nq_sl_on_sale(array $v): bool
        {
            return isset($v['compareAt']) && $v['compareAt'] > $v['price'];
        }

        function nq_sl_discount(int|float $price, int|float|null $compareAt): int
        {
            return ! $compareAt || $compareAt <= $price ? 0 : (int) floor((($compareAt - $price) * 100) / $compareAt);
        }

        function nq_sl_min_price(array $p): int|float
        {
            return $p['variants'] ? min(array_column($p['variants'], 'price')) : 0;
        }

        function nq_sl_cheapest(array $p): ?array
        {
            $best = null;
            foreach ($p['variants'] as $v) {
                if ($best === null || $v['price'] < $best['price']) {
                    $best = $v;
                }
            }

            return $best;
        }

        function nq_sl_best_discount(array $p): int
        {
            return array_reduce($p['variants'], fn ($b, $v) => max($b, nq_sl_discount($v['price'], $v['compareAt'] ?? null)), 0);
        }

        function nq_sl_product_in_stock(array $p): bool
        {
            foreach ($p['variants'] as $v) {
                if (nq_sl_in_stock($v)) {
                    return true;
                }
            }

            return false;
        }

        function nq_sl_has_price_range(array $p): bool
        {
            return count(array_unique(array_column($p['variants'], 'price'))) > 1;
        }

        function nq_sl_price_bounds(array $products): array
        {
            $prices = [];
            foreach ($products as $p) {
                foreach ($p['variants'] as $v) {
                    $prices[] = $v['price'];
                }
            }

            return $prices ? ['min' => min($prices), 'max' => max($prices)] : ['min' => 0, 'max' => 0];
        }

        function nq_sl_search_score(array $p, string $query): int
        {
            $words = nq_sl_tokens($query);
            if (! $words) {
                return 1;
            }
            $all = nq_sl_normalize(implode(' ', array_filter([$p['name'], $p['brand'] ?? null, $p['category'] ?? null, $p['description'] ?? null, ...($p['tags'] ?? []), ...array_column($p['variants'], 'sku')])));
            $name = nq_sl_normalize($p['name']);
            $brand = nq_sl_normalize($p['brand'] ?? '');
            $category = nq_sl_normalize($p['category'] ?? '');
            $score = 0;
            foreach ($words as $w) {
                if (! str_contains($all, $w)) {
                    return 0;
                }
                if (str_starts_with($name, $w)) {
                    $score += 12;
                } elseif (array_filter(preg_split('/\s+/u', $name), fn ($n) => str_starts_with($n, $w))) {
                    $score += 8;
                } elseif (str_contains($name, $w)) {
                    $score += 5;
                }
                if (str_contains($brand, $w)) {
                    $score += 3;
                }
                if (str_contains($category, $w)) {
                    $score += 2;
                }
                $score += 1;
            }

            return $score;
        }

        function nq_sl_descendants(array $tree, string $id): array
        {
            $collect = function (array $node) use (&$collect): array {
                $out = [$node['id']];
                foreach ($node['children'] ?? [] as $c) {
                    $out = array_merge($out, $collect($c));
                }

                return $out;
            };
            $find = function (array $nodes) use (&$find, $collect, $id): ?array {
                foreach ($nodes as $n) {
                    if ($n['id'] === $id) {
                        return $collect($n);
                    }
                    if ($r = $find($n['children'] ?? [])) {
                        return $r;
                    }
                }

                return null;
            };

            return $find($tree) ?? [];
        }

        function nq_sl_category_path(array $tree, string $id): array
        {
            foreach ($tree as $n) {
                if ($n['id'] === $id) {
                    return [$n['id']];
                }
                $inner = nq_sl_category_path($n['children'] ?? [], $id);
                if ($inner) {
                    return [$n['id'], ...$inner];
                }
            }

            return [];
        }

        function nq_sl_variant_matches(array $v, array $f, ?string $skip): bool
        {
            foreach ($f['options'] as $optionId => $values) {
                if (! $values || $skip === 'option:'.$optionId) {
                    continue;
                }
                if (! in_array($v['options'][$optionId] ?? null, $values, true)) {
                    return false;
                }
            }
            if ($f['inStock'] && $skip !== 'stock' && ! nq_sl_in_stock($v)) {
                return false;
            }
            if ($f['onSale'] && $skip !== 'sale' && ! nq_sl_on_sale($v)) {
                return false;
            }
            if ($f['price'] && $skip !== 'price' && ($v['price'] < $f['price'][0] || $v['price'] > $f['price'][1])) {
                return false;
            }

            return true;
        }

        function nq_sl_has_variant_constraint(array $f, ?string $skip): bool
        {
            foreach ($f['options'] as $id => $values) {
                if ($values && $skip !== 'option:'.$id) {
                    return true;
                }
            }

            return ($f['inStock'] && $skip !== 'stock') || ($f['onSale'] && $skip !== 'sale') || ($f['price'] !== null && $skip !== 'price');
        }

        function nq_sl_matches(array $p, array $f, array $tree = [], ?string $skip = null): bool
        {
            if ($skip !== 'query' && trim($f['query']) !== '' && nq_sl_search_score($p, $f['query']) === 0) {
                return false;
            }
            if ($skip !== 'category' && $f['category']) {
                $ids = $tree ? nq_sl_descendants($tree, $f['category']) : [$f['category']];
                if (! in_array($p['category'] ?? '', $ids, true)) {
                    return false;
                }
            }
            if ($skip !== 'brand' && $f['brands'] && ! in_array($p['brand'] ?? '', $f['brands'], true)) {
                return false;
            }
            if ($skip !== 'rating' && $f['minRating'] !== null && (($p['rating']['average'] ?? 0) < $f['minRating'])) {
                return false;
            }
            if (! $p['variants']) {
                return ! nq_sl_has_variant_constraint($f, $skip);
            }
            foreach ($p['variants'] as $v) {
                if (nq_sl_variant_matches($v, $f, $skip)) {
                    return true;
                }
            }

            return false;
        }

        function nq_sl_filter(array $products, array $f, array $tree = []): array
        {
            return array_values(array_filter($products, fn ($p) => nq_sl_matches($p, $f, $tree)));
        }

        function nq_sl_count(array $products, array $f, array $tree): int
        {
            return count(nq_sl_filter($products, $f, $tree));
        }

        /** Stable sort of the products; "relevance" ranks by query score when there is a query. */
        function nq_sl_sort(array $products, string $sort, string $query = ''): array
        {
            $indexed = [];
            foreach (array_values($products) as $i => $p) {
                $indexed[] = [$p, $i];
            }
            $rating = fn ($p) => $p['rating']['average'] ?? 0;
            $cmp = function ($a, $b) use ($sort, $query, $rating) {
                $c = match ($sort) {
                    'popular' => ($b['rating']['count'] ?? 0) <=> ($a['rating']['count'] ?? 0),
                    'rating' => $rating($b) <=> $rating($a) ?: ($b['rating']['count'] ?? 0) <=> ($a['rating']['count'] ?? 0),
                    'price-asc' => nq_sl_min_price($a) <=> nq_sl_min_price($b),
                    'price-desc' => nq_sl_min_price($b) <=> nq_sl_min_price($a),
                    'discount' => nq_sl_best_discount($b) <=> nq_sl_best_discount($a),
                    'name' => strcmp($a['name'], $b['name']),
                    default => trim($query) !== '' ? nq_sl_search_score($b, $query) <=> nq_sl_search_score($a, $query) : 0,
                };

                return $c;
            };
            usort($indexed, fn ($x, $y) => $cmp($x[0], $y[0]) ?: $x[1] <=> $y[1]);

            return array_map(fn ($x) => $x[0], $indexed);
        }

        /** Labels of every option value across the catalogue (first product wins). */
        function nq_sl_label_index(array $products, array $tree = []): array
        {
            $categories = [];
            $walk = function (array $nodes) use (&$walk, &$categories) {
                foreach ($nodes as $n) {
                    $categories[$n['id']] = $n['label'];
                    $walk($n['children'] ?? []);
                }
            };
            $walk($tree);
            $options = [];
            foreach ($products as $p) {
                if (! empty($p['category']) && ! isset($categories[$p['category']])) {
                    $categories[$p['category']] = $p['category'];
                }
                foreach ($p['options'] ?? [] as $o) {
                    $options[$o['id']] ??= ['name' => $o['name'], 'display' => $o['display'] ?? 'button', 'values' => []];
                    foreach ($o['values'] as $val) {
                        $options[$o['id']]['values'][$val['id']] ??= ['label' => $val['label'], 'color' => $val['color'] ?? null, 'image' => $val['image'] ?? null];
                    }
                }
            }

            return ['categories' => $categories, 'options' => $options];
        }

        /** Disjunctive facet counts for the current filters, plus the static lists (tree, brands, options). */
        function nq_sl_facets(array $products, array $f, array $tree = [], ?array $index = null): array
        {
            $index ??= nq_sl_label_index($products, $tree);
            $path = $f['category'] ? nq_sl_category_path($tree, $f['category']) : [];
            $catCount = fn ($id) => nq_sl_count($products, ['category' => $id] + $f, $tree);
            $cat = function (array $n) use (&$cat, $f, $path, $catCount): array {
                return ['id' => $n['id'], 'label' => $n['label'], 'count' => $catCount($n['id']), 'selected' => $f['category'] === $n['id'], 'open' => in_array($n['id'], $path, true), 'children' => array_map($cat, $n['children'] ?? [])];
            };
            if ($tree) {
                $categories = array_map($cat, $tree);
            } else {
                $categories = [];
                foreach (array_unique(array_filter(array_column($products, 'category'))) as $id) {
                    $categories[] = ['id' => $id, 'label' => $index['categories'][$id] ?? $id, 'count' => $catCount($id), 'selected' => $f['category'] === $id, 'open' => $f['category'] === $id, 'children' => []];
                }
            }
            $brands = [];
            foreach (array_unique(array_filter(array_column($products, 'brand'))) as $b) {
                $brands[] = ['id' => $b, 'label' => $b, 'count' => nq_sl_count($products, ['brands' => [$b]] + $f, $tree), 'selected' => in_array($b, $f['brands'], true)];
            }
            usort($brands, fn ($a, $b) => $b['count'] <=> $a['count'] ?: strcmp($a['label'], $b['label']));
            $options = [];
            foreach ($index['options'] as $id => $meta) {
                $values = [];
                foreach ($meta['values'] as $vid => $v) {
                    $values[] = ['id' => $vid, 'label' => $v['label'], 'color' => $v['color'], 'image' => $v['image'],
                        'count' => nq_sl_count($products, ['options' => [$id => [$vid]] + $f['options']] + $f, $tree), 'selected' => in_array($vid, $f['options'][$id] ?? [], true)];
                }
                $options[] = ['id' => $id, 'name' => $meta['name'], 'display' => $meta['display'], 'values' => $values];
            }
            $ratings = array_map(fn ($min) => ['min' => $min, 'count' => nq_sl_count($products, ['minRating' => $min] + $f, $tree), 'selected' => $f['minRating'] === $min], [4, 3, 2, 1]);

            return [
                'categories' => $categories, 'brands' => $brands, 'options' => $options, 'ratings' => $ratings,
                'inStock' => nq_sl_count($products, ['inStock' => true] + $f, $tree), 'onSale' => nq_sl_count($products, ['onSale' => true] + $f, $tree),
                'price' => nq_sl_price_bounds($products),
            ];
        }

        /** One chip per applied value: ['id', 'kind', 'value', 'optionId'?]. */
        function nq_sl_chips(array $f, bool $withQuery = false): array
        {
            $chips = [];
            if ($withQuery && trim($f['query']) !== '') {
                $chips[] = ['id' => 'query', 'kind' => 'query', 'value' => trim($f['query'])];
            }
            if ($f['category']) {
                $chips[] = ['id' => 'category:'.$f['category'], 'kind' => 'category', 'value' => $f['category']];
            }
            foreach ($f['brands'] as $b) {
                $chips[] = ['id' => 'brand:'.$b, 'kind' => 'brand', 'value' => $b];
            }
            foreach ($f['options'] as $optionId => $values) {
                foreach ($values as $v) {
                    $chips[] = ['id' => 'option:'.$optionId.':'.$v, 'kind' => 'option', 'optionId' => $optionId, 'value' => $v];
                }
            }
            if ($f['price']) {
                $chips[] = ['id' => 'price', 'kind' => 'price', 'value' => $f['price']];
            }
            if ($f['minRating'] !== null) {
                $chips[] = ['id' => 'rating', 'kind' => 'rating', 'value' => $f['minRating']];
            }
            if ($f['inStock']) {
                $chips[] = ['id' => 'stock', 'kind' => 'stock'];
            }
            if ($f['onSale']) {
                $chips[] = ['id' => 'sale', 'kind' => 'sale'];
            }

            return $chips;
        }

        function nq_sl_chip_label(array $chip, array $index, callable $money): string
        {
            return match ($chip['kind']) {
                'query' => '“'.$chip['value'].'”',
                'category' => $index['categories'][$chip['value']] ?? $chip['value'],
                'brand' => $chip['value'],
                'option' => $index['options'][$chip['optionId']]['values'][$chip['value']]['label'] ?? $chip['value'],
                'price' => $money($chip['value'][0]).' – '.$money($chip['value'][1]),
                'rating' => nq_sl_t('andUp', ['n' => $chip['value']]),
                'stock' => nq_sl_t('inStock'),
                'sale' => nq_sl_t('onSale'),
            };
        }

        function nq_sl_page(int $total, int $page, int $size): array
        {
            $size = max(1, $size);
            $count = max(1, (int) ceil($total / $size));
            $current = min(max($page, 1), $count);
            $start = ($current - 1) * $size;
            $end = min($start + $size, $total);

            return ['page' => $current, 'pageCount' => $count, 'total' => $total, 'from' => $total ? $start + 1 : 0, 'to' => $end, 'start' => $start, 'end' => $end];
        }

        /** Minor-unit exponent of a currency (USD 2, JPY 0, KWD 3). */
        function nq_sl_exponent(string $code): int
        {
            if (! class_exists(\NumberFormatter::class)) {
                return ['JPY' => 0, 'KRW' => 0, 'KWD' => 3, 'BHD' => 3, 'OMR' => 3][$code] ?? 2;
            }
            $f = new \NumberFormatter('en', \NumberFormatter::CURRENCY);
            $f->setTextAttribute(\NumberFormatter::CURRENCY_CODE, $code);

            return (int) $f->getAttribute(\NumberFormatter::MAX_FRACTION_DIGITS);
        }

        /** Money for a minor-unit amount, Latin digits, in the page locale; whole amounts show no decimals (like formatMoney compact). */
        function nq_sl_money(int|float $minor, int $exp, string $code): string
        {
            $value = $minor / (10 ** $exp);
            $digits = floor($value) == $value ? 0 : $exp;
            if (! class_exists(\NumberFormatter::class)) {
                return $code.' '.number_format($value, $digits);
            }
            $f = new \NumberFormatter(str_replace('_', '-', app()->getLocale()).'@numbers=latn', \NumberFormatter::CURRENCY);
            $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, $digits);
            $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $digits);

            return $f->formatCurrency($value, $code);
        }
    }
@endphp
