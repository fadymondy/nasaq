{{-- <x-nq::members-manager :members="$members" :invites="$invites" :roles="$roles" current-user-id="m1" can-invite can-change-role can-remove @invite="$event.detail.wait(…)" />
     Members and roles of a workspace: a searchable table, an invite-by-email dialog, pending invites with resend and revoke, transfer of ownership and leave.
     The last owner is protected everywhere: they cannot be demoted, removed or leave.
     members: [['id', 'name', 'email', 'role' => role id, 'joinedAt', 'lastActive']]. invites: [['id', 'email', 'role', 'invitedBy', 'sentAt', 'expiresAt']]; the Pending tab shows when invites is passed (even empty).
     roles: [['id', 'label', 'description']] in display order. current-user-id: the signed-in member. grantable-roles: role ids that may be assigned (default every role but the owner role). owner-role: "owner".
     can-manage (true): false hides every control. can-invite / can-change-role / can-remove / can-resend / can-revoke / can-transfer / can-leave (all false): which actions to offer.
     page-size (8), loading, labels: any of the strings below, by key.
     Differences from the other stacks: the profile hover card and the inline role select are not drawn (the member cell is an avatar, the name with a "You" badge and the email under it).
     Role changes happen from the row menu ("Change role…"). A menu item that does not apply (remove the last owner) explains why in the notice.
     It is presentational: it fires events on the root with detail { …, wait(promise) } and your handler talks to the server.
       invite  detail.values { emails, role }; resolve, or resolve { error, emailsError }     change-role  detail.member, detail.role     remove / transfer-ownership  detail.member
       resend-invite / revoke-invite  detail.invite     leave  (no detail)    Resolve, or resolve { error }. A rejected promise shows a generic error. After success re-render with the new lists.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'members' => [], 'invites' => null, 'roles' => [], 'currentUserId' => null, 'grantableRoles' => null, 'ownerRole' => 'owner', 'canManage' => true,
    'canInvite' => false, 'canChangeRole' => false, 'canRemove' => false, 'canResend' => false, 'canRevoke' => false, 'canTransfer' => false, 'canLeave' => false,
    'pageSize' => 8, 'loading' => false, 'labels' => [],
])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $L = fn (string $key, string $en, string $arabic) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $num = fn ($n) => number_format($n, 0, '.', ',');
    $roleLabel = collect($roles)->mapWithKeys(fn ($r) => [$r['id'] => $r['label']])->all();
    $grantable = $grantableRoles ?? collect($roles)->pluck('id')->reject(fn ($id) => $id === $ownerRole)->values()->all();
    $inviteRoles = collect($roles)->filter(fn ($r) => in_array($r['id'], $grantable, true) && $r['id'] !== $ownerRole)->values()->all();
    $me = collect($members)->firstWhere('id', $currentUserId);
    $ownerCount = collect($members)->where('role', $ownerRole)->count();
    $iAmOwner = $me && $me['role'] === $ownerRole;
    $leaveOk = $me && ! ($me['role'] === $ownerRole && $ownerCount <= 1);
    $iso = fn ($v) => $v === null || $v === '' ? null : ($v instanceof \DateTimeInterface ? \Carbon\Carbon::instance($v) : \Carbon\Carbon::parse($v))->toDateString();
    $showInvites = $invites !== null;
    $rows = collect($members)->map(fn ($m) => [
        'id' => $m['id'], 'name' => $m['name'], 'email' => $m['email'], 'role' => $m['role'], 'self' => $currentUserId !== null && (string) $m['id'] === (string) $currentUserId,
        'lastActive' => $iso($m['lastActive'] ?? null), 'joinedAt' => $iso($m['joinedAt']),
    ])->all();
    $columns = [
        ['id' => 'name', 'header' => $L('member', 'Member', 'العضو'), 'type' => 'avatar', 'secondary' => 'email', 'secondaryDir' => 'ltr', 'badge' => 'self', 'badgeLabel' => $L('you', 'You', 'أنت'), 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'email', 'header' => $L('emailField', 'Email address', 'البريد الإلكتروني'), 'searchable' => true, 'hidden' => true],
        ['id' => 'role', 'header' => $L('role', 'Role', 'الدور'), 'type' => 'tag', 'sortable' => true, 'filter' => true, 'options' => collect($roles)->map(fn ($r) => ['value' => $r['id'], 'label' => $r['label'], 'hue' => $r['id'] === $ownerRole ? 'amber' : 'blue'])->all()],
        ['id' => 'lastActive', 'header' => $L('lastActive', 'Last active', 'آخر نشاط'), 'type' => 'date', 'sortable' => true],
        ['id' => 'joinedAt', 'header' => $L('joined', 'Joined', 'تاريخ الانضمام'), 'type' => 'date', 'sortable' => true, 'align' => 'end'],
    ];
    $actions = $canManage ? array_values(array_filter([
        $canChangeRole ? ['id' => 'role', 'label' => $L('changeRole', 'Change role…', 'تغيير الدور…'), 'icon' => 'shield-check', 'group' => 'manage'] : null,
        $canTransfer && $iAmOwner ? ['id' => 'transfer', 'label' => $L('transfer', 'Transfer ownership…', 'نقل الملكية…'), 'icon' => 'crown', 'group' => 'ownership', 'visibleWhen' => ['field' => 'role', 'ne' => $ownerRole]] : null,
        $canRemove ? ['id' => 'remove', 'label' => $L('remove', 'Remove from workspace…', 'إزالة من مساحة العمل…'), 'icon' => 'user-minus', 'danger' => true, 'group' => 'danger'] : null,
    ])) : [];
    $config = [
        'locale' => $ar ? 'ar' : 'en',
        'currentUserId' => $currentUserId,
        'ownerRole' => $ownerRole,
        'grantable' => array_values($grantable),
        'members' => (object) collect($members)->mapWithKeys(fn ($m) => [(string) $m['id'] => ['id' => $m['id'], 'name' => $m['name'], 'email' => $m['email'], 'role' => $m['role']]])->all(),
        'invites' => (object) collect($invites ?? [])->mapWithKeys(fn ($i) => [(string) $i['id'] => ['id' => $i['id'], 'email' => $i['email'], 'role' => $i['role']]])->all(),
        'roles' => (object) collect($roles)->mapWithKeys(fn ($r) => [(string) $r['id'] => ['label' => $r['label'], 'description' => $r['description'] ?? '']])->all(),
        'defaultRole' => $inviteRoles ? $inviteRoles[count($inviteRoles) - 1]['id'] : '',
        'labels' => [
            'failed' => $L('failed', 'That did not work. Try again.', 'لم تنجح العملية. حاول مرة أخرى.'),
            'blockLastOwner' => $L('blockLastOwner', 'A workspace needs an owner. Transfer ownership first.', 'تحتاج مساحة العمل إلى مالك. انقل الملكية أولًا.'),
            'blockOwnerOnly' => $L('blockOwnerOnly', 'Only an owner can change another owner.', 'المالك وحده يستطيع تغيير مالك آخر.'),
            'blockNotGrantable' => $L('blockNotGrantable', 'You cannot change this role.', 'لا يمكنك تغيير هذا الدور.'),
            'blockSelf' => $L('blockSelf', 'Use Leave workspace to remove yourself.', 'استخدم «مغادرة مساحة العمل» لإزالة نفسك.'),
            'emailsRequired' => $L('emailsRequired', 'Add at least one email address.', 'أضف عنوان بريد واحدًا على الأقل.'),
            'emailInvalid' => $L('emailInvalid', '{v} is not a valid email address.', '{v} ليس بريدًا إلكترونيًا صالحًا.'),
            'emailDuplicate' => $L('emailDuplicate', '{v} is already added.', '{v} مضاف بالفعل.'),
            'invitedOne' => $L('invitedOne', '1 invite sent.', 'أُرسلت دعوة واحدة.'),
            'invitedMany' => $L('invitedMany', '{n} invites sent.', 'أُرسلت {n} دعوات.'),
            'roleOk' => $L('roleOk', 'Role updated for {name}.', 'تم تحديث دور {name}.'),
            'removedOk' => $L('removedOk', '{name} was removed.', 'تمت إزالة {name}.'),
            'resentOk' => $L('resentOk', 'Invite sent again to {email}.', 'أُعيد إرسال الدعوة إلى {email}.'),
            'revokedOk' => $L('revokedOk', 'Invite to {email} was revoked.', 'أُلغيت الدعوة إلى {email}.'),
            'transferredOk' => $L('transferredOk', '{name} is now the owner.', 'أصبح {name} المالك.'),
            'removeTitle' => $L('removeTitle', 'Remove {name}?', 'إزالة {name}؟'),
            'removeBody' => $L('removeBody', 'They lose access to this workspace at once. Their work stays here.', 'يفقد وصوله إلى مساحة العمل فورًا. يبقى عمله هنا.'),
            'removeConfirm' => $L('removeConfirm', 'Remove member', 'إزالة العضو'),
            'transferTitle' => $L('transferTitle', 'Make {name} the owner?', 'جعل {name} المالك؟'),
            'transferBody' => $L('transferBody', 'They become the owner and you lose owner rights. Only they can give ownership back.', 'يصبح هو المالك وتفقد أنت صلاحيات المالك. هو وحده يستطيع إعادة الملكية إليك.'),
            'transferConfirm' => $L('transferConfirm', 'Transfer ownership', 'نقل الملكية'),
            'leaveTitle' => $L('leaveTitle', 'Leave this workspace?', 'مغادرة مساحة العمل هذه؟'),
            'leaveBody' => $L('leaveBody', 'You lose access until someone invites you again.', 'تفقد الوصول إلى أن يدعوك أحد مرة أخرى.'),
            'leaveConfirm' => $L('leaveConfirm', 'Leave workspace', 'مغادرة مساحة العمل'),
            'roleTitle' => $L('roleTitle', 'Role of {name}', 'دور {name}'),
        ],
    ];
    $dismiss = $L('dismiss', 'Dismiss', 'تجاهل');
    $cancel = $L('cancel', 'Cancel', 'إلغاء');
    $now = \Carbon\Carbon::now();
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'members-manager') }}" x-data="nqMembersManager(@js($config))" x-on:nq-data-table-action="onAction($event)" {{ $attributes->except('data-slot')->cn('flex flex-col gap-5') }}>
    <template x-if="notice !== null && notice.tone === 'success'">
        <x-nq::alert tone="success" dismissible :dismiss-label="$dismiss" x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
    </template>
    <template x-if="notice !== null && notice.tone === 'danger'">
        <x-nq::alert tone="danger" dismissible :dismiss-label="$dismiss" x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
    </template>

    <x-nq::tabs default-value="members">
        <div class="flex flex-wrap items-center justify-between gap-3">
            @if ($showInvites)
                <x-nq::tabs.list aria-label="{{ $L('title', 'Members', 'الأعضاء') }}">
                    <x-nq::tabs.tab value="members">{{ $L('members', 'Members', 'الأعضاء') }} <span class="text-muted-foreground">{{ $num(count($members)) }}</span></x-nq::tabs.tab>
                    <x-nq::tabs.tab value="pending">{{ $L('pending', 'Pending invites', 'الدعوات المعلّقة') }} <span class="text-muted-foreground">{{ $num(count($invites)) }}</span></x-nq::tabs.tab>
                    <x-nq::tabs.indicator />
                </x-nq::tabs.list>
            @else
                <h2 class="text-h3 text-foreground">{{ $L('members', 'Members', 'الأعضاء') }} <span class="text-muted-foreground">{{ $num(count($members)) }}</span></h2>
            @endif
            @if ($canManage && $canInvite)
                <x-nq::button type="button" variant="primary" x-on:click="openInvite()" :disabled="count($inviteRoles) === 0"><x-lucide-user-plus aria-hidden="true" />{{ $L('invite', 'Invite people', 'دعوة أشخاص') }}</x-nq::button>
            @endif
        </div>
        <x-nq::tabs.panel value="members" class="mt-4">
            <div class="flex flex-col gap-4">
                <x-nq::data-table :label="$L('table', 'Workspace members', 'أعضاء مساحة العمل')" name-key="name" :search="$L('search', 'Search name or email…', 'ابحث بالاسم أو البريد…')"
                    :page-size="$pageSize" :columns="$columns" :rows="$rows" :row-actions="$actions" :loading="$loading">
                    <x-slot:empty>
                        <x-nq::states.empty :title="$L('empty', 'No members yet', 'لا يوجد أعضاء بعد')" :description="$L('emptyHint', 'Invite the first person to get started.', 'ادعُ أول شخص للبدء.')" />
                    </x-slot:empty>
                </x-nq::data-table>
            </div>
        </x-nq::tabs.panel>
        @if ($showInvites)
            <x-nq::tabs.panel value="pending" class="mt-4">
                @if (count($invites))
                    <ul aria-label="{{ $L('inviteList', 'Pending invites', 'الدعوات المعلّقة') }}" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
                        @foreach ($invites as $invite)
                            @php($expired = ! empty($invite['expiresAt']) && \Carbon\Carbon::parse($invite['expiresAt'])->lt($now))
                            <li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                                <span aria-hidden="true" class="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"><x-lucide-mail class="size-4" /></span>
                                <div class="flex min-w-0 flex-1 flex-col">
                                    <bdi dir="ltr" class="truncate text-label text-foreground">{{ $invite['email'] }}</bdi>
                                    <span class="text-caption text-muted-foreground">
                                        @if (! empty($invite['invitedBy'])){{ $L('invitedBy', 'Invited by', 'دعاه') }} {{ $invite['invitedBy'] }} · @endif{{ $L('sent', 'Sent', 'أُرسلت') }} <x-nq::numeric.date-time :value="$invite['sentAt']" relative />
                                    </span>
                                </div>
                                <x-nq::badge variant="neutral">{{ $roleLabel[$invite['role']] ?? $invite['role'] }}</x-nq::badge>
                                @if (! empty($invite['expiresAt']))
                                    <x-nq::status :tone="$expired ? 'danger' : 'info'" class="text-caption">
                                        @if ($expired){{ $L('expired', 'Expired', 'منتهية') }}@else{{ $L('expiresIn', 'Expires', 'تنتهي') }} <x-nq::numeric.date-time :value="$invite['expiresAt']" relative />@endif
                                    </x-nq::status>
                                @endif
                                @if ($canManage)
                                    <div class="flex items-center gap-1">
                                        @if ($canResend)
                                            <x-nq::button type="button" size="sm" variant="secondary" data-id="{{ $invite['id'] }}" x-on:click="resend($el.dataset.id)" x-bind:data-disabled="isBusy($el.dataset.id) ? '' : null"><x-lucide-rotate-cw aria-hidden="true" />{{ $L('resend', 'Resend', 'إعادة الإرسال') }}</x-nq::button>
                                        @endif
                                        @if ($canRevoke)
                                            <x-nq::button type="button" size="sm" variant="ghost" data-id="{{ $invite['id'] }}" x-on:click="revokeInvite($el.dataset.id)" x-bind:data-disabled="isBusy($el.dataset.id) ? '' : null"><x-lucide-x aria-hidden="true" />{{ $L('revoke', 'Revoke', 'إلغاء الدعوة') }}</x-nq::button>
                                        @endif
                                    </div>
                                @endif
                            </li>
                        @endforeach
                    </ul>
                @else
                    <x-nq::states.empty icon="mail" :title="$L('noInvites', 'No pending invites', 'لا توجد دعوات معلّقة')" :description="$L('noInvitesHint', 'People you invite show up here until they accept.', 'يظهر من تدعوهم هنا إلى أن يقبلوا.')" />
                @endif
            </x-nq::tabs.panel>
        @endif
    </x-nq::tabs>

    @if ($canLeave && $me)
        <div data-slot="members-leave" class="flex flex-col gap-3 rounded-card border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex min-w-0 flex-col gap-0.5">
                <span class="text-label text-foreground">{{ $L('leave', 'Leave workspace', 'مغادرة مساحة العمل') }}</span>
                <span class="text-body-sm text-muted-foreground">{{ $leaveOk ? $L('leaveHint', 'You can rejoin only if someone invites you again.', 'لا تستطيع العودة إلا إذا دعاك أحد مرة أخرى.') : $L('leaveBlocked', 'You are the only owner. Transfer ownership to another member before you leave.', 'أنت المالك الوحيد. انقل الملكية إلى عضو آخر قبل أن تغادر.') }}</span>
            </div>
            <x-nq::button type="button" variant="danger" class="shrink-0" :disabled="! $leaveOk" x-on:click="openLeave()"><x-lucide-log-out class="rtl:-scale-x-100" aria-hidden="true" />{{ $L('leave', 'Leave workspace', 'مغادرة مساحة العمل') }}</x-nq::button>
        </div>
    @endif

    @if ($canInvite)
        <x-nq::dialog x-model="inviteOpen">
            <x-nq::dialog.content class="max-w-lg">
                <form x-on:submit.prevent="submitInvite()" class="flex flex-col gap-5" novalidate>
                    <x-nq::dialog.header>
                        <x-nq::dialog.title>{{ $L('inviteTitle', 'Invite people', 'دعوة أشخاص') }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $L('inviteBody', 'They get an email with a link to join. Invites expire after a while.', 'يصلهم بريد برابط للانضمام. تنتهي الدعوات بعد فترة.') }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <div class="flex flex-col gap-4">
                        <x-nq::field x-model="emailsBad">
                            <x-nq::field.label>{{ $L('emails', 'Email addresses', 'عناوين البريد') }}</x-nq::field.label>
                            <x-nq::tag-input x-model="draft.emails" :placeholder="$L('emailsPlaceholder', 'name@example.com', 'name@example.com')" validate="validateEmail(tag, tags)" dir="ltr" :aria-label="$L('emails', 'Email addresses', 'عناوين البريد')" />
                            <x-nq::field.error><span x-text="emailsMsg"></span></x-nq::field.error>
                            <x-nq::field.description>{{ $L('emailsHint', 'Press Enter or comma after each address.', 'اضغط Enter أو الفاصلة بعد كل عنوان.') }}</x-nq::field.description>
                        </x-nq::field>
                        <x-nq::field>
                            <x-nq::field.label>{{ $L('roleField', 'Role', 'الدور') }}</x-nq::field.label>
                            <x-nq::select :value="$inviteRoles ? $inviteRoles[count($inviteRoles) - 1]['id'] : null" x-model="draft.role">
                                <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    @foreach ($inviteRoles as $r)
                                        <x-nq::select.item :value="(string) $r['id']">{{ $r['label'] }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                            <p x-show="roleDescription !== ''" x-text="roleDescription" style="display: none" class="text-caption text-muted-foreground"></p>
                        </x-nq::field>
                        <template x-if="formError !== null">
                            <x-nq::alert tone="danger" role="alert"><span x-text="formError"></span></x-nq::alert>
                        </template>
                    </div>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="inviteOpen = false" x-bind:disabled="busy ? '' : null">{{ $cancel }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                            <x-nq::spinner x-show="busy" style="display: none" />
                            {{ $L('send', 'Send invites', 'إرسال الدعوات') }}
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($canChangeRole)
        <x-nq::dialog x-model="roleOpen">
            <x-nq::dialog.content class="max-w-md">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="roleDialogTitle"></span></x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $L('roleBody', 'The new role applies on their next request.', 'يسري الدور الجديد عند طلبه التالي.') }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <x-nq::field>
                    <x-nq::field.label>{{ $L('roleField', 'Role', 'الدور') }}</x-nq::field.label>
                    <x-nq::select :value="$inviteRoles ? $inviteRoles[0]['id'] : null" x-model="roleDraft">
                        <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($inviteRoles as $r)
                                <x-nq::select.item :value="(string) $r['id']">{{ $r['label'] }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </x-nq::field>
                <template x-if="roleError !== null">
                    <x-nq::alert tone="danger" role="alert"><span x-text="roleError"></span></x-nq::alert>
                </template>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="roleOpen = false" x-bind:disabled="busy ? '' : null">{{ $cancel }}</x-nq::button>
                    <x-nq::button type="button" variant="primary" x-on:click="saveRole()" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                        <x-nq::spinner x-show="busy" style="display: none" />
                        {{ $L('saveRole', 'Save role', 'حفظ الدور') }}
                    </x-nq::button>
                </x-nq::dialog.footer>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($canRemove || $canTransfer || $canLeave)
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
                    <x-nq::button type="button" variant="ghost" x-on:click="closeConfirm()" x-bind:disabled="busy ? '' : null">{{ $cancel }}</x-nq::button>
                    <x-nq::button type="button" variant="primary" x-on:click="runConfirm()" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                        <x-nq::spinner x-show="busy" style="display: none" />
                        <span x-text="confirmAction"></span>
                    </x-nq::button>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</div>
