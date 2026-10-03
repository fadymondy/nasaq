{{-- <x-nq::workspace-settings :workspace="['name' => 'Acme', 'slug' => 'acme', 'logo' => null]" slug-prefix="nasaq.app/" can-leave
         @rename="$event.detail.wait(rename($event.detail.values))" @leave="$event.detail.wait(leave())" @delete="$event.detail.wait(destroy())" />
     Manage one workspace: rename it and change its address and picture, leave it, and delete it. Leaving asks first and is blocked for the last owner;
     deleting needs the workspace name typed, so a stray Enter cannot do it. Sections are settings-section cards. Needs the Alpine runtime (@nasaqScripts).
     workspace: ['name', 'slug', 'logo']. can-edit (true): owners and admins; false makes it read only. can-delete (true) and has-delete (false): the delete section shows when both.
     can-leave (true): false when you are the only owner, so leave is disabled and says why. has-leave (false) shows the leave section. has-rename (true): the Save button.
     has-logo (false): shows the picture upload (the nq-avatar-change / nq-avatar-remove events of avatar-upload bubble to you). check-slug (false): true fires check-slug while typing a new address. slug-prefix. labels: any of the strings below, by key.
     It fires events on the root with detail { …, wait(promise) }; resolve, or resolve { error } to show it (rename also takes fieldErrors: { name, slug }):
       rename      detail.values { name, slug }            check-slug  detail.slug; resolve true / false / { available, message }. Nobody listening means no check.
       leave       (no detail)                              delete      (no detail)
     A rejected promise shows a generic error. After success re-render with the new values. --}}
@props(['workspace' => [], 'canEdit' => true, 'canDelete' => true, 'hasDelete' => false, 'canLeave' => true, 'hasLeave' => false, 'hasRename' => true, 'hasLogo' => false, 'slugPrefix' => null, 'checkSlug' => false, 'labels' => []])
@php
    $L = fn (string $key, string $en, string $arabic) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $wsName = $workspace['name'] ?? '';
    $wsSlug = $workspace['slug'] ?? '';
    $phrase = trim($wsName);
    $cancel = $L('cancel', 'Cancel', 'إلغاء');
    $config = [
        'name' => $wsName, 'slug' => $wsSlug, 'hasCheck' => (bool) $checkSlug,
        'labels' => [
            'nameRequired' => $L('nameRequired', 'Enter a name for the workspace.', 'أدخل اسمًا لمساحة العمل.'),
            'slugHelp' => $L('slugHelp', 'Letters, numbers and dashes. You can change it later.', 'أحرف وأرقام وشرطات. يمكنك تغييره لاحقًا.'),
            'slugChecking' => $L('slugChecking', 'Checking availability', 'جارٍ التحقق من التوفر'),
            'slugAvailable' => $L('slugAvailable', 'This address is available.', 'هذا العنوان متاح.'),
            'slugTaken' => $L('slugTaken', 'That address is taken. Try another one.', 'هذا العنوان مستخدم. جرّب عنوانًا آخر.'),
            'slugCheckFailed' => $L('slugCheckFailed', 'Availability could not be checked. It will be verified when you create it.', 'تعذّر التحقق من التوفر. سيُتحقق منه عند الإنشاء.'),
            'problemEmpty' => $L('problemEmpty', 'Enter an address for the workspace.', 'أدخل عنوانًا لمساحة العمل.'),
            'problemShort' => $L('problemShort', 'Use at least 3 characters.', 'استخدم 3 أحرف على الأقل.'),
            'problemLong' => $L('problemLong', 'Use at most 40 characters.', 'استخدم 40 حرفًا على الأكثر.'),
            'problemFormat' => $L('problemFormat', 'Use lowercase letters, numbers and dashes. Start and end with a letter or number.', 'استخدم أحرفًا لاتينية صغيرة وأرقامًا وشرطات. ابدأ وانتهِ بحرف أو رقم.'),
            'failed' => $L('failed', 'That did not work. Try again.', 'لم تنجح العملية. حاول مرة أخرى.'),
            'saved' => $L('saved', 'Workspace updated.', 'تم تحديث مساحة العمل.'),
            'deleteFailed' => $L('deleteFailed', 'The workspace could not be deleted. Try again.', 'تعذّر حذف مساحة العمل. حاول مرة أخرى.'),
        ],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'workspace-settings') }}" x-data="nqWorkspaceSettings(@js($config))" x-on:nq-account-delete="onDelete($event)" {{ $attributes->except('data-slot')->cn('flex flex-col gap-6') }}>
    <x-nq::account-settings.settings-section :title="$L('generalTitle', 'General', 'عام')" :description="$L('generalBody', 'The name and address people see for this workspace.', 'الاسم والعنوان اللذان يراهما الناس لمساحة العمل هذه.')"
        :footer="$canEdit ? null : $L('readOnly', 'Only owners and admins can change these settings.', 'المالكون والمشرفون وحدهم يستطيعون تغيير هذه الإعدادات.')">
        <form id="workspace-general" novalidate class="flex flex-col gap-5" x-on:submit.prevent="save()">
            @if ($hasLogo)
                <x-nq::avatar-upload :name="$wsName" :src="$workspace['logo'] ?? null" shape="square" :disabled="! $canEdit" :labels="['upload' => $L('picture', 'Workspace picture', 'صورة مساحة العمل')]" />
            @endif
            <x-nq::field x-model="nameBad">
                <x-nq::field.label>{{ $L('name', 'Workspace name', 'اسم مساحة العمل') }}</x-nq::field.label>
                <x-nq::field.input x-bind:value="name" x-on:input="onName($event.target.value)" x-bind:disabled="saving || {{ $canEdit ? 'false' : 'true' }}" />
                <x-nq::field.error><span x-text="nameMsg"></span></x-nq::field.error>
            </x-nq::field>
            <x-nq::workspace-settings.slug-field :label="$L('slug', 'Workspace address', 'عنوان مساحة العمل')" :prefix="$slugPrefix" :disabled="'saving || '.($canEdit ? 'false' : 'true')" />
            <template x-if="notice !== null && notice.tone === 'success'">
                <x-nq::alert tone="success" dismissible :dismiss-label="$L('dismiss', 'Dismiss', 'تجاهل')" x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
            </template>
            <template x-if="notice !== null && notice.tone === 'danger'">
                <x-nq::alert tone="danger" dismissible :dismiss-label="$L('dismiss', 'Dismiss', 'تجاهل')" x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
            </template>
        </form>
        @if ($canEdit && $hasRename)
            <x-slot:actions>
                <x-nq::button type="submit" form="workspace-general" variant="primary" x-bind:aria-busy="saving ? 'true' : null" x-bind:data-disabled="cannotSave() ? '' : null" x-bind:disabled="cannotSave()">
                    <x-nq::spinner x-show="saving" style="display: none" />
                    {{ $L('save', 'Save changes', 'حفظ التغييرات') }}
                </x-nq::button>
            </x-slot:actions>
        @endif
    </x-nq::account-settings.settings-section>

    @if ($hasLeave)
        <x-nq::account-settings.settings-section :title="$L('leaveTitle', 'Leave workspace', 'مغادرة مساحة العمل')"
            :description="$canLeave ? $L('leaveBody', 'You lose access until someone invites you again.', 'تفقد الوصول إلى أن يدعوك أحد مرة أخرى.') : $L('leaveBlocked', 'You are the only owner. Transfer ownership to another member first.', 'أنت المالك الوحيد. انقل الملكية إلى عضو آخر أولًا.')">
            <x-nq::button type="button" variant="danger" :disabled="! $canLeave" x-on:click="leaveOpen = true"><x-lucide-log-out class="rtl:-scale-x-100" aria-hidden="true" />{{ $L('leaveButton', 'Leave workspace', 'مغادرة مساحة العمل') }}</x-nq::button>
        </x-nq::account-settings.settings-section>
        <x-nq::alert-dialog x-model="leaveOpen">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title>{{ str_replace('{name}', $wsName, $L('leaveConfirmTitle', 'Leave {name}?', 'مغادرة {name}؟')) }}</x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description>{{ $L('leaveConfirmBody', 'You lose access to everything in this workspace. You can rejoin only if someone invites you.', 'تفقد الوصول إلى كل شيء في مساحة العمل هذه. لا تستطيع العودة إلا إذا دعاك أحد.') }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <template x-if="leaveError !== null">
                    <x-nq::alert tone="danger" role="alert"><span x-text="leaveError"></span></x-nq::alert>
                </template>
                <x-nq::alert-dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="leaveOpen = false" x-bind:disabled="leaving ? '' : null">{{ $cancel }}</x-nq::button>
                    <x-nq::button type="button" variant="danger" x-on:click="leave()" x-bind:aria-busy="leaving ? 'true' : null" x-bind:data-disabled="leaving ? '' : null">
                        <x-nq::spinner x-show="leaving" style="display: none" />
                        {{ $L('leaveButton', 'Leave workspace', 'مغادرة مساحة العمل') }}
                    </x-nq::button>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif

    @if ($hasDelete && $canDelete)
        <x-nq::account-settings.danger-zone :title="$L('deleteTitle', 'Delete workspace', 'حذف مساحة العمل')" :heading="$L('deleteHeading', 'Delete this workspace', 'احذف مساحة العمل هذه')"
            :description="$L('deleteBody', 'Permanently delete the workspace and everything in it for every member. This cannot be undone.', 'احذف مساحة العمل وكل ما فيها نهائيًا لجميع الأعضاء. لا يمكن التراجع عن ذلك.')"
            :confirm-text="$phrase"
            :labels="[
                'button' => $L('deleteButton', 'Delete workspace', 'حذف مساحة العمل'),
                'confirmTitle' => str_replace('{name}', $wsName, $L('deleteConfirmTitle', 'Delete {name}?', 'حذف {name}؟')),
                'confirmDescription' => $L('deleteConfirmBody', 'Every member loses access and all of its data is removed for good.', 'يفقد كل الأعضاء وصولهم وتُحذف كل بياناتها نهائيًا.'),
                'confirmPrompt' => $L('deletePrompt', 'Type {text} to confirm', 'اكتب {text} للتأكيد'),
                'confirmAction' => $L('deleteAction', 'Delete this workspace', 'احذف مساحة العمل هذه'),
                'cancel' => $cancel,
                'failed' => $L('deleteFailed', 'The workspace could not be deleted. Try again.', 'تعذّر حذف مساحة العمل. حاول مرة أخرى.'),
            ]" />
    @endif
</div>
