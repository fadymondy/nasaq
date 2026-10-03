{{-- <x-nq::marketing-sections.app-mockup-hero title="Book seats in seconds" description="…" frame-title="app.example.com" mockup-label="The seat map"> <x-slot:actions>…buttons…</x-slot:actions> <img src="/app.png" alt=""> </x-nq::marketing-sections.app-mockup-hero>
     A page opener: headline, buttons and a framed picture of the app, over a soft backdrop. The default slot is the mockup (it sits inside a screenshot-frame and fades out at the bottom).
     title (renders the page's h1), eyebrow, description. Slots: actions (buttons), proof (a line of proof under the buttons). frame: browser (default) | window | phone. frame-title: address or window title.
     mockup-label: describes the mockup for screen readers (its content is then hidden and inert). background: aurora (default) | grid | none. --}}
@props(['eyebrow' => null, 'title' => '', 'description' => null, 'actions' => null, 'proof' => null, 'frame' => 'browser', 'frameTitle' => null, 'mockupLabel' => null, 'background' => 'aurora'])
<section data-slot="{{ $attributes->get('data-slot', 'app-mockup-hero') }}" {{ $attributes->except('data-slot')->cn('w-full min-w-0') }}>
    @if ($background === 'aurora')
        <x-nq::marketing-sections.aurora-background>@include('nasaq::components.marketing-sections._hero-body')</x-nq::marketing-sections.aurora-background>
    @elseif ($background === 'grid')
        <x-nq::marketing-sections.grid-background>@include('nasaq::components.marketing-sections._hero-body')</x-nq::marketing-sections.grid-background>
    @else
        @include('nasaq::components.marketing-sections._hero-body')
    @endif
</section>
