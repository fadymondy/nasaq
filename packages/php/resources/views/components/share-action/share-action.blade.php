{{-- <x-nq::share-action url="https://app.example.com/docs/q3" title="Q3 plan" :people="[['id' => '1', 'name' => 'Sara Ali', 'email' => 'sara@example.com', 'role' => 'editor', 'owner' => true]]" />
     A "Share" button that opens a dialog: invite people by email with a role, the people who already have access (change role, remove), link access
     (restricted or anyone with the link) with an expiry, the link to copy, the device share sheet and an email link.
     url (required), title, text (used by the share sheet and the email), roles: [{ value, label }] (default viewer / commenter / editor),
     default-role, people: [{ id, name, email?, avatar?, role, owner? }], invite (default true), link-access (default true), mailto (default true),
     default-access (restricted | anyone), default-link-role, default-expiry (never | 1d | 7d | 30d), variant, size (default secondary / sm).
     Slot: the button text (default Share).
     Bubbling events: "invite" { emails, role, done(), fail(message) } (answer it, the button waits), "rolechange" { person, role },
     "remove" { person } (the row is removed too), "linkchange" { access, role, expiry, expiresAt }, "copy" { url }, "shared".
     Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'url' => '',
    'title' => null,
    'text' => null,
    'roles' => null,
    'defaultRole' => null,
    'people' => [],
    'invite' => true,
    'linkAccess' => true,
    'mailto' => true,
    'defaultAccess' => 'restricted',
    'defaultLinkRole' => null,
    'defaultExpiry' => 'never',
    'variant' => 'secondary',
    'size' => 'sm',
    'disabled' => false,
])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $roles = array_values($roles ?: [
        ['value' => 'viewer', 'label' => $T('Can view', 'يمكنه العرض')],
        ['value' => 'commenter', 'label' => $T('Can comment', 'يمكنه التعليق')],
        ['value' => 'editor', 'label' => $T('Can edit', 'يمكنه التعديل')],
    ]);
    $people = array_values((array) $people);
    $options = array_filter([
        'title' => $title,
        'text' => $text,
        'roles' => $roles,
        'defaultRole' => $defaultRole,
        'defaultAccess' => $defaultAccess !== 'restricted' ? $defaultAccess : null,
        'defaultLinkRole' => $defaultLinkRole,
        'defaultExpiry' => $defaultExpiry !== 'never' ? $defaultExpiry : null,
    ], fn ($v) => $v !== null);
    $expiries = ['never' => $T('Never', 'أبدًا'), '1d' => $T('In 1 day', 'بعد يوم'), '7d' => $T('In 7 days', 'بعد 7 أيام'), '30d' => $T('In 30 days', 'بعد 30 يومًا')];
    $trigger = $T('Share', 'مشاركة');
    $heading = $title ? $T('Share', 'مشاركة').': '.$title : $T('Share', 'مشاركة');
    $selectTrigger = 'w-auto min-w-32';
    $nativeSelect = 'h-8 min-w-28 rounded-control border border-input bg-card px-2 text-body-sm text-foreground outline-none focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus';
@endphp
<div data-slot="share-action"
    x-data="nqShareAction({!! \Illuminate\Support\Js::from((string) $url)->toHtml() !!}, {!! \Illuminate\Support\Js::from($people)->toHtml() !!}, {!! \Illuminate\Support\Js::from((object) $options)->toHtml() !!})"
    {{ $attributes->cn('contents') }}>
    <x-nq::button :variant="$variant" :size="$size" :disabled="$disabled" data-slot="share-button" x-on:click="dlg = true">
        <x-lucide-share-2 aria-hidden="true" />
        {{ $slot->isNotEmpty() ? $slot : $trigger }}
    </x-nq::button>

    <x-nq::dialog x-model="dlg">
        <template x-teleport="body">
            <div data-slot="dialog-portal">
                <div data-slot="dialog-backdrop" x-nq-presence="open" x-on:click="close()" class="fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60 transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0"></div>
                <div data-slot="share-dialog" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open"
                    class="fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-lg grid-cols-[minmax(0,1fr)] gap-4 rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none max-h-[calc(100dvh-2rem)] overflow-y-auto transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title>{{ $heading }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $T('Invite people or send a link.', 'ادعُ أشخاصًا أو أرسل رابطًا.') }}</x-nq::dialog.description>
                    </x-nq::dialog.header>

                    <div class="flex flex-col gap-5">
                        @if ($invite)
                            <section class="flex flex-col gap-2" data-slot="share-invite">
                                <h3 class="text-label text-foreground">{{ $T('Invite people', 'دعوة أشخاص') }}</h3>
                                <div class="flex flex-col gap-2 sm:flex-row sm:items-start">
                                    <x-nq::tag-input x-model="emails" class="min-w-0 flex-1" :separators="[',', ';', ' ']" :placeholder="$T('Add email addresses', 'أضف عناوين البريد')"
                                        validate="validate(tag, tags)" type="email" dir="ltr" aria-label="{{ $T('Invite people', 'دعوة أشخاص') }}" />
                                    <x-nq::select :value="$defaultRole ?? $roles[0]['value']" x-model="inviteRole">
                                        <x-nq::select.trigger aria-label="{{ $T('Role', 'الدور') }}" class="{{ $selectTrigger }}"><x-nq::select.value /></x-nq::select.trigger>
                                        <x-nq::select.content>
                                            @foreach ($roles as $r)
                                                <x-nq::select.item :value="$r['value']">{{ $r['label'] }}</x-nq::select.item>
                                            @endforeach
                                        </x-nq::select.content>
                                    </x-nq::select>
                                    <x-nq::button variant="primary" data-slot="share-send" x-bind:disabled="emails.length && ! pending ? null : true" x-on:click="sendInvite()">
                                        <x-lucide-user-plus aria-hidden="true" />
                                        {{ $T('Send invite', 'إرسال الدعوة') }}
                                    </x-nq::button>
                                </div>
                                <p class="text-caption text-muted-foreground">{{ $T('Press Enter or comma after each address.', 'اضغط Enter أو الفاصلة بعد كل عنوان.') }}</p>
                                <div x-show="message" style="display: none">
                                    <x-nq::alert x-bind:tone="message ? message.tone : 'success'"><span x-text="message ? message.text : ''"></span></x-nq::alert>
                                </div>
                            </section>
                        @endif

                        <section x-show="people.length" @if (! count($people)) style="display: none" @endif class="flex flex-col gap-2" data-slot="share-people">
                            <h3 class="text-label text-foreground">{{ $T('People with access', 'أشخاص لديهم صلاحية') }}</h3>
                            <ul class="flex max-h-48 flex-col divide-y divide-border overflow-y-auto rounded-control border border-border">
                                <template x-for="p in people" :key="p.id">
                                    <li class="flex items-center gap-3 px-3 py-2" data-slot="share-person">
                                        <span aria-hidden="true" class="inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-medium text-muted-foreground" x-text="p.name.trim().charAt(0).toUpperCase()"></span>
                                        <span class="flex min-w-0 flex-1 flex-col">
                                            <span class="truncate text-body-sm text-foreground" x-text="p.name"></span>
                                            <bdi dir="ltr" class="truncate text-start text-caption text-muted-foreground" x-show="p.email" x-text="p.email"></bdi>
                                        </span>
                                        <span class="text-body-sm text-muted-foreground" x-show="p.owner" style="display: none">{{ $T('Owner', 'المالك') }}</span>
                                        <select class="{{ $nativeSelect }}" x-show="! p.owner" x-model="p.role" x-bind:aria-label="roleFor(p.name)" x-on:change="fire('rolechange', { person: p, role: p.role })">
                                            @foreach ($roles as $r)
                                                <option value="{{ $r['value'] }}">{{ $r['label'] }}</option>
                                            @endforeach
                                        </select>
                                        <x-nq::button variant="ghost" size="icon-sm" x-show="! p.owner" x-bind:aria-label="removeFor(p.name)" x-on:click="removePerson(p)">
                                            <x-lucide-x aria-hidden="true" />
                                        </x-nq::button>
                                    </li>
                                </template>
                            </ul>
                        </section>

                        @if ($linkAccess)
                            <section class="flex flex-col gap-3" data-slot="share-access">
                                <h3 class="text-label text-foreground">{{ $T('Link access', 'الوصول عبر الرابط') }}</h3>
                                <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <span class="flex min-w-0 flex-1 items-start gap-2.5">
                                        <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                            <x-lucide-globe aria-hidden="true" class="size-4" x-show="access === 'anyone'" style="display: none" />
                                            <x-lucide-lock aria-hidden="true" class="size-4" x-show="access !== 'anyone'" />
                                        </span>
                                        <span class="flex min-w-0 flex-col">
                                            <x-nq::select :value="$defaultAccess" x-model="access">
                                                <x-nq::select.trigger aria-label="{{ $T('Link access', 'الوصول عبر الرابط') }}" class="h-8 w-auto border-transparent bg-transparent ps-1 text-label"><x-nq::select.value /></x-nq::select.trigger>
                                                <x-nq::select.content>
                                                    <x-nq::select.item value="restricted">{{ $T('Restricted', 'مقيّد') }}</x-nq::select.item>
                                                    <x-nq::select.item value="anyone">{{ $T('Anyone with the link', 'أي شخص لديه الرابط') }}</x-nq::select.item>
                                                </x-nq::select.content>
                                            </x-nq::select>
                                            <span class="ps-1 text-caption text-muted-foreground" x-show="access !== 'anyone'">{{ $T('Only people you invite can open the link.', 'يفتح الرابط من دعوتهم فقط.') }}</span>
                                            <span class="ps-1 text-caption text-muted-foreground" x-show="access === 'anyone'" style="display: none">{{ $T('Anyone who has the link can open it.', 'يستطيع فتحه كل من لديه الرابط.') }}</span>
                                        </span>
                                    </span>
                                    <div x-show="access === 'anyone'" style="display: none">
                                        <x-nq::select :value="$defaultLinkRole ?? $roles[0]['value']" x-model="linkRole">
                                            <x-nq::select.trigger aria-label="{{ $T('Link permission', 'صلاحية الرابط') }}" class="{{ $selectTrigger }}"><x-nq::select.value /></x-nq::select.trigger>
                                            <x-nq::select.content>
                                                @foreach ($roles as $r)
                                                    <x-nq::select.item :value="$r['value']">{{ $r['label'] }}</x-nq::select.item>
                                                @endforeach
                                            </x-nq::select.content>
                                        </x-nq::select>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2.5">
                                    <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                        <x-lucide-clock aria-hidden="true" class="size-4" />
                                    </span>
                                    <span class="flex-1 text-body-sm text-foreground">{{ $T('Link expires', 'ينتهي الرابط') }}</span>
                                    <x-nq::select :value="$defaultExpiry" x-model="expiry">
                                        <x-nq::select.trigger aria-label="{{ $T('Link expires', 'ينتهي الرابط') }}" class="{{ $selectTrigger }}"><x-nq::select.value /></x-nq::select.trigger>
                                        <x-nq::select.content>
                                            @foreach ($expiries as $k => $label)
                                                <x-nq::select.item :value="$k">{{ $label }}</x-nq::select.item>
                                            @endforeach
                                        </x-nq::select.content>
                                    </x-nq::select>
                                </div>
                            </section>
                        @endif

                        <section class="flex flex-col gap-2" data-slot="share-link">
                            <h3 class="text-label text-foreground">{{ $T('Link', 'الرابط') }}</h3>
                            <x-nq::input-group>
                                <x-nq::input-group.input ltr readonly aria-label="{{ $T('Link', 'الرابط') }}" x-bind:value="shareLink()" x-on:focus="$el.select()" />
                                <x-nq::input-group.addon align="end">
                                    <x-nq::button variant="ghost" size="sm" data-slot="share-copy" x-on:click="copyLink()">
                                        <x-lucide-copy aria-hidden="true" x-show="! copied" />
                                        <x-lucide-check aria-hidden="true" x-show="copied" style="display: none" />
                                        <span x-text="copied ? '{{ $T('Copied', 'تم النسخ') }}' : '{{ $T('Copy link', 'نسخ الرابط') }}'">{{ $T('Copy link', 'نسخ الرابط') }}</span>
                                    </x-nq::button>
                                </x-nq::input-group.addon>
                            </x-nq::input-group>
                            <p class="text-caption text-muted-foreground" x-show="access === 'anyone'" style="display: none">{{ $T('Anyone with the link', 'أي شخص لديه الرابط') }}: <span x-text="roleLabel(linkRole)"></span></p>
                            <div class="flex flex-wrap gap-2">
                                <x-nq::button variant="secondary" size="sm" x-show="canShare" style="display: none" x-on:click="nativeShare()">
                                    <x-lucide-share-2 aria-hidden="true" />
                                    {{ $T('Share via…', 'مشاركة عبر…') }}
                                </x-nq::button>
                                @if ($mailto)
                                    <x-nq::button variant="secondary" size="sm" href="#" x-bind:href="mailHref()" data-slot="share-mailto">
                                        <x-lucide-mail aria-hidden="true" />
                                        {{ $T('Email', 'البريد') }}
                                    </x-nq::button>
                                @endif
                            </div>
                        </section>
                    </div>

                    <x-nq::dialog.footer>
                        <x-nq::button variant="primary" x-on:click="dlg = false">{{ $T('Done', 'تم') }}</x-nq::button>
                    </x-nq::dialog.footer>
                    <button type="button" data-slot="dialog-close" x-on:click="close()" aria-label="{{ $T('Close', 'إغلاق') }}"
                        class="absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-x /></button>
                </div>
            </div>
        </template>
    </x-nq::dialog>
</div>
