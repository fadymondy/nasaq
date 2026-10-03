{{-- <x-nq::blog-index.post-cover :post="$post" />   post: slug, cover, coverAlt. ratio: an aspect class (default aspect-video).
     The post's cover image, or when it has none a soft generated cover in the hue of its slug. Decorative art carries no text. --}}
@props(['post', 'ratio' => 'aspect-video'])
@php
    $post = (array) $post;
    $hues = ['gray', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink'];
    $h = 5381;
    foreach (unpack('n*', mb_convert_encoding((string) $post['slug'], 'UTF-16BE', 'UTF-8')) ?: [] as $unit) {
        $h = (($h << 5) + $h + $unit) & 0xFFFFFFFF;
    }
    $n = count($hues) - 1;
    $a = $hues[1 + ($h % $n)];
    $b = $hues[1 + (($h >> 3) % $n)];
    $art = '--cover-a: var(--nq-tag-'.$a.'); --cover-a-soft: var(--nq-tag-'.$a.'-soft); --cover-b-soft: var(--nq-tag-'.$b.'-soft); --cover-x: '.(20 + ($h % 50)).'%; --cover-y: '.(20 + (($h >> 5) % 50)).'%';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'post-cover') }}" {{ $attributes->except('data-slot')->cn('relative w-full overflow-hidden rounded-card border border-border bg-secondary', $ratio) }}>
    @if (! empty($post['cover']))
        <img src="{{ $post['cover'] }}" alt="{{ $post['coverAlt'] ?? '' }}" loading="lazy" class="size-full object-cover">
    @else
        <div aria-hidden="true" style="{{ $art }}"
            class="size-full bg-[radial-gradient(circle_at_var(--cover-x)_var(--cover-y),var(--cover-a-soft),transparent_55%),linear-gradient(135deg,var(--cover-a-soft),var(--cover-b-soft))]">
            <div class="absolute -bottom-1/4 -end-[8%] size-2/5 rounded-full border-2 border-[var(--cover-a)] opacity-40"></div>
            <div class="absolute start-[10%] top-[16%] size-6 rounded-full bg-[var(--cover-a)] opacity-30"></div>
        </div>
    @endif
</div>
