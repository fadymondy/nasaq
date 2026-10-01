{{-- <x-nq::country-flag code="SA" label="Saudi Arabia" />
     A country's flag as an SVG, 3:2, sized by the font (1em tall) so it sits in a line of text. code: ISO 3166-1 alpha-2.
     label: accessible name; without it the flag is decorative. The SVG is fetched by the Alpine runtime (needs @nasaqScripts); until then, or for an unknown code, an empty frame shows. --}}
@props(['code', 'label' => null])
<span data-slot="country-flag" data-code="{{ strtoupper($code) }}" x-data="nqCountryFlag(@js(strtoupper($code)))" x-html="svg" @if ($label) role="img" aria-label="{{ $label }}" @else aria-hidden="true" @endif
    {{ $attributes->cn([
        // An inset hairline drawn over the SVG keeps white and pale flags visible on a white surface.
        'relative inline-block aspect-[3/2] h-[1em] shrink-0 overflow-hidden rounded-[2px] bg-muted align-[-0.125em] [&>svg]:block [&>svg]:size-full',
        'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-foreground/15 after:ring-inset',
    ]) }}></span>
