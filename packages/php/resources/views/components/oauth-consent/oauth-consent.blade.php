{{-- <x-nq::oauth-consent :app="['name' => 'Zapline', 'publisher' => 'by Zapline Inc.']" :account="['name' => 'Fady Mondy', 'email' => 'fady@example.com']"
         :scopes="[['id' => 'profile', 'label' => 'Read your profile'], ['id' => 'write', 'label' => 'Edit tasks', 'sensitive' => true]]" redirect-host="app.zapline.io"
         x-on:nq-oauth-allow="$event.detail.waitUntil(allow())" x-on:nq-oauth-deny="$event.detail.waitUntil(deny())" />
     The "App X wants to access your account" screen: who is asking, what they can do, which account it applies to, and Allow / Deny. Deny is as easy to
     reach as Allow and both wait on your listeners.
     app: ['name', 'logo' (an image URL), 'publisher']. scopes: [['id', 'label', 'description', 'sensitive']]. account: ['name', 'email', 'avatar'].
     Events (bubble from the section; detail.waitUntil(promise); resolve nothing for success or { error } to show a failure): nq-oauth-allow, nq-oauth-deny,
     nq-oauth-switch-account (shown with the switch-account attribute). redirect-host: where people are sent back to. product-name: what the account
     belongs to (default Nasaq / نسق). heading-level: 1-3, default 2. labels: override any string (title uses {app} and {product}, scopes-intro {app},
     redirect {host}). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['app', 'scopes' => [], 'account', 'switchAccount' => false, 'redirectHost' => null, 'productName' => null, 'headingLevel' => 2, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'title' => $t::t('{app} wants to access your {product} account', 'يريد {app} الوصول إلى حسابك في {product}'),
        'signedInAs' => $t::t('Signed in as', 'مسجّل الدخول باسم'),
        'switchAccount' => $t::t('Switch account', 'تبديل الحساب'),
        'scopesIntro' => $t::t('This will let {app}:', 'سيسمح هذا لتطبيق {app} بما يلي:'),
        'sensitive' => $t::t('Sensitive', 'حساس'),
        'allow' => $t::t('Allow', 'السماح'),
        'deny' => $t::t('Deny', 'رفض'),
        'redirect' => $t::t('You will be sent to {host}.', 'ستتم إعادة توجيهك إلى {host}.'),
        'revoke' => $t::t('You can remove this access at any time in your account settings.', 'يمكنك إزالة هذا الوصول في أي وقت من إعدادات حسابك.'),
        'failed' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
    ], (array) $labels);
    $product = $productName ?? $t::t('Nasaq', 'نسق');
    $appName = $app['name'] ?? '';
    $logo = $app['logo'] ?? null;
    $level = in_array((int) $headingLevel, [1, 2, 3], true) ? (int) $headingLevel : 2;
    $titleId = 'oauth-consent-title-'.\Illuminate\Support\Str::random(6);
    [$titleBefore, $titleRest] = array_pad(explode('{app}', $l['title'], 2), 2, '');
    [$titleMid, $titleAfter] = array_pad(explode('{product}', $titleRest, 2), 2, '');
    $hasProduct = str_contains($l['title'], '{product}');
    [$introBefore, $introAfter] = array_pad(explode('{app}', $l['scopesIntro'], 2), 2, '');
    [$redirectBefore, $redirectAfter] = array_pad(explode('{host}', $l['redirect'], 2), 2, '');
    $config = ['failed' => $l['failed']];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'oauth-consent') }}" aria-labelledby="{{ $titleId }}" x-data="nqOAuthConsent(@js($config))"
    x-bind:aria-busy="pendingKind ? 'true' : null" {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-5') }}>
    <div class="flex flex-col items-start gap-3">
        <div data-slot="oauth-consent-app" class="flex items-center gap-3">
            <span class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-card border border-border bg-secondary text-label text-secondary-foreground">
                @if (is_string($logo) && $logo !== '')
                    <img src="{{ $logo }}" alt="" class="size-full object-cover" />
                @else
                    <span aria-hidden="true">{{ mb_strtoupper(mb_substr($appName, 0, 1)) }}</span>
                @endif
            </span>
            @if (! empty($app['publisher'])) <span class="text-caption text-muted-foreground">{{ $app['publisher'] }}</span> @endif
        </div>
        <h{{ $level }} id="{{ $titleId }}" class="text-h3 text-foreground">{{ $titleBefore }}<bdi>{{ $appName }}</bdi>{{ $titleMid }}@if ($hasProduct)<bdi>{{ $product }}</bdi>@endif{{ $titleAfter }}</h{{ $level }}>
    </div>

    <div data-slot="oauth-consent-account" class="flex items-center gap-3 rounded-card border border-border bg-card p-3">
        <x-nq::avatar :name="$account['name'] ?? ''" :src="$account['avatar'] ?? null" size="lg" />
        <div class="flex min-w-0 flex-1 flex-col">
            <span class="text-caption text-muted-foreground">{{ $l['signedInAs'] }}</span>
            <span class="truncate text-label text-foreground">{{ $account['name'] ?? '' }}</span>
            <bdi dir="ltr" class="truncate text-caption text-muted-foreground">{{ $account['email'] ?? '' }}</bdi>
        </div>
        @if ($switchAccount)
            <x-nq::button type="button" variant="link" size="sm" x-on:click="emit('nq-oauth-switch-account')" x-bind:disabled="pendingKind !== ''"
                x-bind:data-disabled="pendingKind !== '' ? '' : null">{{ $l['switchAccount'] }}</x-nq::button>
        @endif
    </div>

    <div class="flex flex-col gap-2">
        <p class="text-body-sm text-foreground">{{ $introBefore }}<bdi class="font-medium">{{ $appName }}</bdi>{{ $introAfter }}</p>
        <ul data-slot="oauth-consent-scopes" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            @foreach ($scopes as $scope)
                <li data-scope="{{ $scope['id'] ?? '' }}" class="flex items-start gap-3 p-3">
                    @if (! empty($scope['sensitive']))
                        <x-lucide-shield-alert aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-warning-text" />
                    @else
                        <x-lucide-check aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-success-text" />
                    @endif
                    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span class="flex flex-wrap items-center gap-2 text-label text-foreground">
                            {{ $scope['label'] ?? '' }}
                            @if (! empty($scope['sensitive'])) <x-nq::badge variant="warning">{{ $l['sensitive'] }}</x-nq::badge> @endif
                        </span>
                        @if (! empty($scope['description'])) <span class="text-body-sm text-muted-foreground">{{ $scope['description'] }}</span> @endif
                    </div>
                </li>
            @endforeach
        </ul>
    </div>

    <x-nq::alert tone="danger" x-show="error" style="display: none"><span x-text="error"></span></x-nq::alert>

    <div class="grid grid-cols-2 gap-2">
        <x-nq::button type="button" variant="secondary" size="lg" data-slot="oauth-consent-deny" x-on:click="run('deny')" x-bind:disabled="off('deny')"
            x-bind:data-disabled="off('deny') ? '' : null" x-bind:aria-busy="pendingKind === 'deny' ? 'true' : null">
            <template x-if="pendingKind === 'deny'"><x-nq::spinner /></template>
            {{ $l['deny'] }}
        </x-nq::button>
        <x-nq::button type="button" variant="primary" size="lg" data-slot="oauth-consent-allow" x-on:click="run('allow')" x-bind:disabled="off('allow')"
            x-bind:data-disabled="off('allow') ? '' : null" x-bind:aria-busy="pendingKind === 'allow' ? 'true' : null">
            <template x-if="pendingKind === 'allow'"><x-nq::spinner /></template>
            {{ $l['allow'] }}
        </x-nq::button>
    </div>

    <p class="text-caption text-muted-foreground">
        @if ($redirectHost)
            {{ $redirectBefore }}<bdi dir="ltr" class="font-medium text-foreground">{{ $redirectHost }}</bdi>{{ $redirectAfter }}
        @endif
        {{ $l['revoke'] }}
    </p>
</section>
