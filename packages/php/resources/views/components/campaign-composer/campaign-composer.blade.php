{{-- <x-nq::campaign-composer :audiences="[['id' => 'all', 'label' => 'Everyone', 'counts' => ['email' => 1240, 'whatsapp' => 610]]]" :variables="[['key' => 'name', 'label' => 'Name', 'sample' => 'Sara']]"
         @nq-campaign-send="$event.detail.promise = api.send($event.detail.draft)" />
     Compose a broadcast to an audience by email or WhatsApp: pick who, see the live count, write the message, preview it as the reader sees it,
     send a test, check what is missing, confirm, and watch the send progress. Presentational: you own sending. Needs the Alpine runtime (@nasaqScripts).
     audiences: [['id', 'label', 'description', 'counts' => ['email' => n, 'whatsapp' => n]]]. variables: [['key', 'label', 'sample']]: {{key}} is filled with sample in the preview.
     default-value: ['channel' => 'email', 'audienceId' => 'all', 'subject' => '', 'body' => '']. live-count: ask for each count with an event instead of audience.counts.
     can-send, can-send-test (both true): the actions work with no listener (they succeed on the spot); set false to disable Send or hide "Send a test".
     sender ['name', 'email'] and test-recipient (the default address of the test) are for the email preview. progress: ['sent' => n, 'failed' => n, 'total' => n] or null,
     x-modelable: x-model="progress" locks the composer and shows the bar. load: a JS expression returning a promise of Tiptap (see rich-text-editor) to write the email
     body as rich text; without it the body is an HTML textarea. labels: override any string of the English table below.
     Events (bubbling): nq-campaign-count { audienceId, channel } (promise resolves to a number), nq-campaign-send-test { draft, to }, nq-campaign-send { draft },
     nq-campaign-stop, nq-campaign-change { draft }. Set event.detail.promise to a Promise (or one resolving to { error }). The preview renders in <iframe sandbox="">. --}}
@props(['audiences' => [], 'variables' => [], 'defaultValue' => [], 'liveCount' => false, 'canSend' => true, 'canSendTest' => true, 'sender' => null, 'testRecipient' => null, 'progress' => null, 'load' => null, 'labels' => [], 'locale' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $locale ??= $ar ? 'ar' : str_replace('_', '-', app()->getLocale());
    $uid = 'nq-cc-'.\Illuminate\Support\Str::random(6);
    $en = [
        'channel' => 'Channel', 'channels' => ['email' => 'Email', 'whatsapp' => 'WhatsApp'], 'audience' => 'Audience', 'audiencePlaceholder' => 'Choose who gets it',
        'reach' => 'Will reach', 'peopleOne' => 'person', 'peopleMany' => 'people', 'counting' => 'Counting…', 'countFailed' => 'Could not count this audience.',
        'subject' => 'Subject', 'subjectHint' => 'What they see before opening.', 'body' => 'Message', 'whatsappBody' => 'Message text', 'htmlBody' => 'Message (HTML)',
        'whatsappHint' => 'Plain text. WhatsApp allows up to 1,024 characters.', 'variables' => 'Variables', 'variablesHint' => 'Filled in for each person.',
        'insert' => 'Insert {label}', 'copyVariable' => 'Copy {label} variable', 'preview' => 'Preview', 'previewFrame' => 'Email preview', 'desktop' => 'Desktop', 'mobile' => 'Mobile',
        'from' => 'From', 'to' => 'To', 'footerEmail' => 'You get this because you subscribed. Unsubscribe any time.', 'footerWhatsapp' => 'Reply STOP to unsubscribe.',
        'sendTest' => 'Send a test', 'testTitle' => 'Send a test', 'testEmail' => 'Send the test to this address. It uses sample values for the variables.',
        'testWhatsapp' => 'Send the test to your own workspace number only. It uses sample values for the variables.', 'testToEmail' => 'Email address', 'testToWhatsapp' => 'WhatsApp number',
        'testSent' => 'Test sent', 'testInvalid' => 'Enter a valid address or number.', 'send' => 'Send campaign', 'sendTitle' => 'Send to {n} {people}?',
        'sendBody' => 'This goes out right away and cannot be recalled. Send a test first if you have not.', 'cancel' => 'Cancel', 'confirmSend' => 'Send now', 'checks' => 'Before you send',
        'issues' => [
            'audience-none' => 'Choose an audience.', 'audience-empty' => 'This audience has no one reachable on this channel.', 'subject-empty' => 'Add a subject.',
            'body-empty' => 'Write the message.', 'body-too-long' => 'The message is over the WhatsApp limit.', 'variable-unknown' => 'The message uses a variable that does not exist.',
        ],
        'ready' => 'Ready to send.', 'failed' => 'That did not work. Try again.', 'sending' => 'Sending', 'sentOf' => '{sent} of {total} sent', 'failedCount' => '{n} failed',
        'done' => 'Sent to everyone.', 'partial' => 'Finished, but some did not go through.', 'stop' => 'Stop sending', 'characters' => '{n} / {max}', 'noPreview' => 'Nothing to preview yet',
    ];
    $arabic = [
        'channel' => 'القناة', 'channels' => ['email' => 'بريد إلكتروني', 'whatsapp' => 'واتساب'], 'audience' => 'الجمهور', 'audiencePlaceholder' => 'اختر من سيستلم',
        'reach' => 'سيصل إلى', 'peopleOne' => 'شخص', 'peopleMany' => 'شخصًا', 'counting' => 'جارٍ العدّ…', 'countFailed' => 'تعذّر عدّ هذا الجمهور.',
        'subject' => 'الموضوع', 'subjectHint' => 'ما يراه المستلم قبل الفتح.', 'body' => 'الرسالة', 'whatsappBody' => 'نص الرسالة', 'htmlBody' => 'الرسالة (HTML)',
        'whatsappHint' => 'نص عادي. يسمح واتساب بحتى 1024 حرفًا.', 'variables' => 'المتغيرات', 'variablesHint' => 'تُملأ لكل شخص.',
        'insert' => 'إدراج {label}', 'copyVariable' => 'نسخ متغير {label}', 'preview' => 'معاينة', 'previewFrame' => 'معاينة البريد', 'desktop' => 'حاسوب', 'mobile' => 'جوال',
        'from' => 'من', 'to' => 'إلى', 'footerEmail' => 'وصلتك هذه الرسالة لأنك اشتركت. يمكنك إلغاء الاشتراك في أي وقت.', 'footerWhatsapp' => 'أرسل STOP لإلغاء الاشتراك.',
        'sendTest' => 'إرسال تجربة', 'testTitle' => 'إرسال تجربة', 'testEmail' => 'أرسل التجربة إلى هذا العنوان. تُستخدم قيم تجريبية للمتغيرات.',
        'testWhatsapp' => 'أرسل التجربة إلى رقم مساحة عملك فقط. تُستخدم قيم تجريبية للمتغيرات.', 'testToEmail' => 'عنوان البريد', 'testToWhatsapp' => 'رقم واتساب',
        'testSent' => 'تم إرسال التجربة', 'testInvalid' => 'أدخل عنوانًا أو رقمًا صحيحًا.', 'send' => 'إرسال الحملة', 'sendTitle' => 'الإرسال إلى {n} {people}؟',
        'sendBody' => 'يُرسل فورًا ولا يمكن استرجاعه. أرسل تجربة أولًا إن لم تفعل.', 'cancel' => 'إلغاء', 'confirmSend' => 'أرسل الآن', 'checks' => 'قبل الإرسال',
        'issues' => [
            'audience-none' => 'اختر جمهورًا.', 'audience-empty' => 'لا أحد في هذا الجمهور يمكن الوصول إليه عبر هذه القناة.', 'subject-empty' => 'أضف موضوعًا.',
            'body-empty' => 'اكتب الرسالة.', 'body-too-long' => 'الرسالة أطول من حد واتساب.', 'variable-unknown' => 'تستخدم الرسالة متغيرًا غير موجود.',
        ],
        'ready' => 'جاهزة للإرسال.', 'failed' => 'لم تنجح العملية. حاول مرة أخرى.', 'sending' => 'جارٍ الإرسال', 'sentOf' => 'أُرسلت {sent} من {total}', 'failedCount' => 'فشلت {n}',
        'done' => 'أُرسلت للجميع.', 'partial' => 'انتهى الإرسال، لكن بعض الرسائل لم تصل.', 'stop' => 'إيقاف الإرسال', 'characters' => '{n} / {max}', 'noPreview' => 'لا شيء للمعاينة بعد',
    ];
    $base = $ar ? $arabic : $en;
    $t = array_merge($base, (array) $labels);
    $t['channels'] = array_merge($base['channels'], (array) ($labels['channels'] ?? []));
    $t['issues'] = array_merge($base['issues'], (array) ($labels['issues'] ?? []));
    $options = array_filter([
        'audiences' => array_values((array) $audiences), 'variables' => array_values((array) $variables), 'defaultValue' => $defaultValue ?: null, 'liveCount' => $liveCount ?: null,
        'canSend' => (bool) $canSend, 'canSendTest' => (bool) $canSendTest, 'sender' => $sender, 'testRecipient' => $testRecipient, 'progress' => $progress,
        'locale' => $locale, 'labels' => $t,
    ], fn ($v) => $v !== null);
    $tag = fn (string $k): string => '{'.'{'.$k.'}'.'}';
    $segmented = 'flex w-fit max-w-full gap-0.5 rounded-control bg-secondary p-0.5';
    $toggle = 'inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-label text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-disabled:pointer-events-none data-disabled:opacity-50 rounded-[calc(var(--radius-control)-2px)] data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-xs';
    $initialChannel = $defaultValue['channel'] ?? 'email';
@endphp
<div data-slot="campaign-composer" x-data="nqCampaignComposer({!! \Illuminate\Support\Js::from($options) !!})" x-modelable="progress"
    {{ $attributes->cn('grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]') }}>
    <div class="flex min-w-0 flex-col gap-5" x-bind:inert="locked ? '' : null">
        <x-nq::field>
            <x-nq::field.label>{{ $t['channel'] }}</x-nq::field.label>
            <div role="group" data-slot="campaign-channel" aria-label="{{ $t['channel'] }}" class="{{ $segmented }}" x-on:keydown="channelKey($event)">
                @foreach (['email', 'whatsapp'] as $c)
                    <button type="button" data-slot="toggle" aria-pressed="{{ $initialChannel === $c ? 'true' : 'false' }}" x-bind:aria-pressed="channel === '{{ $c }}' ? 'true' : 'false'"
                        x-bind:data-pressed="channel === '{{ $c }}' ? '' : null" @if ($initialChannel === $c) data-pressed @endif x-on:click="setChannel('{{ $c }}')" class="{{ $toggle }}">{{ $t['channels'][$c] }}</button>
                @endforeach
            </div>
        </x-nq::field>

        <x-nq::field>
            <x-nq::field.label>{{ $t['audience'] }}</x-nq::field.label>
            <x-nq::select x-model="audienceId">
                <x-nq::select.trigger><x-nq::select.value :placeholder="$t['audiencePlaceholder']" /></x-nq::select.trigger>
                <x-nq::select.content>
                    @foreach ((array) $audiences as $a)
                        <x-nq::select.item :value="$a['id']">{{ $a['label'] }}</x-nq::select.item>
                    @endforeach
                </x-nq::select.content>
            </x-nq::select>
            <template x-if="audience && audience.description"><x-nq::field.description><span x-text="audience.description"></span></x-nq::field.description></template>
        </x-nq::field>

        <div role="status" aria-live="polite" data-slot="campaign-audience-count" class="flex items-center gap-3 rounded-card border border-border bg-nq-surface-soft p-3">
            <x-nq::icon name="users" aria-hidden="true" class="size-5 text-muted-foreground" />
            <div class="flex flex-col">
                <span class="text-caption text-muted-foreground">{{ $t['reach'] }}</span>
                <span x-show="countState === 'none'" class="text-body-sm text-muted-foreground">—</span>
                <span x-show="countState === 'error'" style="display: none" class="text-body-sm text-destructive">{{ $t['countFailed'] }}</span>
                <span x-show="countState === 'loading'" style="display: none" class="text-body-sm text-muted-foreground">{{ $t['counting'] }}</span>
                <span x-show="countState === 'ready'" style="display: none" class="text-body font-medium text-foreground tabular-nums"><bdi data-slot="num" data-numeric="" x-text="countText"></bdi></span>
            </div>
        </div>

        <template x-if="isEmail">
            <x-nq::field>
                <x-nq::field.label>{{ $t['subject'] }}</x-nq::field.label>
                <x-nq::field.input x-model="subject" />
                <x-nq::field.description>{{ $t['subjectHint'] }}</x-nq::field.description>
            </x-nq::field>
        </template>

        <div class="flex flex-col gap-2">
            <span id="{{ $uid }}-body" class="text-label text-foreground" x-text="isEmail ? labels.body : labels.whatsappBody">{{ $initialChannel === 'email' ? $t['body'] : $t['whatsappBody'] }}</span>
            <template x-if="isEmail">
                <div class="contents">
                    @if ($load)
                        <x-nq::rich-text-editor x-model="body" aria-label="{{ $t['body'] }}" min-height="12rem" :load="$load"
                            :toolbar="['bold', 'italic', 'underline', 'h2', 'bulletList', 'orderedList', 'link', 'undo', 'redo']" />
                    @else
                        <x-nq::field.textarea x-model="body" dir="ltr" rows="10" aria-label="{{ $t['htmlBody'] }}" class="font-mono text-code" />
                    @endif
                </div>
            </template>
            <template x-if="! isEmail">
                <div class="contents">
                    <x-nq::field.textarea x-model="body" rows="8" aria-labelledby="{{ $uid }}-body" />
                    <div class="flex items-center justify-between gap-2 text-caption text-muted-foreground">
                        <span>{{ $t['whatsappHint'] }}</span>
                        <bdi dir="ltr" x-bind:class="tooLong ? 'text-destructive' : ''" x-text="charsText"></bdi>
                    </div>
                </div>
            </template>
            @if (count((array) $variables))
                <div role="group" aria-label="{{ $t['variables'] }}" class="flex flex-wrap items-center gap-1.5">
                    <span class="text-caption text-muted-foreground">{{ $t['variables'] }}. {{ $t['variablesHint'] }}</span>
                    <template x-if="isEmail">
                        <div class="contents">
                            @foreach ((array) $variables as $v)
                                <x-nq::copy-button :value="$tag($v['key'])" :label="str_replace('{label}', $v['label'], $t['copyVariable'])">{{ $v['label'] }}</x-nq::copy-button>
                            @endforeach
                        </div>
                    </template>
                    <template x-if="! isEmail">
                        <div class="contents">
                            @foreach ((array) $variables as $v)
                                <x-nq::button type="button" size="sm" variant="secondary" aria-label="{{ str_replace('{label}', $v['label'], $t['insert']) }}" x-on:click="insert('{{ $v['key'] }}')">{{ $v['label'] }}</x-nq::button>
                            @endforeach
                        </div>
                    </template>
                </div>
            @endif
        </div>
    </div>

    <div class="flex min-w-0 flex-col gap-4">
        <template x-if="isEmail">
            <div data-slot="email-template-preview" class="flex min-w-0 flex-col gap-3">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-label text-foreground">{{ $t['preview'] }}</span>
                    <div role="group" aria-label="{{ $t['preview'] }}" class="inline-flex gap-0.5 rounded-control bg-nq-surface-soft p-0.5">
                        <x-nq::button type="button" size="icon-sm" aria-label="{{ $t['desktop'] }}" x-bind:variant="device === 'desktop' ? 'secondary' : 'ghost'" x-bind:aria-pressed="device === 'desktop' ? 'true' : 'false'" x-on:click="device = 'desktop'"><x-nq::icon name="monitor" aria-hidden="true" class="size-4" /></x-nq::button>
                        <x-nq::button type="button" size="icon-sm" aria-label="{{ $t['mobile'] }}" x-bind:variant="device === 'mobile' ? 'secondary' : 'ghost'" x-bind:aria-pressed="device === 'mobile' ? 'true' : 'false'" x-on:click="device = 'mobile'"><x-nq::icon name="smartphone" aria-hidden="true" class="size-4" /></x-nq::button>
                    </div>
                </div>
                <div class="flex justify-center rounded-card border border-border bg-secondary p-3">
                    <div class="flex w-full flex-col overflow-hidden rounded-card border border-border bg-card" x-bind:data-device="device" x-bind:class="device === 'mobile' ? 'max-w-[375px]' : 'max-w-[680px]'">
                        <div class="flex flex-col gap-0.5 border-b border-border px-4 py-3 text-body-sm">
                            <span class="truncate text-label text-foreground" x-text="previewSubject"></span>
                            <template x-if="sender">
                                <span class="flex flex-wrap items-center gap-x-1 text-muted-foreground">
                                    {{ $t['from'] }}: <span class="text-foreground" x-text="sender.name"></span> <bdi dir="ltr" x-text="'<' + sender.email + '>'"></bdi>
                                </span>
                            </template>
                            <template x-if="recipient">
                                <span class="flex flex-wrap items-center gap-x-1 text-muted-foreground">
                                    {{ $t['to'] }}: <bdi dir="ltr" x-text="recipient"></bdi>
                                </span>
                            </template>
                        </div>
                        <iframe title="{{ $t['previewFrame'] }}" sandbox="" x-bind:srcdoc="srcdoc" class="h-[520px] w-full border-0 bg-secondary"></iframe>
                    </div>
                </div>
            </div>
        </template>
        <template x-if="! isEmail">
            <div class="flex flex-col gap-3">
                <span class="text-label text-foreground">{{ $t['preview'] }}</span>
                <div class="flex justify-center rounded-card border border-border bg-secondary p-4">
                    <div class="flex w-full max-w-[22rem] flex-col gap-1 rounded-card rounded-ss-none border border-border bg-card p-3 text-body-sm">
                        <p x-show="bodyText" dir="auto" class="whitespace-pre-wrap break-words text-foreground" x-text="bodyText"></p>
                        <p x-show="! bodyText" class="text-muted-foreground">{{ $t['noPreview'] }}</p>
                        <p class="text-caption text-muted-foreground">{{ $t['footerWhatsapp'] }}</p>
                    </div>
                </div>
            </div>
        </template>

        <section aria-label="{{ $t['checks'] }}" class="flex flex-col gap-2 rounded-card border border-border p-3">
            <h3 class="text-label text-foreground">{{ $t['checks'] }}</h3>
            <p x-show="ready" style="display: none" class="flex items-center gap-1.5 text-body-sm text-nq-success-text">
                <x-nq::icon name="circle-check" aria-hidden="true" class="size-4" />
                {{ $t['ready'] }}
            </p>
            <ul x-show="! ready" class="flex flex-col gap-1">
                <template x-for="i in issueItems" :key="i.key">
                    <li class="flex items-center gap-1.5 text-body-sm" x-bind:class="tried ? 'text-destructive' : 'text-muted-foreground'">
                        <x-nq::icon name="triangle-alert" aria-hidden="true" class="size-4 shrink-0" />
                        <span x-text="i.text"></span>
                    </li>
                </template>
            </ul>
        </section>

        <template x-if="sendError"><x-nq::alert tone="danger"><span x-text="sendError"></span></x-nq::alert></template>

        <template x-if="progress">
            <section aria-label="{{ $t['sending'] }}" class="flex flex-col gap-2 rounded-card border border-border p-3">
                <div data-slot="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" x-bind:aria-valuenow="prog.percent" x-bind:aria-valuetext="prog.percent + '%'" x-bind:aria-label="progLabel"
                    x-bind:data-tone="prog.state === 'done' ? 'success' : (prog.state === 'partial' ? 'warning' : 'default')" class="flex w-full flex-col gap-1.5">
                    <div data-slot="progress-head" class="flex items-baseline justify-between gap-3 text-body-sm">
                        <span class="text-label text-foreground" x-text="progLabel"></span>
                        <span aria-hidden="true" class="text-muted-foreground tabular-nums" x-text="prog.percent + '%'"></span>
                    </div>
                    <div data-slot="progress-track" class="relative block h-2 w-full overflow-hidden rounded-full bg-nq-surface-soft">
                        <div data-slot="progress-indicator" x-bind:style="'inset-inline-start:0;width:' + prog.percent + '%'"
                            x-bind:class="{ 'bg-primary': prog.state === 'sending', 'bg-nq-success': prog.state === 'done', 'bg-nq-warning': prog.state === 'partial' }"
                            class="block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none"></div>
                    </div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2 text-body-sm text-muted-foreground">
                    <span aria-live="polite" x-text="progText"></span>
                    <template x-if="progress.failed > 0"><x-nq::badge variant="danger"><span x-text="failedText"></span></x-nq::badge></template>
                    <template x-if="prog.state === 'sending'"><x-nq::button size="sm" variant="secondary" x-on:click="stop()">{{ $t['stop'] }}</x-nq::button></template>
                </div>
            </section>
        </template>

        <div class="flex flex-wrap items-center justify-end gap-2">
            <template x-if="canSendTest">
                <x-nq::button variant="secondary" x-bind:disabled="locked ? '' : null" x-on:click="openTest()">{{ $t['sendTest'] }}</x-nq::button>
            </template>
            <x-nq::button variant="primary" x-bind:disabled="(locked || ! canSend) ? '' : null" x-bind:aria-busy="sending ? 'true' : null" x-on:click="trySend()">
                <x-nq::icon name="send" aria-hidden="true" class="rtl:-scale-x-100" />
                {{ $t['send'] }}
            </x-nq::button>
        </div>
    </div>

    {{-- Send a test --}}
    <x-nq::dialog x-model="testOpen">
        <x-nq::dialog.content>
            <form novalidate class="flex flex-col gap-4" x-on:submit.prevent="sendTest()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['testTitle'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description><span x-text="testDescription"></span></x-nq::dialog.description>
                </x-nq::dialog.header>
                <x-nq::field>
                    <x-nq::field.label><span x-text="testToLabel"></span></x-nq::field.label>
                    <template x-if="isEmail"><x-nq::field.input type="email" ltr x-model="testTo" /></template>
                    <template x-if="! isEmail"><x-nq::field.input type="tel" ltr x-model="testTo" /></template>
                </x-nq::field>
                <template x-if="testNote && testNote.tone === 'danger'"><x-nq::alert tone="danger"><span x-text="testNote.text"></span></x-nq::alert></template>
                <template x-if="testNote && testNote.tone === 'success'"><x-nq::alert tone="success"><span x-text="testNote.text"></span></x-nq::alert></template>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="testOpen = false" x-bind:disabled="testBusy ? '' : null">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:aria-busy="testBusy ? 'true' : null" x-bind:disabled="testBusy ? '' : null">
                        <x-nq::icon name="send" aria-hidden="true" class="rtl:-scale-x-100" />
                        {{ $t['sendTest'] }}
                    </x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    {{-- Confirm --}}
    <x-nq::alert-dialog x-model="confirmOpen">
        <x-nq::alert-dialog.content>
            <x-nq::alert-dialog.header>
                <x-nq::alert-dialog.title><span x-text="sendTitle"></span></x-nq::alert-dialog.title>
                <x-nq::alert-dialog.description>{{ $t['sendBody'] }}</x-nq::alert-dialog.description>
            </x-nq::alert-dialog.header>
            <x-nq::alert-dialog.footer>
                <x-nq::alert-dialog.cancel>{{ $t['cancel'] }}</x-nq::alert-dialog.cancel>
                <x-nq::alert-dialog.action x-on:click="start()">{{ $t['confirmSend'] }}</x-nq::alert-dialog.action>
            </x-nq::alert-dialog.footer>
        </x-nq::alert-dialog.content>
    </x-nq::alert-dialog>
</div>
