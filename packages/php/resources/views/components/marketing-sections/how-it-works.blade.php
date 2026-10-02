{{-- <x-nq::marketing-sections.how-it-works title="How it works" :steps="[['title' => 'Create', 'description' => '…'], ['title' => 'Share'], ['title' => 'Sell', 'icon' => 'zap']]" />
     Three or four numbered steps that explain how to get started. Numbers are Latin digits in both languages; the joining line follows the reading direction. Static markup, no runtime.
     steps: [['title', 'description', 'icon' (a lucide name, shown in the badge instead of the number), 'media' (HTML, an HtmlString or text, under the text)]].
     eyebrow, title, description: the intro. layout: row (steps side by side from 48rem) | column (always vertical). title-as: h2 (default) | h3. --}}
@props(['eyebrow' => null, 'title' => null, 'description' => null, 'steps' => [], 'layout' => 'row', 'titleAs' => 'h2'])
@php
    $has = fn ($v) => $v !== null && trim((string) $v) !== '';
    $headingId = 'nq-how-'.substr(md5((string) $title.count($steps)), 0, 8);
    $row = $layout === 'row';
    $steps = array_values($steps);
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'how-it-works') }}" @if ($has($title)) aria-labelledby="{{ $headingId }}" @endif
    {{ $attributes->except('data-slot')->cn('@container flex min-w-0 flex-col gap-8') }}>
    @include('nasaq::components.marketing-sections._intro', ['eyebrow' => $eyebrow, 'title' => $title, 'description' => $description, 'headingId' => $headingId, 'titleAs' => $titleAs, 'align' => 'start'])
    <ol class="{{ \Nasaq\Cn::merge('grid gap-6', $row ? '@3xl:grid-cols-[repeat(var(--steps),minmax(0,1fr))] @3xl:gap-8' : 'max-w-2xl') }}" style="--steps: {{ count($steps) }}">
        @foreach ($steps as $i => $step)
            <li class="{{ \Nasaq\Cn::merge('relative flex min-w-0 gap-4', $row ? '@3xl:flex-col' : '') }}">
                @if ($i < count($steps) - 1)
                    <span aria-hidden="true" class="{{ \Nasaq\Cn::merge('absolute bg-border', $row ? 'start-5 top-11 bottom-[-1.5rem] w-px @3xl:start-12 @3xl:top-5 @3xl:bottom-auto @3xl:h-px @3xl:w-[calc(100%-2rem)]' : 'start-5 top-11 bottom-[-1.5rem] w-px') }}"></span>
                @endif
                <span dir="ltr" class="relative z-1 grid size-10 shrink-0 place-items-center rounded-full border border-border bg-nq-surface font-semibold text-body-sm text-nq-brand tabular-nums [&_svg]:size-4">
                    @if (! empty($step['icon']))<x-dynamic-component :component="'lucide-'.$step['icon']" aria-hidden="true" />@else{{ $i + 1 }}@endif
                </span>
                <div class="flex min-w-0 flex-1 flex-col gap-1.5 pb-2">
                    <h3 class="font-semibold text-foreground text-h3">{{ $step['title'] ?? '' }}</h3>
                    @if ($has($step['description'] ?? null))<p class="text-body-sm text-nq-fg-body">{{ $step['description'] }}</p>@endif
                    @if ($has($step['media'] ?? null))<div class="mt-2">{{ $step['media'] }}</div>@endif
                </div>
            </li>
        @endforeach
    </ol>
</section>
