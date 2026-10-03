{{-- <x-nq::cookie-consent policy-href="/cookies" x-on:save="$event.detail.wait(storeConsent($event.detail.state, $event.detail.source))" />
     A consent banner and its preferences dialog. Reject and Accept carry the same weight, optional categories start off, and every choice fires `save`.
     It holds no tracking code and sets no cookies of its own. Needs the Alpine runtime (@nasaqScripts).
     categories: [{ id, label?, description?, required?, cookies?: [{ name, purpose, duration? }] }]. Default: necessary, preferences, analytics, marketing.
     consent: the saved choice { id: bool }, or null (the banner shows). position: bottom | start | end. inline: render in the page flow, not fixed to the viewport.
     policy-href links your cookie policy. labels: string overrides, with a `categories` map of { label, description } per id.
     Event on the root: save, with detail { state, source (accept-all | reject-all | custom), wait(promise) }. Resolve nothing to accept the choice, { error } to show it and keep the banner;
     a rejection, or no listener, shows the generic error. Reopen the preferences from a "Cookie settings" link with window.dispatchEvent(new Event('nq-cookie-settings')),
     or bind the open state: x-model="open" on the component. --}}
@props(['categories' => null, 'consent' => null, 'policyHref' => null, 'position' => 'bottom', 'inline' => false, 'labels' => []])
@php
$S = [
    'en' => [
        'title' => 'Your privacy choices',
        'description' => 'We use cookies to keep the site working. With your permission we also use them to understand how it is used and to remember your settings. You can change this at any time.',
        'policy' => 'Cookie policy',
        'acceptAll' => 'Accept all',
        'rejectAll' => 'Reject all',
        'customise' => 'Customise',
        'preferencesTitle' => 'Cookie preferences',
        'preferencesDescription' => 'Choose which kinds of cookies we may use. Strictly necessary cookies cannot be turned off because the site does not work without them.',
        'save' => 'Save choices',
        'alwaysOn' => 'Always on',
        'showCookies' => 'Show cookies ({count})',
        'hideCookies' => 'Hide cookies',
        'colName' => 'Name',
        'colPurpose' => 'Purpose',
        'colDuration' => 'Duration',
        'failed' => 'Your choices could not be saved. Try again.',
        'banner' => 'Cookie consent',
        'categories' => ['necessary' => ['label' => 'Strictly necessary', 'description' => 'Keep you signed in, protect against fraud and remember this choice.'], 'preferences' => ['label' => 'Preferences', 'description' => 'Remember your language, theme and layout.'], 'analytics' => ['label' => 'Analytics', 'description' => 'Help us see which pages are used and where things break, in aggregate.'], 'marketing' => ['label' => 'Marketing', 'description' => 'Measure campaigns and show relevant ads on other sites.']],
    ],
    'ar' => [
        'title' => 'خياراتك في الخصوصية',
        'description' => 'نستخدم ملفات تعريف الارتباط لإبقاء الموقع يعمل. وبإذنك نستخدمها أيضًا لفهم كيفية استخدامه وتذكّر إعداداتك. يمكنك تغيير ذلك في أي وقت.',
        'policy' => 'سياسة ملفات تعريف الارتباط',
        'acceptAll' => 'قبول الكل',
        'rejectAll' => 'رفض الكل',
        'customise' => 'تخصيص',
        'preferencesTitle' => 'تفضيلات ملفات تعريف الارتباط',
        'preferencesDescription' => 'اختر أنواع ملفات تعريف الارتباط التي يمكننا استخدامها. لا يمكن إيقاف الضرورية منها لأن الموقع لا يعمل بدونها.',
        'save' => 'حفظ الاختيارات',
        'alwaysOn' => 'مفعّلة دائمًا',
        'showCookies' => 'عرض الملفات ({count})',
        'hideCookies' => 'إخفاء الملفات',
        'colName' => 'الاسم',
        'colPurpose' => 'الغرض',
        'colDuration' => 'المدة',
        'failed' => 'تعذّر حفظ اختياراتك. حاول مرة أخرى.',
        'banner' => 'الموافقة على ملفات تعريف الارتباط',
        'categories' => ['necessary' => ['label' => 'ضرورية', 'description' => 'تُبقيك مسجّل الدخول وتحميك من الاحتيال وتتذكّر هذا الاختيار.'], 'preferences' => ['label' => 'التفضيلات', 'description' => 'تتذكّر لغتك وسمتك وتخطيطك.'], 'analytics' => ['label' => 'التحليلات', 'description' => 'تساعدنا على معرفة الصفحات المستخدمة وأماكن الأعطال، بشكل مجمّع.'], 'marketing' => ['label' => 'التسويق', 'description' => 'تقيس الحملات وتعرض إعلانات مناسبة في مواقع أخرى.']],
    ],
];
    $ar = \Nasaq\Nasaq::rtl();
    $locale = $ar ? 'ar' : 'en';
    $labels = (array) $labels;
    $cats = (array) ($labels['categories'] ?? []);
    unset($labels['categories']);
    $T = array_merge($S[$locale], $labels);
    $names = array_replace_recursive($S[$locale]['categories'], $cats);
    $categories = $categories ?? [['id' => 'necessary', 'required' => true], ['id' => 'preferences'], ['id' => 'analytics'], ['id' => 'marketing']];
    $categories = array_values(array_map(fn ($c) => (array) $c, (array) $categories));
    $saved = is_array($consent) ? $consent : null;
    $position = in_array($position, ['bottom', 'start', 'end'], true) ? $position : 'bottom';
    $config = [
        'categories' => array_map(fn ($c) => ['id' => $c['id'], 'required' => (bool) ($c['required'] ?? false)], $categories),
        'consent' => $saved,
        'labels' => ['failed' => $T['failed']],
    ];
    $bannerClass = [
        'z-50 flex flex-col gap-4 rounded-floating border border-border bg-popover p-4 text-popover-foreground shadow-floating sm:p-5',
        'fixed bottom-4 inset-x-4' => ! $inline,
        'mx-auto max-w-4xl sm:flex-row sm:items-center' => ! $inline && $position === 'bottom',
        'sm:end-auto sm:start-4 sm:max-w-sm' => ! $inline && $position === 'start',
        'sm:start-auto sm:end-4 sm:max-w-sm' => ! $inline && $position === 'end',
        'max-w-4xl' => $inline,
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'cookie-consent-root') }}" class="contents" x-data="nqCookieConsent(@js($config))" x-modelable="prefs" x-on:nq-cookie-settings.window="openPrefs()"
    {{ $attributes->except('data-slot')->whereStartsWith(['x-model', 'wire:model']) }}>
    @if ($saved === null)
        <section data-slot="{{ $attributes->get('data-slot', 'cookie-consent') }}" data-position="{{ $position }}" aria-label="{{ $T['banner'] }}" x-show="saved === null"
            {{ $attributes->except('data-slot')->whereDoesntStartWith(['x-model', 'wire:model'])->cn($bannerClass) }}>
            <div class="flex min-w-0 flex-1 gap-3">
                <x-lucide-cookie aria-hidden="true" class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div class="flex min-w-0 flex-col gap-1">
                    <h2 class="text-label text-foreground">{{ $T['title'] }}</h2>
                    <p class="text-body-sm text-muted-foreground">
                        {{ $T['description'] }}
                        @if ($policyHref)<a href="{{ $policyHref }}" class="text-foreground underline underline-offset-4">{{ $T['policy'] }}</a>@endif
                    </p>
                    <p role="alert" class="text-caption text-nq-danger-text" x-show="error && ! prefs" x-text="error" style="display: none"></p>
                </div>
            </div>
            <div data-slot="cookie-consent-actions" class="flex flex-col gap-2 sm:flex-row sm:shrink-0">
                <x-nq::button variant="ghost" x-on:click="openPrefs()" x-bind:disabled="busy">{{ $T['customise'] }}</x-nq::button>
                <x-nq::button variant="secondary" x-on:click="reject()" x-bind:disabled="blocked('reject-all')" x-bind:aria-busy="pending === 'reject-all' ? 'true' : null">
                    <template x-if="pending === 'reject-all'"><x-nq::spinner /></template>
                    {{ $T['rejectAll'] }}
                </x-nq::button>
                <x-nq::button variant="secondary" x-on:click="accept()" x-bind:disabled="blocked('accept-all')" x-bind:aria-busy="pending === 'accept-all' ? 'true' : null">
                    <template x-if="pending === 'accept-all'"><x-nq::spinner /></template>
                    {{ $T['acceptAll'] }}
                </x-nq::button>
            </div>
        </section>
    @endif

    <x-nq::dialog x-model="prefs">
        <x-nq::dialog.content class="max-w-xl">
            <div data-slot="cookie-preferences" class="contents">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $T['preferencesTitle'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $T['preferencesDescription'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <ul class="m-0 flex list-none flex-col divide-y divide-border p-0">
                    @foreach ($categories as $i => $category)
                        @php
                            $id = (string) $category['id'];
                            $required = (bool) ($category['required'] ?? false);
                            $label = $category['label'] ?? ($names[$id]['label'] ?? $id);
                            $desc = $category['description'] ?? ($names[$id]['description'] ?? null);
                            $cookies = (array) ($category['cookies'] ?? []);
                            $on = $required || (bool) ($saved[$id] ?? false);
                        @endphp
                        <li data-slot="cookie-category" data-category="{{ $id }}" class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                            <div class="flex items-start justify-between gap-4">
                                <div class="flex min-w-0 flex-col gap-0.5">
                                    <span class="text-label text-foreground">{{ $label }}</span>
                                    @if ($desc)<span class="text-body-sm text-muted-foreground">{{ $desc }}</span>@endif
                                </div>
                                <div class="flex shrink-0 items-center gap-2">
                                    @if ($required)
                                        <span class="text-caption text-muted-foreground">{{ $T['alwaysOn'] }}</span>
                                        <x-nq::switch :checked="true" disabled aria-label="{{ $label }}" />
                                    @else
                                        <x-nq::switch :checked="$on" x-model="draft[ids[{{ $i }}]]" aria-label="{{ $label }}" />
                                    @endif
                                </div>
                            </div>
                            @if (count($cookies))
                                <x-nq::collapsible>
                                    <x-nq::collapsible.trigger variant="link" class="gap-1 text-caption text-muted-foreground no-underline hover:text-foreground">
                                        <x-lucide-chevron-down aria-hidden="true" class="size-3.5 transition-transform" x-bind:class="open ? 'rotate-180' : ''" />
                                        <span x-show="! open">{{ str_replace('{count}', (string) count($cookies), $T['showCookies']) }}</span>
                                        <span x-show="open" style="display: none">{{ $T['hideCookies'] }}</span>
                                    </x-nq::collapsible.trigger>
                                    <x-nq::collapsible.panel>
                                        <div class="mt-2 overflow-x-auto rounded-control border border-border">
                                            <table class="w-full text-start text-caption">
                                                <thead class="bg-muted text-muted-foreground">
                                                    <tr>
                                                        <th scope="col" class="px-2.5 py-1.5 text-start font-medium">{{ $T['colName'] }}</th>
                                                        <th scope="col" class="px-2.5 py-1.5 text-start font-medium">{{ $T['colPurpose'] }}</th>
                                                        <th scope="col" class="px-2.5 py-1.5 text-start font-medium">{{ $T['colDuration'] }}</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="divide-y divide-border">
                                                    @foreach ($cookies as $cookie)
                                                        <tr>
                                                            <td class="px-2.5 py-1.5 align-top"><bdi dir="ltr" class="font-mono text-foreground">{{ $cookie['name'] }}</bdi></td>
                                                            <td class="px-2.5 py-1.5 align-top text-muted-foreground">{{ $cookie['purpose'] ?? '' }}</td>
                                                            <td class="px-2.5 py-1.5 align-top whitespace-nowrap text-muted-foreground">{{ $cookie['duration'] ?? '' }}</td>
                                                        </tr>
                                                    @endforeach
                                                </tbody>
                                            </table>
                                        </div>
                                    </x-nq::collapsible.panel>
                                </x-nq::collapsible>
                            @endif
                        </li>
                    @endforeach
                </ul>
                <template x-if="error">
                    <x-nq::alert tone="danger"><span x-text="error"></span></x-nq::alert>
                </template>
                <x-nq::dialog.footer>
                    <x-nq::button variant="secondary" x-on:click="reject()" x-bind:disabled="blocked('reject-all')" x-bind:aria-busy="pending === 'reject-all' ? 'true' : null">
                        <template x-if="pending === 'reject-all'"><x-nq::spinner /></template>
                        {{ $T['rejectAll'] }}
                    </x-nq::button>
                    <x-nq::button variant="secondary" x-on:click="accept()" x-bind:disabled="blocked('accept-all')" x-bind:aria-busy="pending === 'accept-all' ? 'true' : null">
                        <template x-if="pending === 'accept-all'"><x-nq::spinner /></template>
                        {{ $T['acceptAll'] }}
                    </x-nq::button>
                    <x-nq::button variant="primary" x-on:click="saveDraft()" x-bind:disabled="blocked('custom')" x-bind:aria-busy="pending === 'custom' ? 'true' : null">
                        <template x-if="pending === 'custom'"><x-nq::spinner /></template>
                        {{ $T['save'] }}
                    </x-nq::button>
                </x-nq::dialog.footer>
            </div>
        </x-nq::dialog.content>
    </x-nq::dialog>
</div>
