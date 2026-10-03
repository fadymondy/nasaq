{{-- <x-nq::placement-settings :value="['mode' => 'sidebar', 'order' => 3, 'defaultPage' => false]" allow-overlays allow-default-page />
     Where a plugin or module appears in the app shell: sidebar, header, side panel, floating widget or hidden, as radio cards with a small picture of the shell;
     its order; and (allow-default-page) whether the app opens on it. Keeps a draft, shows what is unsaved and saves only what changed.
     value: { mode, order, defaultPage? }, the saved placement. allow-overlays enables the side panel and floating widget (otherwise they show, disabled, with why).
     modes: which modes to offer, in order (default all five). title / description: text that replaces the heading, or false to hide it. heading-as: default h2.
     error: a message (or true) shown as the last save failure. labels: an array that replaces strings; modes and modeHints merge with the built-in ones.
     @placement-save fires with detail { changes, done } (only the changed fields): handle it synchronously and the component is saved; call $event.preventDefault()
     to answer later, then $event.detail.done() or done("message") on failure. value is x-modelable (x-model / wire:model); a new saved value starts the draft over.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => [], 'allowOverlays' => false, 'allowDefaultPage' => false, 'modes' => ['sidebar', 'header', 'sideover', 'fixed', 'hidden'], 'title' => null, 'description' => null, 'headingAs' => 'h2', 'error' => null, 'labels' => []])
@php
    $N = \Nasaq\Nasaq::class;
    $strings = [
        'title' => $N::t('Appearance & placement', 'المظهر والموضع'),
        'description' => $N::t('Choose where this shows up in the app and in what order.', 'اختر مكان ظهوره في التطبيق وترتيبه.'),
        'placement' => $N::t('Placement', 'الموضع'),
        'modes' => [
            'sidebar' => $N::t('Sidebar', 'الشريط الجانبي'),
            'header' => $N::t('Header', 'الشريط العلوي'),
            'sideover' => $N::t('Side panel', 'لوحة جانبية'),
            'fixed' => $N::t('Floating widget', 'أداة عائمة'),
            'hidden' => $N::t('Hidden', 'مخفي'),
        ],
        'modeHints' => [
            'sidebar' => $N::t('A link in the main sidebar.', 'رابط في الشريط الجانبي الرئيسي.'),
            'header' => $N::t('A button in the top bar, next to notifications.', 'زر في الشريط العلوي بجانب الإشعارات.'),
            'sideover' => $N::t('Slides in from the edge, opened from a button in the top bar.', 'تنزلق من الحافة، وتُفتح من زر في الشريط العلوي.'),
            'fixed' => $N::t('Floats on every page, like an assistant.', 'تطفو فوق كل الصفحات، مثل المساعد.'),
            'hidden' => $N::t('Not shown anywhere in the app.', 'لا يظهر في أي مكان من التطبيق.'),
        ],
        'overlayOnly' => $N::t('Only for capability plugins.', 'لإضافات القدرات فقط.'),
        'order' => $N::t('Order', 'الترتيب'),
        'orderHint' => $N::t('Lower numbers come first.', 'الأرقام الأصغر تظهر أولًا.'),
        'orderInvalid' => $N::t('Enter a whole number, 0 or more.', 'أدخل عددًا صحيحًا، صفرًا أو أكثر.'),
        'defaultPage' => $N::t('Open on start', 'الفتح عند البدء'),
        'defaultPageHint' => $N::t('People land on this page when they open the app.', 'تظهر هذه الصفحة أولًا عند فتح التطبيق.'),
        'defaultPageBlocked' => $N::t('Only items in the sidebar or header can be the start page.', 'صفحة البدء تكون فقط لعنصر في الشريط الجانبي أو العلوي.'),
        'unsaved' => $N::t('Unsaved changes', 'تغييرات غير محفوظة'),
        'saved' => $N::t('All changes saved', 'كل التغييرات محفوظة'),
        'save' => $N::t('Save changes', 'حفظ التغييرات'),
        'reset' => $N::t('Discard', 'تجاهل'),
        'saveFailed' => $N::t('Could not save', 'تعذر الحفظ'),
    ];
    $t = array_replace_recursive($strings, (array) $labels);
    $value = (array) $value;
    $mode = $value['mode'] ?? 'sidebar';
    $order = (int) ($value['order'] ?? 0);
    $overlay = ['sideover', 'fixed'];
    $startAllowed = in_array($mode, ['sidebar', 'header'], true);
    $heading = $title === null ? $t['title'] : ($title === false ? null : $title);
    $sub = $description === null ? $t['description'] : ($description === false ? null : $description);
    $options = [
        'allowDefaultPage' => (bool) $allowDefaultPage,
        'failure' => $error === null || $error === false ? null : $error,
        'labels' => array_intersect_key($t, array_flip(['unsaved', 'saved', 'orderHint', 'orderInvalid', 'defaultPageHint', 'defaultPageBlocked', 'saveFailed'])),
    ];
    $initial = ['mode' => $mode, 'order' => $order, 'defaultPage' => (bool) ($value['defaultPage'] ?? false)];
    $failure = is_string($error) ? $error : '';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'placement-settings') }}" x-data="nqPlacementSettings({!! \Illuminate\Support\Js::from($initial) !!}, {!! \Illuminate\Support\Js::from($options) !!})" x-modelable="saved" x-id="['nq-placement']"
    x-bind:data-dirty="dirty() ? 'true' : null" @if ($heading) x-bind:aria-labelledby="$id('nq-placement', 'title')" @endif
    {{ $attributes->except('data-slot')->cn('flex flex-col rounded-card border border-border bg-card') }}>
    @if ($heading || $sub)
        <header class="flex flex-col gap-1 border-b border-border px-5 py-4">
            @if ($heading)
                <{{ $headingAs }} x-bind:id="$id('nq-placement', 'title')" class="text-h4 text-foreground">{{ $heading }}</{{ $headingAs }}>
            @endif
            @if ($sub)
                <p class="text-body-sm text-muted-foreground">{{ $sub }}</p>
            @endif
        </header>
    @endif

    <div class="flex flex-col gap-6 px-5 py-5">
        <fieldset class="flex flex-col gap-2">
            <legend x-bind:id="$id('nq-placement', 'placement')" class="pb-2 text-label text-foreground">{{ $t['placement'] }}</legend>
            <x-nq::radio-group :default-value="$mode" x-model="mode" x-bind:aria-labelledby="uid(`placement`)" class="grid gap-2 sm:grid-cols-2">
                @foreach ($modes as $m)
                    @php
                        $available = $allowOverlays || ! in_array($m, $overlay, true);
                        $checked = $m === $mode;
                    @endphp
                    <button type="button" role="radio" data-slot="radio-card" data-mode="{{ $m }}" x-bind="radio(@js($m))"
                        aria-checked="{{ $checked ? 'true' : 'false' }}" tabindex="{{ $checked ? 0 : -1 }}"
                        @if ($checked) data-checked @else data-unchecked @endif
                        @if (! $available) disabled data-disabled @endif
                        class="group/card relative flex w-full cursor-pointer items-start gap-3 rounded-card border border-border bg-card p-3 text-start outline-none transition-colors duration-150 ease-nq hover:border-nq-line-strong data-checked:border-primary data-checked:bg-nq-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-disabled:cursor-not-allowed data-disabled:opacity-50">
                        <span data-slot="radio-card-mark" aria-hidden="true"
                            class="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-nq-line-strong bg-card group-data-checked/card:border-primary group-data-checked/card:bg-primary">
                            <span class="block size-1.5 rounded-full bg-primary-foreground" x-show="isChecked(@js($m))" @unless ($checked) style="display: none" @endunless></span>
                        </span>
                        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span data-slot="radio-card-title" class="text-label text-foreground">{{ $t['modes'][$m] ?? $m }}</span>
                            <span data-slot="radio-card-description" class="text-caption text-muted-foreground">{{ ($t['modeHints'][$m] ?? '').($available ? '' : ' '.$t['overlayOnly']) }}</span>
                        </span>
                        <span data-slot="radio-card-meta" class="shrink-0 text-label text-foreground">
                            <span aria-hidden="true" data-slot="placement-diagram"
                                class="relative block h-11 w-16 shrink-0 overflow-hidden rounded-control border bg-background {{ $m === 'hidden' ? 'border-dashed border-nq-line-strong opacity-60' : 'border-border' }}">
                                <span class="absolute inset-y-0 start-0 w-3.5 border-e border-border bg-muted"></span>
                                <span class="absolute inset-x-0 top-0 h-2.5 border-b border-border bg-muted"></span>
                                <span class="absolute start-1 top-4 h-0.5 w-1.5 rounded-full bg-nq-line-strong"></span>
                                <span class="absolute start-1 top-6 h-0.5 w-1.5 rounded-full bg-nq-line-strong"></span>
                                @if ($m === 'sidebar')<span class="absolute start-0.5 top-[1.875rem] h-1 w-2.5 rounded-full bg-primary"></span>@endif
                                @if ($m === 'header')<span class="absolute end-1 top-0.5 h-1.5 w-3 rounded-full bg-primary"></span>@endif
                                @if ($m === 'sideover')<span class="absolute inset-y-0 end-0 w-5 border-s-2 border-primary bg-nq-selected"></span>@endif
                                @if ($m === 'fixed')<span class="absolute bottom-1 end-1 size-2.5 rounded-full bg-primary"></span>@endif
                            </span>
                        </span>
                    </button>
                @endforeach
            </x-nq::radio-group>
        </fieldset>

        <div class="grid gap-6 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
                <label x-bind:for="$id('nq-placement', 'order')" class="text-label text-foreground">{{ $t['order'] }}</label>
                <x-nq::field.input ltr type="number" inputmode="numeric" min="0" step="1" class="w-32"
                    x-bind:id="uid(`order`)" x-bind:value="orderText" x-on:input="setOrder($event.target.value)"
                    x-bind:disabled="busy" x-bind:aria-invalid="orderValid() ? null : `true`" x-bind:aria-describedby="uid(`order-hint`)" />
                <p x-bind:id="$id('nq-placement', 'order-hint')" x-bind:class="orderValid() ? 'text-muted-foreground' : 'text-nq-danger-text'" x-text="orderValid() ? labels.orderHint : labels.orderInvalid" class="text-caption">{{ $t['orderHint'] }}</p>
            </div>

            @if ($allowDefaultPage)
                <div data-slot="placement-default-page" class="flex items-start gap-3">
                    <x-nq::switch :checked="($initial['defaultPage'] && $startAllowed)" x-model="startOn" class="mt-0.5"
                        x-bind:id="uid(`start`)" x-bind:disabled="switchOff()" x-bind:aria-describedby="uid(`start-hint`)" />
                    <div class="flex flex-col gap-0.5">
                        <label x-bind:for="$id('nq-placement', 'start')" x-bind:class="startAllowed() ? '' : 'opacity-50'" class="text-label text-foreground">{{ $t['defaultPage'] }}</label>
                        <p x-bind:id="$id('nq-placement', 'start-hint')" x-text="startAllowed() ? labels.defaultPageHint : labels.defaultPageBlocked" class="text-caption text-muted-foreground">{{ $startAllowed ? $t['defaultPageHint'] : $t['defaultPageBlocked'] }}</p>
                    </div>
                </div>
            @endif
        </div>

        <div data-slot="alert" data-tone="danger" role="alert" x-show="failed" x-cloak @unless ($error) style="display: none" @endunless class="relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-card border border-nq-danger/30 bg-nq-danger-soft p-3 text-start">
            <x-lucide-circle-x aria-hidden="true" data-slot="alert-icon" class="mt-0.5 size-4 text-nq-danger-text" />
            <div data-slot="alert-body" class="flex min-w-0 flex-col gap-0.5">
                <div data-slot="alert-title" class="text-label text-foreground">{{ $t['saveFailed'] }}</div>
                <div data-slot="alert-description" x-show="failure" x-text="failure" class="text-body-sm text-muted-foreground" @if ($failure === '') style="display: none" @endif>{{ $failure }}</div>
            </div>
        </div>
    </div>

    <footer class="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3">
        <span role="status" data-slot="placement-state" class="text-caption text-muted-foreground">
            <span x-show="dirty()" class="inline-flex items-center gap-1.5" style="display: none">
                <span aria-hidden="true" class="size-1.5 rounded-full bg-[var(--nq-tag-amber)]"></span>
                <span x-text="labels.unsaved">{{ $t['unsaved'] }}</span>
            </span>
            <span x-show="! dirty()" x-text="labels.saved">{{ $t['saved'] }}</span>
        </span>
        <div class="ms-auto flex gap-2">
            <x-nq::button size="sm" variant="ghost" x-bind:disabled="resetOff()" x-on:click="reset()">
                <x-lucide-undo-2 aria-hidden="true" />
                {{ $t['reset'] }}
            </x-nq::button>
            <x-nq::button size="sm" x-bind:disabled="saveOff()" x-bind:aria-busy="busy ? `true` : null" x-on:click="save()">
                <span x-show="busy" style="display: none"><x-nq::spinner /></span>
                <x-lucide-save aria-hidden="true" />
                {{ $t['save'] }}
            </x-nq::button>
        </div>
    </footer>
</section>
