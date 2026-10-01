{{-- <x-nq::user-menu :user="['name' => 'Fady Mondy', 'email' => 'fady@example.com']" sign-out> <x-nq::dropdown-menu.item><x-lucide-user /> Account</x-nq::dropdown-menu.item> </x-nq::user-menu>
     The account menu at the bottom of the sidebar: product items (the slot), Theme, Language, Sign out.
     user: name, email, avatar (a URL). profile: a person array (see profile-card); swaps the plain name and email header for a profile card and puts a presence dot on the avatar.
     preferences: the Theme and Language submenus (default true). locales: [['value','label','dir']] (default English and Arabic); Language shows when there are two or more.
     sign-out: adds the Sign out item; it dispatches a bubbling "nq-sign-out" event on window, and goes to sign-out-href when given.
     variant: sidebar (default, the name and email card; folds to the avatar on the collapsed rail) | avatar (just the avatar, for a top bar; the menu opens below).
     labels: ['theme' => , 'language' => , 'signOut' => ]. Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'user',
    'preferences' => true,
    'signOut' => false,
    'signOutHref' => null,
    'profile' => null,
    'variant' => 'sidebar',
    'labels' => [],
    'locales' => [['value' => 'en', 'label' => 'English', 'dir' => 'ltr'], ['value' => 'ar', 'label' => 'العربية', 'dir' => 'rtl']],
])
@php
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $top = $variant === 'avatar';
    $click = '$dispatch(`nq-sign-out`); if ($el.dataset.href) window.location.href = $el.dataset.href';
    $name = $user['name'] ?? '';
    $email = $user['email'] ?? '';
    $avatar = $user['avatar'] ?? null;
    $theme = $labels['theme'] ?? \Nasaq\Nasaq::t('Theme', 'المظهر');
    $language = $labels['language'] ?? \Nasaq\Nasaq::t('Language', 'اللغة');
    $out = $labels['signOut'] ?? \Nasaq\Nasaq::t('Sign out', 'تسجيل الخروج');
    $person = $profile ? array_merge($profile, ['name' => $name, 'email' => $profile['email'] ?? $email, 'avatar' => $avatar ?? ($profile['avatar'] ?? null)]) : null;
    $hasPresence = $profile && ! empty($profile['presence']);
    $names = collect($locales)->pluck('label', 'value')->all();
    // Collapsed look: always for the avatar variant, on the collapsed rail for the sidebar one.
    $g = 'group-data-collapsed/sidebar:';
@endphp
<div data-slot="user-menu-root" x-data="nqThemePref()" class="contents">
<div x-data="nqLocalePref({!! $js($names) !!})" class="contents">
<x-nq::dropdown-menu>
    <button type="button" data-slot="user-menu" x-bind="trigger" x-ref="trigger"
        @if ($top) aria-label="{{ $name }}" @else x-bind:aria-label="typeof rail !== 'undefined' && rail && collapsed ? {!! $js($name) !!} : null" @endif
        {{ $attributes->cn([
            'flex w-full items-center gap-2 rounded-control px-1.5 outline-none',
            'transition-colors duration-150 ease-nq hover:bg-nq-hover data-popup-open:bg-nq-selected',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
            'size-control justify-center rounded-full px-0' => $top,
            'min-h-[calc(var(--spacing-nav-row)+12px)] border border-border bg-background/60 py-1 shadow-xs hover:border-nq-line-strong' => ! $top,
            $g.'size-control '.$g.'justify-center '.$g.'px-0 '.$g.'border-0 '.$g.'bg-transparent '.$g.'shadow-none' => ! $top,
        ]) }}>
        @if ($hasPresence)
            <x-nq::profile-card.presence-avatar :person="$person" :size="$top ? 'sm' : 'md'" />
        @else
            <x-nq::avatar :name="$name" :src="$avatar" :size="$top ? 'sm' : 'md'" />
        @endif
        @unless ($top)
            <span class="grid min-w-0 flex-1 text-start {{ $g }}hidden">
                <span class="truncate text-label leading-snug text-foreground">{{ $name }}</span>
                <span class="truncate text-caption leading-snug text-muted-foreground"><bdi dir="ltr">{{ $email }}</bdi></span>
            </span>
            <x-lucide-chevrons-up-down aria-hidden="true" class="size-4 shrink-0 text-muted-foreground {{ $g }}hidden" />
        @endunless
    </button>
    <x-nq::dropdown-menu.content :side="$top ? 'bottom' : 'top'" :align="$top ? 'end' : 'start'" class="w-60 {{ $top ? '' : 'w-[max(15rem,var(--anchor-width))]' }}">
        @if ($person)
            <x-nq::profile-card data-slot="user-menu-profile" :person="$person" class="p-2" />
        @else
            <div class="flex items-center gap-2 px-2 py-2">
                <x-nq::avatar :name="$name" :src="$avatar" />
                <span class="grid min-w-0 flex-1 text-start">
                    <span class="truncate text-label leading-snug text-foreground">{{ $name }}</span>
                    <span class="truncate text-caption leading-snug text-muted-foreground"><bdi dir="ltr">{{ $email }}</bdi></span>
                </span>
            </div>
        @endif
        <x-nq::dropdown-menu.separator />
        @if ($slot->isNotEmpty())
            <x-nq::dropdown-menu.group>{{ $slot }}</x-nq::dropdown-menu.group>
            <x-nq::dropdown-menu.separator />
        @endif
        @if ($preferences)
            <x-nq::dropdown-menu.sub>
                <x-nq::dropdown-menu.sub-trigger><x-lucide-palette /> {{ $theme }}</x-nq::dropdown-menu.sub-trigger>
                <x-nq::dropdown-menu.sub-content><x-nq::switchers.theme-menu-items /></x-nq::dropdown-menu.sub-content>
            </x-nq::dropdown-menu.sub>
            @if (count($locales) > 1)
                <x-nq::dropdown-menu.sub>
                    <x-nq::dropdown-menu.sub-trigger><x-lucide-languages /> {{ $language }}</x-nq::dropdown-menu.sub-trigger>
                    <x-nq::dropdown-menu.sub-content><x-nq::switchers.locale-menu-items :locales="$locales" /></x-nq::dropdown-menu.sub-content>
                </x-nq::dropdown-menu.sub>
            @endif
            @if ($signOut)<x-nq::dropdown-menu.separator />@endif
        @endif
        @if ($signOut)
            <x-nq::dropdown-menu.item data-user-menu="sign-out" :data-href="$signOutHref"
                :x-on:click="$click"><x-lucide-log-out /> {{ $out }}</x-nq::dropdown-menu.item>
        @endif
    </x-nq::dropdown-menu.content>
</x-nq::dropdown-menu>
</div>
</div>
