{{-- <x-nq::check-in-kiosk :bookings="$bookings" x-on:nq-check-in="$event.detail.promise = fetch('/check-in', { method: 'POST', body: JSON.stringify($event.detail) }).then((r) => r.json())" />
     A self-service check-in screen for the waiting room. A person scans the QR on their booking ticket (a handheld scanner types the code and presses
     Enter, so the field is always focused) or types a phone number on a big number pad. A match becomes a queue ticket. It handles more than one
     booking, no booking and coming too early, and resets itself after each person. Needs the Alpine runtime (@nasaqScripts).
     bookings: arrays of ['id', 'code', 'phone', 'name', 'startsAt' (epoch ms)]. allow-walk-in (true), early-minutes (60), window-minutes (240),
     reset-seconds (20; 0 keeps the ticket), default-mode (scan | phone), now: epoch ms that freezes the clock. labels: array overriding any built-in word.
     The kiosk never fetches by itself: every check-in dispatches a bubbling "nq-check-in" with { booking?, phone? }. A listener sets event.detail.promise
     to a Promise of { entry: { ticket }, position?, waitMinutes? } or { error }. --}}
@props(['bookings' => [], 'allowWalkIn' => true, 'earlyMinutes' => 60, 'windowMinutes' => 240, 'resetSeconds' => 20, 'now' => null, 'defaultMode' => 'scan', 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = \Nasaq\Nasaq::rtl($locale);
    $en = [
        'title' => 'Check in', 'subtitle' => 'Scan your booking code or type your phone number.', 'modeScan' => 'Scan code', 'modePhone' => 'Phone number',
        'scanLabel' => 'Booking code', 'scanHint' => "Hold your ticket's QR code to the scanner, or type the code, such as BK-7F3Q9K.", 'scanPlaceholder' => 'Scan or type the code',
        'phoneLabel' => 'Mobile number', 'keypad' => 'Number pad', 'backspace' => 'Delete last digit', 'clear' => 'Clear', 'find' => 'Find my booking',
        'finding' => 'Looking', 'checkingIn' => 'Checking you in', 'multiple' => 'We found more than one booking. Which one is yours?',
        'none' => 'We could not find a booking for that.', 'noneWalkIn' => 'You can still join the line without a booking.', 'walkIn' => 'Join the line without a booking',
        'tooEarly' => 'Your visit is at :time. You can check in from :opens.', 'back' => 'Try again', 'ticketTitle' => 'You are checked in', 'ticketNumber' => 'Your ticket',
        'aheadNext' => 'You are next.', 'aheadOne' => '1 person is ahead of you.', 'aheadMany' => ':n people are ahead of you.',
        'waitNow' => 'You will be called any moment.', 'wait' => 'Estimated wait: about :n min.', 'watch' => 'Watch the screen for your number. We will call you.',
        'done' => 'Done', 'autoReset' => 'This screen resets in :n s', 'failed' => 'We could not check you in. Please ask reception.', 'bookingLine' => ':name, :time',
        'invalidPhone' => 'Enter at least 9 digits.', 'qrLabel' => 'QR code of your ticket',
    ];
    $arabic = [
        'title' => 'تسجيل الوصول', 'subtitle' => 'امسح رمز حجزك أو اكتب رقم هاتفك.', 'modeScan' => 'مسح الرمز', 'modePhone' => 'رقم الهاتف',
        'scanLabel' => 'رمز الحجز', 'scanHint' => 'قرّب رمز QR من قارئ الباركود، أو اكتب الرمز مثل BK-7F3Q9K.', 'scanPlaceholder' => 'امسح الرمز أو اكتبه',
        'phoneLabel' => 'رقم الجوال', 'keypad' => 'لوحة الأرقام', 'backspace' => 'حذف آخر رقم', 'clear' => 'مسح', 'find' => 'ابحث عن حجزي',
        'finding' => 'جارٍ البحث', 'checkingIn' => 'جارٍ تسجيل وصولك', 'multiple' => 'وجدنا أكثر من حجز. أيها حجزك؟',
        'none' => 'لم نجد حجزًا بهذه البيانات.', 'noneWalkIn' => 'يمكنك الانضمام إلى الصف بدون حجز.', 'walkIn' => 'الانضمام إلى الصف بدون حجز',
        'tooEarly' => 'موعدك الساعة :time. يمكنك تسجيل الوصول من الساعة :opens.', 'back' => 'حاول مجددًا', 'ticketTitle' => 'تم تسجيل وصولك', 'ticketNumber' => 'تذكرتك',
        'aheadNext' => 'أنت التالي.', 'aheadOne' => 'شخص واحد قبلك.', 'aheadTwo' => 'شخصان قبلك.', 'aheadMany' => ':n أشخاص قبلك.',
        'waitNow' => 'سننادي عليك في أي لحظة.', 'wait' => 'وقت الانتظار المتوقع: حوالي :n دقيقة.', 'watch' => 'تابع الشاشة لرؤية رقمك. سننادي عليك.',
        'done' => 'تم', 'autoReset' => 'تُعاد الشاشة خلال :n ثانية', 'failed' => 'تعذّر تسجيل وصولك. اسأل الاستقبال.', 'bookingLine' => ':name، :time',
        'invalidPhone' => 'أدخل 9 أرقام على الأقل.', 'qrLabel' => 'رمز QR لتذكرتك',
    ];
    $t = array_replace($ar ? $arabic : $en, (array) $labels);
    $config = [
        'bookings' => array_values((array) $bookings), 'allowWalkIn' => (bool) $allowWalkIn, 'earlyMinutes' => $earlyMinutes, 'windowMinutes' => $windowMinutes,
        'resetSeconds' => $resetSeconds, 'now' => $now, 'defaultMode' => $defaultMode, 'locale' => str_replace('_', '-', $locale), 't' => $t,
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'check-in-kiosk') }}" x-data="nqCheckInKiosk({!! \Illuminate\Support\Js::from($config) !!})" x-bind:data-view="view"
    {{ $attributes->except('data-slot')->cn('mx-auto flex w-full max-w-xl flex-col gap-4') }}>
    <div class="flex flex-col gap-1 text-center">
        <h2 class="text-h1" x-text="view === 'ticket' ? sentence('ticketTitle') : sentence('title')">{{ $t['title'] }}</h2>
        <p class="text-body text-muted-foreground" x-show="view !== 'ticket'">{{ $t['subtitle'] }}</p>
    </div>

    <x-nq::card x-show="view === 'input' || view === 'busy'" x-bind:aria-busy="busy ? 'true' : null">
        <x-nq::card.header>
            <div role="group" aria-label="{{ $t['title'] }}" class="col-span-full grid grid-cols-2 gap-2">
                <template x-if="mode === 'scan'">
                    <x-nq::button variant="primary" aria-pressed="true" x-bind:disabled="busy ? '' : null"><x-lucide-qr-code aria-hidden="true" />{{ $t['modeScan'] }}</x-nq::button>
                </template>
                <template x-if="mode !== 'scan'">
                    <x-nq::button variant="secondary" aria-pressed="false" x-on:click="setMode('scan')" x-bind:disabled="busy ? '' : null"><x-lucide-qr-code aria-hidden="true" />{{ $t['modeScan'] }}</x-nq::button>
                </template>
                <template x-if="mode === 'phone'">
                    <x-nq::button variant="primary" aria-pressed="true" x-bind:disabled="busy ? '' : null"><x-lucide-phone aria-hidden="true" />{{ $t['modePhone'] }}</x-nq::button>
                </template>
                <template x-if="mode !== 'phone'">
                    <x-nq::button variant="secondary" aria-pressed="false" x-on:click="setMode('phone')" x-bind:disabled="busy ? '' : null"><x-lucide-phone aria-hidden="true" />{{ $t['modePhone'] }}</x-nq::button>
                </template>
            </div>
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col gap-4">
            <form x-show="mode === 'scan'" x-on:submit.prevent="submitScan()" class="flex flex-col gap-3">
                <label for="kiosk-code" class="text-label">{{ $t['scanLabel'] }}</label>
                <x-nq::field.input id="kiosk-code" ltr autocomplete="off" spellcheck="false" placeholder="{{ $t['scanPlaceholder'] }}" x-ref="code" x-model="code" x-bind:disabled="busy ? '' : null" class="h-14 text-center font-mono text-h3" />
                <p class="text-caption text-muted-foreground">{{ $t['scanHint'] }}</p>
                <x-nq::button type="submit" size="lg" x-bind:disabled="(! code.trim() || busy) ? '' : null"><x-lucide-search aria-hidden="true" /><span x-text="findLabel">{{ $t['find'] }}</span></x-nq::button>
            </form>
            <div x-show="mode === 'phone'" style="display: none" class="flex flex-col gap-3">
                <span id="kiosk-phone-label" class="text-label">{{ $t['phoneLabel'] }}</span>
                <output aria-labelledby="kiosk-phone-label" dir="ltr" class="flex h-14 items-center justify-center rounded-control border border-border bg-background font-mono text-h2 tabular-nums">
                    <span x-show="phone" x-text="phone"></span>
                    <span x-show="! phone" class="text-muted-foreground">01X XXXX XXXX</span>
                </output>
                <div role="group" aria-label="{{ $t['keypad'] }}" class="grid grid-cols-3 gap-2" dir="ltr">
                    @foreach (['1', '2', '3', '4', '5', '6', '7', '8', '9'] as $k)
                        <x-nq::button variant="secondary" size="lg" class="h-16 text-h2" x-on:click="press('{{ $k }}')" x-bind:disabled="busy ? '' : null">{{ $k }}</x-nq::button>
                    @endforeach
                    <x-nq::button variant="ghost" size="lg" class="h-16" x-on:click="clearPhone()" x-bind:disabled="(! phone || busy) ? '' : null">{{ $t['clear'] }}</x-nq::button>
                    <x-nq::button variant="secondary" size="lg" class="h-16 text-h2" x-on:click="press('0')" x-bind:disabled="busy ? '' : null">0</x-nq::button>
                    <x-nq::button variant="ghost" size="lg" class="h-16" aria-label="{{ $t['backspace'] }}" x-on:click="backspace()" x-bind:disabled="(! phone || busy) ? '' : null"><x-lucide-delete aria-hidden="true" class="rtl:rotate-180" /></x-nq::button>
                </div>
                <x-nq::button size="lg" x-on:click="submitPhone()" x-bind:disabled="(! phoneReady || busy) ? '' : null"><x-lucide-search aria-hidden="true" /><span x-text="findLabel">{{ $t['find'] }}</span></x-nq::button>
                <p x-show="phone && ! phoneReady" class="text-caption text-muted-foreground">{{ $t['invalidPhone'] }}</p>
            </div>
        </x-nq::card.content>
    </x-nq::card>

    <template x-if="view === 'choose'">
        <x-nq::card>
            <x-nq::card.header><x-nq::card.title as="h3">{{ $t['multiple'] }}</x-nq::card.title></x-nq::card.header>
            <x-nq::card.content class="flex flex-col gap-2">
                <template x-for="b in choices" :key="b.id">
                    <x-nq::button variant="secondary" size="lg" class="h-auto justify-between py-3" x-on:click="pick(b.id)">
                        <span x-text="bookingLine(b)"></span>
                        <bdi dir="ltr" class="font-mono text-caption text-muted-foreground" x-text="b.code"></bdi>
                    </x-nq::button>
                </template>
                <x-nq::button variant="ghost" x-on:click="reset()">{{ $t['back'] }}</x-nq::button>
            </x-nq::card.content>
        </x-nq::card>
    </template>

    <div x-show="view === 'message'" style="display: none" class="flex flex-col gap-3">
        <x-nq::alert tone="warning"><span x-text="messageText"></span></x-nq::alert>
        <x-nq::button size="lg" x-show="walkIn" style="display: none" x-on:click="walkInCheckIn()"><x-lucide-user-round-plus aria-hidden="true" />{{ $t['walkIn'] }}</x-nq::button>
        <x-nq::button variant="secondary" size="lg" x-on:click="reset()">{{ $t['back'] }}</x-nq::button>
    </div>

    <template x-if="view === 'ticket'">
        <x-nq::card>
            <x-nq::card.header>
                <x-nq::card.description class="flex items-center gap-2 text-nq-success-text"><x-lucide-circle-check aria-hidden="true" class="size-4" />{{ $t['ticketNumber'] }}</x-nq::card.description>
            </x-nq::card.header>
            <x-nq::card.content class="flex flex-col items-center gap-4" role="status">
                <bdi dir="ltr" data-slot="kiosk-ticket" class="font-mono text-[5rem] font-semibold leading-none tracking-wider tabular-nums" x-text="ticketText"></bdi>
                <div class="flex flex-col items-center gap-1 text-center text-body">
                    <p x-show="result && result.position !== undefined" x-text="ahead"></p>
                    <p x-show="result && result.waitMinutes !== undefined" class="inline-flex items-center gap-1.5"><x-lucide-hourglass aria-hidden="true" class="size-4" /><span x-text="waitText"></span></p>
                    <p class="text-muted-foreground">{{ $t['watch'] }}</p>
                </div>
                <x-nq::qr-code x-model="qr" :size="120" label="{{ $t['qrLabel'] }}" />
                <x-nq::button size="lg" class="self-stretch" x-on:click="reset()">{{ $t['done'] }}</x-nq::button>
                @if ($resetSeconds > 0)<p class="text-caption text-muted-foreground" x-text="autoReset"></p>@endif
            </x-nq::card.content>
        </x-nq::card>
    </template>
</div>
