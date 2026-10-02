{{-- <x-nq::onboarding-flow user-name="Sara" storage-key="onboarding:u1"
         x-on:nq-onboarding-save="$event.detail.waitUntil(save($event.detail.stepId, $event.detail.values))"
         x-on:nq-onboarding-connect="$event.detail.waitUntil(connect($event.detail.integrationId))"
         x-on:nq-onboarding-finish="$event.detail.waitUntil(finish($event.detail.values))">
       <x-slot:done-action><x-nq::button href="/">Open the dashboard</x-nq::button></x-slot:done-action>
     </x-nq::onboarding-flow>
     The flow after sign-up: welcome, profile, workspace, invites, preferences, a first integration and a review, built on <x-nq::setup-wizard>
     (Back, Continue, Skip on optional steps). Progress is kept in localStorage under storage-key, so a refresh resumes where the person left off.
     It saves nothing itself: listen for the events below and resolve { error: "…" } to keep the person on the step. Needs the Alpine runtime (@nasaqScripts).
     user-name: greets them and pre-fills the profile. default-values: start values for any section (profile, workspace, invite, preferences, connected).
     roles / invite-roles: [['value' => 'design', 'label' => 'Design']]. integrations: [['id' => 'github', 'name' => 'GitHub', 'description' => '…', 'icon' => 'github']]
     (icon: github | google | microsoft, or a lucide name). hide-steps: ids to leave out (invite, preferences, integration). labels: override any string key. <x-slot:done-action>: the completion screen's action.
     Events (bubble from the root, each with detail.waitUntil(promise)):
       nq-onboarding-save { stepId: profile | workspace | invite | preferences, values }   leaving that step forward
       nq-onboarding-avatar { file }   resolve the hosted URL of the cropped photo (without a listener the photo stays local)
       nq-onboarding-connect { integrationId }   the Connect button     nq-onboarding-finish { values }   the last step's Finish
       nq-onboarding-progress { current, completed, skipped, values, updatedAt }   after every change (save it on your server) --}}
@props(['userName' => null, 'defaultValues' => [], 'storageKey' => null, 'roles' => null, 'inviteRoles' => null, 'integrations' => null, 'hideSteps' => [], 'labels' => [], 'doneAction' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $S = [
        'title' => ['Set up your account', 'أعدّ حسابك'],
        'description' => ['A few quick steps and you are ready. You can skip the optional ones and finish them later.', 'بضع خطوات سريعة وتصبح جاهزًا. يمكنك تخطي الاختيارية وإكمالها لاحقًا.'],
        'welcome' => ['Welcome', 'أهلًا بك'],
        'welcomeDescription' => ['Here is what we will do together.', 'هذا ما سنفعله معًا.'],
        'welcomeHeading' => ['Welcome, {name}', 'أهلًا بك يا {name}'],
        'welcomeHeadingAnon' => ['Welcome aboard', 'أهلًا بك معنا'],
        'welcomeLead' => ['Setting up takes about three minutes. Your progress is saved, so you can leave and come back.', 'يستغرق الإعداد نحو ثلاث دقائق. تقدّمك محفوظ، فيمكنك المغادرة والعودة.'],
        'welcomeProfile' => ['Tell us who you are', 'عرّفنا بنفسك'],
        'welcomeWorkspace' => ['Create or join a workspace', 'أنشئ مساحة عمل أو انضم إلى واحدة'],
        'welcomeInvite' => ['Bring your team', 'ادعُ فريقك'],
        'welcomePrefs' => ['Choose how it looks and feels', 'اختر شكل التطبيق وسلوكه'],
        'welcomeConnect' => ['Connect your first tool', 'اربط أول أداة'],
        'resumed' => ['Welcome back. We saved your place.', 'أهلًا بعودتك. حفظنا مكانك.'],
        'startOver' => ['Start over', 'ابدأ من جديد'],
        'profile' => ['Your profile', 'ملفك الشخصي'],
        'profileDescription' => ['This is how teammates see you.', 'هكذا يراك زملاؤك.'],
        'photo' => ['Profile photo', 'الصورة الشخصية'],
        'fullName' => ['Full name', 'الاسم الكامل'],
        'nameRequired' => ['Enter your name.', 'أدخل اسمك.'],
        'role' => ['Your role', 'دورك'],
        'rolePlaceholder' => ['Choose a role', 'اختر دورًا'],
        'workspace' => ['Your workspace', 'مساحة عملك'],
        'workspaceDescription' => ['Create a new one or join your team\'s.', 'أنشئ مساحة جديدة أو انضم إلى مساحة فريقك.'],
        'create' => ['Create a workspace', 'أنشئ مساحة عمل'],
        'join' => ['Join with a code', 'انضم برمز'],
        'workspaceName' => ['Workspace name', 'اسم مساحة العمل'],
        'workspaceNameHint' => ['Your company or team. You can rename it later.', 'شركتك أو فريقك. يمكنك تغييره لاحقًا.'],
        'workspaceNameRequired' => ['Enter a workspace name.', 'أدخل اسم مساحة العمل.'],
        'inviteCode' => ['Invite code', 'رمز الدعوة'],
        'inviteCodeHint' => ['Ask a workspace admin. It looks like ABCD-1234.', 'اطلبه من مسؤول مساحة العمل. يبدو هكذا ABCD-1234.'],
        'inviteCodeRequired' => ['Enter the invite code.', 'أدخل رمز الدعوة.'],
        'invite' => ['Invite teammates', 'ادعُ زملاءك'],
        'inviteDescription' => ['They get an email with a link to join.', 'يصلهم بريد فيه رابط الانضمام.'],
        'emails' => ['Email addresses', 'عناوين البريد'],
        'emailsHint' => ['Press Enter or comma after each one. Pasting a list works too.', 'اضغط Enter أو الفاصلة بعد كل عنوان. ولصق قائمة يعمل أيضًا.'],
        'emailsPlaceholder' => ['name@company.com', 'name@company.com'],
        'inviteRole' => ['Invite them as', 'ادعُهم بصفة'],
        'invalidEmail' => ['{email} is not an email address.', '{email} ليس عنوان بريد صالحًا.'],
        'duplicateEmail' => ['{email} is already added.', '{email} مضاف بالفعل.'],
        'invitesCount' => ['{count} to invite', '{count} دعوة'],
        'preferences' => ['Preferences', 'التفضيلات'],
        'preferencesDescription' => ['Change these any time in settings.', 'غيّرها في أي وقت من الإعدادات.'],
        'language' => ['Language', 'اللغة'],
        'theme' => ['Theme', 'المظهر'],
        'themeLight' => ['Light', 'فاتح'],
        'themeDark' => ['Dark', 'داكن'],
        'themeSystem' => ['System', 'النظام'],
        'notifications' => ['Notifications', 'الإشعارات'],
        'notifyEmail' => ['Email me about activity', 'راسلني عن النشاط'],
        'notifyPush' => ['Push notifications on this device', 'إشعارات فورية على هذا الجهاز'],
        'notifyDigest' => ['Send a weekly summary', 'أرسل ملخصًا أسبوعيًا'],
        'integration' => ['Connect a tool', 'اربط أداة'],
        'integrationDescription' => ['Pick the first place your work comes from.', 'اختر أول مكان يأتي منه عملك.'],
        'connect' => ['Connect', 'اربط'],
        'connected' => ['Connected', 'مربوط'],
        'connectFailed' => ['Could not connect. Try again.', 'تعذّر الربط. حاول مرة أخرى.'],
        'finish' => ['All set', 'كل شيء جاهز'],
        'finishDescription' => ['Review what you did.', 'راجع ما أنجزته.'],
        'review' => ['Your setup', 'إعدادك'],
        'stepDone' => ['Done', 'تم'],
        'stepSkipped' => ['Skipped', 'تم تخطيها'],
        'stepOpen' => ['Not done', 'لم تتم'],
        'later' => ['You can finish skipped steps from the Get started checklist.', 'يمكنك إكمال الخطوات المتخطاة من قائمة ابدأ.'],
        'doneTitle' => ['You are ready', 'أنت جاهز'],
        'doneDescription' => ['Your workspace is set up. Head in and look around.', 'تم إعداد مساحة عملك. ادخل وتجوّل.'],
        'optional' => ['Optional', 'اختياري'],
        'errorTitle' => ['Fix these to continue', 'أصلح هذه الحقول للمتابعة'],
        'failed' => ['Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'],
        'googleDesc' => ['Calendar and contacts', 'التقويم وجهات الاتصال'],
        'githubDesc' => ['Repositories and pull requests', 'المستودعات وطلبات الدمج'],
        'microsoftDesc' => ['Outlook and Teams', 'Outlook وTeams'],
    ];
    $roleSet = [
        'design' => ['Design', 'التصميم'],
        'engineering' => ['Engineering', 'الهندسة'],
        'product' => ['Product', 'المنتج'],
        'marketing' => ['Marketing', 'التسويق'],
        'operations' => ['Operations', 'العمليات'],
        'other' => ['Other', 'أخرى'],
    ];
    $inviteRoleSet = [
        'member' => ['Member', 'عضو'],
        'admin' => ['Admin', 'مسؤول'],
        'viewer' => ['Viewer', 'مشاهد'],
    ];
    $t = [];
    foreach ($S as $k => [$en, $arText]) {
        $t[$k] = $labels[$k] ?? ($ar ? $arText : $en);
    }
    $pick = fn (array $set) => collect($set)->map(fn ($p, $k) => ['value' => (string) $k, 'label' => $ar ? $p[1] : $p[0]])->values()->all();
    $roleOptions = $roles ?? $pick($roleSet);
    $inviteRoleOptions = $inviteRoles ?? $pick($inviteRoleSet);
    $integrationList = $integrations ?? [
        ['id' => 'github', 'name' => 'GitHub', 'description' => $t['githubDesc'], 'icon' => 'github'],
        ['id' => 'google', 'name' => 'Google', 'description' => $t['googleDesc'], 'icon' => 'google'],
        ['id' => 'microsoft', 'name' => 'Microsoft', 'description' => $t['microsoftDesc'], 'icon' => 'microsoft'],
    ];

    $everyStep = ['welcome', 'profile', 'workspace', 'invite', 'preferences', 'integration', 'finish'];
    $ids = array_values(array_filter($everyStep, fn ($id) => ! in_array($id, (array) $hideSteps, true)));
    $has = fn (string $id) => in_array($id, $ids, true);
    $optional = ['invite', 'preferences', 'integration'];
    $meta = [
        'welcome' => [$t['welcome'], $t['welcomeDescription']],
        'profile' => [$t['profile'], $t['profileDescription']],
        'workspace' => [$t['workspace'], $t['workspaceDescription']],
        'invite' => [$t['invite'], $t['inviteDescription']],
        'preferences' => [$t['preferences'], $t['preferencesDescription']],
        'integration' => [$t['integration'], $t['integrationDescription']],
        'finish' => [$t['finish'], $t['finishDescription']],
    ];
    $stepsCfg = array_map(fn ($id) => ['id' => $id, 'title' => $meta[$id][0], 'description' => $meta[$id][1], 'optional' => in_array($id, $optional, true)], $ids);
    $reviewIds = array_values(array_filter($ids, fn ($id) => $id !== 'welcome' && $id !== 'finish'));
    $reviewTitles = ['profile' => $t['profile'], 'workspace' => $t['workspace'], 'invite' => $t['invite'], 'preferences' => $t['preferences'], 'integration' => $t['integration']];

    $defaults = $defaultValues;
    $defaults['preferences']['locale'] ??= $ar ? 'ar' : 'en';
    $notifyOn = array_merge(['email' => true, 'push' => false, 'digest' => true], $defaults['preferences']['notifications'] ?? []);
    $connectedNow = (array) ($defaults['connected'] ?? []);
    $workspaceMode = ($defaults['workspace']['mode'] ?? 'create') === 'join' ? 'join' : 'create';
    $welcomeName = ($defaults['profile']['name'] ?? null) ?: $userName;
    $config = [
        'steps' => $ids,
        'optional' => array_values(array_intersect($ids, $optional)),
        'review' => $reviewIds,
        'storageKey' => $storageKey,
        'userName' => $userName ?? '',
        'defaults' => $defaults,
        'labels' => collect($t)->only(['welcomeHeading', 'welcomeHeadingAnon', 'nameRequired', 'workspaceNameRequired', 'inviteCodeRequired', 'invalidEmail', 'duplicateEmail', 'invitesCount', 'connectFailed'])->all(),
    ];
    $welcomeItems = [
        ['profile', 'user-round', 'welcomeProfile'],
        ['workspace', 'users', 'welcomeWorkspace'],
        ['invite', 'mail', 'welcomeInvite'],
        ['preferences', 'palette', 'welcomePrefs'],
        ['integration', 'plug', 'welcomeConnect'],
    ];
    $notes = [['email', $t['notifyEmail']], ['push', $t['notifyPush']], ['digest', $t['notifyDigest']]];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'onboarding-flow') }}" x-data="nqOnboardingFlow({{ \Illuminate\Support\Js::from($config) }})"
    x-on:nq-step-complete="$event.detail.waitUntil(obComplete($event.detail.stepId))"
    x-on:nq-step-change="obStep($event.detail)"
    x-on:nq-finish="$event.detail.waitUntil(obFinish())"
    {{ $attributes->except('data-slot') }}>
    <x-nq::setup-wizard :steps="$stepsCfg" :completed="[]" :title="$t['title']" :description="$t['description']" :done-title="$t['doneTitle']" :done-description="$t['doneDescription']">
        @if ($has('welcome'))
            <x-nq::setup-wizard.step id="welcome">
                <div data-slot="onboarding-welcome" class="flex flex-col gap-4">
                    <x-nq::alert tone="info" x-show="resumed" style="display: none">
                        {{ $t['resumed'] }}
                        <x-nq::button variant="link" size="sm" x-on:click="startOver()">{{ $t['startOver'] }}</x-nq::button>
                    </x-nq::alert>
                    <div class="flex items-start gap-3">
                        <span class="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-nq-selected text-primary">
                            <x-lucide-sparkles aria-hidden="true" class="size-5" />
                        </span>
                        <div class="flex flex-col gap-1">
                            <p class="text-h3 text-foreground" x-text="obHeading()">{{ $welcomeName ? str_replace('{name}', $welcomeName, $t['welcomeHeading']) : $t['welcomeHeadingAnon'] }}</p>
                            <p class="text-body text-muted-foreground">{{ $t['welcomeLead'] }}</p>
                        </div>
                    </div>
                    <ul class="flex flex-col gap-2">
                        @foreach ($welcomeItems as [$id, $icon, $label])
                            @if ($has($id))
                                <li class="flex items-center gap-3 rounded-control border border-border bg-card px-3 py-2 text-body text-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground">
                                    <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />
                                    {{ $t[$label] }}
                                </li>
                            @endif
                        @endforeach
                    </ul>
                </div>
            </x-nq::setup-wizard.step>
        @endif

        @if ($has('profile'))
            <x-nq::setup-wizard.step id="profile">
                <div data-slot="onboarding-profile" class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1.5">
                        <span class="text-label text-foreground">{{ $t['photo'] }}</span>
                        <x-nq::avatar-upload :name="$welcomeName ?: '?'" x-on:nq-avatar-change="$event.detail.promise = obAvatar($event.detail)" x-on:nq-avatar-remove="$event.detail.promise = obRemoveAvatar()" />
                    </div>
                    <x-nq::field name="name" x-model="inv.name">
                        <x-nq::field.label>{{ $t['fullName'] }}</x-nq::field.label>
                        <x-nq::field.input autocomplete="name" x-model="vals.profile.name" :value="$defaults['profile']['name'] ?? $userName" />
                        <x-nq::field.error x-text="errs.name"></x-nq::field.error>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['role'] }}</x-nq::field.label>
                        <x-nq::select x-model="vals.profile.role" :value="$defaults['profile']['role'] ?? null">
                            <x-nq::select.trigger>
                                <x-nq::select.value :placeholder="$t['rolePlaceholder']" />
                            </x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach ($roleOptions as $r)
                                    <x-nq::select.item :value="$r['value']">{{ $r['label'] }}</x-nq::select.item>
                                @endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    </x-nq::field>
                </div>
            </x-nq::setup-wizard.step>
        @endif

        @if ($has('workspace'))
            <x-nq::setup-wizard.step id="workspace">
                <x-nq::tabs :default-value="$workspaceMode" x-model="vals.workspace.mode" data-slot="onboarding-workspace">
                    <x-nq::tabs.list>
                        <x-nq::tabs.tab value="create">{{ $t['create'] }}</x-nq::tabs.tab>
                        <x-nq::tabs.tab value="join">{{ $t['join'] }}</x-nq::tabs.tab>
                    </x-nq::tabs.list>
                    <x-nq::tabs.panel value="create" class="pt-4">
                        <x-nq::field name="workspaceName" x-model="inv.workspaceName">
                            <x-nq::field.label>{{ $t['workspaceName'] }}</x-nq::field.label>
                            <x-nq::field.input autocomplete="organization" x-model="vals.workspace.name" :value="$defaults['workspace']['name'] ?? ''" />
                            <x-nq::field.description>{{ $t['workspaceNameHint'] }}</x-nq::field.description>
                            <x-nq::field.error x-text="errs.workspaceName"></x-nq::field.error>
                        </x-nq::field>
                    </x-nq::tabs.panel>
                    <x-nq::tabs.panel value="join" class="pt-4">
                        <x-nq::field name="code" x-model="inv.code">
                            <x-nq::field.label>{{ $t['inviteCode'] }}</x-nq::field.label>
                            <x-nq::field.input ltr autocapitalize="characters" autocomplete="off" x-model="vals.workspace.code" x-on:input="vals.workspace.code = vals.workspace.code.toUpperCase()" :value="$defaults['workspace']['code'] ?? ''" />
                            <x-nq::field.description>{{ $t['inviteCodeHint'] }}</x-nq::field.description>
                            <x-nq::field.error x-text="errs.code"></x-nq::field.error>
                        </x-nq::field>
                    </x-nq::tabs.panel>
                </x-nq::tabs>
            </x-nq::setup-wizard.step>
        @endif

        @if ($has('invite'))
            <x-nq::setup-wizard.step id="invite">
                <div data-slot="onboarding-invite" class="flex flex-col gap-4">
                    <x-nq::field>
                        <x-nq::field.label for="onb-emails">{{ $t['emails'] }}</x-nq::field.label>
                        <x-nq::tag-input id="onb-emails" type="email" dir="ltr" :aria-label="$t['emails']" :placeholder="$t['emailsPlaceholder']" :value="$defaults['invite']['emails'] ?? []" validate="obEmail(tag, tags)" x-model="vals.invite.emails" />
                        <x-nq::field.description>{{ $t['emailsHint'] }}</x-nq::field.description>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['inviteRole'] }}</x-nq::field.label>
                        <x-nq::select x-model="vals.invite.role" :value="$defaults['invite']['role'] ?? 'member'">
                            <x-nq::select.trigger>
                                <x-nq::select.value />
                            </x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach ($inviteRoleOptions as $r)
                                    <x-nq::select.item :value="$r['value']">{{ $r['label'] }}</x-nq::select.item>
                                @endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    </x-nq::field>
                    <p class="text-caption text-muted-foreground" x-show="vals.invite.emails.length > 0" x-text="obInvites()" style="display: none"></p>
                </div>
            </x-nq::setup-wizard.step>
        @endif

        @if ($has('preferences'))
            <x-nq::setup-wizard.step id="preferences">
                <div data-slot="onboarding-preferences" class="flex flex-col gap-5">
                    <div class="flex flex-col gap-1.5">
                        <span id="onb-lang" class="text-label text-foreground">{{ $t['language'] }}</span>
                        <x-nq::toggle-group aria-labelledby="onb-lang" :default-value="[$defaults['preferences']['locale']]" x-model="obLoc">
                            <x-nq::toggle-group.toggle value="en">English</x-nq::toggle-group.toggle>
                            <x-nq::toggle-group.toggle value="ar">العربية</x-nq::toggle-group.toggle>
                        </x-nq::toggle-group>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <span id="onb-theme" class="text-label text-foreground">{{ $t['theme'] }}</span>
                        <x-nq::toggle-group aria-labelledby="onb-theme" :default-value="[$defaults['preferences']['theme'] ?? 'system']" x-model="obTheme">
                            <x-nq::toggle-group.toggle value="light"><x-lucide-sun aria-hidden="true" />{{ $t['themeLight'] }}</x-nq::toggle-group.toggle>
                            <x-nq::toggle-group.toggle value="dark"><x-lucide-moon aria-hidden="true" />{{ $t['themeDark'] }}</x-nq::toggle-group.toggle>
                            <x-nq::toggle-group.toggle value="system"><x-lucide-sun-moon aria-hidden="true" />{{ $t['themeSystem'] }}</x-nq::toggle-group.toggle>
                        </x-nq::toggle-group>
                    </div>
                    <div class="flex flex-col gap-2">
                        <span class="flex items-center gap-1.5 text-label text-foreground">
                            <x-lucide-bell aria-hidden="true" class="size-4 text-muted-foreground" />
                            {{ $t['notifications'] }}
                        </span>
                        @foreach ($notes as [$key, $label])
                            <label class="flex items-center justify-between gap-3 rounded-control border border-border bg-card px-3 py-2 text-body text-foreground">
                                {{ $label }}
                                <x-nq::switch :checked="(bool) $notifyOn[$key]" x-model="vals.preferences.notifications.{{ $key }}" />
                            </label>
                        @endforeach
                    </div>
                </div>
            </x-nq::setup-wizard.step>
        @endif

        @if ($has('integration'))
            <x-nq::setup-wizard.step id="integration">
                <div data-slot="onboarding-integration" class="flex flex-col gap-2">
                    <x-nq::alert tone="danger" x-show="connectError" style="display: none"><span x-text="connectError"></span></x-nq::alert>
                    <ul class="flex flex-col gap-2">
                        @foreach ($integrationList as $i)
                            @php($on = in_array($i['id'], $connectedNow, true))
                            <li class="flex items-center gap-3 rounded-card border border-border bg-card p-3">
                                <span aria-hidden="true" class="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-background">
                                    @if (($i['icon'] ?? null) === 'github')
                                        <x-nq::oauth-buttons.github-logo />
                                    @elseif (($i['icon'] ?? null) === 'google')
                                        <x-nq::oauth-buttons.google-logo />
                                    @elseif (($i['icon'] ?? null) === 'microsoft')
                                        <x-nq::oauth-buttons.microsoft-logo />
                                    @else
                                        <x-dynamic-component :component="'lucide-'.($i['icon'] ?? 'plug')" class="size-4" />
                                    @endif
                                </span>
                                <span class="flex min-w-0 flex-1 flex-col text-start">
                                    <span class="truncate text-label text-foreground">{{ $i['name'] }}</span>
                                    @if (! empty($i['description']))<span class="truncate text-caption text-muted-foreground">{{ $i['description'] }}</span>@endif
                                </span>
                                <span class="contents" x-show="obConnected('{{ $i['id'] }}')" @style(['display: none' => ! $on])>
                                    <x-nq::badge variant="success"><x-lucide-circle-check aria-hidden="true" />{{ $t['connected'] }}</x-nq::badge>
                                </span>
                                <span class="contents" x-show="! obConnected('{{ $i['id'] }}')" @style(['display: none' => $on])>
                                    <x-nq::button variant="secondary" size="sm" aria-label="{{ $t['connect'] }} {{ $i['name'] }}" x-on:click="obConnect('{{ $i['id'] }}')" x-bind:disabled="connecting !== null" x-bind:data-disabled="connecting !== null ? '' : null" x-bind:aria-busy="connecting === '{{ $i['id'] }}' ? 'true' : null">
                                        <template x-if="connecting === '{{ $i['id'] }}'"><x-nq::spinner /></template>
                                        {{ $t['connect'] }}
                                    </x-nq::button>
                                </span>
                            </li>
                        @endforeach
                    </ul>
                </div>
            </x-nq::setup-wizard.step>
        @endif

        @if ($has('finish'))
            <x-nq::setup-wizard.step id="finish">
                <div data-slot="onboarding-finish" class="flex flex-col gap-3">
                    <div class="flex items-center gap-2 text-label text-foreground">
                        <x-lucide-party-popper aria-hidden="true" class="size-4 text-primary" />
                        {{ $t['review'] }}
                    </div>
                    <ul class="flex flex-col gap-2">
                        @foreach ($reviewIds as $id)
                            <li class="flex items-center gap-3 rounded-control border border-border bg-card px-3 py-2">
                                <span class="contents" x-show="obStatus('{{ $id }}') === 'done'" style="display: none"><x-lucide-circle-check aria-hidden="true" class="size-4 shrink-0 text-nq-success-text" /></span>
                                <span class="contents" x-show="obStatus('{{ $id }}') === 'skipped'" style="display: none"><x-lucide-circle-minus aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" /></span>
                                <span class="contents" x-show="obStatus('{{ $id }}') === 'open'"><x-lucide-circle-dashed aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" /></span>
                                <span class="flex-1 text-body text-foreground">{{ $reviewTitles[$id] ?? $id }}</span>
                                <span class="text-caption text-muted-foreground" x-show="obStatus('{{ $id }}') === 'done'" style="display: none">{{ $t['stepDone'] }}</span>
                                <span class="text-caption text-muted-foreground" x-show="obStatus('{{ $id }}') === 'skipped'" style="display: none">{{ $t['stepSkipped'] }}</span>
                                <span class="text-caption text-muted-foreground" x-show="obStatus('{{ $id }}') === 'open'">{{ $t['stepOpen'] }}</span>
                            </li>
                        @endforeach
                    </ul>
                    <p class="text-caption text-muted-foreground" x-show="obSkippedAny()">{{ $t['later'] }}</p>
                </div>
            </x-nq::setup-wizard.step>
        @endif

        <x-slot:done-action>{{ $doneAction }}</x-slot:done-action>
    </x-nq::setup-wizard>
</div>
