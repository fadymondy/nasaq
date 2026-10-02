{{-- <x-nq::text-effects.handwritten-mark kind="underline">the important part</x-nq::text-effects.handwritten-mark>
     Marks a few words as if a pen had just done it. The stroke is an SVG path drawn with the reading flow of the page and never touches the text, so it works with Arabic. The Alpine runtime draws it in
     when it scrolls into view; under prefers-reduced-motion it is drawn already.
     kind: underline (default) | circle | highlight | strike. tone: brand (default) | danger | warning | success | info. animate: draw in on scroll (true). delay: milliseconds before drawing (0).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['kind' => 'underline', 'tone' => 'brand', 'animate' => true, 'delay' => 0])
@php
    $marks = [
        'underline' => ['d' => 'M2 12 C 18 6, 34 16, 52 9 S 84 8, 98 11', 'viewBox' => '0 0 100 20', 'box' => 'inset-x-[-2%] -bottom-[0.3em] h-[0.5em]', 'width' => '0.09em', 'opacity' => 1],
        'circle' => ['d' => 'M50 4 C 82 2, 98 12, 96 22 C 94 34, 60 39, 40 38 C 12 36, 2 27, 5 16 C 9 6, 34 3, 62 4', 'viewBox' => '0 0 100 42', 'box' => '-inset-x-[0.5em] -inset-y-[0.35em]', 'width' => '0.07em', 'opacity' => 1],
        'highlight' => ['d' => 'M2 20 C 30 17, 60 22, 98 17', 'viewBox' => '0 0 100 40', 'box' => 'inset-x-[-3%] inset-y-[0.05em]', 'width' => '0.95em', 'opacity' => 0.28],
        'strike' => ['d' => 'M2 22 C 30 16, 60 26, 98 18', 'viewBox' => '0 0 100 40', 'box' => 'inset-x-[-2%] inset-y-0', 'width' => '0.08em', 'opacity' => 1],
    ];
    $tones = ['brand' => 'text-nq-brand', 'danger' => 'text-nq-danger', 'warning' => 'text-nq-warning', 'success' => 'text-nq-success', 'info' => 'text-nq-info'];
    $kind = isset($marks[$kind]) ? $kind : 'underline';
    $spec = $marks[$kind];
    $drawn = ! $animate;
    $config = \Illuminate\Support\Js::from(['animate' => (bool) $animate, 'delay' => (int) $delay])->toHtml();
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'handwritten-mark') }}" data-kind="{{ $kind }}" @if ($drawn) data-drawn @endif x-data="nqHandwrittenMark({!! $config !!})"
    {{ $attributes->except('data-slot')->cn(['relative inline-block', $tones[$tone] ?? $tones['brand']]) }}>
    <span class="relative z-10 text-foreground">{{ $slot }}</span>
    <svg aria-hidden="true" focusable="false" viewBox="{{ $spec['viewBox'] }}" preserveAspectRatio="none" class="{{ \Nasaq\Cn::merge('pointer-events-none absolute overflow-visible', $spec['box'], $kind === 'highlight' ? 'z-0' : 'z-20') }}">
        <path d="{{ $spec['d'] }}" pathLength="1" fill="none" stroke="currentColor" stroke-opacity="{{ $spec['opacity'] }}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"
            style="stroke-width: {{ $spec['width'] }}; stroke-dasharray: 1; stroke-dashoffset: {{ $drawn ? 0 : 1 }}; transition: none"></path>
    </svg>
</span>