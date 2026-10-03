{{-- <x-nq::account-settings value="profile"> <x-nq::account-settings.panel id="profile"> … </x-nq::account-settings.panel> … </x-nq::account-settings>
     The settings page layout: a title, a section nav (a vertical list on wide screens, scrolling tabs on narrow ones) and the content.
     It only switches which panel shows; the sections themselves are yours, wrapped in <x-nq::account-settings.settings-section>.
     items: [['id' => 'profile', 'label' => 'Profile', 'icon' => 'user' (a lucide name), 'description' =>, 'tone' => 'danger', 'badge' => 3]].
       Default: Profile, Security, Connected accounts, Notifications, Danger zone, in the active language.
     value: the active item id (x-modelable: x-model, wire:model). Pass it so the right panel renders before Alpine starts; defaults to the first item.
     title / description: replace the localised text; description="false" hides it. nav-label: the name of the nav.
     Every item needs an <x-nq::account-settings.panel id="…"> with the same id; the inactive ones are hidden.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => null, 'value' => null, 'title' => null, 'description' => null, 'navLabel' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $items = collect($items ?? [
        ['id' => 'profile', 'label' => $t::t('Profile', 'الملف الشخصي'), 'icon' => 'user'],
        ['id' => 'security', 'label' => $t::t('Security', 'الأمان'), 'icon' => 'shield-check'],
        ['id' => 'connected', 'label' => $t::t('Connected accounts', 'الحسابات المرتبطة'), 'icon' => 'link-2'],
        ['id' => 'notifications', 'label' => $t::t('Notifications', 'الإشعارات'), 'icon' => 'bell'],
        ['id' => 'danger', 'label' => $t::t('Danger zone', 'منطقة الخطر'), 'icon' => 'triangle-alert', 'tone' => 'danger'],
    ])->map(fn ($i) => (array) $i)->values();
    $active = $items->firstWhere('id', $value) ?? $items->first();
    $value = $active['id'] ?? '';
    $uid = 'nq-account-settings-'.substr(md5($items->toJson()), 0, 6);
    $hideDescription = $description === false || $description === 'false';
    $navName = $navLabel ?? $t::t('Settings sections', 'أقسام الإعدادات');
    $navItem = 'flex h-nav-row w-full min-h-[var(--nq-touch-min,0px)] items-center gap-2.5 rounded-control px-3 text-start text-body-sm text-muted-foreground outline-none '
        .'transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground '
        .'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus '
        .'data-[active=true]:bg-nq-selected data-[active=true]:font-medium data-[active=true]:text-foreground '
        .'[&_svg]:size-4 [&_svg]:shrink-0';
    $tabClass = 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-label text-muted-foreground outline-none transition-colors duration-150 ease-nq '
        .'hover:text-foreground data-active:text-foreground [&_svg]:size-4 [&_svg]:shrink-0 '
        .'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus '
        .'data-disabled:pointer-events-none data-disabled:opacity-50 h-9 px-0.5';
    $config = ['value' => $value];
@endphp
<div data-slot="account-settings" x-data="nqAccountSettings(@js($config))" x-modelable="value" x-id="['nq-account-settings']" data-uid="{{ $uid }}"
    {{ $attributes->cn('mx-auto flex w-full max-w-5xl flex-col gap-6') }}>
    <header data-slot="account-settings-header" class="flex flex-col gap-1">
        <h1 class="text-h1 text-foreground">{{ $title ?? $t::t('Account settings', 'إعدادات الحساب') }}</h1>
        @unless ($hideDescription)<p class="text-body text-muted-foreground">{{ $description ?? $t::t('Manage your profile, sign-in security and preferences.', 'أدر ملفك الشخصي وأمان تسجيل الدخول وتفضيلاتك.') }}</p>@endunless
    </header>
    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[15rem_minmax(0,1fr)] md:items-start md:gap-10">
        <div data-slot="account-settings-nav" class="min-w-0 overflow-x-auto md:overflow-visible">
            <div data-slot="tabs" data-orientation="horizontal" class="flex flex-col gap-0 md:hidden">
                <div data-slot="tabs-list" data-variant="underline" aria-orientation="horizontal" role="tablist" aria-label="{{ $navName }}" x-bind="tablist"
                    class="relative z-0 flex max-w-full gap-5 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    @foreach ($items as $item)
                        @php $current = $item['id'] === $value; @endphp
                        <button type="button" role="tab" data-slot="tabs-tab" x-bind="tab(@js($item['id']))" data-value="{{ $item['id'] }}" aria-controls="{{ $uid }}-panel-{{ $item['id'] }}"
                            @if ($current) data-active aria-selected="true" tabindex="0" @else aria-selected="false" tabindex="-1" @endif
                            class="{{ \Nasaq\Cn::merge($tabClass, ($item['tone'] ?? null) === 'danger' ? 'text-nq-danger-text data-active:text-nq-danger-text' : '') }}">
                            @if (! empty($item['icon']))<x-dynamic-component :component="'lucide-'.$item['icon']" aria-hidden="true" />@endif
                            {{ $item['label'] }}
                        </button>
                    @endforeach
                    <span data-slot="tabs-indicator" aria-hidden="true"
                        class="absolute -z-10 bottom-0 h-0.5 rounded-full bg-primary left-[var(--active-tab-left)] w-[var(--active-tab-width)] transition-[left,width] duration-200 ease-nq"></span>
                </div>
            </div>
            <nav aria-label="{{ $navName }}" class="sticky top-4 hidden md:block">
                <ul class="flex flex-col gap-0.5">
                    @foreach ($items as $item)
                        @php $current = $item['id'] === $value; @endphp
                        <li>
                            <button type="button" id="{{ $uid }}-nav-{{ $item['id'] }}" x-bind="nav(@js($item['id']))" data-active="{{ $current ? 'true' : 'false' }}"
                                @if (! empty($item['tone'])) data-tone="{{ $item['tone'] }}" @endif
                                @if ($current) aria-current="page" @endif
                                aria-controls="{{ $uid }}-panel-{{ $item['id'] }}"
                                @if (! empty($item['description'])) title="{{ $item['description'] }}" @endif
                                class="{{ \Nasaq\Cn::merge($navItem, ($item['tone'] ?? null) === 'danger' ? 'text-nq-danger-text hover:text-nq-danger-text data-[active=true]:text-nq-danger-text' : '') }}">
                                @if (! empty($item['icon']))<x-dynamic-component :component="'lucide-'.$item['icon']" aria-hidden="true" />@endif
                                <span class="min-w-0 flex-1 truncate">{{ $item['label'] }}</span>
                                @if (! empty($item['badge']))<span class="shrink-0 text-caption tabular-nums">{{ $item['badge'] }}</span>@endif
                            </button>
                        </li>
                    @endforeach
                </ul>
            </nav>
        </div>
        <div class="flex min-w-0 flex-col gap-6">
            {{ $slot }}
        </div>
    </div>
</div>
