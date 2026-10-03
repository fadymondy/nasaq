{{-- <x-nq::profile-page :profile="$profile" :post-href="..." blog-href="/blog" />
     A profile page in two columns: the identity column beside about, experience, skills, projects, writing and testimonials, with personal widgets under the identity.
     profile: name, handle, avatar, headline, bio, location, email, cvHref, joined, availability, availabilityNote, links[], about (Markdown), experience[], skills[], projects[], posts[],
     testimonials[], timeZone, workingHours, weather{city,temperature,condition,high,low,unit}, stats[], now[], nowUpdated.
     The default slot holds your own sections, shown first in the content column.
     owner / edit-href: the owner view (Edit profile instead of contact; apps and account details are shown, the closing call to action is left out).
     contact-button: the contact buttons dispatch "profile-contact" (the page element), "profile-edit" for Edit profile. Otherwise mailto: to profile.email.
     post-href: closure or template with {slug}. blog-href. now: fixed "now". widgets (default true). apps[] + apps-href, account[] ({label, value}). labels: override any word. --}}
@props(['profile', 'contactButton' => false, 'owner' => false, 'editHref' => null, 'postHref' => null, 'blogHref' => null, 'now' => null, 'widgets' => true, 'apps' => null, 'appsHref' => null, 'account' => null, 'locale' => null, 'labels' => []])
@include('nasaq::components.profile-page._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_pp_words($locale, (array) $labels);
    $p = (array) $profile;
    $isOwner = (bool) ($owner || $editHref);
    $hasWidgets = $widgets && (! empty($p['timeZone']) || ! empty($p['weather']) || ! empty($p['stats']) || ! empty($p['now']));
    $w = (array) ($p['weather'] ?? []);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'profile-page') }}" x-data="nqProfilePage" {{ $attributes->except('data-slot')->cn('@container mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 @2xl:px-6 @2xl:py-12') }}>
    <div class="grid grid-cols-1 gap-10 @4xl:grid-cols-[17rem_minmax(0,1fr)] @4xl:grid-rows-[auto_1fr] @4xl:gap-x-12">
        <x-nq::profile-page.sidebar :profile="$p" :owner="$owner" :edit-href="$editHref" :contact-button="$contactButton" :locale="$locale" :labels="$labels" class="@4xl:col-start-1 @4xl:row-start-1" />
        <div class="flex min-w-0 flex-col gap-12 @4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1">
            {{ $slot }}
            @if ($isOwner && $apps !== null)<x-nq::profile-page.apps :apps="$apps" :browse-href="$appsHref" :locale="$locale" :labels="$labels" />@endif
            @if ($isOwner && ! empty($account))<x-nq::profile-page.account :details="$account" :locale="$locale" :labels="$labels" />@endif
            @if (! empty($p['about']))<x-nq::profile-page.about :about="$p['about']" :locale="$locale" :labels="$labels" />@endif
            @if (! empty($p['experience']))<x-nq::profile-page.experience :experience="$p['experience']" :now="$now" :locale="$locale" :labels="$labels" />@endif
            @if (! empty($p['skills']))<x-nq::profile-page.skills :skills="$p['skills']" :locale="$locale" :labels="$labels" />@endif
            @if (! empty($p['projects']))<x-nq::profile-page.projects :projects="$p['projects']" :locale="$locale" :labels="$labels" />@endif
            @if (! empty($p['posts']))<x-nq::profile-page.writing :posts="$p['posts']" :post-href="$postHref" :all-href="$blogHref" :locale="$locale" :labels="$labels" />@endif
            @if (! empty($p['testimonials']))<x-nq::profile-page.testimonials :testimonials="$p['testimonials']" :locale="$locale" :labels="$labels" />@endif
        </div>
        @if ($hasWidgets)
            <aside aria-label="{{ $t['sections'] }}" class="grid grid-cols-1 content-start gap-4 @xl:grid-cols-2 @4xl:col-start-1 @4xl:row-start-2 @4xl:grid-cols-1">
                @if (! empty($p['timeZone']))<x-nq::personal-widgets.local-clock :time-zone="$p['timeZone']" :city="$p['location'] ?? null" :working-hours="$p['workingHours'] ?? []" :now="$now" />@endif
                @if ($w)<x-nq::personal-widgets.weather-widget :city="$w['city']" :temperature="$w['temperature']" :condition="$w['condition'] ?? 'clear'" :high="$w['high'] ?? null" :low="$w['low'] ?? null" :unit="$w['unit'] ?? 'c'" />@endif
                @if (! empty($p['stats']))<x-nq::personal-widgets.stats-widget :stats="$p['stats']" />@endif
                @if (! empty($p['now']))<x-nq::personal-widgets.now-widget :items="$p['now']" :updated="$p['nowUpdated'] ?? null" />@endif
            </aside>
        @endif
    </div>
    @if (! $isOwner)
        <x-nq::profile-page.contact :email="$p['email'] ?? null" :availability="$p['availability'] ?? null" :availability-note="$p['availabilityNote'] ?? null" :contact-button="$contactButton" :locale="$locale" :labels="$labels" />
    @endif
</div>
