{{-- <x-nq::avatar name="Fady Mondy" src="/people/fady.jpg" />   <x-nq::avatar name="Acme" shape="square" size="lg" />
     <x-nq::avatar fallback="?" />   Compose: <x-nq::avatar><x-nq::avatar.image src="/a.jpg" alt="Fady" /><x-nq::avatar.fallback>FM</x-nq::avatar.fallback></x-nq::avatar>
     size: xs | sm | md | lg   shape: circle | square. The image shows once loaded; initials (or `fallback`) show meanwhile and on error. --}}
@props(['name' => '', 'src' => null, 'fallback' => null, 'size' => 'md', 'shape' => 'circle'])
@php
    $sizes = ['xs' => 'size-5 text-[9px]', 'sm' => 'size-6 text-[10px]', 'md' => 'size-8 text-caption', 'lg' => 'size-10 text-label'];
    $shapes = ['circle' => 'rounded-full', 'square' => 'rounded-control'];
    // First user-perceived character, so emoji and surrogate pairs are never split.
    $first = fn (string $w): string => $w === '' ? '' : (function_exists('grapheme_substr') ? (string) grapheme_substr($w, 0, 1) : mb_substr($w, 0, 1));
    // Leading punctuation is skipped and punctuation-only words are ignored: "(Test) Driver" is "TD", not "(D".
    $words = array_values(array_filter(array_map(
        fn (string $w): string => (string) preg_replace('/^\p{P}+/u', '', $w),
        preg_split('/\s+/u', trim($name), -1, PREG_SPLIT_NO_EMPTY) ?: [],
    ), fn (string $w): bool => $w !== ''));
    $initials = mb_strtoupper(($words ? $first($words[0]) : '').(count($words) > 1 ? $first($words[count($words) - 1]) : ''));
    $composed = $slot->isNotEmpty();
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'avatar') }}" x-data="nqAvatar({{ $src && ! $composed ? 400 : 0 }})"
    {{ $attributes->except('data-slot')->cn([
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-secondary align-middle font-medium text-secondary-foreground',
        $sizes[$size] ?? $sizes['md'],
        $shapes[$shape] ?? $shapes['circle'],
    ]) }}>
    @if ($composed)
        {{ $slot }}
    @else
        @if ($src)
            <img data-slot="avatar-image" src="{{ $src }}" alt="{{ $name }}" class="size-full object-cover" style="display: none" x-bind="image">
        @endif
        <span data-slot="avatar-fallback" class="flex size-full items-center justify-center" x-bind="fallback"
            @if ($src) aria-hidden="true" @elseif ($name !== '') role="img" aria-label="{{ $name }}" @endif>{{ $fallback ?? $initials }}</span>
    @endif
</span>
