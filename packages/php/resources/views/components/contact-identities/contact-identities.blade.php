{{-- <x-nq::contact-identities :identities="$identities" :consent="$consent" @nq-contact-add="$event.detail.waitUntil(…)" @nq-contact-consent="$event.detail.waitUntil(…)" />
     The accounts a contact writes from (many emails, numbers, handles), one primary per channel, plus consent per channel. It stores
     nothing: it fires events on the root with detail.waitUntil(promise) and your handler saves. Resolve { error: '…' } (or reject) to show a message.
       nq-contact-add      detail { channel, value, label }          resolve, or { error } to keep the form open
       nq-contact-remove   detail { id, channel, value }             (asked first in a dialog)
       nq-contact-primary  detail { id, channel, value }
       nq-contact-consent  detail { channel, status: 'granted'|'denied' }   on { error } the switch goes back
     identities: [['id', 'channel', 'value', 'label', 'primary', 'verified']]. channel: email, phone, whatsapp, telegram, slack, discord,
     messenger, instagram, linkedin, x, chat, other. consent: ['email' => ['status' => granted|denied|unknown, 'at', 'source']].
     channels (the form's choices, all) and consent-channels (email, whatsapp, phone) narrow the lists. can-add / can-remove / can-primary /
     can-consent (all true) and read-only show or lock the controls. Each account's actions also open as a context menu.
     After a change re-render the lists. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['identities' => [], 'consent' => [], 'channels' => null, 'consentChannels' => null, 'canAdd' => true, 'canRemove' => true, 'canPrimary' => true, 'canConsent' => true, 'readOnly' => false])
@php
    $t = \Nasaq\Nasaq::class;
    $all = ['email', 'phone', 'whatsapp', 'telegram', 'slack', 'discord', 'messenger', 'instagram', 'linkedin', 'x', 'chat', 'other'];
    $channels = array_values($channels ?? $all);
    $consentChannels = array_values($consentChannels ?? ['email', 'whatsapp', 'phone']);
    $names = [
        'email' => $t::t('Email', 'البريد'), 'phone' => $t::t('Phone', 'الهاتف'), 'whatsapp' => 'WhatsApp', 'telegram' => 'Telegram', 'slack' => 'Slack',
        'discord' => 'Discord', 'messenger' => 'Messenger', 'instagram' => 'Instagram', 'linkedin' => 'LinkedIn', 'x' => 'X',
        'chat' => $t::t('Chat widget', 'ودجة الدردشة'), 'other' => $t::t('Other', 'أخرى'),
    ];
    $order = array_flip($all);
    $list = collect($identities)->values()->map(fn ($i, $n) => $i + ['_n' => $n])->sort(
        fn ($a, $b) => (($order[$a['channel']] ?? 99) <=> ($order[$b['channel']] ?? 99)) ?: ((int) ! empty($b['primary']) <=> (int) ! empty($a['primary'])) ?: ($a['_n'] <=> $b['_n'])
    )->values()->all();
    $uid = 'nq-contact-'.\Illuminate\Support\Str::random(6);
    $editable = ! $readOnly;
    $consentState = [];
    foreach ($consentChannels as $c) $consentState[$c] = ($consent[$c]['status'] ?? 'unknown') === 'granted';
    $config = [
        'identities' => array_map(fn ($i) => ['id' => (string) $i['id'], 'channel' => $i['channel'], 'value' => (string) $i['value']], $list),
        'channels' => $channels,
        'consent' => $consentState,
        'labels' => [
            'failed' => $t::t('That did not work. Try again.', 'لم تنجح العملية. حاول مرة أخرى.'),
            'removeTitle' => $t::t('Unlink {value}?', 'فك ربط {value}؟'),
            'issues' => [
                'empty' => $t::t('Enter the account.', 'أدخل الحساب.'),
                'email' => $t::t('That is not a valid email address.', 'هذا ليس بريدًا إلكترونيًا صالحًا.'),
                'phone' => $t::t('Enter the number with its country code.', 'أدخل الرقم مع رمز الدولة.'),
                'duplicate' => $t::t('This account is already linked.', 'هذا الحساب مرتبط بالفعل.'),
            ],
        ],
    ];
    $consentWord = ['granted' => $t::t('Opted in', 'موافق'), 'denied' => $t::t('Opted out', 'رافض'), 'unknown' => $t::t('Not asked', 'لم يُسأل')];
    $consentTone = ['granted' => 'success', 'denied' => 'danger', 'unknown' => 'outline'];
    $hasOther = fn ($i) => collect($list)->contains(fn ($o) => $o['channel'] === $i['channel'] && (string) $o['id'] !== (string) $i['id']);
    $linkedTitle = $t::t('Linked accounts', 'الحسابات المرتبطة');
    $consentTitle = $t::t('Consent by channel', 'الموافقة حسب القناة');
    $unlink = $t::t('Unlink', 'فك الربط');
    $makePrimary = $t::t('Make primary', 'اجعله أساسيًا');
    $valuePlaceholder = $t::t('Address, number or @handle', 'عنوان أو رقم أو @معرّف');
    $labelPlaceholder = $t::t('Work, personal…', 'عمل، شخصي…');
@endphp
<section data-slot="contact-identities" aria-labelledby="{{ $uid }}-title" x-data="nqContactIdentities(@js($config))" {{ $attributes->cn('flex min-w-0 flex-col gap-6') }}>
    <div class="flex min-w-0 flex-col gap-3">
        <header class="flex flex-wrap items-start justify-between gap-2">
            <div class="flex min-w-0 flex-col gap-0.5">
                <h3 id="{{ $uid }}-title" class="text-title-sm text-foreground">{{ $linkedTitle }}</h3>
                <p class="text-body-sm text-muted-foreground">{{ $t::t('Every address, number and handle this person uses. A message to any of them reaches the same contact.', 'كل عنوان ورقم ومعرّف يستخدمه هذا الشخص. أي رسالة من أي منها تصل إلى جهة الاتصال نفسها.') }}</p>
            </div>
            @if ($editable && $canAdd)
                <x-nq::button type="button" size="sm" x-show="!adding" x-on:click="openForm()">
                    <x-lucide-plus aria-hidden="true" />
                    {{ $t::t('Link an account', 'ربط حساب') }}
                </x-nq::button>
            @endif
        </header>

        <template x-if="error">
            <x-nq::alert tone="danger" role="alert"><span x-text="error"></span></x-nq::alert>
        </template>

        @if ($editable && $canAdd)
            <form novalidate data-slot="contact-identities-form" x-show="adding" style="display: none" x-on:submit.prevent="submit()"
                class="grid gap-3 rounded-card border border-border bg-card p-3 sm:grid-cols-[10rem_1fr_9rem_auto] sm:items-start">
                <x-nq::field>
                    <x-nq::field.label>{{ $t::t('Channel', 'القناة') }}</x-nq::field.label>
                    <x-nq::select :value="$channels[0] ?? 'email'" x-model="channel">
                        <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($channels as $c)
                                <x-nq::select.item :value="$c">{{ $names[$c] ?? $c }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </x-nq::field>
                <x-nq::field x-model="fieldInvalid">
                    <x-nq::field.label>{{ $t::t('Account', 'الحساب') }}</x-nq::field.label>
                    <x-nq::field.input x-model="value" ltr placeholder="{{ $valuePlaceholder }}" x-on:input="setIssue(null)" />
                    <p role="alert" class="text-caption text-destructive" x-show="issue" style="display: none" x-text="issueText()"></p>
                </x-nq::field>
                <x-nq::field>
                    <x-nq::field.label>{{ $t::t('Label', 'التسمية') }}</x-nq::field.label>
                    <x-nq::field.input x-model="label" placeholder="{{ $labelPlaceholder }}" />
                </x-nq::field>
                <div class="flex gap-2 sm:mt-6">
                    <x-nq::button type="submit" variant="primary" x-bind:aria-busy="busy === 'add' ? 'true' : null" x-bind:data-disabled="busy === 'add' ? '' : null">
                        <x-nq::spinner x-show="busy === 'add'" style="display: none" />
                        {{ $t::t('Link', 'ربط') }}
                    </x-nq::button>
                    <x-nq::button type="button" variant="ghost" x-on:click="closeForm()">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::button>
                </div>
            </form>
        @endif

        @if (count($list) === 0)
            <x-nq::states.empty icon="link-2" class="border border-dashed border-border" :title="$t::t('No linked accounts', 'لا توجد حسابات مرتبطة')" :description="$t::t('Link an email, a phone number or a chat handle.', 'اربط بريدًا أو رقم هاتف أو معرّف محادثة.')" />
        @else
            <div role="list" aria-label="{{ $linkedTitle }}" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
                @foreach ($list as $n => $i)
                    @php
                        $showPrimary = $editable && $canPrimary && empty($i['primary']) && $hasOther($i);
                        $busyKey = "busy === 'primary-".$i['id']."' ? 'true' : null";
                        $unlinkLabel = $unlink.' '.$i['value'];
                    @endphp
                    <x-nq::context-menu>
                        <x-nq::context-menu.trigger role="listitem" data-channel="{{ $i['channel'] }}" class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                            <x-nq::badge variant="outline" class="min-w-20 justify-center">{{ $names[$i['channel']] ?? $i['channel'] }}</x-nq::badge>
                            <bdi dir="ltr" class="min-w-0 flex-1 truncate text-body tabular-nums text-foreground">{{ $i['value'] }}</bdi>
                            @if (! empty($i['label']))<span class="text-caption text-muted-foreground">{{ $i['label'] }}</span>@endif
                            @if (! empty($i['verified']))
                                <span class="inline-flex items-center gap-1 text-caption text-nq-success-text"><x-lucide-badge-check aria-hidden="true" class="size-3.5" />{{ $t::t('Verified', 'موثّق') }}</span>
                            @endif
                            @if (! empty($i['primary']))
                                <x-nq::badge variant="brand"><x-lucide-star aria-hidden="true" />{{ $t::t('Primary', 'أساسي') }}</x-nq::badge>
                            @endif
                            @if ($editable)
                                <span class="ms-auto flex items-center gap-1">
                                    @if ($showPrimary)
                                        <x-nq::button type="button" size="sm" variant="ghost" x-bind:aria-busy="{!! $busyKey !!}" x-on:click="act('primary', {{ $n }})">{{ $makePrimary }}</x-nq::button>
                                    @endif
                                    @if ($canRemove)
                                        <x-nq::button type="button" size="icon-sm" variant="ghost" aria-label="{{ $unlinkLabel }}" x-on:click="act('remove', {{ $n }})"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                                    @endif
                                </span>
                            @endif
                        </x-nq::context-menu.trigger>
                        @if ($editable)
                            <x-nq::context-menu.content>
                                @if ($showPrimary)
                                    <x-nq::context-menu.item x-on:click="act('primary', {{ $n }})"><x-lucide-star aria-hidden="true" />{{ $makePrimary }}</x-nq::context-menu.item>
                                @endif
                                <x-nq::context-menu.item x-on:click="act('copy', {{ $n }})"><x-lucide-copy aria-hidden="true" />{{ $t::t('Copy', 'نسخ') }}</x-nq::context-menu.item>
                                @if ($canRemove)
                                    <x-nq::context-menu.separator />
                                    <x-nq::context-menu.item variant="danger" x-on:click="act('remove', {{ $n }})"><x-lucide-trash-2 aria-hidden="true" />{{ $unlink }}</x-nq::context-menu.item>
                                @endif
                            </x-nq::context-menu.content>
                        @endif
                    </x-nq::context-menu>
                @endforeach
            </div>
        @endif
    </div>

    <div class="flex min-w-0 flex-col gap-3">
        <header class="flex flex-col gap-0.5">
            <h3 class="text-title-sm text-foreground">{{ $consentTitle }}</h3>
            <p class="text-body-sm text-muted-foreground">{{ $t::t('Whether this person agreed to be written to. Consent belongs to the channel, so it covers every account on it.', 'هل وافق هذا الشخص على مراسلته. الموافقة تخص القناة، فتشمل كل حساب عليها.') }}</p>
        </header>
        <ul aria-label="{{ $consentTitle }}" class="m-0 flex list-none flex-col divide-y divide-border rounded-card border border-border bg-card p-0">
            @foreach ($consentChannels as $c)
                @php
                    $has = collect($list)->contains(fn ($i) => $i['channel'] === $c);
                    $state = $consent[$c] ?? [];
                    $status = $state['status'] ?? 'unknown';
                    $locked = $readOnly || ! $canConsent || ! $has;
                    $swOff = $locked ? "''" : "busy ? '' : null";
                    $swLabel = $t::t('Allow messages on '.($names[$c] ?? $c), 'السماح بالرسائل على '.($names[$c] ?? $c));
                    $swModel = 'consent.'.$c;
                @endphp
                <li data-slot="contact-consent" data-channel="{{ $c }}" class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                        <span class="text-label text-foreground">{{ $names[$c] ?? $c }}</span>
                        @if ($has)
                            <span class="flex min-w-0 flex-wrap items-center gap-x-1.5 text-caption text-muted-foreground">
                                <x-nq::badge :variant="$consentTone[$status] ?? 'outline'">{{ $consentWord[$status] ?? $consentWord['unknown'] }}</x-nq::badge>
                                @if (! empty($state['at']))<span>{{ $t::t('Since', 'منذ') }} <x-nq::numeric.date-time :value="$state['at']" /></span>@endif
                                @if (! empty($state['source']))<span>{{ $t::t('via', 'عبر') }} {{ $state['source'] }}</span>@endif
                            </span>
                        @else
                            <span class="text-caption text-muted-foreground">{{ $t::t('No account linked on this channel', 'لا يوجد حساب مرتبط على هذه القناة') }}</span>
                        @endif
                    </div>
                    <x-nq::switch aria-label="{{ $swLabel }}" :checked="$status === 'granted'" x-model="{{ $swModel }}"
                        x-bind:disabled="{!! $swOff !!}" x-bind:data-disabled="{!! $swOff !!}" />
                </li>
            @endforeach
        </ul>
    </div>

    <x-nq::alert-dialog x-model="removeOpen">
        <x-nq::alert-dialog.content>
            <div data-slot="contact-identities-remove" class="contents">
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><span x-text="removeTitle()"></span></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description>{{ $t::t('New messages from this account will stop being matched to this contact.', 'لن تُنسب الرسائل الجديدة من هذا الحساب إلى جهة الاتصال هذه.') }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel>{{ $t::t('Cancel', 'إلغاء') }}</x-nq::alert-dialog.cancel>
                    <x-nq::alert-dialog.action x-on:click="confirmRemove()">{{ $unlink }}</x-nq::alert-dialog.action>
                </x-nq::alert-dialog.footer>
            </div>
        </x-nq::alert-dialog.content>
    </x-nq::alert-dialog>
</section>
