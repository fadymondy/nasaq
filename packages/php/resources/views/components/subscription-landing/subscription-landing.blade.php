{{-- <x-nq::subscription-landing mode="subscribe" brand="Nasaq" x-on:nq-subscribe="$event.detail.waitUntil(subscribe($event.detail))" />
     The three public pages of an email list: subscribe (explicit, unticked consent), confirm (double opt-in) and unsubscribe (optional
     reason, a way back). One centred card each. Needs the Alpine runtime (@nasaqScripts).
     mode: subscribe | confirm | unsubscribe   brand: the sender's name as text (or the brand slot)   email: the address from the email link
     (confirm and unsubscribe; shown masked)   reasons: reason keys for the unsubscribe page (too_many, not_relevant, never_signed, other)
     ask-name: adds a name field to the subscribe page   labels: an array overriding the built-in reason texts (labels['reasons'][key]).
     Listen on the root for nq-subscribe { email, name }, nq-confirm, nq-unsubscribe { reason, note } and nq-resubscribe; each carries
     waitUntil(promise). Resolve nothing for success or { error: "…" } to show a message. Without a nq-resubscribe listener the undo button
     still shows; add the listener or `no-resubscribe` to hide it. --}}
@props(['mode' => 'subscribe', 'brand' => null, 'email' => null, 'reasons' => null, 'askName' => false, 'noResubscribe' => false, 'labels' => []])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $keys = $reasons ?? ['too_many', 'not_relevant', 'never_signed', 'other'];
    $reasonTexts = array_merge([
        'too_many' => $t('I get too many emails', 'تصلني رسائل كثيرة'),
        'not_relevant' => $t('The emails are not relevant', 'الرسائل لا تعنيني'),
        'never_signed' => $t('I never signed up', 'لم أشترك أصلًا'),
        'other' => $t('Something else', 'سبب آخر'),
    ], (array) ($labels['reasons'] ?? []));
    $config = ['mode' => $mode, 'email' => $email, 'labels' => collect((array) $labels)->except('reasons')->all()];
    $hide = 'display: none';
    $uid = 'nq-sub-'.substr(md5($mode.json_encode($keys)), 0, 6);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'subscription-landing') }}" data-mode="{{ $mode }}" x-data="nqSubscriptionLanding(@js($config))"
    {{ $attributes->except('data-slot')->cn('flex min-h-full w-full flex-col items-center justify-center gap-6 p-4 sm:p-8') }}>
    @if (filled($brand) || (isset($slot) && ! $slot->isEmpty()))
        <div class="text-h4 text-foreground">{{ filled($brand) ? $brand : $slot }}</div>
    @endif
    <x-nq::card class="w-full max-w-md p-6">
        @if ($mode === 'subscribe')
            <div x-show="stage === 'pending'" style="{{ $hide }}" class="flex flex-col gap-4" role="status">
                <x-nq::subscription-landing.head icon="mail-check" :title="$t('Check your inbox', 'تحقق من بريدك')" body-expr="pendingText" />
                <x-nq::button variant="ghost" x-on:click="startOver()">{{ $t('Wrong address? Start over', 'العنوان خاطئ؟ ابدأ من جديد') }}</x-nq::button>
            </div>
            <form x-show="stage === 'form'" novalidate class="flex flex-col gap-4" x-on:submit.prevent="submitSubscribe()">
                <x-nq::subscription-landing.head icon="mail-check" :title="$t('Stay in the loop', 'ابقَ على اطلاع')" :body="$t('Product news and new articles, once in a while. No spam.', 'أخبار المنتج ومقالات جديدة بين حين وآخر. بلا إزعاج.')" />
                <x-nq::alert tone="danger" x-show="error" style="{{ $hide }}"><span x-text="error"></span></x-nq::alert>
                @if ($askName)
                    <x-nq::field>
                        <x-nq::field.label>{{ $t('Name', 'الاسم') }} <span class="text-caption font-normal text-muted-foreground">({{ $t('optional', 'اختياري') }})</span></x-nq::field.label>
                        <x-nq::field.input autocomplete="name" x-model="name" />
                    </x-nq::field>
                @endif
                <x-nq::field x-model="emailBad" x-effect="emailBad = emailIssue !== ''">
                    <x-nq::field.label>{{ $t('Email address', 'البريد الإلكتروني') }}</x-nq::field.label>
                    <x-nq::field.input ltr type="email" autocomplete="email" x-model="email" />
                    <p x-show="emailIssue" style="{{ $hide }}" role="alert" class="text-caption text-destructive" x-text="emailIssue"></p>
                </x-nq::field>
                <div class="flex flex-col gap-1">
                    <label for="{{ $uid }}-consent" class="flex items-start gap-2 text-body-sm">
                        <x-nq::checkbox id="{{ $uid }}-consent" class="mt-0.5" x-model="consent" />
                        <span>{{ $t('Yes, send me emails. I can unsubscribe at any time.', 'نعم، أرسلوا لي رسائل بريدية. يمكنني إلغاء الاشتراك في أي وقت.') }}</span>
                    </label>
                    <p x-show="consentIssue" style="{{ $hide }}" role="alert" class="text-caption text-destructive" x-text="consentIssue"></p>
                </div>
                <x-nq::button type="submit" variant="primary" class="w-full" x-bind:disabled="busy" x-bind:aria-busy="busy ? 'true' : null">
                    <template x-if="busy"><x-nq::spinner /></template>
                    {{ $t('Subscribe', 'اشتراك') }}
                </x-nq::button>
                <p class="text-center text-caption text-muted-foreground">{{ $t('We keep your address private and never sell it.', 'نحافظ على خصوصية عنوانك ولا نبيعه أبدًا.') }}</p>
            </form>
        @elseif ($mode === 'confirm')
            <div x-show="stage === 'done'" style="{{ $hide }}" role="status">
                <x-nq::subscription-landing.head icon="circle-check" :title="$t('You are subscribed', 'تم اشتراكك')" :body="$t('Thanks. Your first email is on its way soon.', 'شكرًا. رسالتك الأولى في الطريق.')" />
            </div>
            <div x-show="stage !== 'done'" class="flex flex-col gap-4">
                <x-nq::subscription-landing.head icon="mail-check" :title="$t('Confirm your subscription', 'أكّد اشتراكك')" body-expr="confirmText" />
                <x-nq::alert tone="danger" x-show="error" style="{{ $hide }}"><span x-text="error"></span></x-nq::alert>
                <x-nq::button variant="primary" class="w-full" x-on:click="confirm()" x-bind:disabled="busy" x-bind:aria-busy="busy ? 'true' : null">
                    <template x-if="busy"><x-nq::spinner /></template>
                    {{ $t('Yes, confirm', 'نعم، أكّد') }}
                </x-nq::button>
            </div>
        @else
            <div x-show="stage === 'done'" style="{{ $hide }}" class="flex flex-col gap-4" role="status">
                <x-nq::subscription-landing.head icon="mail-x" :title="$t('You are unsubscribed', 'تم إلغاء اشتراكك')" body-expr="unsubscribedText" />
                <x-nq::alert tone="danger" x-show="error" style="{{ $hide }}"><span x-text="error"></span></x-nq::alert>
                @unless ($noResubscribe)
                    <x-nq::button variant="secondary" class="w-full" x-on:click="resubscribe()" x-bind:disabled="busy" x-bind:aria-busy="busy ? 'true' : null">
                        <template x-if="busy"><x-nq::spinner /></template>
                        {{ $t('That was a mistake. Subscribe again', 'كان هذا خطأ. اشترك من جديد') }}
                    </x-nq::button>
                @endunless
            </div>
            <div x-show="stage === 'undone'" style="{{ $hide }}" role="status">
                <x-nq::subscription-landing.head icon="circle-check" :title="$t('Welcome back', 'أهلًا بعودتك')" :body="$t('You are subscribed again.', 'تم اشتراكك من جديد.')" />
            </div>
            <form x-show="stage === 'form'" class="flex flex-col gap-4" x-on:submit.prevent="unsubscribe()">
                <x-nq::subscription-landing.head icon="mail-x" :title="$t('Unsubscribe', 'إلغاء الاشتراك')" body-expr="unsubscribeText" />
                <x-nq::alert tone="danger" x-show="error" style="{{ $hide }}"><span x-text="error"></span></x-nq::alert>
                <fieldset class="flex flex-col gap-2">
                    <legend class="mb-1 text-label text-foreground">{{ $t('Would you tell us why? (optional)', 'هل تخبرنا بالسبب؟ (اختياري)') }}</legend>
                    <x-nq::radio-group class="flex flex-col gap-2" x-model="reason">
                        @foreach ($keys as $k)
                            <label class="flex items-center gap-2 text-body-sm">
                                <x-nq::radio-group.radio :value="$k" />
                                {{ $reasonTexts[$k] ?? $k }}
                            </label>
                        @endforeach
                    </x-nq::radio-group>
                </fieldset>
                <x-nq::field x-show="reason === 'other'" style="{{ $hide }}">
                    <x-nq::field.label>{{ $t('Anything to add', 'أي إضافة') }}</x-nq::field.label>
                    <x-nq::field.textarea rows="3" x-model="note" />
                </x-nq::field>
                <x-nq::button type="submit" variant="primary" class="w-full" x-bind:disabled="busy" x-bind:aria-busy="busy ? 'true' : null">
                    <template x-if="busy"><x-nq::spinner /></template>
                    {{ $t('Unsubscribe', 'إلغاء الاشتراك') }}
                </x-nq::button>
            </form>
        @endif
    </x-nq::card>
</div>
