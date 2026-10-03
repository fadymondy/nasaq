{{-- <x-nq::user-actions-menu :user="['name' => 'Mona', 'email' => 'mona@example.com', 'roles' => ['editor']]" edit impersonate set-password reset-link magic-link delete @edit="$event.detail.wait(…)" />
     The actions an admin takes on one account: edit email, roles and permissions, impersonate, set a password or send a reset link,
     send a sign-in link, and delete. Each action shows only when you turn it on with its flag. It owns its dialogs: confirmations for
     impersonate and delete, and a copyable link when the server returns one.
     user: ['email', 'name' (shown in titles, default the email), 'roles' => [], 'permissions' => [] (leave out to hide the permissions field)].
     variant: menu (a "…" button with a menu, default) | toolbar (a row of buttons).
     Flags (all false): edit, impersonate, set-password (adds the field to the password dialog), reset-link, magic-link, delete.
     The password item shows when set-password or reset-link is on. role-suggestions, permission-suggestions: offered while typing tags.
     min-password-length (8) applies to set-password.
     It is presentational: it fires events on the root with detail { …, wait(promise) } and your handler talks to the server.
       edit          detail.values = { email, roles, permissions }       resolve, or resolve { error }
       impersonate   resolve, or resolve { error }                       delete  resolve, or resolve { error }
       set-password  detail.password                                     resolve, or resolve { error }
       reset-link / magic-link   resolve { link } (shown with a copy button), { emailed: true }, or { error }
     A rejected promise shows a generic error. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['user', 'variant' => 'menu', 'edit' => false, 'impersonate' => false, 'setPassword' => false, 'resetLink' => false, 'magicLink' => false, 'delete' => false, 'roleSuggestions' => null, 'permissionSuggestions' => null, 'minPasswordLength' => 8])
@php
    $t = \Nasaq\Nasaq::class;
    $fill = fn (string $text, array $values) => preg_replace_callback('/\{(\w+)\}/', fn ($m) => $values[$m[1]] ?? $m[0], $text);
    $uid = 'nq-user-'.\Illuminate\Support\Str::random(6);
    $email = (string) $user['email'];
    $name = (string) (($user['name'] ?? null) ?: $email);
    $hasPermissions = array_key_exists('permissions', $user) && $user['permissions'] !== null;
    $toolbar = $variant === 'toolbar';
    $showPassword = $setPassword || $resetLink;
    $items = array_values(array_filter([
        $edit ? ['edit', 'pencil', $t::t('Edit…', 'تعديل…'), 'beginEdit()'] : null,
        $impersonate ? ['impersonate', 'user-cog', $t::t('Impersonate…', 'انتحال الهوية…'), 'beginImpersonate()'] : null,
        $showPassword ? ['password', 'key-round', $t::t('Password…', 'كلمة المرور…'), 'beginPassword()'] : null,
        $magicLink ? ['magic-link', 'link-2', $t::t('Send sign-in link', 'إرسال رابط تسجيل الدخول'), 'sendMagic()'] : null,
    ]));
    $actionsLabel = $fill($t::t('Actions for {name}', 'إجراءات {name}'), ['name' => $name]);
    $config = [
        'email' => $email,
        'roles' => array_values((array) ($user['roles'] ?? [])),
        'permissions' => array_values((array) ($user['permissions'] ?? [])),
        'minPasswordLength' => (int) $minPasswordLength,
        'labels' => [
            'failed' => $t::t('That did not work. Try again.', 'لم ينجح ذلك. حاول مرة أخرى.'),
            'emailInvalid' => $t::t('Enter a valid email address.', 'أدخل بريدًا إلكترونيًا صالحًا.'),
            'passwordShort' => $fill($t::t('Use at least {min} characters.', 'استخدم {min} أحرف على الأقل.'), ['min' => (string) $minPasswordLength]),
            'resetLinkTitle' => $t::t('Password reset link', 'رابط إعادة تعيين كلمة المرور'),
            'magicLinkTitle' => $t::t('Sign-in link', 'رابط تسجيل الدخول'),
        ],
    ];
    $deleteTitle = $fill($t::t('Delete {name}?', 'حذف {name}؟'), ['name' => $name]);
    $impersonateTitle = $fill($t::t('Impersonate {name}?', 'انتحال هوية {name}؟'), ['name' => $name]);
    $deleteBody = $t::t('Their account and access go away at once. This cannot be undone.', 'يُحذف حسابه وصلاحياته فورًا. لا يمكن التراجع عن ذلك.');
    $impersonateBody = $t::t('You will see the app exactly as they do. Everything you do is recorded in the audit log under both names.', 'سترى التطبيق كما يراه تمامًا. كل ما تفعله يُسجَّل في سجل التدقيق باسمكما معًا.');
    $emailed = $fill($t::t('We emailed the link to {email}.', 'أرسلنا الرابط إلى {email}.'), ['email' => "\u{2068}{$email}\u{2069}"]);
@endphp
<div data-slot="user-actions-menu" data-variant="{{ $variant }}" x-data="nqUserActionsMenu(@js($config))" {{ $attributes->cn($toolbar ? 'flex flex-wrap items-center gap-2' : 'inline-flex') }}>
    @if ($toolbar)
        @foreach ($items as [$id, $icon, $label, $call])
            <x-nq::button type="button" variant="secondary" size="sm" data-action="{{ $id }}" x-on:click="{{ $call }}">
                <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />
                {{ $label }}
            </x-nq::button>
        @endforeach
        @if ($delete)
            <x-nq::button type="button" variant="secondary" size="sm" class="text-nq-danger-text" data-action="delete" x-on:click="begin('delete')">
                <x-lucide-trash-2 aria-hidden="true" />
                {{ $t::t('Delete…', 'حذف…') }}
            </x-nq::button>
        @endif
    @else
        <x-nq::dropdown-menu>
            <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" aria-label="{{ $actionsLabel }}">
                <x-lucide-ellipsis aria-hidden="true" />
            </x-nq::dropdown-menu.trigger>
            <x-nq::dropdown-menu.content align="end" class="min-w-52">
                @foreach ($items as [$id, $icon, $label, $call])
                    <x-nq::dropdown-menu.item data-action="{{ $id }}" x-on:click="{{ $call }}">
                        <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />
                        {{ $label }}
                    </x-nq::dropdown-menu.item>
                @endforeach
                @if ($delete)
                    @if (count($items))
                        <x-nq::dropdown-menu.separator />
                    @endif
                    <x-nq::dropdown-menu.item variant="danger" data-action="delete" x-on:click="begin('delete')">
                        <x-lucide-trash-2 aria-hidden="true" />
                        {{ $t::t('Delete…', 'حذف…') }}
                    </x-nq::dropdown-menu.item>
                @endif
            </x-nq::dropdown-menu.content>
        </x-nq::dropdown-menu>
    @endif

    @if ($edit)
        <x-nq::dialog x-model="editOpen">
            <x-nq::dialog.content class="max-w-lg">
                <form novalidate class="flex flex-col gap-5" x-on:submit.prevent="saveEdit()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title>{{ $fill($t::t('Edit {name}', 'تعديل {name}'), ['name' => $name]) }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $t::t('Changes apply on their next request.', 'تسري التغييرات عند طلبه التالي.') }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <div class="flex flex-col gap-4">
                        <x-nq::field x-model="emailErr">
                            <x-nq::field.label>{{ $t::t('Email address', 'البريد الإلكتروني') }}</x-nq::field.label>
                            <x-nq::field.input type="email" ltr autocomplete="off" x-model="email" x-on:input="emailErr = false" />
                            <x-nq::field.error>{{ $t::t('Enter a valid email address.', 'أدخل بريدًا إلكترونيًا صالحًا.') }}</x-nq::field.error>
                        </x-nq::field>
                        <div class="flex flex-col gap-1.5">
                            <label for="{{ $uid }}-roles" class="text-label text-foreground">{{ $t::t('Roles', 'الأدوار') }}</label>
                            <x-nq::tag-input id="{{ $uid }}-roles" x-model="roles" :suggestions="$roleSuggestions" :placeholder="$t::t('Type and press Enter', 'اكتب واضغط Enter')" />
                        </div>
                        @if ($hasPermissions)
                            <div class="flex flex-col gap-1.5">
                                <label for="{{ $uid }}-perms" class="text-label text-foreground">{{ $t::t('Permissions', 'الصلاحيات') }}</label>
                                <x-nq::tag-input id="{{ $uid }}-perms" x-model="perms" :suggestions="$permissionSuggestions" placeholder="users:read" dir="ltr" />
                            </div>
                        @endif
                        <template x-if="err"><x-nq::alert tone="danger" role="alert"><span x-text="err"></span></x-nq::alert></template>
                    </div>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="dismiss()" x-bind:disabled="busy ? '' : null">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                            <x-nq::spinner x-show="busy" style="display: none" />
                            {{ $t::t('Save changes', 'حفظ التغييرات') }}
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($showPassword)
        <x-nq::dialog x-model="passwordOpen">
            <x-nq::dialog.content class="max-w-md">
                <form novalidate class="flex flex-col gap-5" x-on:submit.prevent="savePassword()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title>{{ $fill($t::t('Password for {name}', 'كلمة مرور {name}'), ['name' => $name]) }}</x-nq::dialog.title>
                        <x-nq::dialog.description x-show="!pwDone">{{ $t::t('Set a new password yourself, or send them a link to choose one.', 'عيّن كلمة مرور جديدة بنفسك، أو أرسل له رابطًا ليختار واحدة.') }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <template x-if="pwDone"><x-nq::alert tone="success" role="status">{{ $t::t('The password was changed. Tell them through a channel you trust.', 'تم تغيير كلمة المرور. أبلغه بها عبر قناة موثوقة.') }}</x-nq::alert></template>
                    <div class="flex flex-col gap-4" x-show="!pwDone">
                        @if ($setPassword)
                            <template x-if="passwordOpen && !pwDone">
                                <div class="flex flex-col gap-1.5">
                                    <label for="{{ $uid }}-pw" class="text-label text-foreground">{{ $t::t('New password', 'كلمة المرور الجديدة') }}</label>
                                    <x-nq::password-input id="{{ $uid }}-pw" name="new-password" autocomplete="new-password" show-strength aria-describedby="{{ $uid }}-pw-hint"
                                        x-on:input="newPassword = $event.target.value; pwErr = null" />
                                    <p id="{{ $uid }}-pw-hint" role="alert" x-show="pwErr" style="display: none" class="text-caption text-nq-danger-text" x-text="pwErr"></p>
                                    <p x-show="!pwErr" class="text-caption text-muted-foreground">{{ $config['labels']['passwordShort'] }}</p>
                                </div>
                            </template>
                        @endif
                        <template x-if="err"><x-nq::alert tone="danger" role="alert"><span x-text="err"></span></x-nq::alert></template>
                    </div>
                    <x-nq::dialog.footer>
                        <template x-if="pwDone">
                            <x-nq::button type="button" variant="primary" x-on:click="dismiss()">{{ $t::t('Done', 'تم') }}</x-nq::button>
                        </template>
                        <template x-if="!pwDone">
                            <div class="contents">
                                <x-nq::button type="button" variant="ghost" x-on:click="dismiss()" x-bind:disabled="busy ? '' : null">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::button>
                                @if ($resetLink)
                                    <x-nq::button type="button" :variant="$setPassword ? 'secondary' : 'primary'" data-action="send-reset" x-on:click="sendReset()" x-bind:disabled="busy ? '' : null">{{ $t::t('Send reset link', 'إرسال رابط إعادة التعيين') }}</x-nq::button>
                                @endif
                                @if ($setPassword)
                                    <x-nq::button type="submit" variant="primary" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                                        <x-nq::spinner x-show="busy" style="display: none" />
                                        {{ $t::t('Set password', 'تعيين كلمة المرور') }}
                                    </x-nq::button>
                                @endif
                            </div>
                        </template>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($resetLink || $magicLink)
        <x-nq::dialog x-model="linkOpen">
            <x-nq::dialog.content class="max-w-md">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="linkTitle"></span></x-nq::dialog.title>
                    <x-nq::dialog.description class="sr-only">{{ $email }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <div role="status" x-bind:aria-busy="linkPending ? 'true' : null" class="flex flex-col gap-3">
                    <p x-show="linkPending" style="display: none" class="flex items-center gap-2 text-body-sm text-muted-foreground">
                        <x-nq::spinner aria-hidden="true" class="size-4" />
                        {{ $t::t('Creating the link…', 'جارٍ إنشاء الرابط…') }}
                    </p>
                    <template x-if="!linkPending && linkError"><x-nq::alert tone="danger"><span x-text="linkError"></span></x-nq::alert></template>
                    <div x-show="!linkPending && !linkError" style="display: none" class="flex flex-col gap-3">
                        <template x-if="linkEmailed"><x-nq::alert tone="success">{{ $emailed }}</x-nq::alert></template>
                        <div x-show="linkUrl" class="flex flex-col gap-3">
                            <div data-slot="copy-field" class="contents">
                                <x-nq::input-group>
                                    <x-nq::input-group.input readonly ltr aria-label="{{ $t::t('Link', 'الرابط') }}" x-bind:value="linkUrl" x-on:focus="$el.select()" />
                                    <x-nq::input-group.addon align="end">
                                        <x-nq::button type="button" variant="ghost" size="icon-sm" data-slot="copy-button" aria-label="{{ $t::t('Copy', 'نسخ') }}"
                                            x-on:click="copyLink()" x-bind:data-copied="copied ? '' : null" class="data-copied:text-nq-success-text">
                                            <x-lucide-copy aria-hidden="true" x-show="!copied" />
                                            <x-lucide-check aria-hidden="true" x-show="copied" style="display: none" />
                                        </x-nq::button>
                                    </x-nq::input-group.addon>
                                </x-nq::input-group>
                            </div>
                            <p class="text-caption text-muted-foreground">{{ $t::t('It works once. Share it only with this person.', 'يعمل مرة واحدة. شاركه مع هذا الشخص فقط.') }}</p>
                        </div>
                        <p x-show="!linkUrl && !linkEmailed" style="display: none" class="text-body-sm text-muted-foreground">{{ $t::t('The server did not return a link.', 'لم يُرجع الخادم رابطًا.') }}</p>
                    </div>
                </div>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="primary" x-on:click="closeLink()" x-bind:disabled="linkPending ? '' : null">{{ $t::t('Done', 'تم') }}</x-nq::button>
                </x-nq::dialog.footer>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($impersonate || $delete)
        <x-nq::alert-dialog x-model="confirmOpen">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><span x-text="confirmKind === 'delete' ? @js($deleteTitle) : @js($impersonateTitle)"></span></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description><span x-text="confirmKind === 'delete' ? @js($deleteBody) : @js($impersonateBody)"></span></x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <template x-if="err"><x-nq::alert tone="danger" role="alert"><span x-text="err"></span></x-nq::alert></template>
                <x-nq::alert-dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="dismiss()" x-bind:disabled="busy ? '' : null">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::button>
                    @if ($delete)
                        <x-nq::button type="button" variant="danger" data-action="confirm-delete" x-show="confirmKind === 'delete'" x-on:click="confirmAction()" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                            <x-nq::spinner x-show="busy" style="display: none" />
                            {{ $t::t('Delete user', 'حذف المستخدم') }}
                        </x-nq::button>
                    @endif
                    @if ($impersonate)
                        <x-nq::button type="button" variant="primary" data-action="confirm-impersonate" x-show="confirmKind === 'impersonate'" style="display: none" x-on:click="confirmAction()" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                            <x-nq::spinner x-show="busy" style="display: none" />
                            {{ $t::t('Start impersonating', 'بدء انتحال الهوية') }}
                        </x-nq::button>
                    @endif
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</div>
