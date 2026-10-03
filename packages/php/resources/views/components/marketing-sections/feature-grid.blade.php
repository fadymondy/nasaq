{{-- <x-nq::marketing-sections.feature-grid title="Everything you need" :features="[['icon' => 'zap', 'title' => 'Fast', 'description' => 'Pages load at once.'], ['title' => 'Docs', 'href' => '/docs', 'wide' => true]]" />
     A grid of short feature tiles: an icon, a title and one or two lines. It adapts to its container, not the screen. Static markup, no runtime.
     features: [['icon' (a lucide name), 'title', 'description', 'href' (makes the whole tile a link), 'wide' (spans two columns from 48rem)]].
     columns: 2 | 3 (default) | 4 at the widest. variant: cards (bordered tiles, default) | plain. align: start | center (the intro). eyebrow, title, description, title-as. --}}
@props(['eyebrow' => null, 'title' => null, 'description' => null, 'features' => [], 'columns' => 3, 'variant' => 'cards', 'align' => 'start', 'titleAs' => 'h2'])
@php
    $has = fn ($v) => $v !== null && trim((string) $v) !== '';
    $cols = [2 => '@2xl:grid-cols-2', 3 => '@2xl:grid-cols-2 @4xl:grid-cols-3', 4 => '@2xl:grid-cols-2 @4xl:grid-cols-4'][(int) $columns] ?? '@2xl:grid-cols-2 @4xl:grid-cols-3';
    $headingId = 'nq-features-'.substr(md5((string) $title.count($features)), 0, 8);
    $ar = \Nasaq\Nasaq::rtl();
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'feature-grid') }}" @if ($has($title)) aria-labelledby="{{ $headingId }}" @endif
    {{ $attributes->except('data-slot')->cn('@container flex min-w-0 flex-col gap-8') }}>
    @include('nasaq::components.marketing-sections._intro', ['eyebrow' => $eyebrow, 'title' => $title, 'description' => $description, 'headingId' => $headingId, 'titleAs' => $titleAs, 'align' => $align])
    <ul class="{{ \Nasaq\Cn::merge('grid grid-cols-1 gap-4', $cols) }}">
        @foreach ($features as $f)
            @php
                $href = $f['href'] ?? null;
                $tile = \Nasaq\Cn::merge('group flex h-full min-w-0 flex-col items-start gap-3 p-4 text-start', $variant === 'cards' ? 'rounded-card border border-border bg-card' : '', $href ? 'outline-none transition-colors hover:border-nq-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus' : '');
                $tag = $href ? 'a' : 'div';
            @endphp
            <li class="{{ \Nasaq\Cn::merge('min-w-0', ! empty($f['wide']) ? '@2xl:col-span-2' : '') }}">
                <{{ $tag }} @if ($href) href="{{ $href }}" @endif class="{{ $tile }}">
                    @if (! empty($f['icon']))
                        <span class="grid size-9 shrink-0 place-items-center rounded-control bg-nq-selected text-nq-brand [&_svg]:size-5"><x-dynamic-component :component="'lucide-'.$f['icon']" /></span>
                    @endif
                    <span class="flex min-w-0 flex-col gap-1">
                        <span class="flex items-center gap-1 font-semibold text-foreground text-label">
                            {{ $f['title'] ?? '' }}
                            @if ($href)<x-lucide-arrow-right aria-hidden="true" class="{{ \Nasaq\Cn::merge('size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5', $ar ? '-scale-x-100 group-hover:-translate-x-0.5' : '') }}" />@endif
                        </span>
                        @if ($has($f['description'] ?? null))<span class="text-body-sm text-nq-fg-body">{{ $f['description'] }}</span>@endif
                    </span>
                </{{ $tag }}>
            </li>
        @endforeach
    </ul>
</section>
