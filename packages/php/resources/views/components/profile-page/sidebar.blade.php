{{-- <x-nq::profile-page.sidebar :profile="['name' => 'Laylah', 'handle' => '@laylah', 'email' => 'l@example.com', 'links' => [['kind' => 'github', 'label' => 'GitHub', 'href' => '…', 'handle' => 'laylah']]]" />
     The identity column: a large avatar, name and handle, location and links, one full-width action, then the bio and the join date.
     owner / edit-href: "Edit profile" replaces contact and CV. contact-button: a real button that dispatches "profile-contact" (else a mailto: link).
     Slots: action replaces the buttons; the default slot goes under the bio. --}}
@props(['profile', 'owner' => false, 'editHref' => null, 'contactButton' => false, 'action' => null, 'locale' => null, 'labels' => []])
@include('nasaq::components.profile-page._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_pp_words($locale, (array) $labels);
    $p = (array) $profile;
    $links = array_values(array_map(fn ($x) => (array) $x, (array) ($p['links'] ?? [])));
    $bio = $p['bio'] ?? ($p['headline'] ?? null);
    $isOwner = (bool) ($owner || $editHref);
    $has = fn ($v) => $v !== null && ! ($v instanceof \Illuminate\View\ComponentSlot && $v->isEmpty());
    $metaRow = 'flex min-w-0 items-center gap-2 text-body-sm text-foreground';
    $metaIcon = 'size-4 shrink-0 text-muted-foreground';
    $external = fn ($h) => (bool) preg_match('#^https?://#i', $h);
    $showList = ! empty($p['availability']) || ! empty($p['location']) || $links;
    $showActions = $has($action) || $isOwner || $contactButton || ! empty($p['email']) || ! empty($p['cvHref']);
@endphp
<header data-slot="{{ $attributes->get('data-slot', 'profile-sidebar') }}" x-data="nqProfilePage" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-5') }}>
    <div class="flex items-center gap-4 @4xl:flex-col @4xl:items-start">
        <x-nq::avatar :name="$p['name']" :src="$p['avatar'] ?? null" class="size-20 shrink-0 text-h1 ring-1 ring-border @2xl:size-28 @4xl:size-56 @4xl:text-display" />
        <div class="flex min-w-0 flex-col gap-1">
            <h1 dir="auto" class="text-balance text-h1 text-foreground">{{ $p['name'] }}</h1>
            @if (! empty($p['handle']))<p dir="ltr" class="truncate text-start font-mono text-body-sm text-muted-foreground">{{ $p['handle'] }}</p>@endif
        </div>
    </div>
    @if ($showList)
        <ul aria-label="{{ $t['profileDetails'] }}" class="flex list-none flex-col gap-2 p-0">
            @if (! empty($p['availability']))
                <li><x-nq::personal-widgets.availability-badge :status="$p['availability']" :note="$p['availabilityNote'] ?? null" class="h-auto min-h-6 max-w-full flex-wrap py-0.5 text-start whitespace-normal" /></li>
            @endif
            @if (! empty($p['location']))
                <li class="{{ $metaRow }}"><x-nq::icon name="map-pin" class="{{ $metaIcon }}" /><bdi class="truncate">{{ $p['location'] }}</bdi></li>
            @endif
            @foreach ($links as $l)
                @php $named = in_array($l['kind'], ['github', 'website', 'email'], true); @endphp
                <li class="{{ $metaRow }}">
                    @if ($l['kind'] === 'github')<x-nq::oauth-buttons.github-logo class="size-4 shrink-0" />
                    @elseif ($l['kind'] === 'website')<x-nq::icon name="globe" class="{{ $metaIcon }}" />
                    @elseif ($l['kind'] === 'email')<x-nq::icon name="mail" class="{{ $metaIcon }}" />
                    @else<span class="shrink-0 text-muted-foreground">{{ $l['label'] }}</span>@endif
                    <a href="{{ $l['href'] }}" @if ($external($l['href'])) target="_blank" rel="noopener noreferrer" @endif @if ($named) aria-label="{{ $l['label'] }}: {{ nq_pp_link_text($l) }}" @endif dir="ltr" class="truncate rounded-[2px] outline-none hover:underline hover:decoration-nq-line-strong hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">{{ nq_pp_link_text($l) }}</a>
                </li>
            @endforeach
        </ul>
    @endif
    @if ($showActions)
        <div class="flex flex-col gap-2">
            @if ($has($action))
                {{ $action }}
            @elseif ($isOwner)
                @if ($editHref)
                    <x-nq::button :href="$editHref" variant="secondary" class="w-full">{{ $t['editProfile'] }}</x-nq::button>
                @else
                    <x-nq::button variant="secondary" class="w-full" x-on:click="edit()">{{ $t['editProfile'] }}</x-nq::button>
                @endif
            @else
                @if ($contactButton)
                    <x-nq::button variant="primary" class="w-full" x-on:click="contact()"><x-nq::icon name="mail" />{{ $t['contact'] }}</x-nq::button>
                @elseif (! empty($p['email']))
                    <x-nq::button :href="'mailto:'.$p['email']" variant="primary" class="w-full"><x-nq::icon name="mail" />{{ $t['contact'] }}</x-nq::button>
                @endif
                @if (! empty($p['cvHref']))
                    <x-nq::button :href="$p['cvHref']" download variant="secondary" class="w-full"><x-nq::icon name="download" />{{ $t['downloadCv'] }}</x-nq::button>
                @endif
            @endif
        </div>
    @endif
    @if ($bio || ! empty($p['joined']))
        <x-nq::separator />
        <div class="flex flex-col gap-3">
            @if ($bio)<p dir="auto" class="text-pretty text-body-sm text-nq-fg-body">{{ $bio }}</p>@endif
            @if (! empty($p['joined']))
                <p class="inline-flex items-center gap-1.5 text-caption text-muted-foreground"><x-nq::icon name="calendar-days" class="size-3.5" />{{ nq_pp_fill($t['joined'], ['date' => nq_pp_date($p['joined'], $locale, 'MMMM y')]) }}</p>
            @endif
        </div>
    @endif
    {{ $slot }}
</header>
