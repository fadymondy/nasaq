{{-- <x-nq::api-keys :keys="$keys" :scopes="$scopes" @create="$event.detail.wait(…)" @revoke="$event.detail.wait(…)" />
     Create, list, rotate and revoke API keys. Creating asks for a name, scopes and an expiry, then shows the secret once in a dialog
     with a copy button; the list only ever shows the masked key, the scopes, last use and expiry. Revoke and rotate ask first.
     keys: [['id', 'name', 'prefix', 'last4', 'scopes' => ['read'], 'createdAt', 'lastUsedAt', 'expiresAt', 'revokedAt']]; dates are
     DateTime, ISO strings or unix seconds. scopes: [['id' => 'read', 'label' => 'Read', 'description' => '…']].
     default-scopes: ticked when the form opens. expiry-options: days, null is never (default [7, 30, 90, 365, null]).
     default-expiry-days (90). rotatable / revocable (true): show those actions.
     It is presentational: it fires events on the root with detail { …, wait(promise) } and your handler talks to the server.
       create  detail.input = { name, scopes, expiresInDays }; resolve { secret } (shown once) or { error }
       rotate  detail.id; resolve { secret } or { error }      revoke  detail.id; resolve, or resolve { error }
     A rejected promise shows a generic error. After success re-render the list with the new keys.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['keys' => [], 'scopes' => [], 'defaultScopes' => [], 'expiryOptions' => [7, 30, 90, 365, null], 'defaultExpiryDays' => 90, 'rotatable' => true, 'revocable' => true])
@php
    $t = \Nasaq\Nasaq::class;
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $uid = 'nq-api-key-'.\Illuminate\Support\Str::random(6);
    $date = fn ($v) => $v === null ? null : ($v instanceof \DateTimeInterface ? \Carbon\Carbon::instance($v) : (is_numeric($v) ? \Carbon\Carbon::createFromTimestamp($v) : \Carbon\Carbon::parse($v)));
    $now = \Carbon\Carbon::now();
    $status = function ($key) use ($date, $now) {
        if (($key['revokedAt'] ?? null) !== null) return 'revoked';
        $exp = $date($key['expiresAt'] ?? null);
        if ($exp === null) return 'active';
        $left = $exp->getTimestamp() - $now->getTimestamp();
        if ($left <= 0) return 'expired';
        return $left <= 7 * 86400 ? 'expiring' : 'active';
    };
    $tones = ['active' => 'success', 'expiring' => 'warning', 'expired' => 'danger', 'revoked' => 'neutral'];
    $statusLabels = [
        'active' => $t::t('Active', 'نشط'), 'expiring' => $t::t('Expiring soon', 'ينتهي قريبًا'),
        'expired' => $t::t('Expired', 'منتهي'), 'revoked' => $t::t('Revoked', 'ملغى'),
    ];
    $scopeLabel = fn ($id) => collect($scopes)->firstWhere('id', $id)['label'] ?? $id;
    $expiryLabel = fn ($d) => $d === null ? $t::t('Never', 'بلا انتهاء') : ($d === 1 ? $t::t('In 1 day', 'بعد يوم') : ($d === 365 ? $t::t('In 1 year', 'بعد سنة') : $t::t("In {$d} days", "بعد {$d} يومًا")));
    $names = collect($keys)->mapWithKeys(fn ($k) => [(string) $k['id'] => $k['name']])->all();
    $config = [
        'scopes' => collect($scopes)->pluck('id')->values()->all(),
        'defaultScopes' => array_values($defaultScopes),
        'expiry' => (string) ($defaultExpiryDays ?? 'never'),
        'names' => (object) $names,
        'labels' => [
            'revealTitle' => $t::t('Copy your new key now', 'انسخ مفتاحك الجديد الآن'),
            'revealRotated' => $t::t('New key for {name}', 'مفتاح جديد لـ {name}'),
            'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
        ],
    ];
@endphp
{{-- The card's classes, copied from card.blade.php, so data-slot can be api-keys. --}}
<div data-slot="api-keys" x-data="nqApiKeys(@js($config))" {{ $attributes->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full max-w-4xl') }}>
    <x-nq::card.header class="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div class="flex flex-col gap-1.5">
            <x-nq::card.title as="h2">{{ $t::t('API keys', 'مفاتيح API') }}</x-nq::card.title>
            <x-nq::card.description>{{ $t::t('Keys let your own code call the API. Give each key only the access it needs.', 'تتيح المفاتيح لشيفرتك استدعاء الـ API. امنح كل مفتاح الصلاحيات التي يحتاجها فقط.') }}</x-nq::card.description>
        </div>
        <x-nq::button type="button" variant="primary" class="mt-3 sm:mt-0" x-on:click="openCreate()">
            <x-lucide-plus aria-hidden="true" />
            {{ $t::t('Create key', 'إنشاء مفتاح') }}
        </x-nq::button>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <template x-if="pageError">
            <x-nq::alert tone="danger" dismissible x-on:nq:dismiss="pageError = null"><span x-text="pageError"></span></x-nq::alert>
        </template>
        @if (count($keys) === 0)
            <x-nq::states.empty icon="key-round" :title="$t::t('No API keys yet', 'لا توجد مفاتيح بعد')" :description="$t::t('Create a key to call the API from a script or a server.', 'أنشئ مفتاحًا لاستدعاء الـ API من سكربت أو خادم.')" />
        @else
            <ul aria-label="{{ $t::t('API keys', 'مفاتيح API') }}" class="overflow-hidden rounded-card border border-border">
                @foreach ($keys as $key)
                    @php
                        $s = $status($key);
                        $dead = $s === 'revoked' || $s === 'expired';
                        $exp = $date($key['expiresAt'] ?? null);
                        $left = $exp === null ? null : (int) ceil(($exp->getTimestamp() - $now->getTimestamp()) / 86400);
                        $name = $key['name'];
                    @endphp
                    <li data-slot="api-key" data-status="{{ $s }}" class="flex flex-col gap-3 border-t border-border px-4 py-3 first:border-t-0 sm:flex-row sm:items-start sm:justify-between">
                        <div class="flex min-w-0 flex-col gap-2">
                            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span dir="auto" class="{{ \Nasaq\Cn::merge('text-label text-foreground', $dead ? 'text-muted-foreground line-through decoration-1' : '') }}">{{ $name }}</span>
                                <x-nq::status :tone="$tones[$s]">{{ $statusLabels[$s] }}</x-nq::status>
                            </div>
                            <code dir="ltr" data-slot="api-key-masked" class="w-fit max-w-full truncate text-start font-mono text-code text-muted-foreground">{{ $key['prefix'] }}{{ str_repeat('•', 8) }}{{ $key['last4'] ?? '' }}</code>
                            <ul aria-label="{{ $t::t('Scopes', 'الصلاحيات') }}" class="flex flex-wrap gap-1">
                                @foreach ($key['scopes'] ?? [] as $sc)
                                    <li><x-nq::badge variant="outline">{{ $scopeLabel($sc) }}</x-nq::badge></li>
                                @endforeach
                            </ul>
                            <dl class="flex flex-wrap gap-x-5 gap-y-1 text-caption text-muted-foreground">
                                <div class="flex gap-1">
                                    <dt>{{ $t::t('Created', 'أُنشئ') }}</dt>
                                    <dd><x-nq::numeric.date-time :value="$key['createdAt']" date-style="medium" /></dd>
                                </div>
                                <div class="flex gap-1">
                                    <dt>{{ $t::t('Last used', 'آخر استخدام') }}</dt>
                                    <dd>@if (($key['lastUsedAt'] ?? null) === null){{ $t::t('Never used', 'لم يُستخدم بعد') }}@else<x-nq::numeric.date-time :value="$key['lastUsedAt']" relative />@endif</dd>
                                </div>
                                <div class="flex gap-1">
                                    <dt>{{ $s === 'expired' ? $t::t('Expired', 'انتهى') : $t::t('Expires', 'ينتهي') }}</dt>
                                    <dd>
                                        @if ($exp === null){{ $t::t('Never expires', 'لا ينتهي') }}
                                        @elseif ($s === 'expiring' && $left !== null){{ $left === 1 ? $t::t('in 1 day', 'بعد يوم') : $t::t("in {$left} days", "بعد {$left} أيام") }}
                                        @else<x-nq::numeric.date-time :value="$key['expiresAt']" date-style="medium" />@endif
                                    </dd>
                                </div>
                            </dl>
                        </div>
                        @if ($s !== 'revoked')
                            <div role="group" aria-label="{{ $t::t("Actions for {$name}", "إجراءات {$name}") }}" class="flex shrink-0 flex-wrap gap-2">
                                @if ($rotatable)
                                    <x-nq::alert-dialog.confirm-button size="sm" variant="secondary" :title="$t::t('Rotate '.$name.'?', 'تبديل '.$name.'؟')"
                                        :description="$t::t('A new secret replaces the old one, and the old one stops working at once. Update the places that use it.', 'يحل سر جديد محل القديم، ويتوقف القديم عن العمل فورًا. حدّث الأماكن التي تستخدمه.')"
                                        :confirm-label="$t::t('Rotate key', 'تبديل المفتاح')" data-key-id="{{ $key['id'] }}" x-on:click="rotate($el.dataset.keyId)">
                                        <x-lucide-refresh-cw aria-hidden="true" />
                                        {{ $t::t('Rotate', 'تبديل') }}
                                    </x-nq::alert-dialog.confirm-button>
                                @endif
                                @if ($revocable)
                                    <x-nq::alert-dialog.confirm-button size="sm" variant="danger" :title="$t::t('Revoke '.$name.'?', 'إلغاء '.$name.'؟')"
                                        :description="$t::t('Anything using this key loses access immediately. This cannot be undone.', 'أي شيء يستخدم هذا المفتاح يفقد الوصول فورًا. لا يمكن التراجع.')"
                                        :confirm-label="$t::t('Revoke key', 'إلغاء المفتاح')" data-key-id="{{ $key['id'] }}" x-on:click="revoke($el.dataset.keyId)">
                                        <x-lucide-trash-2 aria-hidden="true" />
                                        {{ $t::t('Revoke', 'إلغاء') }}
                                    </x-nq::alert-dialog.confirm-button>
                                @endif
                            </div>
                        @else
                            <x-lucide-shield-alert aria-hidden="true" class="hidden size-4 shrink-0 text-muted-foreground sm:block" />
                        @endif
                    </li>
                @endforeach
            </ul>
        @endif
    </x-nq::card.content>

    <x-nq::dialog x-model="createOpen">
        <x-nq::dialog.content>
            <form novalidate data-slot="api-key-create" class="grid gap-4" x-on:submit.prevent="submit()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t::t('Create an API key', 'إنشاء مفتاح API') }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t::t('Name it after where it will be used. You will see the key once.', 'سمِّه باسم المكان الذي سيُستخدم فيه. ستراه مرة واحدة فقط.') }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <template x-if="formError"><x-nq::alert tone="danger"><span x-text="formError"></span></x-nq::alert></template>
                <x-nq::field x-model="nameInvalid">
                    <x-nq::field.label>{{ $t::t('Name', 'الاسم') }}</x-nq::field.label>
                    <x-nq::field.input x-model="draftName" placeholder="{{ $t::t('Production server', 'خادم الإنتاج') }}" autocomplete="off" maxlength="60" />
                    <x-nq::field.error>{{ $t::t('Give the key a name.', 'أعطِ المفتاح اسمًا.') }}</x-nq::field.error>
                </x-nq::field>
                <fieldset class="grid gap-2 border-0 p-0" aria-describedby="{{ $uid }}-scopes">
                    <legend class="mb-1 text-label text-foreground">{{ $t::t('Scopes', 'الصلاحيات') }}</legend>
                    <p id="{{ $uid }}-scopes" class="text-caption text-muted-foreground">{{ $t::t('The key can do only what these allow.', 'لا يستطيع المفتاح فعل أكثر مما تسمح به هذه الصلاحيات.') }}</p>
                    <ul class="grid gap-1 rounded-card border border-border p-2">
                        @foreach ($scopes as $sc)
                            <li class="flex items-start gap-2.5 rounded-control px-2 py-1.5 hover:bg-nq-hover">
                                <x-nq::checkbox id="{{ $uid }}-{{ $sc['id'] }}" class="mt-0.5" :checked="in_array($sc['id'], $defaultScopes)" :x-model="'picked['.$loop->index.']'" />
                                <label for="{{ $uid }}-{{ $sc['id'] }}" class="grid min-w-0 flex-1 cursor-pointer gap-0.5">
                                    <span class="text-body-sm text-foreground">{{ $sc['label'] }}</span>
                                    @if (! empty($sc['description']))<span class="text-caption text-muted-foreground">{{ $sc['description'] }}</span>@endif
                                </label>
                            </li>
                        @endforeach
                    </ul>
                    <p role="alert" x-show="scopesInvalid" style="display: none" class="text-caption text-nq-danger-text">{{ $t::t('Pick at least one scope.', 'اختر صلاحية واحدة على الأقل.') }}</p>
                </fieldset>
                <x-nq::field>
                    <x-nq::field.label>{{ $t::t('Expires', 'الانتهاء') }}</x-nq::field.label>
                    <x-nq::select :value="(string) ($defaultExpiryDays ?? 'never')" x-model="expiry">
                        <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($expiryOptions as $d)
                                <x-nq::select.item :value="(string) ($d ?? 'never')">{{ $expiryLabel($d) }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </x-nq::field>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="createOpen = false" x-bind:disabled="pending ? '' : null">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:aria-busy="pending ? 'true' : null" x-bind:data-disabled="pending ? '' : null">
                        <x-nq::spinner x-show="pending" style="display: none" />
                        {{ $t::t('Create key', 'إنشاء مفتاح') }}
                    </x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    <x-nq::dialog x-model="revealOpen">
        <x-nq::dialog.content :show-close="false">
            <div data-slot="api-key-reveal" class="contents">
            <x-nq::dialog.header>
                <x-nq::dialog.title><span x-text="secretTitle"></span></x-nq::dialog.title>
                <x-nq::dialog.description>{{ $t::t('This is the only time the full key is shown. Store it in a secret manager. If you lose it, rotate the key.', 'هذه هي المرة الوحيدة التي يظهر فيها المفتاح كاملًا. احفظه في مدير أسرار. إذا فقدته فبدّل المفتاح.') }}</x-nq::dialog.description>
            </x-nq::dialog.header>
            <x-nq::alert tone="warning">{{ $t::t('You will not see this key again.', 'لن تتمكن من رؤية هذا المفتاح مرة أخرى.') }}</x-nq::alert>
            <div data-slot="copy-field" class="contents">
                <x-nq::input-group>
                    <x-nq::input-group.input readonly ltr aria-label="{{ $t::t('Secret key', 'المفتاح السري') }}" x-bind:value="secret" x-on:focus="$el.select()" />
                    <x-nq::input-group.addon align="end">
                        <x-nq::button type="button" variant="ghost" size="icon-sm" data-slot="copy-button" aria-label="{{ $t::t('Copy', 'نسخ') }}"
                            x-on:click="copySecret()" x-bind:data-copied="copied ? '' : null" class="data-copied:text-nq-success-text">
                            <x-lucide-copy aria-hidden="true" x-show="!copied" />
                            <x-lucide-check aria-hidden="true" x-show="copied" style="display: none" />
                        </x-nq::button>
                    </x-nq::input-group.addon>
                </x-nq::input-group>
            </div>
            <span role="status" aria-live="polite" class="sr-only" x-text="copied ? @js($t::t('Copied to clipboard', 'تم النسخ إلى الحافظة')) : ''"></span>
            <x-nq::dialog.footer>
                <x-nq::button type="button" variant="primary" x-on:click="revealOpen = false">{{ $t::t('Done', 'تم') }}</x-nq::button>
            </x-nq::dialog.footer>
            </div>
        </x-nq::dialog.content>
    </x-nq::dialog>
</div>
