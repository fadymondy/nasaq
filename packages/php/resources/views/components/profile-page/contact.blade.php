{{-- <x-nq::profile-page.contact email="laylah@example.com" availability="open" />
     The closing call to action: a headline, one sentence, the availability and a contact button.
     With contact-button the button dispatches a "profile-contact" event; otherwise it opens mailto: to email. --}}
@props(['email' => null, 'availability' => null, 'availabilityNote' => null, 'contactButton' => false, 'title' => null, 'description' => null, 'locale' => null, 'labels' => []])
@include('nasaq::components.profile-page._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_pp_words($locale, (array) $labels);
    $id = 'nq-profile-contact-'.substr(md5((string) $email.(string) $title.$locale), 0, 8);
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'profile-contact') }}" x-data="nqProfilePage" aria-labelledby="{{ $id }}" {{ $attributes->except('data-slot')->cn('flex flex-col items-start gap-4 rounded-card border border-border bg-card p-6 @2xl:flex-row @2xl:items-center @2xl:justify-between') }}>
    <div class="flex min-w-0 flex-col gap-2">
        @if ($availability)<x-nq::personal-widgets.availability-badge :status="$availability" :note="$availabilityNote" />@endif
        <h2 id="{{ $id }}" class="text-balance text-h1 text-foreground">{{ $title ?? $t['contactTitle'] }}</h2>
        <p class="max-w-xl text-pretty text-body text-muted-foreground">{{ $description ?? $t['contactBody'] }}</p>
    </div>
    @if ($contactButton)
        <x-nq::button variant="primary" size="lg" x-on:click="contact()"><x-nq::icon name="mail" />{{ $t['contact'] }}</x-nq::button>
    @elseif ($email)
        <x-nq::button variant="primary" size="lg" :href="'mailto:'.$email"><x-nq::icon name="mail" />{{ $t['contact'] }}</x-nq::button>
    @endif
</section>
