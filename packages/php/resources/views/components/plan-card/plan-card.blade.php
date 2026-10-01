{{-- <x-nq::plan-card name="Team" description="For small teams." highlighted badge="Most popular" :features="['Unlimited projects', ['label' => 'SSO', 'included' => false]]"> <x-slot:price>…</x-slot:price> <x-slot:action><x-nq::button>Start trial</x-nq::button></x-slot:action> </x-nq::plan-card>
     One pricing plan. Plans are separated by space and a quiet surface, not borders; the recommended one is tinted with the product's brand colour and lifted. Lay several out with <x-nq::plan-card.grid>.
     name, description, price-note, features-title, footnote and badge are attributes (or the name, description… slots). price (usually a price) and action (the plan's button; only the highlighted plan's should be primary) are slots.
     features: strings, or ['label' => …, 'included' => false, 'hint' => '…']. included false lists it as not included (a muted dash); hint shows a tooltip on the label.
     highlighted: the recommended plan, use on at most one. current: the plan the account is on now (a neutral ring and a "Current plan" pill, unless badge is set). --}}
@props(['name' => null, 'description' => null, 'priceNote' => null, 'features' => [], 'featuresTitle' => null, 'footnote' => null, 'highlighted' => false, 'current' => false, 'badge' => null, 'price' => null, 'action' => null])
@php
    $has = fn ($v) => $v !== null && trim((string) $v) !== '';
    $id = 'nq-plan-'.\Illuminate\Support\Str::slug(strip_tags((string) $name));
    $pill = $has($badge) ? $badge : ($current ? \Nasaq\Nasaq::t('Current plan', 'خطتك الحالية') : null);
    $items = array_map(function ($item) {
        $f = is_array($item) ? $item : ['label' => $item];

        return ['label' => $f['label'] ?? '', 'hint' => $f['hint'] ?? null, 'included' => ($f['included'] ?? true) !== false];
    }, (array) $features);
@endphp
<article data-slot="plan-card" @if ($highlighted) data-highlighted @endif @if ($current) data-current @endif aria-labelledby="{{ $id }}"
    {{ $attributes->cn([
        'relative flex min-w-0 flex-col gap-5 rounded-card p-6',
        $highlighted
            ? 'bg-[color-mix(in_oklab,var(--nq-brand)_9%,var(--nq-surface))] shadow-lg ring-2 ring-nq-brand/50'
            : ($current ? 'bg-nq-surface ring-1 ring-nq-line-strong' : 'bg-nq-surface'),
    ]) }}>
    @if ($has($pill))
        <span data-slot="plan-card-badge"
            class="{{ \Nasaq\Cn::merge('absolute -top-3 start-6 inline-flex h-6 items-center rounded-full border px-2.5 text-caption font-medium whitespace-nowrap', $highlighted ? 'border-transparent bg-primary text-primary-foreground' : 'border-border bg-card text-foreground') }}">{{ $pill }}</span>
    @endif
    <div class="flex flex-col gap-1">
        <h3 id="{{ $id }}" class="text-h3 text-foreground">{{ $name }}</h3>
        @if ($has($description))
            <p class="text-body-sm text-muted-foreground">{{ $description }}</p>
        @endif
    </div>
    <div class="flex flex-col gap-1">
        {{ $price }}
        @if ($has($priceNote))
            <p class="text-caption text-muted-foreground">{{ $priceNote }}</p>
        @endif
    </div>
    @if ($has($action) || $has($footnote))
        <div class="flex flex-col gap-2">
            {{ $action }}
            @if ($has($footnote))
                <p class="text-center text-caption text-muted-foreground">{{ $footnote }}</p>
            @endif
        </div>
    @endif
    @if (count($items) > 0)
        <div class="flex flex-col gap-3 border-t border-border pt-5">
            @if ($has($featuresTitle))
                <p class="text-label text-foreground">{{ $featuresTitle }}</p>
            @endif
            <ul class="flex flex-col gap-2.5">
                @foreach ($items as $feature)
                    <li @if ($feature['included']) data-included @endif class="{{ \Nasaq\Cn::merge('flex items-start gap-2 text-body-sm', $feature['included'] ? 'text-foreground' : 'text-muted-foreground') }}">
                        @if ($feature['included'])
                            <x-lucide-check aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-brand" />
                        @else
                            <x-lucide-minus aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
                        @endif
                        <span>
                            @if ($feature['hint'])
                                <x-nq::tooltip :content="$feature['hint']"><span tabindex="0" class="cursor-help underline decoration-nq-line decoration-dotted underline-offset-4">{{ $feature['label'] }}</span></x-nq::tooltip>
                            @else
                                {{ $feature['label'] }}
                            @endif
                            @unless ($feature['included'])
                                <span class="sr-only"> ({{ \Nasaq\Nasaq::t('Not included', 'غير مشمول') }})</span>
                            @endunless
                        </span>
                    </li>
                @endforeach
            </ul>
        </div>
    @endif
</article>
