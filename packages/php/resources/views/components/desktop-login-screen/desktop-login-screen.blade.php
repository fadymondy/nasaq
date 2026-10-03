{{-- <x-nq::desktop-login-screen title="ToGO OS" x-on:nq-login="$event.detail.waitUntil(signIn($event.detail))" />
     A desktop OS sign-in screen: wallpaper, a big clock with a greeting, and a card with the mark, the name and the Nasaq login form. For a signed-in
     person coming back, use <x-nq::lock-screen> instead. The form is <x-nq::login-form>, so its events bubble from this root: nq-login { email, password,
     remember }, nq-passkey, nq-magic-link, nq-oauth-select … each with detail.waitUntil(promise) (resolve nothing for success or { error, fieldErrors }).
     title: the product or machine name on the card (default "Sign in"). description. show-clock: default true. now: freeze the clock (a timestamp or a
     local date-time string, docs and tests); leave it out for a live clock. show-mark: false hides the product mark (slot `mark` replaces it).
     form-props: any other login-form prop as an array (methods, oauthProviders, passkey, passkeyAutofill, showRemember, defaultEmail, magicLinkSeconds,
     devLogin, labels). Slots: the default slot replaces the form (a register form, an SSO button, a user picker), wallpaper (an image or gradient under
     the scrim), mark, footer ("No account? Create one", a dev sign-in), forgot-password (beside the password label).
     power-actions: round buttons at the bottom, [['id' => 'sleep', 'label' => 'Sleep', 'icon' => 'moon']] (a lucide icon name); each fires
     nq-desktop-login-power { id } from the root. labels: override morning, afternoon, evening, signIn, power. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['title' => null, 'description' => null, 'showClock' => true, 'showMark' => true, 'now' => null, 'formProps' => [], 'powerActions' => [], 'mark' => null, 'wallpaper' => null,
    'footer' => null, 'forgotPassword' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'morning' => $t::t('Good morning', 'صباح الخير'),
        'afternoon' => $t::t('Good afternoon', 'مساء الخير'),
        'evening' => $t::t('Good evening', 'مساء الخير'),
        'signIn' => $t::t('Sign in', 'تسجيل الدخول'),
        'power' => $t::t('Power options', 'خيارات الطاقة'),
    ], (array) $labels);
    $fp = (array) $formProps;
    $has = fn ($s) => $s && ! $s->isEmpty();
    $config = [
        'now' => $now, 'locale' => app()->getLocale(),
        'labels' => array_intersect_key($l, array_flip(['morning', 'afternoon', 'evening'])),
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'desktop-login-screen') }}" x-data="nqDesktopLoginScreen(@js($config))"
    {{ $attributes->except('data-slot')->cn('relative isolate flex min-h-dvh flex-col items-center overflow-hidden bg-muted px-4 text-foreground') }}>
    <div aria-hidden="true" data-slot="desktop-login-screen-wallpaper" class="absolute inset-0 -z-10">
        @if ($has($wallpaper)) {{ $wallpaper }} @endif
        <div class="absolute inset-0 bg-background/55 backdrop-blur-sm"></div>
    </div>

    <main class="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8 py-10">
        @if ($showClock)
            <div data-slot="desktop-login-screen-clock" class="flex flex-col items-center gap-1 text-center">
                <p class="text-label tracking-wide text-muted-foreground uppercase" x-text="greeting"></p>
                <time dir="ltr" class="text-[clamp(3rem,10vw,5rem)] leading-none font-light tabular-nums text-foreground" x-text="time"></time>
                <p class="text-body text-muted-foreground first-letter:uppercase" x-text="date"></p>
            </div>
        @endif

        <section aria-labelledby="desktop-login-title" data-slot="desktop-login-screen-card" class="flex w-full flex-col gap-6 rounded-card border border-border bg-card/90 p-6 text-card-foreground backdrop-blur-md">
            <header class="flex flex-col items-center gap-3 text-center">
                @if ($has($mark))
                    <div data-slot="desktop-login-screen-mark">{{ $mark }}</div>
                @elseif ($showMark)
                    <div data-slot="desktop-login-screen-mark"><x-nq::product-mark :size="40" title="" /></div>
                @endif
                <div class="flex flex-col gap-0.5">
                    <h1 id="desktop-login-title" class="text-h3 text-foreground">{{ $title ?? $l['signIn'] }}</h1>
                    @if ($description) <p class="text-body-sm text-muted-foreground">{{ $description }}</p> @endif
                </div>
            </header>
            @if (! $slot->isEmpty())
                {{ $slot }}
            @else
                <x-nq::login-form :default-email="$fp['defaultEmail'] ?? ''" :show-remember="$fp['showRemember'] ?? true" :oauth-providers="$fp['oauthProviders'] ?? []"
                    :passkey="$fp['passkey'] ?? false" :passkey-autofill="$fp['passkeyAutofill'] ?? false" :methods="$fp['methods'] ?? ['password']"
                    :magic-link-seconds="$fp['magicLinkSeconds'] ?? 30" :dev-login="$fp['devLogin'] ?? false" :labels="$fp['labels'] ?? []">
                    @if ($has($forgotPassword)) <x-slot:forgot-password>{{ $forgotPassword }}</x-slot:forgot-password> @endif
                </x-nq::login-form>
            @endif
            @if ($has($footer))
                <div class="text-center text-body-sm text-muted-foreground">{{ $footer }}</div>
            @endif
        </section>
    </main>

    @if (count($powerActions))
        <nav aria-label="{{ $l['power'] }}" data-slot="desktop-login-screen-power" class="flex items-center gap-4 pb-8">
            @foreach ($powerActions as $action)
                <button type="button" data-id="{{ $action['id'] }}" aria-label="{{ $action['label'] }}" title="{{ $action['label'] }}" x-on:click="power($el.dataset.id)"
                    class="grid size-10 place-items-center rounded-full border border-border bg-card/70 text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                    <x-dynamic-component :component="'lucide-'.($action['icon'] ?? 'power')" aria-hidden="true" class="size-4" />
                </button>
            @endforeach
        </nav>
    @endif
</div>
