{{-- <x-nq::chat-widget :messages="$messages" :agent="['name' => 'Layla']" :starters="['Pricing', 'Talk to sales']" @nq-send="send($event.detail)" />
     The floating customer chat (React ChatWidget): a round launcher with an unread badge that opens a panel with a greeting, the conversation, quick
     questions, file attachments and, outside business hours, a leave-a-message form. It stores nothing: pass `messages`; the visitor's new messages
     show at once and your listener decides whether they stand.
     messages: [{ id, from: visitor|agent|bot, text, at, name?, avatar?, status?: sending|sent|error, attachments?: [{ id, name, url?, kind: image|file }] }]
     open: starts open (x-model works on it). title, subtitle, agent: { name, avatar? }, greeting, starters: [..] (until the visitor writes),
     online (false swaps the composer for the offline form; offline-form="false" shows nothing there), unread, typing,
     position: end (default; the right in English, the left in Arabic) | start. placement: fixed (default) | absolute | static. max-file-mb: 5.
     retry: show Retry on failed visitor messages. labels: partial overrides of the words (key names as in the React ChatWidgetLabels).
     Events, bubbling from the root, each with detail.waitUntil(promise); resolve { error: "message" } to keep the text and show the message:
       nq-send { text, files }   nq-offline-submit { name, email, message }   nq-retry { id }   nq-open-change { open }
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['messages' => [], 'agent' => null, 'open' => false, 'title' => null, 'subtitle' => null, 'greeting' => null, 'starters' => [], 'online' => true, 'offlineForm' => true, 'unread' => 0, 'typing' => false, 'position' => 'end', 'placement' => 'fixed', 'maxFileMb' => 5, 'retry' => false, 'labels' => []])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $L = fn (string $key, string $en, string $arabic) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $online = (bool) $online;
    $open = (bool) $open;
    $uid = 'nq-cw-'.\Illuminate\Support\Str::random(6);
    $agentName = $agent['name'] ?? null;
    $agentAvatar = $agent['avatar'] ?? null;
    $visitors = collect($messages)->filter(fn ($m) => ($m['from'] ?? 'agent') === 'visitor')->count();
    $heading = $title ?? $L('title', 'Chat with us', 'تحدث معنا');
    $sub = $subtitle ?? ($online ? $L('subtitleOnline', 'We usually reply in a few minutes', 'نرد عادةً خلال دقائق') : $L('subtitleOffline', 'We are away, leave a message', 'نحن بعيدون الآن، اترك رسالة'));
    $intro = $online ? ($greeting ?? $L('greeting', 'Hi! How can we help you today?', 'مرحباً! كيف يمكننا مساعدتك اليوم؟')) : $L('offlineGreeting', 'We are not around right now. Leave your details and we will write back by email.', 'لسنا متاحين الآن. اترك بياناتك وسنرد عليك عبر البريد الإلكتروني.');
    $options = \Illuminate\Support\Js::from([
        'open' => $open,
        'maxFileMb' => (int) $maxFileMb,
        'visitor' => $visitors,
        'labels' => [
            'launcher' => $L('launcher', 'Open chat', 'فتح المحادثة'),
            'close' => $L('close', 'Close chat', 'إغلاق المحادثة'),
            'sendFailed' => $L('sendFailed', 'Could not send. Try again.', 'تعذر الإرسال. حاول مرة أخرى.'),
            'fileTooBig' => $labels['fileTooBig'] ?? \Nasaq\Nasaq::t('{name} is larger than {mb} MB', 'حجم {name} أكبر من {mb} ميغابايت'),
            'removeFile' => $labels['removeFile'] ?? \Nasaq\Nasaq::t('Remove {name}', 'إزالة {name}'),
            'formRequired' => $L('formRequired', 'Required', 'مطلوب'),
            'formInvalidEmail' => $L('formInvalidEmail', 'Enter a valid email address', 'أدخل بريداً إلكترونياً صحيحاً'),
        ],
    ])->toHtml();
    $starterClass = 'rounded-full border border-border bg-background px-3 py-1.5 text-body-sm text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'chat-widget') }}" x-data="nqChatWidget({!! $options !!})" x-modelable="open"
    x-bind:data-open="open ? '' : null" x-on:keydown="onKey($event)"
    @if ($online) data-online @endif
    {{ $attributes->except('data-slot')->cn([
        'z-50 flex flex-col items-end gap-3',
        $position === 'start' ? 'items-start' : '',
        $placement === 'fixed' ? 'fixed bottom-4' : '',
        $placement === 'absolute' ? 'absolute bottom-4' : '',
        $placement !== 'static' ? ($position === 'end' ? 'end-4' : 'start-4') : '',
    ]) }}>
    <section role="dialog" aria-labelledby="{{ $uid }}-title" x-show="open" @unless ($open) style="display: none" @endunless
        class="flex h-[min(34rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-floating border border-border bg-card shadow-floating">
        <header class="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground">
            @if ($agentName)<x-nq::avatar :name="$agentName" :src="$agentAvatar" size="md" />@endif
            <div class="flex min-w-0 flex-1 flex-col">
                <h2 id="{{ $uid }}-title" dir="auto" class="truncate text-label">{{ $heading }}</h2>
                <p class="flex items-center gap-1.5 truncate text-caption opacity-90">
                    <span aria-hidden="true" class="{{ \Nasaq\Cn::merge('size-2 shrink-0 rounded-full', $online ? 'bg-nq-success' : 'bg-nq-line-strong') }}"></span>
                    <span class="sr-only">{{ $online ? $L('online', 'Online', 'متصل') : $L('offline', 'Offline', 'غير متصل') }}. </span>
                    <span dir="auto" class="truncate">{{ $sub }}</span>
                </p>
            </div>
            <x-nq::button type="button" variant="ghost" size="icon-sm" x-on:click="close()" aria-label="{{ $L('close', 'Close chat', 'إغلاق المحادثة') }}" class="text-primary-foreground hover:bg-primary-foreground/15">
                <x-lucide-x aria-hidden="true" />
            </x-nq::button>
        </header>
        <x-nq::chat :label="$heading" class="flex-1" content-class="gap-3 p-4" x-on:nq-retry.stop="retry($event)">
            <x-nq::chat.message :name="$agentName" :avatar-src="$agentAvatar" :text="$intro" />
            @foreach ($messages as $m)
                @php
                    $mine = ($m['from'] ?? 'agent') === 'visitor';
                    $atts = $m['attachments'] ?? [];
                @endphp
                @if (count($atts))
                    <x-nq::chat.message :side="$mine ? 'user' : 'assistant'" :name="$mine ? null : ($m['name'] ?? $agentName)" :avatar-src="$m['avatar'] ?? ($mine ? null : $agentAvatar)"
                        :time="$m['at'] ?? null" :status="$mine ? ($m['status'] ?? null) : null" :retry="$retry" data-id="{{ $m['id'] ?? '' }}">
                        @if (($m['text'] ?? '') !== '')<p dir="auto" class="whitespace-pre-wrap text-start [overflow-wrap:anywhere]">{{ $m['text'] }}</p>@endif
                        <ul class="{{ \Nasaq\Cn::merge('flex flex-col gap-1.5', ($m['text'] ?? '') !== '' ? 'mt-2' : '') }}">
                            @foreach ($atts as $a)
                                <li>
                                    @if (($a['kind'] ?? 'file') === 'image' && ! empty($a['url']))
                                        <img src="{{ $a['url'] }}" alt="{{ $a['name'] }}" class="max-h-40 rounded-control" />
                                    @else
                                        <span dir="auto" class="inline-flex items-center gap-1 text-body-sm"><x-lucide-paperclip aria-hidden="true" class="size-3.5" />{{ $a['name'] }}</span>
                                    @endif
                                </li>
                            @endforeach
                        </ul>
                    </x-nq::chat.message>
                @else
                    <x-nq::chat.message :side="$mine ? 'user' : 'assistant'" :name="$mine ? null : ($m['name'] ?? $agentName)" :avatar-src="$m['avatar'] ?? ($mine ? null : $agentAvatar)"
                        :time="$m['at'] ?? null" :status="$mine ? ($m['status'] ?? null) : null" :retry="$retry" data-id="{{ $m['id'] ?? '' }}" :text="$m['text'] ?? ''" />
                @endif
            @endforeach
            {{-- The visitor's messages sent in this page: shown at once, kept unless the host refuses them. --}}
            <template x-for="m in outbox" x-bind:key="m.id">
                <div data-slot="chat-message" data-side="user" x-bind:data-status="m.status" class="flex max-w-[85%] items-start gap-2 flex-row-reverse self-end">
                    <div class="flex min-w-0 flex-col gap-1 items-end">
                        <div data-slot="chat-bubble" class="min-w-0 rounded-card px-3 py-2 text-body bg-secondary text-secondary-foreground">
                            <p x-show="m.text" x-text="m.text" dir="auto" class="whitespace-pre-wrap text-start [overflow-wrap:anywhere]"></p>
                            <ul x-show="m.files.length" class="mt-2 flex flex-col gap-1.5">
                                <template x-for="name in m.files">
                                    <li><span dir="auto" class="inline-flex items-center gap-1 text-body-sm"><x-lucide-paperclip aria-hidden="true" class="size-3.5" /><span x-text="name"></span></span></li>
                                </template>
                            </ul>
                        </div>
                        <div data-slot="chat-status" class="flex items-center gap-1.5 text-caption text-muted-foreground">
                            <span x-show="m.status === 'sending'" role="status">{{ $L('sending', 'Sending…', 'جارٍ الإرسال…') }}</span>
                            <span x-show="m.status === 'sent'" class="flex items-center gap-1.5"><x-lucide-check aria-hidden="true" class="size-3" /><span>{{ $L('sent', 'Sent', 'تم الإرسال') }}</span></span>
                        </div>
                    </div>
                </div>
            </template>
            @if ($online && count($starters))
                <div role="group" aria-label="{{ $L('startersLabel', 'Quick questions', 'أسئلة سريعة') }}" x-show="! hasVisitor()" @if ($visitors > 0) style="display: none" @endif class="flex flex-wrap gap-2">
                    @foreach ($starters as $s)
                        <button type="button" dir="auto" x-on:click="submit({!! \Illuminate\Support\Js::from((string) $s) !!})" class="{{ $starterClass }}">{{ $s }}</button>
                    @endforeach
                </div>
            @endif
            @if ($typing)<x-nq::chat.typing-indicator :label="$L('typing', 'The team is typing', 'الفريق يكتب')" />@endif
        </x-nq::chat>
        <p role="alert" x-show="error" x-text="error" style="display: none" class="px-4 pb-2 text-caption text-nq-danger-text"></p>
        @if ($online)
            <div class="border-t border-border p-3">
                <input type="file" multiple hidden x-on:change="addFiles($event)" />
                <x-nq::chat.composer x-model="draft" x-on:nq-send.stop="submit($event.detail.text)" :placeholder="$L('placeholder', 'Write a message', 'اكتب رسالة')" :max-rows="4">
                    <x-slot:attachments>
                        <template x-for="(f, i) in files" x-bind:key="i + f.name">
                            <span class="inline-flex h-7 max-w-48 items-center gap-1 rounded-full border border-border bg-secondary ps-2.5 pe-1 text-caption text-foreground">
                                <span dir="auto" class="truncate" x-text="f.name"></span>
                                <button type="button" x-bind:aria-label="removeLabel(f.name)" x-on:click="removeFile(i)"
                                    class="grid size-5 place-items-center rounded-full outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                                    <x-lucide-x aria-hidden="true" class="size-3" />
                                </button>
                            </span>
                        </template>
                    </x-slot:attachments>
                    <x-slot:actions>
                        <x-nq::button type="button" variant="ghost" size="icon" x-on:click="pick()" aria-label="{{ $L('attach', 'Attach a file', 'إرفاق ملف') }}">
                            <x-lucide-paperclip aria-hidden="true" />
                        </x-nq::button>
                    </x-slot:actions>
                </x-nq::chat.composer>
            </div>
        @elseif ($offlineForm)
            <div data-slot="chat-widget-sent" role="status" x-show="sent" style="display: none" class="flex flex-col items-center gap-2 border-t border-border p-6 text-center">
                <x-lucide-circle-check aria-hidden="true" class="size-8 text-nq-success-text" />
                <p class="text-label text-foreground">{{ $L('formSent', 'Thanks, we got it', 'شكراً، وصلتنا رسالتك') }}</p>
                <p class="text-body-sm text-muted-foreground">{{ $L('formSentHint', 'We will reply to your email as soon as we are back.', 'سنرد على بريدك الإلكتروني فور عودتنا.') }}</p>
                <x-nq::button type="button" variant="link" size="sm" x-on:click="again()">{{ $L('formAgain', 'Send another', 'إرسال رسالة أخرى') }}</x-nq::button>
            </div>
            <form data-slot="chat-widget-offline" novalidate x-show="! sent" x-on:submit.prevent="submitOffline()" class="flex flex-col gap-3 border-t border-border p-4">
                <x-nq::field x-model="nameBad">
                    <x-nq::field.label>{{ $L('formName', 'Your name', 'اسمك') }}</x-nq::field.label>
                    <x-nq::field.input x-model="form.name" x-on:input="touch()" dir="auto" autocomplete="name" />
                    <x-nq::field.error>{{ $L('formRequired', 'Required', 'مطلوب') }}</x-nq::field.error>
                </x-nq::field>
                <x-nq::field x-model="emailBad">
                    <x-nq::field.label>{{ $L('formEmail', 'Email', 'البريد الإلكتروني') }}</x-nq::field.label>
                    <x-nq::field.input x-model="form.email" x-on:input="touch()" ltr type="email" autocomplete="email" />
                    <x-nq::field.error><span x-text="emailError()">{{ $L('formRequired', 'Required', 'مطلوب') }}</span></x-nq::field.error>
                </x-nq::field>
                <x-nq::field x-model="messageBad">
                    <x-nq::field.label>{{ $L('formMessage', 'How can we help?', 'كيف نساعدك؟') }}</x-nq::field.label>
                    <x-nq::field.textarea x-model="form.message" x-on:input="touch()" dir="auto" rows="3" />
                    <x-nq::field.error>{{ $L('formRequired', 'Required', 'مطلوب') }}</x-nq::field.error>
                </x-nq::field>
                <p role="alert" x-show="offlineError" x-text="offlineError" style="display: none" class="text-caption text-nq-danger-text"></p>
                <x-nq::button type="submit" variant="primary" x-bind:disabled="busy" x-bind:aria-busy="busy ? 'true' : null">{{ $L('formSend', 'Send message', 'إرسال الرسالة') }}</x-nq::button>
            </form>
        @endif
    </section>
    <x-nq::button x-ref="launcher" type="button" variant="primary" size="icon" x-on:click="toggle()" x-bind:aria-label="launcherLabel()" x-bind:aria-expanded="open ? 'true' : 'false'"
        class="relative size-14 rounded-full shadow-floating">
        <x-lucide-x x-show="open" :style="$open ? '' : 'display: none'" aria-hidden="true" class="size-6" />
        <x-lucide-message-circle x-show="! open" :style="$open ? 'display: none' : ''" aria-hidden="true" class="size-6 rtl:-scale-x-100" />
        @if ((int) $unread > 0)
            <span x-show="! open" @if ($open) style="display: none" @endif class="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-nq-danger px-1 text-caption tabular-nums text-primary-foreground">
                <span aria-hidden="true">{{ (int) $unread }}</span>
                <span class="sr-only">{{ $labels['unread'] ?? \Nasaq\Nasaq::t((int) $unread.' unread', (int) $unread.' غير مقروءة') }}</span>
            </span>
        @endif
    </x-nq::button>
</div>
