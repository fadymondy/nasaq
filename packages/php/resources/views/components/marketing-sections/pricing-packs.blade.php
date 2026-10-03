{{-- <x-nq::marketing-sections.pricing-packs title="Top up" :packs="[['id' => 's', 'name' => 'Starter', 'credits' => 500, 'price' => 9], ['id' => 'p', 'name' => 'Pro', 'credits' => 2500, 'bonus' => 250, 'price' => 39, 'highlighted' => true, 'badge' => 'Best value']]" />
     One-off bundles of credits, tokens or seats. Not a subscription: there is no period, so no plan comparison (use plan-card for recurring plans). Amounts use Latin digits and the pack's currency (USD, or SAR in Arabic).
     packs: [['id', 'name', 'credits', 'bonus', 'price', 'currency', 'highlighted' (the best value, on at most one), 'badge', 'description']].
     show-unit-price: what each unit costs (true). labels: ['buy' => , 'bonus' => , 'unit' => , 'perUnit' => ]. eyebrow, title, description, title-as.
     Needs the Alpine runtime: Buy fires `nq-purchase` on the section with detail { pack, wait(promise) }; call detail.wait(promise) to keep that button loading (and the others disabled) until the promise settles.
     In Alpine: <x-nq::marketing-sections.pricing-packs … x-on:nq-purchase="$event.detail.wait(fetch('/buy/' + $event.detail.pack.id, { method: 'POST' }))" /> --}}
@props(['eyebrow' => null, 'title' => null, 'description' => null, 'packs' => [], 'showUnitPrice' => true, 'labels' => [], 'titleAs' => 'h2'])
@php
    $locale = app()->getLocale();
    $ar = str_starts_with(strtolower($locale), 'ar');
    $strings = $ar
        ? ['buy' => 'شراء', 'bonus' => 'إضافي', 'unit' => 'رصيد', 'perUnit' => 'للرصيد']
        : ['buy' => 'Buy', 'bonus' => 'bonus', 'unit' => 'credits', 'perUnit' => 'per credit'];
    $t = array_merge($strings, array_filter((array) $labels, fn ($v) => $v !== null));
    $has = fn ($v) => $v !== null && trim((string) $v) !== '';
    $headingId = 'nq-packs-'.substr(md5((string) $title.count($packs)), 0, 8);
    $tag = str_replace('_', '-', $locale).'@numbers=latn';
    $number = function (float|int $n) use ($tag): string {
        return class_exists(\NumberFormatter::class) ? (new \NumberFormatter($tag, \NumberFormatter::DECIMAL))->format($n) : number_format($n);
    };
    $currencyOf = fn (array $pack): string => strtoupper($pack['currency'] ?? \Nasaq\Nasaq::currency($locale));
    $unitText = function (array $pack, float $unit) use ($tag, $currencyOf): string {
        if (! class_exists(\NumberFormatter::class)) {
            return $currencyOf($pack).' '.number_format($unit, 3);
        }
        $f = new \NumberFormatter($tag, \NumberFormatter::CURRENCY);
        $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, 3);

        return $f->formatCurrency($unit, $currencyOf($pack));
    };
    $packs = array_values($packs);
    $config = ['packs' => array_map(fn ($p) => array_intersect_key($p, array_flip(['id', 'name', 'credits', 'bonus', 'price', 'currency'])), $packs)];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'pricing-packs') }}" @if ($has($title)) aria-labelledby="{{ $headingId }}" @endif x-data="nqPricingPacks({{ \Illuminate\Support\Js::from($config) }})"
    {{ $attributes->except('data-slot')->cn('@container flex min-w-0 flex-col gap-8') }}>
    @include('nasaq::components.marketing-sections._intro', ['eyebrow' => $eyebrow, 'title' => $title, 'description' => $description, 'headingId' => $headingId, 'titleAs' => $titleAs, 'align' => 'start'])
    <ul class="grid grid-cols-1 gap-4 @2xl:grid-cols-[repeat(var(--packs),minmax(0,1fr))]" style="--packs: {{ min(count($packs), 4) }}">
        @foreach ($packs as $pack)
            @php
                $bonus = $pack['bonus'] ?? 0;
                $total = $pack['credits'] + $bonus;
                $unit = $total > 0 ? $pack['price'] / $total : 0;
                $highlighted = ! empty($pack['highlighted']);
                $id = e($pack['id']);
            @endphp
            <li class="min-w-0">
                <article class="{{ \Nasaq\Cn::merge('flex h-full min-w-0 flex-col gap-4 rounded-card p-5', $highlighted ? 'border border-nq-brand/40 bg-nq-selected' : 'border border-border bg-card') }}">
                    <div class="flex items-center justify-between gap-2">
                        <h3 class="font-semibold text-foreground text-h3">{{ $pack['name'] }}</h3>
                        @if ($has($pack['badge'] ?? null))<x-nq::badge variant="brand">{{ $pack['badge'] }}</x-nq::badge>@endif
                    </div>
                    <div class="flex flex-col gap-1">
                        <div class="flex items-baseline gap-1.5">
                            <bdi class="font-semibold text-display text-foreground tabular-nums">{{ $number($pack['credits']) }}</bdi>
                            <span class="text-body-sm text-muted-foreground">{{ $t['unit'] }}</span>
                        </div>
                        @if ($bonus)
                            <div class="text-caption text-nq-success-text"><bdi>+{{ $number($bonus) }}</bdi> {{ $t['bonus'] }}</div>
                        @endif
                        @if ($has($pack['description'] ?? null))<p class="text-body-sm text-nq-fg-body">{{ $pack['description'] }}</p>@endif
                    </div>
                    <div class="mt-auto flex flex-col gap-3">
                        <div class="flex flex-col gap-0.5">
                            <x-nq::price :amount="$pack['price']" :currency="$currencyOf($pack)" size="lg" />
                            @if ($showUnitPrice && $unit > 0)
                                <span class="text-caption text-muted-foreground"><bdi dir="ltr">{{ $unitText($pack, $unit) }}</bdi> {{ $t['perUnit'] }}</span>
                            @endif
                        </div>
                        <x-nq::button :variant="$highlighted ? 'primary' : 'secondary'" class="w-full" data-pack="{{ $pack['id'] }}"
                            x-on:click="buy(`{{ $id }}`)" x-bind:aria-busy="busyAttr(`{{ $id }}`)" x-bind:disabled="blocked(`{{ $id }}`)" x-bind:data-disabled="disabledAttr(`{{ $id }}`)">
                            <template x-if="isBusy(`{{ $id }}`)"><x-nq::spinner /></template>
                            {{ $t['buy'] }}
                        </x-nq::button>
                    </div>
                </article>
            </li>
        @endforeach
    </ul>
</section>
