{{-- <x-nq::connected-accounts :providers="[['id' => 'google', 'connected' => true, 'account' => 'fady@example.com'], ['id' => 'github', 'connected' => false]]" :other-sign-in-methods="1"
         @nq-connect="$event.detail.wait(startOAuth($event.detail.id))" @nq-disconnect="$event.detail.wait(unlink($event.detail.id))" />
     The OAuth accounts linked to a sign-in: each provider with the connected email or username and a Connect or Disconnect button.
     providers: id google | github | apple | microsoft use the official logo and name; any other id is custom: pass 'name' and 'icon' (the provider's official logo as <svg>).
     other-sign-in-methods: sign-in methods outside this list that still work (a password counts 1, each passkey 1). The last remaining method cannot be
     disconnected: the button is disabled and a tooltip and a visible line say why.
     Clicking dispatches `nq-connect` / `nq-disconnect` with detail { id, wait(promise) }: pass a promise to wait() to show the row's pending state;
     resolve { error } (or reject) to show a message, otherwise the row flips. `connected` is x-modelable. labels: override any string. Needs the Alpine runtime. --}}
@props(['providers' => [], 'otherSignInMethods' => 0, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $s = array_merge([
        'title' => $t::t('Connected accounts', 'الحسابات المرتبطة'),
        'description' => $t::t('Sign in with these accounts instead of a password.', 'سجّل الدخول بهذه الحسابات بدلًا من كلمة المرور.'),
        'list' => $t::t('Sign-in providers', 'مزوّدو تسجيل الدخول'),
        'connect' => $t::t('Connect', 'ربط'),
        'disconnect' => $t::t('Disconnect', 'فك الارتباط'),
        'connected' => $t::t('Connected', 'مرتبط'),
        'notConnected' => $t::t('Not connected', 'غير مرتبط'),
        'lastMethod' => $t::t('This is your only way to sign in. Add a password, a passkey or another account first.', 'هذه هي طريقتك الوحيدة لتسجيل الدخول. أضف كلمة مرور أو مفتاح مرور أو حسابًا آخر أولًا.'),
        'disconnectTitle' => $t::t('Disconnect {provider}?', 'فك ارتباط {provider}؟'),
        'disconnectBody' => $t::t('You will no longer be able to sign in with this account. You can connect it again later.', 'لن تتمكن بعد ذلك من تسجيل الدخول بهذا الحساب. يمكنك ربطه مرة أخرى لاحقًا.'),
        'disconnectConfirm' => $t::t('Disconnect', 'فك الارتباط'),
        'cancel' => $t::t('Cancel', 'إلغاء'),
        'connectFailed' => $t::t('Could not connect the account. Try again.', 'تعذر ربط الحساب. حاول مرة أخرى.'),
        'disconnectFailed' => $t::t('Could not disconnect the account. Try again.', 'تعذر فك ارتباط الحساب. حاول مرة أخرى.'),
    ], (array) $labels);
    // Provider names are brand names: they are never translated.
    $names = ['google' => 'Google', 'github' => 'GitHub', 'apple' => 'Apple', 'microsoft' => 'Microsoft'];
    $rows = collect($providers)->map(fn ($p) => [
        'id' => $p['id'],
        'name' => $p['name'] ?? ($names[$p['id']] ?? $p['id']),
        'icon' => $p['icon'] ?? null,
        'account' => $p['account'] ?? null,
        'connected' => (bool) ($p['connected'] ?? false),
    ])->all();
    $connectedMap = collect($rows)->mapWithKeys(fn ($r) => [$r['id'] => $r['connected']])->all();
    $accounts = collect($rows)->filter(fn ($r) => $r['connected'] && $r['account'])->mapWithKeys(fn ($r) => [$r['id'] => $r['account']])->all();
    $total = count(array_filter($connectedMap)) + (int) $otherSignInMethods;
    $init = [
        'connected' => (object) $connectedMap,
        'accounts' => (object) $accounts,
        'others' => (int) $otherSignInMethods,
        'messages' => ['connectFailed' => $s['connectFailed'], 'disconnectFailed' => $s['disconnectFailed']],
    ];
    $uid = 'nq-connected-'.substr(md5(json_encode($rows)), 0, 6);
@endphp
<div data-slot="connected-accounts" x-data="nqConnectedAccounts({!! \Illuminate\Support\Js::from($init) !!})" x-modelable="connected"
    {{ $attributes->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full max-w-2xl') }}>
    <x-nq::card.header>
        <x-nq::card.title as="h2">{{ $s['title'] }}</x-nq::card.title>
        <x-nq::card.description>{{ $s['description'] }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <x-nq::alert tone="danger" x-show="error" style="display: none"><span x-text="error"></span></x-nq::alert>
        <ul aria-label="{{ $s['list'] }}" class="overflow-hidden rounded-card border border-border">
            @foreach ($rows as $p)
                @php
                    $id = $p['id'];
                    $jsId = \Illuminate\Support\Js::from($id);
                    $showAccount = $p['connected'] && $p['account'];
                    $title = str_replace('{provider}', $p['name'], $s['disconnectTitle']);
                @endphp
                <li data-slot="connected-account" data-provider="{{ $id }}" x-bind:data-connected="connected[{!! $jsId !!}] ? '' : null"
                    class="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0">
                    <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-card [&_svg]:size-5">
                        @if ($id === 'google')
                            <x-nq::oauth-buttons.google-logo />
                        @elseif ($id === 'github')
                            <x-nq::oauth-buttons.github-logo />
                        @elseif ($id === 'apple')
                            <x-nq::oauth-buttons.apple-logo />
                        @elseif ($id === 'microsoft')
                            <x-nq::oauth-buttons.microsoft-logo />
                        @elseif ($p['icon'])
                            {!! $p['icon'] !!}
                        @endif
                    </span>
                    <div class="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
                        <p class="text-label text-foreground"><bdi>{{ $p['name'] }}</bdi></p>
                        <p class="truncate text-caption text-muted-foreground" x-show="connected[{!! $jsId !!}] && accounts[{!! $jsId !!}]" @unless ($showAccount) style="display: none" @endunless>
                            <bdi dir="ltr" x-text="accounts[{!! $jsId !!}]">{{ $p['account'] }}</bdi>
                        </p>
                        <x-nq::status tone="success" class="text-caption text-muted-foreground" x-show="connected[{!! $jsId !!}] && ! accounts[{!! $jsId !!}]"
                            :style="($p['connected'] && ! $p['account']) ? '' : 'display: none'">{{ $s['connected'] }}</x-nq::status>
                        <x-nq::status tone="neutral" class="text-caption text-muted-foreground" x-show="! connected[{!! $jsId !!}]"
                            :style="$p['connected'] ? 'display: none' : ''">{{ $s['notConnected'] }}</x-nq::status>
                        <p id="{{ $uid }}-{{ $id }}" class="text-caption text-muted-foreground" x-show="connected[{!! $jsId !!}] && total <= 1"
                            @unless ($p['connected'] && $total <= 1) style="display: none" @endunless>{{ $s['lastMethod'] }}</p>
                    </div>
                    {{-- Connected: Disconnect (disabled with a tooltip for the last method, else it asks first). --}}
                    <span class="contents" x-show="connected[{!! $jsId !!}]" @unless ($p['connected']) style="display: none" @endunless>
                        <span class="contents" x-show="total <= 1" @unless ($total <= 1) style="display: none" @endunless>
                            <x-nq::tooltip :content="$s['lastMethod']" side="top">
                                <x-nq::button type="button" size="sm" aria-describedby="{{ $uid }}-{{ $id }}" aria-disabled="true" data-disabled="" x-on:click.prevent>
                                    <x-lucide-link-2-off aria-hidden="true" />
                                    {{ $s['disconnect'] }}
                                    <span class="sr-only"> <bdi>{{ $p['name'] }}</bdi></span>
                                </x-nq::button>
                            </x-nq::tooltip>
                        </span>
                        <span class="contents" x-show="total > 1" @unless ($total > 1) style="display: none" @endunless>
                            <x-nq::alert-dialog>
                                <x-nq::alert-dialog.trigger size="sm" variant="secondary" x-bind:disabled="busy !== null">
                                    <x-lucide-link-2-off aria-hidden="true" x-show="busy !== {!! $jsId !!}" />
                                    <x-nq::spinner x-show="busy === {!! $jsId !!}" style="display: none" />
                                    {{ $s['disconnect'] }}
                                    <span class="sr-only"> <bdi>{{ $p['name'] }}</bdi></span>
                                </x-nq::alert-dialog.trigger>
                                <x-nq::alert-dialog.content>
                                    <x-nq::alert-dialog.header>
                                        <x-nq::alert-dialog.title>{{ $title }}</x-nq::alert-dialog.title>
                                        <x-nq::alert-dialog.description>{{ $s['disconnectBody'] }}</x-nq::alert-dialog.description>
                                    </x-nq::alert-dialog.header>
                                    <x-nq::alert-dialog.footer>
                                        <x-nq::alert-dialog.cancel>{{ $s['cancel'] }}</x-nq::alert-dialog.cancel>
                                        <x-nq::alert-dialog.action data-slot="confirm-button-action" x-on:click="disconnect({!! $jsId !!})">{{ $s['disconnectConfirm'] }}</x-nq::alert-dialog.action>
                                    </x-nq::alert-dialog.footer>
                                </x-nq::alert-dialog.content>
                            </x-nq::alert-dialog>
                        </span>
                    </span>
                    {{-- Not connected: Connect. --}}
                    <x-nq::button type="button" size="sm" variant="secondary" x-show="! connected[{!! $jsId !!}]" :style="$p['connected'] ? 'display: none' : ''"
                        x-on:click="connect({!! $jsId !!})" x-bind:disabled="busy !== null && busy !== {!! $jsId !!}">
                        <x-lucide-link-2 aria-hidden="true" x-show="busy !== {!! $jsId !!}" />
                        <x-nq::spinner x-show="busy === {!! $jsId !!}" style="display: none" />
                        {{ $s['connect'] }}
                        <span class="sr-only"> <bdi>{{ $p['name'] }}</bdi></span>
                    </x-nq::button>
                </li>
            @endforeach
        </ul>
    </x-nq::card.content>
</div>
