{{-- <x-nq::feature-story eyebrow="Feedback SDK" title="Hear from users where they are" description="…" :points="['One script tag', 'Screenshots attached']"> <x-slot:media>…</x-slot:media> </x-nq::feature-story>
     One feature told as a story: copy and media side by side from 48rem of container width, stacked below it.
     Slots: icon (on a brand tint beside the eyebrow), action (under the points), media (a screenshot frame, a code sample).
     reverse puts the media at the inline start. title-as: h2 (default) | h3. --}}
@props(['eyebrow' => null, 'icon' => null, 'title' => null, 'description' => null, 'points' => [], 'media' => null, 'reverse' => false, 'action' => null, 'titleAs' => 'h2'])
@php
    $has = fn ($v) => $v !== null && trim((string) $v) !== '';
    $id = 'nq-feature-'.substr(md5((string) $title), 0, 8);
@endphp
<div data-slot="feature-story" class="@container">
    <section aria-labelledby="{{ $id }}" {{ $attributes->cn('grid grid-cols-1 items-center gap-8 @3xl:grid-cols-2 @3xl:gap-12') }}>
        <div class="{{ \Nasaq\Cn::merge('flex min-w-0 flex-col items-start gap-4', $reverse ? '@3xl:order-2' : '') }}">
            @if ($has($eyebrow) || $has($icon))
                <div class="flex items-center gap-2 text-label text-muted-foreground">
                    @if ($has($icon))
                        <span aria-hidden="true" class="grid size-7 place-items-center rounded-control bg-[color-mix(in_oklab,var(--nq-brand)_14%,transparent)] text-nq-brand [&_svg]:size-4">{{ $icon }}</span>
                    @endif
                    {{ $eyebrow }}
                </div>
            @endif
            <{{ $titleAs }} id="{{ $id }}" class="text-balance text-h1 text-foreground">{{ $title }}</{{ $titleAs }}>
            @if ($has($description))
                <p class="text-pretty text-body text-muted-foreground">{{ $description }}</p>
            @endif
            @if (count($points) > 0)
                <ul class="flex flex-col gap-2">
                    @foreach ($points as $point)
                        <li class="flex items-start gap-2 text-body-sm text-foreground">
                            <x-lucide-check aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-brand" />
                            <span>{{ $point }}</span>
                        </li>
                    @endforeach
                </ul>
            @endif
            @if ($has($action))
                <div class="pt-1">{{ $action }}</div>
            @endif
        </div>
        @if ($has($media))
            <div class="min-w-0">{{ $media }}</div>
        @endif
    </section>
</div>
