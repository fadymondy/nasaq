{{-- <x-nq::admin-area active-item="users" :user="['name' => 'Sara Alharbi', 'email' => 'sara@example.com']" environment="Production"> <x-nq::admin-area.page title="Users"> … </x-nq::admin-area.page> </x-nq::admin-area>
     The admin frame. An icon rail plus sub-sidebar (<x-nq::icon-rail-sidebar>) with the admin navigation ready made, an environment tag,
     an account button and the impersonation banner. The page is the default slot; put <x-nq::admin-area.page> inside.
     sections: the rail (default: Overview, People, Tenants, Security, Settings); item ids: dashboard, activity, users, roles, invitations,
     workspaces, plans, invoices, coupons, audit, sessions, api-keys, settings. Same shape as icon-rail-sidebar's sections.
     section / active-item / sub-open: passed to the rail. user: ['name', 'email', 'avatar'], shown at the bottom of the rail.
     environment: a warning tag above the sub-sidebar. impersonating: ['name' => …, 'email' => …] pins the banner; stop-url: where its exit
     button goes, or listen for "exit" on the root: @exit="$event.detail.wait(fetch(…))". labels: any of the strings below.
     Slots: brand, railFooter (above the user), subHeader (below the environment tag).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['sections' => null, 'section' => null, 'activeItem' => null, 'subOpen' => true, 'user' => null, 'environment' => null, 'impersonating' => null, 'stopUrl' => null, 'labels' => [], 'brand' => null, 'railFooter' => null, 'subHeader' => null])
@php
    $tr = fn (string $key, string $en, string $ar) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $ar);
    $L = [
        'overview' => $tr('overview', 'Overview', 'نظرة عامة'),
        'dashboard' => $tr('dashboard', 'Dashboard', 'لوحة التحكم'),
        'activity' => $tr('activity', 'Activity', 'النشاط'),
        'people' => $tr('people', 'People', 'الأشخاص'),
        'users' => $tr('users', 'Users', 'المستخدمون'),
        'roles' => $tr('roles', 'Roles', 'الأدوار'),
        'invitations' => $tr('invitations', 'Invitations', 'الدعوات'),
        'tenants' => $tr('tenants', 'Tenants', 'المستأجرون'),
        'workspaces' => $tr('workspaces', 'Workspaces', 'مساحات العمل'),
        'plans' => $tr('plans', 'Plans', 'الباقات'),
        'billing' => $tr('billing', 'Billing', 'الفوترة'),
        'invoices' => $tr('invoices', 'Invoices', 'الفواتير'),
        'coupons' => $tr('coupons', 'Coupons', 'القسائم'),
        'security' => $tr('security', 'Security', 'الأمان'),
        'audit' => $tr('audit', 'Audit log', 'سجل التدقيق'),
        'sessions' => $tr('sessions', 'Sessions', 'الجلسات'),
        'apiKeys' => $tr('apiKeys', 'API keys', 'مفاتيح API'),
        'settings' => $tr('settings', 'Settings', 'الإعدادات'),
        'hint' => $tr('impersonatingHint', 'Actions you take count as this user.', 'الإجراءات التي تنفذها تُنسب إلى هذا المستخدم.'),
        'account' => $tr('account', 'Your account', 'حسابك'),
    ];
    $railSections = $sections ?? [
        ['id' => 'overview', 'label' => $L['overview'], 'icon' => 'layout-dashboard', 'groups' => [['id' => 'overview', 'items' => [
            ['id' => 'dashboard', 'label' => $L['dashboard'], 'icon' => 'layout-dashboard'],
            ['id' => 'activity', 'label' => $L['activity'], 'icon' => 'activity'],
        ]]]],
        ['id' => 'people', 'label' => $L['people'], 'icon' => 'users', 'groups' => [['id' => 'people', 'items' => [
            ['id' => 'users', 'label' => $L['users'], 'icon' => 'users'],
            ['id' => 'roles', 'label' => $L['roles'], 'icon' => 'user-cog'],
            ['id' => 'invitations', 'label' => $L['invitations'], 'icon' => 'mail'],
        ]]]],
        ['id' => 'tenants', 'label' => $L['tenants'], 'icon' => 'building-2', 'groups' => [['id' => 'tenants', 'items' => [
            ['id' => 'workspaces', 'label' => $L['workspaces'], 'icon' => 'building-2'],
            ['id' => 'plans', 'label' => $L['plans'], 'icon' => 'credit-card'],
            ['id' => 'billing', 'label' => $L['billing'], 'icon' => 'ticket', 'children' => [
                ['id' => 'invoices', 'label' => $L['invoices']],
                ['id' => 'coupons', 'label' => $L['coupons']],
            ]],
        ]]]],
        ['id' => 'security', 'label' => $L['security'], 'icon' => 'shield-check', 'groups' => [['id' => 'security', 'items' => [
            ['id' => 'audit', 'label' => $L['audit'], 'icon' => 'file-clock'],
            ['id' => 'sessions', 'label' => $L['sessions'], 'icon' => 'shield-user'],
            ['id' => 'api-keys', 'label' => $L['apiKeys'], 'icon' => 'key-round'],
        ]]]],
        ['id' => 'settings', 'label' => $L['settings'], 'icon' => 'settings'],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'admin-area') }}" {{ $attributes->except('data-slot')->cn('flex h-full min-h-0 w-full flex-col') }}>
    @if ($impersonating)
        <x-nq::impersonation-banner :as="$impersonating" :sticky="false" :hint="$L['hint']" :exit-url="$stopUrl" />
    @endif
    <x-nq::icon-rail-sidebar class="min-h-0 flex-1" :sections="$railSections" :section="$section" :active-item="$activeItem" :sub-open="$subOpen">
        <x-slot:brand>
            @if ($brand !== null && ! $brand->isEmpty()){{ $brand }}@else
                <span class="flex size-9 items-center justify-center rounded-control bg-primary text-primary-foreground [&_svg]:size-5">
                    <x-lucide-shield-check aria-hidden="true" />
                </span>
            @endif
        </x-slot:brand>
        <x-slot:subHeader>
            @if ($environment)<x-nq::badge variant="warning" class="self-start">{{ $environment }}</x-nq::badge>@endif
            @if ($subHeader !== null){{ $subHeader }}@endif
        </x-slot:subHeader>
        <x-slot:railFooter>
            @if ($railFooter !== null){{ $railFooter }}@endif
            @if ($user)
                <x-nq::tooltip :content="($user['name'] ?? '').' · '.($user['email'] ?? '')" side="inline-end">
                    <button type="button" aria-label="{{ $L['account'] }}: {{ $user['name'] ?? '' }}"
                        class="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                        <x-nq::avatar :name="$user['name'] ?? ''" :src="$user['avatar'] ?? null" size="sm" />
                    </button>
                </x-nq::tooltip>
            @endif
        </x-slot:railFooter>
        {{ $slot }}
    </x-nq::icon-rail-sidebar>
</div>
