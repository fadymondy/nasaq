{{-- <x-nq::marketing-sections.cta-banner title="Ready to start?" description="…" note="No card needed"> <x-slot:action><x-nq::button variant="primary">Create account</x-nq::button></x-slot:action> </x-nq::marketing-sections.cta-banner>
     The closing call to action of a page: one clear ask, one main button, optionally a quieter second one. Give it a single action; two equal buttons make the choice harder.
     Slots: action (the main button), secondary-action (a quieter link or button). title, description, note (a line of reassurance under the buttons).
     tone: brand (default; brand-tinted panel with an aurora glow) | neutral. layout: center (default) | split (buttons at the inline end from 48rem). title-as: h2 (default) | h3. --}}
@props(['title' => '', 'description' => null, 'action' => null, 'secondaryAction' => null, 'note' => null, 'tone' => 'brand', 'layout' => 'center', 'titleAs' => 'h2'])
@php
    $headingId = 'nq-cta-'.substr(md5((string) $title), 0, 8);
    $split = $layout === 'split';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'cta-banner') }}" aria-labelledby="{{ $headingId }}"
    {{ $attributes->except('data-slot')->cn(['@container w-full overflow-hidden rounded-card border', $tone === 'brand' ? 'border-nq-brand/30 bg-nq-selected' : 'border-border bg-nq-surface-soft']) }}>
    @if ($tone === 'brand')
        <x-nq::marketing-sections.aurora-background :fade="false">
            @include('nasaq::components.marketing-sections._cta-inner')
        </x-nq::marketing-sections.aurora-background>
    @else
        @include('nasaq::components.marketing-sections._cta-inner')
    @endif
</section>
