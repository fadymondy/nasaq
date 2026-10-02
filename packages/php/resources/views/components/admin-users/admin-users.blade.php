{{-- <x-nq::admin-users :users="$users" :roles="$roles" current-user-id="u1" can-add can-verify can-update-roles @add-user="$event.detail.wait(…)" />
     The user management suite for an admin area: summary tiles, a searchable, filterable table, an add-user dialog and per-row actions (verify email, edit roles, reset password, impersonate, disable or enable). Risky actions ask first.
     users: [['id', 'name', 'email', 'roles' => [role ids], 'status' => active | disabled | invited, 'verified', 'workspace', 'lastActive', 'createdAt']].
     roles: [['id', 'label', 'description']]. current-user-id: the signed-in admin; their own row cannot be disabled or impersonated.
     can-add / can-verify / can-set-disabled / can-reset-password / can-impersonate / can-update-roles (all false): which actions to offer. can-open: rows fire "open" on click.
     password: the add dialog gets an optional password field (min-password-length, 8). free-roles: type role names instead of ticking them (default: when roles is empty). default-roles: ticked at first.
     page-size (10), hide-stats, loading, error (a message). labels: any of the strings below, by key.
     The row menu follows the row: Verify is disabled for a verified user, Impersonate for yourself and for a user who is not active, and Enable or Disable shows by the user's status (Disable is disabled for yourself). The user cell is an avatar with the "You" badge and the email under the name.
     It is presentational: it fires events on the root with detail { …, wait(promise) } and your handler talks to the server.
       add-user        detail.values { name, email, roles, sendInvite, verified, password? }; resolve, or resolve { error, fieldErrors: { name, email } }
       verify          detail.user;  set-disabled detail.user, detail.disabled;  reset-password detail.user;  impersonate detail.user;  update-roles detail.user, detail.roles. Resolve, or resolve { error }.
       open            detail.user (no wait)
     A rejected promise shows a generic error. After success re-render with the new users. Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'users' => [], 'roles' => [], 'currentUserId' => null, 'canAdd' => false, 'canVerify' => false, 'canSetDisabled' => false, 'canResetPassword' => false, 'canImpersonate' => false, 'canUpdateRoles' => false, 'canOpen' => false,
    'password' => false, 'minPasswordLength' => 8, 'freeRoles' => null, 'defaultRoles' => null, 'pageSize' => 10, 'hideStats' => false, 'loading' => false, 'error' => null, 'labels' => [],
])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $L = fn (string $key, string $en, string $arabic) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $free = $freeRoles ?? count($roles) === 0;
    $roleLabel = collect($roles)->mapWithKeys(fn ($r) => [$r['id'] => $r['label']])->all();
    $count = fn ($status) => collect($users)->where('status', $status)->count();
    $iso = fn ($v) => $v === null || $v === '' ? null : ($v instanceof \DateTimeInterface ? \Carbon\Carbon::instance($v) : \Carbon\Carbon::parse($v))->toDateString();
    $rows = collect($users)->map(fn ($u) => [
        'id' => $u['id'], 'name' => $u['name'], 'email' => $u['email'], 'self' => $currentUserId !== null && (string) $u['id'] === (string) $currentUserId, 'roles' => array_values($u['roles'] ?? []), 'status' => $u['status'], 'verified' => (bool) $u['verified'],
        'rolesText' => count($u['roles'] ?? []) ? collect($u['roles'])->map(fn ($r) => $roleLabel[$r] ?? $r)->implode(', ') : $L('noRoles', 'No roles', 'بلا أدوار'),
        'role' => ($u['roles'] ?? [])[0] ?? '', 'emailState' => ($u['verified'] ?? false) ? 'verified' : 'unverified', 'workspace' => $u['workspace'] ?? '',
        'lastActive' => $iso($u['lastActive'] ?? null), 'createdAt' => $iso($u['createdAt']),
    ])->all();
    $columns = [
        ['id' => 'name', 'header' => $L('user', 'User', 'المستخدم'), 'type' => 'avatar', 'secondary' => 'email', 'secondaryDir' => 'ltr', 'badge' => 'self', 'badgeLabel' => $L('you', 'You', 'أنت'), 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'email', 'header' => $L('emailField', 'Email address', 'البريد الإلكتروني'), 'searchable' => true, 'hidden' => true],
        ['id' => 'rolesText', 'header' => $L('roles', 'Roles', 'الأدوار')],
        ['id' => 'role', 'header' => $L('roles', 'Roles', 'الأدوار'), 'type' => 'tag', 'filter' => true, 'hidden' => true, 'options' => collect($roles)->map(fn ($r) => ['value' => $r['id'], 'label' => $r['label'], 'hue' => 'blue'])->all()],
        ['id' => 'status', 'header' => $L('status', 'Status', 'الحالة'), 'type' => 'status', 'sortable' => true, 'filter' => true, 'options' => [
            ['value' => 'active', 'label' => $L('statusActive', 'Active', 'نشط'), 'tone' => 'success'],
            ['value' => 'invited', 'label' => $L('statusInvited', 'Invited', 'مدعو'), 'tone' => 'info'],
            ['value' => 'disabled', 'label' => $L('statusDisabled', 'Disabled', 'معطّل'), 'tone' => 'danger'],
        ]],
        ['id' => 'emailState', 'header' => $L('email', 'Email', 'البريد'), 'type' => 'status', 'sortable' => true, 'filter' => true, 'options' => [
            ['value' => 'verified', 'label' => $L('verified', 'Verified', 'موثّق'), 'tone' => 'success'],
            ['value' => 'unverified', 'label' => $L('notVerified', 'Unverified', 'غير موثّق'), 'tone' => 'warning'],
        ]],
        ['id' => 'workspace', 'header' => $L('workspace', 'Workspace', 'مساحة العمل'), 'sortable' => true, 'searchable' => true, 'hidden' => true],
        ['id' => 'lastActive', 'header' => $L('lastActive', 'Last active', 'آخر نشاط'), 'type' => 'date', 'sortable' => true],
        ['id' => 'createdAt', 'header' => $L('joined', 'Joined', 'تاريخ الانضمام'), 'type' => 'date', 'sortable' => true, 'align' => 'end'],
    ];
    $actions = array_values(array_filter([
        $canVerify ? ['id' => 'verify', 'label' => $L('verify', 'Verify email', 'توثيق البريد'), 'icon' => 'badge-check', 'group' => 'manage', 'disabledWhen' => ['field' => 'verified', 'eq' => true]] : null,
        $canUpdateRoles ? ['id' => 'roles', 'label' => $L('editRoles', 'Edit roles…', 'تعديل الأدوار…'), 'icon' => 'shield-check', 'group' => 'manage'] : null,
        $canResetPassword ? ['id' => 'reset', 'label' => $L('resetPassword', 'Reset password…', 'إعادة تعيين كلمة المرور…'), 'icon' => 'key-round', 'group' => 'access'] : null,
        $canImpersonate ? ['id' => 'impersonate', 'label' => $L('impersonate', 'Impersonate…', 'انتحال الصفة…'), 'icon' => 'eye', 'group' => 'access', 'disabledWhen' => ['any' => [['field' => 'self', 'eq' => true], ['field' => 'status', 'ne' => 'active']]]] : null,
        $canSetDisabled ? ['id' => 'enable', 'label' => $L('enable', 'Enable account', 'تفعيل الحساب'), 'icon' => 'user-check', 'group' => 'danger', 'visibleWhen' => ['field' => 'status', 'eq' => 'disabled']] : null,
        $canSetDisabled ? ['id' => 'disable', 'label' => $L('disable', 'Disable account…', 'تعطيل الحساب…'), 'icon' => 'user-x', 'danger' => true, 'group' => 'danger', 'visibleWhen' => ['field' => 'status', 'ne' => 'disabled'], 'disabledWhen' => ['field' => 'self', 'eq' => true]] : null,
    ]));
    $config = [
        'locale' => $ar ? 'ar' : 'en',
        'currentUserId' => $currentUserId,
        'freeRoles' => (bool) $free,
        'password' => (bool) $password,
        'minPasswordLength' => $minPasswordLength,
        'defaultRoles' => $defaultRoles,
        'roles' => (object) collect($roles)->mapWithKeys(fn ($r) => [(string) $r['id'] => ['label' => $r['label'], 'description' => $r['description'] ?? '']])->all(),
        'labels' => [
            'failed' => $L('failed', 'That did not work. Try again.', 'لم تنجح العملية. حاول مرة أخرى.'),
            'verifiedOk' => $L('verifiedOk', '{name} was verified.', 'تم توثيق {name}.'),
            'enabledOk' => $L('enabledOk', '{name} was enabled.', 'تم تفعيل {name}.'),
            'disabledOk' => $L('disabledOk', '{name} was disabled.', 'تم تعطيل {name}.'),
            'bulkOk' => $L('bulkOk', '{n} users updated.', 'تم تحديث {n} مستخدمين.'),
            'disableTitle' => $L('disableTitle', 'Disable {name}?', 'تعطيل {name}؟'),
            'disableBody' => $L('disableBody', 'They are signed out at once and cannot sign in until you enable the account again. Their data is kept.', 'سيُسجَّل خروجه فورًا ولن يستطيع الدخول حتى تعيد تفعيل الحساب. تبقى بياناته محفوظة.'),
            'disableConfirm' => $L('disableConfirm', 'Disable account', 'تعطيل الحساب'),
            'disableOk' => $L('disabledOk', '{name} was disabled.', 'تم تعطيل {name}.'),
            'resetTitle' => $L('resetTitle', 'Reset password for {name}?', 'إعادة تعيين كلمة مرور {name}؟'),
            'resetBody' => $L('resetBody', 'We email them a link to choose a new password. Their current password stops working once they use it.', 'نرسل له رابطًا لاختيار كلمة مرور جديدة. تتوقف كلمة المرور الحالية عن العمل بمجرد استخدامه للرابط.'),
            'resetConfirm' => $L('resetConfirm', 'Send reset link', 'إرسال رابط إعادة التعيين'),
            'resetOk' => $L('resetOk', 'A reset link was sent to {name}.', 'أُرسل رابط إعادة التعيين إلى {name}.'),
            'impersonateTitle' => $L('impersonateTitle', 'Impersonate {name}?', 'انتحال صفة {name}؟'),
            'impersonateBody' => $L('impersonateBody', 'You will see the app exactly as they do. Everything you do is recorded in the audit log under both names.', 'سترى التطبيق كما يراه تمامًا. كل ما تفعله يُسجَّل في سجل التدقيق باسمكما معًا.'),
            'impersonateConfirm' => $L('impersonateConfirm', 'Start impersonating', 'بدء انتحال الصفة'),
            'impersonateOk' => $L('impersonateOk', 'You are now signed in as {name}.', 'سجّلت الدخول الآن بصفة {name}.'),
            'rolesTitle' => $L('rolesTitle', 'Roles for {name}', 'أدوار {name}'),
            'rolesOk' => $L('rolesOk', 'Roles updated for {name}.', 'تم تحديث أدوار {name}.'),
            'addedOk' => $L('addedOk', '{name} was added.', 'تمت إضافة {name}.'),
            'nameRequired' => $L('nameRequired', 'Enter a name.', 'أدخل الاسم.'),
            'emailRequired' => $L('emailRequired', 'Enter an email address.', 'أدخل البريد الإلكتروني.'),
            'emailInvalid' => $L('emailInvalid', 'Enter a valid email address.', 'أدخل بريدًا إلكترونيًا صالحًا.'),
            'rolesRequired' => $L('rolesRequired', 'Choose at least one role.', 'اختر دورًا واحدًا على الأقل.'),
            'passwordShort' => $L('passwordShort', 'Use at least {min} characters.', 'استخدم {min} أحرف على الأقل.'),
        ],
    ];
    $dismiss = $L('dismiss', 'Dismiss', 'تجاهل');
    $cancel = $L('cancel', 'Cancel', 'إلغاء');
    $addLabel = $L('addUser', 'Add user', 'إضافة مستخدم');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'admin-users') }}" x-data="nqAdminUsers(@js($config))" x-on:nq-data-table-action="onAction($event)" @if ($canOpen) x-on:nq-data-table-row-click="onRowClick($event)" @endif {{ $attributes->except('data-slot')->cn('flex flex-col gap-5') }}>
    @unless ($hideStats)
        <x-nq::stat-card.grid>
            <x-nq::stat-card :label="$L('total', 'Total users', 'إجمالي المستخدمين')" :value="count($users)" :loading="$loading"><x-slot:icon><x-lucide-shield-check /></x-slot:icon></x-nq::stat-card>
            <x-nq::stat-card :label="$L('active', 'Active', 'نشط')" :value="$count('active')" :loading="$loading"><x-slot:icon><x-lucide-user-check /></x-slot:icon></x-nq::stat-card>
            <x-nq::stat-card :label="$L('unverified', 'Unverified', 'غير موثّق')" :value="collect($users)->where('verified', false)->count()" :loading="$loading"><x-slot:icon><x-lucide-badge-check /></x-slot:icon></x-nq::stat-card>
            <x-nq::stat-card :label="$L('disabled', 'Disabled', 'معطّل')" :value="$count('disabled')" :loading="$loading"><x-slot:icon><x-lucide-user-x /></x-slot:icon></x-nq::stat-card>
        </x-nq::stat-card.grid>
    @endunless
    <template x-if="notice !== null && notice.tone === 'success'">
        <x-nq::alert tone="success" dismissible :dismiss-label="$dismiss" x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
    </template>
    <template x-if="notice !== null && notice.tone === 'danger'">
        <x-nq::alert tone="danger" dismissible :dismiss-label="$dismiss" x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
    </template>
    <x-nq::data-table :label="$L('table', 'Users', 'المستخدمون')" name-key="name" selectable :search="$L('search', 'Search name or email…', 'ابحث بالاسم أو البريد…')"
        :page-size="$pageSize" :columns="$columns" :rows="$rows" :row-actions="$actions" :row-click="$canOpen" :loading="$loading" :error="$error">
        @if ($canVerify || $canSetDisabled)
            <x-slot:bulk>
                @if ($canVerify)
                    <x-nq::button type="button" size="sm" variant="secondary" x-on:click="bulk('verify', selectedRows()); clearSelection()"><x-lucide-badge-check aria-hidden="true" />{{ $L('selectedVerify', 'Verify', 'توثيق') }}</x-nq::button>
                @endif
                @if ($canSetDisabled)
                    <x-nq::button type="button" size="sm" variant="secondary" x-on:click="bulk('disable', selectedRows()); clearSelection()"><x-lucide-user-round-x aria-hidden="true" />{{ $L('selectedDisable', 'Disable', 'تعطيل') }}</x-nq::button>
                @endif
            </x-slot:bulk>
        @endif
        @if ($canAdd)
            <x-slot:toolbar>
                <x-nq::button type="button" variant="primary" size="sm" class="ms-auto" x-on:click="openAdd()"><x-lucide-plus aria-hidden="true" />{{ $addLabel }}</x-nq::button>
            </x-slot:toolbar>
        @endif
        <x-slot:empty>
            <x-nq::states.empty :title="$L('empty', 'No users yet', 'لا يوجد مستخدمون بعد')" :description="$L('emptyHint', 'Add the first user to get started.', 'أضف أول مستخدم للبدء.')" />
        </x-slot:empty>
    </x-nq::data-table>

    @if ($canAdd)
        <x-nq::dialog x-model="addOpen">
            <x-nq::dialog.content class="max-w-lg">
                <form x-on:submit.prevent="submitAdd()" class="flex flex-col gap-5" novalidate>
                    <x-nq::dialog.header>
                        <x-nq::dialog.title>{{ $L('addTitle', 'Add a user', 'إضافة مستخدم') }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $L('addBody', 'They get an email to set a password, unless you mark the address as verified and skip the invite.', 'يصله بريد لتعيين كلمة المرور، إلا إذا وثّقت العنوان وتخطيت الدعوة.') }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <div class="flex flex-col gap-4">
                        <x-nq::field x-model="nameBad">
                            <x-nq::field.label>{{ $L('name', 'Full name', 'الاسم الكامل') }}</x-nq::field.label>
                            <x-nq::field.input x-model="draft.name" autocomplete="off" />
                            <x-nq::field.error><span x-text="nameMsg"></span></x-nq::field.error>
                        </x-nq::field>
                        <x-nq::field x-model="emailBad">
                            <x-nq::field.label>{{ $L('emailField', 'Email address', 'البريد الإلكتروني') }}</x-nq::field.label>
                            <x-nq::field.input x-model="draft.email" type="email" dir="ltr" autocomplete="off" />
                            <x-nq::field.error><span x-text="emailMsg"></span></x-nq::field.error>
                        </x-nq::field>
                        @if ($password)
                            <x-nq::field x-model="passwordBad">
                                <x-nq::field.label>{{ $L('password', 'Password (optional)', 'كلمة المرور (اختياري)') }}</x-nq::field.label>
                                <x-nq::password-input x-model="draft.password" name="password" autocomplete="new-password" show-strength />
                                <x-nq::field.error><span x-text="passwordMsg"></span></x-nq::field.error>
                                <x-nq::field.description>{{ $L('passwordHint', 'Leave it empty to let them set their own.', 'اتركها فارغة ليختاروا كلمة مرورهم بأنفسهم.') }}</x-nq::field.description>
                            </x-nq::field>
                        @endif
                        @if ($free)
                            <x-nq::field>
                                <x-nq::field.label>{{ $L('rolesField', 'Roles', 'الأدوار') }}</x-nq::field.label>
                                <x-nq::tag-input x-model="draft.tags" :suggestions="collect($roles)->pluck('id')->all()" :placeholder="$L('rolesFreePlaceholder', 'Type a role and press Enter', 'اكتب دورًا واضغط Enter')" />
                                <x-nq::field.description>{{ $L('rolesFreeHint', 'For example admin, editor or billing.', 'مثل admin أو editor أو billing.') }}</x-nq::field.description>
                            </x-nq::field>
                        @else
                            <fieldset class="flex min-w-0 flex-col gap-2 border-0 p-0">
                                <legend class="mb-1 text-label text-foreground">{{ $L('rolesField', 'Roles', 'الأدوار') }}</legend>
                                @foreach ($roles as $role)
                                    <label class="flex cursor-pointer items-start gap-2.5 rounded-control border border-border p-2.5 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-nq-selected">
                                        <x-nq::checkbox class="mt-0.5" data-role="{{ $role['id'] }}" x-model="draft.on[$el.dataset.role]" />
                                        <span class="flex min-w-0 flex-col">
                                            <span class="text-label text-foreground">{{ $role['label'] }}</span>
                                            @if (! empty($role['description']))<span class="text-caption text-muted-foreground">{{ $role['description'] }}</span>@endif
                                        </span>
                                    </label>
                                @endforeach
                                <p role="alert" x-show="rolesMsg !== ''" x-text="rolesMsg" style="display: none" class="text-caption text-nq-danger-text"></p>
                            </fieldset>
                        @endif
                        <div class="flex flex-col divide-y divide-border rounded-control border border-border" x-effect="draft.sendInvite = hasPassword ? false : draft.sendInvite">
                            <x-nq::field class="flex-row items-center justify-between gap-4 px-3 py-2.5">
                                <div class="flex min-w-0 flex-col">
                                    <x-nq::field.label>{{ $L('sendInvite', 'Send an invitation email', 'إرسال بريد دعوة') }}</x-nq::field.label>
                                    <x-nq::field.description>{{ $L('sendInviteHint', 'They set their own password.', 'يعيّن كلمة مروره بنفسه.') }}</x-nq::field.description>
                                </div>
                                <x-nq::switch :checked="true" x-model="draft.sendInvite" :aria-label="$L('sendInvite', 'Send an invitation email', 'إرسال بريد دعوة')" />
                            </x-nq::field>
                            <x-nq::field class="flex-row items-center justify-between gap-4 px-3 py-2.5">
                                <div class="flex min-w-0 flex-col">
                                    <x-nq::field.label>{{ $L('markVerified', 'Mark the email as verified', 'اعتبار البريد موثّقًا') }}</x-nq::field.label>
                                    <x-nq::field.description>{{ $L('markVerifiedHint', 'Skips the confirmation step.', 'يتخطى خطوة التأكيد.') }}</x-nq::field.description>
                                </div>
                                <x-nq::switch x-model="draft.verified" :aria-label="$L('markVerified', 'Mark the email as verified', 'اعتبار البريد موثّقًا')" />
                            </x-nq::field>
                        </div>
                        <template x-if="formError !== null">
                            <x-nq::alert tone="danger" role="alert"><span x-text="formError"></span></x-nq::alert>
                        </template>
                    </div>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="addOpen = false" x-bind:disabled="busy ? '' : null">{{ $cancel }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                            <x-nq::spinner x-show="busy" style="display: none" />
                            {{ $addLabel }}
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($canUpdateRoles)
        <x-nq::dialog x-model="rolesOpen">
            <x-nq::dialog.content class="max-w-md">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="rolesTitle"></span></x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $L('rolesBody', 'Choose what this person can do. Changes apply on their next request.', 'اختر ما يستطيع هذا الشخص فعله. تسري التغييرات عند طلبه التالي.') }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <div class="flex flex-col gap-2">
                    @foreach ($roles as $role)
                        <label class="flex cursor-pointer items-start gap-2.5 rounded-control border border-border p-2.5 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-nq-selected">
                            <x-nq::checkbox class="mt-0.5" data-role="{{ $role['id'] }}" x-model="editOn[$el.dataset.role]" />
                            <span class="flex min-w-0 flex-col">
                                <span class="text-label text-foreground">{{ $role['label'] }}</span>
                                @if (! empty($role['description']))<span class="text-caption text-muted-foreground">{{ $role['description'] }}</span>@endif
                            </span>
                        </label>
                    @endforeach
                    <template x-if="rolesError !== null">
                        <x-nq::alert tone="danger" role="alert"><span x-text="rolesError"></span></x-nq::alert>
                    </template>
                </div>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="rolesOpen = false" x-bind:disabled="busy ? '' : null">{{ $cancel }}</x-nq::button>
                    <x-nq::button type="button" variant="primary" x-on:click="saveRoles()" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy || ! canSaveRoles ? '' : null">
                        <x-nq::spinner x-show="busy" style="display: none" />
                        {{ $L('saveRoles', 'Save roles', 'حفظ الأدوار') }}
                    </x-nq::button>
                </x-nq::dialog.footer>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($canSetDisabled || $canResetPassword || $canImpersonate)
        <x-nq::alert-dialog x-model="confirmOpen">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><span x-text="confirmTitle"></span></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description><span x-text="confirmBody"></span></x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <template x-if="confirmError !== null">
                    <x-nq::alert tone="danger" role="alert"><span x-text="confirmError"></span></x-nq::alert>
                </template>
                <x-nq::alert-dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="confirmOpen = false" x-bind:disabled="busy ? '' : null">{{ $cancel }}</x-nq::button>
                    <x-nq::button type="button" variant="primary" x-on:click="runConfirm()" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                        <x-nq::spinner x-show="busy" style="display: none" />
                        <span x-text="confirmAction"></span>
                    </x-nq::button>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</div>
