{{-- <x-nq::oauth-buttons :providers="['google', 'github', 'apple']" @nq-oauth-select="startOAuth($event.detail)" />
     providers: google | github | apple | microsoft, or your own ['id' => 'okta', 'label' => 'Continue with Okta', 'icon' => '<svg …>'].
     layout: stack | grid | icon-only   intent: signin | signup | continue   last-used="github" adds the "Last used" badge.
     Clicking dispatches `nq-oauth-select` with detail { id, wait(promise) }: pass a promise to wait() to show that provider's
     loading state until it settles (the others are disabled meanwhile). pending-provider="google" keeps one loading from the
     server (redirect flows); it is x-modelable. labels: ['continue' => 'Continue with {provider}', …]. Needs the Alpine runtime. --}}
@props(['providers' => ['google', 'github'], 'layout' => 'stack', 'intent' => 'continue', 'pendingProvider' => null, 'disabled' => false, 'lastUsed' => null, 'labels' => []])
@php
    $strings = [
        'signin' => \Nasaq\Nasaq::t('Sign in with {provider}', 'تسجيل الدخول باستخدام {provider}'),
        'signup' => \Nasaq\Nasaq::t('Sign up with {provider}', 'إنشاء حساب باستخدام {provider}'),
        'continue' => \Nasaq\Nasaq::t('Continue with {provider}', 'المتابعة باستخدام {provider}'),
        'group' => \Nasaq\Nasaq::t('Sign in with a provider', 'تسجيل الدخول عبر مزوّد'),
        'lastUsed' => \Nasaq\Nasaq::t('Last used', 'آخر استخدام'),
    ];
    $strings = array_merge($strings, (array) $labels);
    // Provider names are brand names: they are never translated.
    $names = ['google' => 'Google', 'github' => 'GitHub', 'apple' => 'Apple', 'microsoft' => 'Microsoft'];
    $iconOnly = $layout === 'icon-only';
    $template = $strings[$intent] ?? $strings['continue'];
    [$before, $after] = array_pad(explode('{provider}', $template, 2), 2, '');
@endphp
<div role="group" aria-label="{{ $strings['group'] }}" data-slot="oauth-buttons" data-layout="{{ $layout }}"
    x-data="nqOAuthButtons(@js($pendingProvider), @js((bool) $disabled))" x-modelable="pending"
    {{ $attributes->cn([
        'flex w-full flex-col gap-2' => $layout === 'stack',
        'grid w-full grid-cols-2 gap-2' => $layout === 'grid',
        'flex w-full flex-wrap items-center gap-2' => $iconOnly,
    ]) }}>
    @foreach ($providers as $provider)
        @php
            $custom = is_array($provider);
            $id = $custom ? $provider['id'] : $provider;
            $name = $custom ? $provider['label'] : ($names[$id] ?? $id);
            $text = $custom ? $provider['label'] : str_replace('{provider}', $name, $template);
            $busy = $pendingProvider === $id;
            $btnClass = new \Illuminate\Support\HtmlString(\Illuminate\Support\Arr::toCssClasses([
                'relative w-full min-w-0 justify-center gap-3' => ! $iconOnly,
                'border-black bg-black text-white hover:bg-black/90 dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/90' => ! $custom && $id === 'apple',
                '[&_svg]:size-auto' => ! $custom,
            ]));
            $off = $disabled || ($pendingProvider !== null && ! $busy);
        @endphp
        <x-nq::button type="button" variant="secondary" :size="$iconOnly ? 'icon' : 'md'" :disabled="$off"
            data-slot="oauth-button" data-provider="{{ $id }}"
            :aria-label="$iconOnly ? $text : null" :title="$iconOnly ? $text : null"
            :aria-busy="$busy ? 'true' : null" :data-disabled="$busy ? '' : null"
            x-on:click="select('{{ $id }}')"
            x-bind:disabled="isDisabled('{{ $id }}')"
            x-bind:aria-busy="isBusy('{{ $id }}') ? 'true' : null"
            x-bind:data-disabled="(disabled || isBusy('{{ $id }}')) ? '' : null"
            :class="$btnClass">
            <span class="contents" x-show="! isBusy(@js($id))" @if ($busy) style="display: none" @endif>
                @if ($custom)
                    {!! $provider['icon'] ?? '' !!}
                @elseif ($id === 'google')
                    <x-nq::oauth-buttons.google-logo />
                @elseif ($id === 'github')
                    <x-nq::oauth-buttons.github-logo />
                @elseif ($id === 'apple')
                    <x-nq::oauth-buttons.apple-logo />
                @elseif ($id === 'microsoft')
                    <x-nq::oauth-buttons.microsoft-logo />
                @endif
            </span>
            <span class="contents" x-show="isBusy(@js($id))" @unless ($busy) style="display: none" @endunless>
                <x-nq::spinner class="size-4!" />
            </span>
            @unless ($iconOnly)
                @if ($custom)
                    <span class="truncate">{{ $text }}</span>
                @else
                    <span class="truncate">{{ $before }}<bdi>{{ $name }}</bdi>{{ $after }}</span>
                @endif
                @if ($lastUsed === $id)
                    <x-nq::oauth-buttons.last-used>{{ $strings['lastUsed'] }}</x-nq::oauth-buttons.last-used>
                @endif
            @endunless
        </x-nq::button>
    @endforeach
</div>
