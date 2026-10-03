{{-- <x-nq::passkey-list :passkeys="[['id' => 'a', 'name' => 'MacBook Pro', 'kind' => 'device', 'created_at' => '2026-03-02', 'last_used_at' => null]]"
         @nq-passkey-add="$event.detail.wait(registerPasskey())" @nq-passkey-rename="$event.detail.wait(rename($event.detail))" @nq-passkey-remove="$event.detail.wait(remove($event.detail.id))" />
     Manage the passkeys on an account: list, add, rename in place and remove with confirmation. It draws the list only; your handlers run the WebAuthn ceremony.
     passkeys: rows of id, name, kind (device | synced | security-key, picks the icon), authenticator (a hint such as "iCloud Keychain"), created_at, last_used_at (null: never used).
     Add, rename and remove dispatch `nq-passkey-add`, `nq-passkey-rename` ({ id, name }) and `nq-passkey-remove` ({ id }), each with detail.wait(promise): the UI shows its
     pending state until it settles; resolve { error } (or reject) to show a message. A renamed row shows the new name and a removed row disappears once it resolves.
     renamable / removable: false hides that action (default true). supported: override the browser check (default: read after mount; a notice shows when there is no support).
     labels: override any string. Needs the Alpine runtime. --}}
@props(['passkeys' => [], 'renamable' => true, 'removable' => true, 'supported' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $s = array_merge([
        'title' => $t::t('Passkeys', 'مفاتيح المرور'),
        'description' => $t::t('Sign in with your fingerprint, face or screen lock instead of a password.', 'سجّل الدخول ببصمتك أو وجهك أو قفل الشاشة بدلًا من كلمة المرور.'),
        'add' => $t::t('Add a passkey', 'إضافة مفتاح مرور'),
        'unsupportedTitle' => $t::t('Passkeys are not available in this browser', 'مفاتيح المرور غير متاحة في هذا المتصفح'),
        'unsupported' => $t::t('Use a recent version of Chrome, Safari, Edge or Firefox, on a device with a screen lock, to add a passkey.', 'استخدم إصدارًا حديثًا من Chrome أو Safari أو Edge أو Firefox على جهاز به قفل شاشة لإضافة مفتاح مرور.'),
        'emptyTitle' => $t::t('No passkeys yet', 'لا توجد مفاتيح مرور بعد'),
        'emptyBody' => $t::t('Add one to sign in faster and safer than with a password.', 'أضف واحدًا لتسجيل دخول أسرع وأكثر أمانًا من كلمة المرور.'),
        'list' => $t::t('Your passkeys', 'مفاتيح المرور الخاصة بك'),
        'added' => $t::t('Added', 'أُضيف'),
        'lastUsed' => $t::t('Last used', 'آخر استخدام'),
        'neverUsed' => $t::t('Never used', 'لم يُستخدم قط'),
        'device' => $t::t('This device', 'هذا الجهاز'),
        'synced' => $t::t('Synced passkey', 'مفتاح مرور متزامن'),
        'securityKey' => $t::t('Security key', 'مفتاح أمان'),
        'rename' => $t::t('Rename', 'إعادة تسمية'),
        'renameLabel' => $t::t('Passkey name', 'اسم مفتاح المرور'),
        'save' => $t::t('Save name', 'حفظ الاسم'),
        'cancel' => $t::t('Cancel', 'إلغاء'),
        'remove' => $t::t('Remove', 'إزالة'),
        'removeTitle' => $t::t('Remove "{name}"?', 'إزالة «{name}»؟'),
        'removeBody' => $t::t('You will no longer be able to sign in with this passkey. This cannot be undone.', 'لن تتمكن بعد ذلك من تسجيل الدخول بهذا المفتاح. لا يمكن التراجع عن ذلك.'),
        'removeConfirm' => $t::t('Remove passkey', 'إزالة مفتاح المرور'),
        'addFailed' => $t::t('Could not add the passkey. Try again.', 'تعذرت إضافة مفتاح المرور. حاول مرة أخرى.'),
        'addCancelled' => $t::t('Adding the passkey was cancelled.', 'أُلغيت إضافة مفتاح المرور.'),
        'renameFailed' => $t::t('Could not rename the passkey. Try again.', 'تعذرت إعادة تسمية مفتاح المرور. حاول مرة أخرى.'),
        'removeFailed' => $t::t('Could not remove the passkey. Try again.', 'تعذرت إزالة مفتاح المرور. حاول مرة أخرى.'),
    ], (array) $labels);
    $icons = ['device' => 'smartphone', 'synced' => 'cloud', 'security-key' => 'usb'];
    $rows = collect($passkeys)->map(fn ($p) => [
        'id' => (string) $p['id'],
        'name' => $p['name'],
        'kind' => $p['kind'] ?? 'device',
        'authenticator' => $p['authenticator'] ?? null,
        'createdAt' => $p['created_at'] ?? $p['createdAt'] ?? null,
        'lastUsedAt' => $p['last_used_at'] ?? $p['lastUsedAt'] ?? null,
    ])->all();
    $js = fn ($v) => \Illuminate\Support\Js::from($v);
    $init = [
        'supported' => $supported,
        'names' => (object) collect($rows)->mapWithKeys(fn ($r) => [$r['id'] => $r['name']])->all(),
        'messages' => ['addFailed' => $s['addFailed'], 'addCancelled' => $s['addCancelled'], 'renameFailed' => $s['renameFailed'], 'removeFailed' => $s['removeFailed']],
    ];
    $none = $supported === false;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'passkey-list') }}" x-data="nqPasskeyList({!! $js($init) !!})"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full max-w-2xl') }}>
    <x-nq::card.header>
        <x-nq::card.title as="h2">{{ $s['title'] }}</x-nq::card.title>
        <x-nq::card.description>{{ $s['description'] }}</x-nq::card.description>
        @if (count($rows))
            <x-nq::card.action x-show="count > 0">
                <x-nq::button type="button" variant="secondary" size="sm" x-on:click="add()" x-bind:disabled="adding || ! supported" x-bind:data-disabled="(adding || ! supported) ? '' : null" x-bind:aria-busy="adding ? 'true' : null">
                    <x-nq::spinner x-show="adding" style="display: none" />
                    <x-lucide-plus aria-hidden="true" x-show="! adding" />{{ $s['add'] }}
                </x-nq::button>
            </x-nq::card.action>
        @endif
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <x-nq::alert tone="warning" :title="$s['unsupportedTitle']" x-show="supported === false" :style="$none ? '' : 'display: none'">{{ $s['unsupported'] }}</x-nq::alert>
        <x-nq::alert tone="danger" x-show="error" style="display: none"><span x-text="error"></span></x-nq::alert>
        <ul aria-label="{{ $s['list'] }}" class="overflow-hidden rounded-card border border-border" x-show="count > 0" @unless (count($rows)) style="display: none" @endunless>
            @foreach ($rows as $p)
                @php
                    $id = $js($p['id']);
                    $kindLabel = $p['kind'] === 'synced' ? $s['synced'] : ($p['kind'] === 'security-key' ? $s['securityKey'] : $s['device']);
                @endphp
                <li data-slot="passkey-row" x-show="! gone[{!! $id !!}]" class="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0">
                    <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
                        <x-dynamic-component :component="'lucide-'.($icons[$p['kind']] ?? 'key-round')" aria-hidden="true" />
                    </span>
                    <div class="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
                        <form class="flex items-center gap-1.5" x-show="editing === {!! $id !!}" style="display: none"
                            x-on:submit.prevent="save({!! $id !!})" x-on:keydown.escape.stop="cancelEdit({!! $id !!})">
                            <x-nq::field.input x-model="draft" aria-label="{{ $s['renameLabel'] }}" maxlength="64" class="h-control-sm"
                                x-bind:aria-invalid="renameError[{!! $id !!}] ? 'true' : null" x-bind:disabled="renaming === {!! $id !!}" />
                            <x-nq::button type="submit" variant="primary" size="icon-sm" aria-label="{{ $s['save'] }}" x-bind:disabled="! draft.trim() || renaming === {!! $id !!}"
                                x-bind:data-disabled="(! draft.trim() || renaming === {!! $id !!}) ? '' : null" x-bind:aria-busy="renaming === {!! $id !!} ? 'true' : null">
                                <x-nq::spinner x-show="renaming === {!! $id !!}" style="display: none" />
                                <x-lucide-check aria-hidden="true" x-show="renaming !== {!! $id !!}" />
                            </x-nq::button>
                            <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $s['cancel'] }}" x-on:click="cancelEdit({!! $id !!})"
                                x-bind:disabled="renaming === {!! $id !!}" x-bind:data-disabled="renaming === {!! $id !!} ? '' : null">
                                <x-lucide-x aria-hidden="true" />
                            </x-nq::button>
                        </form>
                        <p class="truncate text-label text-foreground" x-show="editing !== {!! $id !!}" x-bind:title="names[{!! $id !!}]" x-text="names[{!! $id !!}]">{{ $p['name'] }}</p>
                        <p role="alert" class="text-caption text-nq-danger-text" x-show="renameError[{!! $id !!}]" x-text="renameError[{!! $id !!}]" style="display: none"></p>
                        <p class="flex flex-wrap gap-x-2 text-caption text-muted-foreground">
                            <span>{{ $p['authenticator'] ?? $kindLabel }}</span>
                            <span>{{ $s['added'] }} @if ($p['createdAt'])<x-nq::numeric.date-time :value="$p['createdAt']" />@endif</span>
                            @if ($p['lastUsedAt'])
                                <span>{{ $s['lastUsed'] }} <x-nq::numeric.date-time :value="$p['lastUsedAt']" relative /></span>
                            @else
                                <span>{{ $s['neverUsed'] }}</span>
                            @endif
                        </p>
                    </div>
                    <div class="flex items-center gap-1" x-show="editing !== {!! $id !!}">
                        @if ($renamable)
                            <x-nq::button type="button" variant="ghost" size="icon-sm" x-on:click="startEdit({!! $id !!}, $el)"
                                x-bind:aria-label="{!! $js($s['rename'].': ') !!} + names[{!! $id !!}]" x-bind:disabled="adding" x-bind:data-disabled="adding ? '' : null">
                                <x-lucide-pencil aria-hidden="true" />
                            </x-nq::button>
                        @endif
                        @if ($removable)
                            <x-nq::alert-dialog>
                                <x-nq::alert-dialog.trigger variant="ghost" size="icon-sm" x-bind:aria-label="{!! $js($s['remove'].': ') !!} + names[{!! $id !!}]"
                                    x-bind:disabled="adding" x-bind:data-disabled="adding ? '' : null">
                                    <x-lucide-trash-2 aria-hidden="true" />
                                </x-nq::alert-dialog.trigger>
                                <x-nq::alert-dialog.content>
                                    <x-nq::alert-dialog.header>
                                        <x-nq::alert-dialog.title x-text="{!! $js(explode('{name}', $s['removeTitle'], 2)[0]) !!} + names[{!! $id !!}] + {!! $js(explode('{name}', $s['removeTitle'], 2)[1] ?? '') !!}">{{ str_replace('{name}', $p['name'], $s['removeTitle']) }}</x-nq::alert-dialog.title>
                                        <x-nq::alert-dialog.description>{{ $s['removeBody'] }}</x-nq::alert-dialog.description>
                                    </x-nq::alert-dialog.header>
                                    <x-nq::alert-dialog.footer>
                                        <x-nq::alert-dialog.cancel>{{ $s['cancel'] }}</x-nq::alert-dialog.cancel>
                                        <x-nq::alert-dialog.action data-slot="confirm-button-action" x-on:click="remove({!! $id !!})">{{ $s['removeConfirm'] }}</x-nq::alert-dialog.action>
                                    </x-nq::alert-dialog.footer>
                                </x-nq::alert-dialog.content>
                            </x-nq::alert-dialog>
                        @endif
                    </div>
                </li>
            @endforeach
        </ul>
        <x-nq::states.empty icon="fingerprint-pattern" :title="$s['emptyTitle']" :description="$s['emptyBody']" x-show="count === 0" :style="count($rows) ? 'display: none' : ''">
            <x-slot:actions>
                <x-nq::button type="button" variant="primary" size="sm" x-on:click="add()" x-bind:disabled="adding || ! supported" x-bind:data-disabled="(adding || ! supported) ? '' : null" x-bind:aria-busy="adding ? 'true' : null">
                    <x-nq::spinner x-show="adding" style="display: none" />
                    <x-lucide-plus aria-hidden="true" x-show="! adding" />{{ $s['add'] }}
                </x-nq::button>
            </x-slot:actions>
        </x-nq::states.empty>
    </x-nq::card.content>
</div>
