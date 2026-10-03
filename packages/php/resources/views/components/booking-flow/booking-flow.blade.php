{{-- <x-nq::booking-flow :locations="$locations" :services="$services" :providers="$providers" :slots="$slots" />
     The online booking flow: branch, service, doctor (with ratings), day and time, details (guest or signed in), notes and attachments,
     payment or pay at the visit, then a review and the confirmation ticket. The branch step is skipped when there is one branch or none.
     locations: [['id', 'name', 'address'?, 'city'?]]. services: [['id', 'name', 'price', 'durationMinutes', 'category'?, 'description'?]].
     providers: [['id', 'name', 'specialty'?, 'avatar'?, 'rating'?, 'reviews'?, 'serviceIds'?, 'locationIds'?]] (a doctor without serviceIds / locationIds takes any).
     slots: the times offered, [['start' => '2030-01-11T09:00', 'state' => 'available'], ...] (see x-nq::booking-slots), shown whichever doctor is chosen.
     For times that depend on the choices, pass slots-url instead: the browser GETs it with ?location=&service=&provider= and reads the same list as JSON.
     signed-in: ['name', 'phone', 'email'?] fills the details. allow-online-payment (default true). currency: ISO code, default USD (SAR in Arabic). tax-rate: 0.14 for 14%.
     submit-url: POST (multipart: "booking" JSON plus "files[]"), answering { code?, error? }. Without it the bubbling, cancelable "booking-submit" event
     { submission, done(code?), fail(message?) } carries the booking: call preventDefault(), then done or fail. Without preventDefault the booking confirms at once.
     Other bubbling events: "step-change" { step } and "reset". The day is picked on <x-nq::calendar> (days with no free time are disabled), the day's times beside it.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['locations' => [], 'services' => [], 'providers' => [], 'slots' => [], 'slotsUrl' => null, 'submitUrl' => null, 'signedIn' => null, 'allowOnlinePayment' => true, 'currency' => null, 'taxRate' => 0, 'locale' => null])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $locale ??= app()->getLocale();
    $ar = \Nasaq\Nasaq::rtl($locale);
    $locations = array_values((array) $locations);
    $services = array_values((array) $services);
    $providers = array_values((array) $providers);
    $branches = count($locations) > 1;
    $stepIds = array_values(array_filter(['location', 'service', 'provider', 'time', 'details', 'notes', 'payment', 'review'], fn ($s) => $s !== 'location' || $branches));
    $names = ['location' => $T('Branch', 'الفرع'), 'service' => $T('Service', 'الخدمة'), 'provider' => $T('Doctor', 'الطبيب'), 'time' => $T('Time', 'الموعد'), 'details' => $T('Details', 'البيانات'), 'notes' => $T('Notes', 'ملاحظات'), 'payment' => $T('Payment', 'الدفع'), 'review' => $T('Review', 'المراجعة')];
    $headings = ['location' => $T('Where would you like to be seen?', 'أين تودّ أن تُعالَج؟'), 'service' => $T('What do you need?', 'ما الذي تحتاجه؟'), 'provider' => $T('Who would you like to see?', 'مع من تريد الحجز؟'), 'time' => $T('Pick a day and time', 'اختر اليوم والوقت'), 'details' => $T('Who is this booking for?', 'لمن هذا الحجز؟'), 'notes' => $T('Anything the clinic should know?', 'هل من شيء تودّ أن تعرفه العيادة؟'), 'payment' => $T('How would you like to pay?', 'كيف تودّ الدفع؟'), 'review' => $T('Check and confirm', 'راجع وأكّد')];
    $first = $stepIds[0];
    $options = array_filter([
        'locations' => $locations,
        'services' => $services,
        'providers' => array_map(fn ($p) => array_diff_key($p, ['avatar' => 1, 'rating' => 1, 'reviews' => 1]), $providers),
        'slots' => $slotsUrl ? null : array_values((array) $slots),
        'slotsUrl' => $slotsUrl,
        'submitUrl' => $submitUrl,
        'signedIn' => $signedIn,
        'taxRate' => $taxRate ?: null,
        'currency' => $currency,
    ], fn ($v) => $v !== null);
    $money = fn ($n) => \Nasaq\Nasaq::money($n, $currency, $locale);
    $minutes = fn ($n) => $ar ? $n.' دقيقة' : $n.' min';
    $stepMarker = 'relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-medium transition-colors duration-150 ease-nq [&_svg]:size-3.5';
    $tile = 'inline-flex min-h-control flex-col items-center justify-center gap-0.5 rounded-control border border-border bg-card px-2 py-1.5 text-label tabular-nums outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:hover:bg-card';
    $forward = $ar ? 'arrow-left' : 'arrow-right';
    $backward = $ar ? 'arrow-right' : 'arrow-left';
    $todayKey = now()->format('Y-m-d');
    $hide = fn (string $id) => $id === $first ? null : 'display: none';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'booking-flow') }}" lang="{{ str_replace('_', '-', $locale) }}" x-data="nqBookingFlow({!! \Illuminate\Support\Js::from((object) $options)->toHtml() !!})"
    x-bind:data-step="isOpen() ? step : undefined" x-bind:data-state="isConfirmed() ? 'confirmed' : undefined" data-step="{{ $first }}"
    {{ $attributes->except('data-slot')->cn('w-full') }}>
    {{-- Confirmation --}}
    <div x-show="isConfirmed()" style="display: none" class="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div class="flex items-start gap-3" role="status">
            <x-lucide-circle-check aria-hidden="true" class="mt-1 size-6 shrink-0 text-nq-success-text" />
            <div>
                <h2 x-ref="confirm" tabindex="-1" class="text-h2 outline-none">{{ $T('Your booking is confirmed', 'تم تأكيد حجزك') }}</h2>
                <p class="text-body-sm text-muted-foreground">{{ $T('Keep this ticket. Scan the code at the kiosk, or give reception the code.', 'احتفظ بهذه التذكرة. امسح الرمز في الكشك أو أعطِ الاستقبال الرمز.') }}</p>
            </div>
        </div>
        <x-nq::card data-slot="booking-ticket" x-bind:data-status="record ? record.status : undefined">
            <x-nq::card.header>
                <x-nq::card.title as="h3"><span x-text="record ? record.service : ''"></span></x-nq::card.title>
                <x-nq::card.description>
                    <x-nq::booking-pipeline.status-badge status="requested" x-show="record ? record.status === 'requested' : false" />
                    <x-nq::booking-pipeline.status-badge status="confirmed" x-show="record ? record.status === 'confirmed' : false" style="display: none" />
                </x-nq::card.description>
            </x-nq::card.header>
            <x-nq::card.content class="grid gap-5 sm:grid-cols-[1fr_auto]">
                <dl class="m-0 grid gap-3">
                    <div class="flex items-start gap-3">
                        <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><x-lucide-calendar-clock /></span>
                        <div class="flex min-w-0 flex-col">
                            <dt class="text-caption text-muted-foreground">{{ $T('When', 'الموعد') }}</dt>
                            <dd class="m-0 text-body-sm text-foreground"><bdi x-text="recordWhen()"></bdi></dd>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><x-lucide-stethoscope /></span>
                        <div class="flex min-w-0 flex-col">
                            <dt class="text-caption text-muted-foreground">{{ $T('With', 'مع') }}</dt>
                            <dd class="m-0 text-body-sm text-foreground" x-text="record ? record.provider : ''"></dd>
                        </div>
                    </div>
                    @if ($branches)
                        <div class="flex items-start gap-3">
                            <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><x-lucide-map-pin /></span>
                            <div class="flex min-w-0 flex-col">
                                <dt class="text-caption text-muted-foreground">{{ $T('Where', 'المكان') }}</dt>
                                <dd class="m-0 text-body-sm text-foreground"><span x-text="record ? record.location : ''"></span><span class="block text-muted-foreground" x-text="record ? record.address : ''"></span></dd>
                            </div>
                        </div>
                    @endif
                    <div class="flex items-start gap-3">
                        <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><x-lucide-user /></span>
                        <div class="flex min-w-0 flex-col">
                            <dt class="text-caption text-muted-foreground">{{ $T('Patient', 'المريض') }}</dt>
                            <dd class="m-0 text-body-sm text-foreground" x-text="record ? record.patient : ''"></dd>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><x-lucide-phone /></span>
                        <div class="flex min-w-0 flex-col">
                            <dt class="text-caption text-muted-foreground">{{ $T('Phone', 'الهاتف') }}</dt>
                            <dd class="m-0 text-body-sm text-foreground"><bdi dir="ltr" x-text="record ? record.phone : ''"></bdi></dd>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><x-lucide-wallet /></span>
                        <div class="flex min-w-0 flex-col">
                            <dt class="text-caption text-muted-foreground">{{ $T('Payment', 'الدفع') }}</dt>
                            <dd class="m-0 text-body-sm text-foreground"><bdi x-text="payLine()"></bdi></dd>
                        </div>
                    </div>
                </dl>
                <div class="flex flex-col items-center gap-2 rounded-card border border-nq-line p-3">
                    <x-nq::qr-code x-model="ticketValue" :size="132" :label="$T('Booking QR code', 'رمز QR للحجز')" />
                    <div class="flex flex-col items-center">
                        <span class="text-caption text-muted-foreground">{{ $T('Booking code', 'رمز الحجز') }}</span>
                        <bdi dir="ltr" class="font-mono text-label tracking-wider" x-text="record ? record.code : ''"></bdi>
                    </div>
                    <p class="max-w-40 text-center text-caption text-muted-foreground">{{ $T('Show this code at reception.', 'أظهر هذا الرمز عند الاستقبال.') }}</p>
                </div>
            </x-nq::card.content>
            <x-nq::card.footer class="flex-wrap">
                <x-nq::button variant="ghost" size="sm" x-on:click="reset()">{{ $T('Book another visit', 'احجز زيارة أخرى') }}</x-nq::button>
            </x-nq::card.footer>
        </x-nq::card>
    </div>

    {{-- The flow --}}
    <div x-show="isOpen()" class="flex w-full flex-col gap-5">
        <div>
            <div class="hidden md:block">
                <ol data-slot="stepper" data-orientation="horizontal" aria-label="{{ $T('Booking steps', 'خطوات الحجز') }}" class="m-0 flex list-none flex-row items-start p-0">
                    <template x-for="(s, i) in stepIds" :key="s">
                        <li data-slot="stepper-item" x-bind:data-status="stepStatus(i)" x-bind:class="i === stepIds.length - 1 ? 'flex-none' : 'flex-1'" class="group/step flex items-start">
                            <span data-slot="stepper-step" x-bind:aria-current="i === index ? 'step' : undefined" class="flex shrink-0 items-start gap-3 rounded-control text-start outline-none">
                                <span data-slot="stepper-marker" x-bind:class="{ 'border-transparent bg-primary text-primary-foreground': i < index, 'border-nq-focus bg-background text-foreground ring-2 ring-nq-focus/30': i === index, 'border-border bg-background text-muted-foreground': i > index }" class="{{ $stepMarker }}">
                                    <x-lucide-check aria-hidden="true" x-show="i < index" style="display: none" />
                                    <span x-show="i >= index" class="tabular-nums" x-text="i + 1"></span>
                                </span>
                                <span data-slot="stepper-text" class="flex min-w-0 flex-col text-start">
                                    <span class="text-label" x-bind:class="i > index ? 'text-muted-foreground' : 'text-foreground'" x-text="stepName(s)"></span>
                                </span>
                            </span>
                            <span aria-hidden="true" data-slot="stepper-connector" x-show="i < stepIds.length - 1" x-bind:class="i < index ? 'bg-primary' : 'bg-border'" class="mx-3 mt-3.5 h-px min-w-6 flex-1 rounded-full transition-colors duration-150 ease-nq"></span>
                        </li>
                    </template>
                </ol>
            </div>
            <div class="flex flex-col gap-2 md:hidden">
                <p class="text-label" x-text="stepOf()">{{ $ar ? 'الخطوة 1 من '.count($stepIds).': '.$names[$first] : 'Step 1 of '.count($stepIds).': '.$names[$first] }}</p>
                <x-nq::progress :value="round(100 / count($stepIds), 4)" value-expr="pct" :aria-label="$T('Booking steps', 'خطوات الحجز')" />
            </div>
        </div>

        <div class="grid gap-5 lg:grid-cols-[1fr_17rem] lg:items-start">
            <x-nq::card>
                <x-nq::card.header>
                    <x-nq::card.title as="h2" class="text-h3">
                        <span x-ref="heading" tabindex="-1" class="outline-none" x-text="heading()">{{ $headings[$first] }}</span>
                    </x-nq::card.title>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-4">
                    @if ($branches)
                        <div x-show="isStep('location')" @if ($hide('location')) style="display: none" @endif>
                            <x-nq::radio-group x-model="locationId" :aria-label="$headings['location']">
                                @foreach ($locations as $l)
                                    <x-nq::radio-group.card :value="$l['id']" :title="$l['name']" :description="implode(', ', array_filter([$l['address'] ?? null, $l['city'] ?? null]))" />
                                @endforeach
                            </x-nq::radio-group>
                        </div>
                    @endif

                    <div x-show="isStep('service')" @if ($hide('service')) style="display: none" @endif>
                        <x-nq::radio-group x-model="serviceId" :aria-label="$headings['service']">
                            @foreach ($services as $s)
                                <x-nq::radio-group.card :value="$s['id']" :title="$s['name']" :description="implode(' · ', array_filter([$s['category'] ?? null, $s['description'] ?? null])) ?: null">
                                    <x-slot:meta>
                                        <span class="flex flex-col items-end text-caption">
                                            <bdi class="text-label">{{ ($s['price'] ?? 0) > 0 ? $money($s['price']) : '' }}</bdi>
                                            <bdi class="text-muted-foreground">{{ $minutes($s['durationMinutes']) }}</bdi>
                                        </span>
                                    </x-slot:meta>
                                </x-nq::radio-group.card>
                            @endforeach
                        </x-nq::radio-group>
                    </div>

                    <div x-show="isStep('provider')" @if ($hide('provider')) style="display: none" @endif>
                        <x-nq::alert tone="warning" x-show="noProviders()" style="display: none">{{ $T('No doctor offers this service here. Go back and change the service or branch.', 'لا يقدّم أي طبيب هذه الخدمة هنا. ارجع وغيّر الخدمة أو الفرع.') }}</x-nq::alert>
                        <x-nq::radio-group x-model="providerId" :aria-label="$headings['provider']">
                            <x-nq::radio-group.card value="any" :title="$T('First available doctor', 'أول طبيب متاح')" :description="$T('We match you with whoever has the earliest time.', 'نحجز لك مع من لديه أقرب موعد.')" x-show="hasChoice()" style="display: none" />
                            @foreach ($providers as $p)
                                <x-nq::radio-group.card :value="$p['id']" :description="$p['specialty'] ?? null" x-show="eligibleAt({{ $loop->index }})" x-bind:disabled="! eligibleAt({{ $loop->index }})" style="display: none">
                                    <span class="flex items-center gap-2">
                                        <x-nq::avatar :name="$p['name']" :src="$p['avatar'] ?? null" size="sm" />
                                        <span>{{ $p['name'] }}</span>
                                    </span>
                                    <x-slot:meta>
                                        @if (isset($p['rating']))
                                            <x-nq::rating :value="$p['rating']" :count="$p['reviews'] ?? null" :count-label="$T('reviews', 'تقييم')" />
                                        @else
                                            <span class="text-caption text-muted-foreground">{{ $T('New', 'جديد') }}</span>
                                        @endif
                                    </x-slot:meta>
                                </x-nq::radio-group.card>
                            @endforeach
                        </x-nq::radio-group>
                    </div>

                    <div x-show="isStep('time')" style="display: none" class="flex flex-col gap-4">
                        <x-nq::alert tone="danger" x-show="isSlotError()" style="display: none">
                            {{ $T('We could not load the times.', 'تعذّر تحميل المواعيد.') }}
                            <x-slot:action>
                                <x-nq::button size="sm" variant="secondary" x-on:click="loadSlots()">{{ $T('Try again', 'حاول مجددًا') }}</x-nq::button>
                            </x-slot:action>
                        </x-nq::alert>
                        <div x-show="isLoading()" style="display: none" role="status" aria-busy="true" aria-label="…" class="grid grid-cols-3 gap-2">
                            @for ($i = 0; $i < 6; $i++)
                                <x-nq::states.skeleton class="h-control" />
                            @endfor
                        </div>
                        <div x-show="isSlotReady()" style="display: none" class="flex flex-col gap-4">
                            <p x-show="noDays()" style="display: none" class="text-body-sm text-muted-foreground">{{ $T('Nothing is free in the coming weeks.', 'لا يوجد موعد متاح في الأسابيع القادمة.') }}</p>
                            <div x-show="hasDays()" style="display: none" class="flex flex-col gap-4 sm:flex-row">
                                <x-nq::calendar x-model="calDay" x-effect="syncDays(cfg)" class="self-start" :min="$todayKey" :locale="$locale" :dir="$ar ? 'rtl' : 'ltr'" />
                                <div data-slot="booking-slots-times" class="flex min-w-0 flex-1 flex-col gap-3">
                                    <h3 aria-live="polite" class="text-label font-semibold"><bdi x-text="day ? dayLabel(day) : ''"></bdi></h3>
                                    <div role="radiogroup" data-slot="radio-group" x-bind:aria-label="$nq.t('Times on ', 'المواعيد يوم ') + (day ? dayLabel(day) : '')" class="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
                                        <template x-for="s in daySlots()" :key="s.start">
                                            <button type="button" role="radio" data-slot="booking-slot" x-bind:data-start="s.start" x-bind:data-state="s.start === startKey ? 'checked' : s.state" x-bind:data-status="s.state"
                                                x-bind:aria-checked="String(s.start === startKey)" x-bind:aria-label="slotLabel(s)" x-bind:disabled="s.state !== 'available'" x-on:click="pickSlot(s)"
                                                x-bind:class="{ 'border-primary bg-nq-selected': s.start === startKey, 'bg-secondary text-muted-foreground': s.state === 'full', 'border-dashed text-muted-foreground': s.state === 'held' }" class="{{ $tile }}">
                                                <bdi x-bind:class="s.state === 'full' ? 'line-through' : ''" x-text="timeLabel(s.start)"></bdi>
                                            </button>
                                        </template>
                                    </div>
                                    <ul aria-label="{{ $T('Legend', 'دليل الألوان') }}" class="m-0 mt-auto flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-caption text-muted-foreground">
                                        <li class="inline-flex items-center gap-1.5"><span aria-hidden="true" class="size-3 rounded-[3px] border border-border bg-card"></span>{{ $T('Available', 'متاح') }}</li>
                                        <li class="inline-flex items-center gap-1.5"><span aria-hidden="true" class="size-3 rounded-[3px] border border-border bg-secondary"></span>{{ $T('Full', 'محجوز') }}</li>
                                        <li class="inline-flex items-center gap-1.5"><span aria-hidden="true" class="size-3 rounded-[3px] border border-dashed border-border bg-card"></span>{{ $T('Held', 'محجوز مؤقتًا') }}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div x-show="isStep('details')" style="display: none" class="flex flex-col gap-4">
                        @if ($signedIn)
                            <p class="text-body-sm text-muted-foreground" x-text="bookingAs()"></p>
                        @else
                            <p class="text-body-sm text-muted-foreground">{{ $T('No account needed. You get a code and a QR ticket.', 'لا حاجة لحساب. ستحصل على رمز وتذكرة QR.') }}</p>
                        @endif
                        <x-nq::field x-model="showErr.name">
                            <x-nq::field.label>{{ $T('Full name', 'الاسم الكامل') }}</x-nq::field.label>
                            <x-nq::field.input x-model="details.name" autocomplete="name" />
                            <x-nq::field.error><span x-text="errText('name')"></span></x-nq::field.error>
                        </x-nq::field>
                        <x-nq::field x-model="showErr.phone">
                            <x-nq::field.label>{{ $T('Mobile number', 'رقم الجوال') }}</x-nq::field.label>
                            <x-nq::field.input x-model="details.phone" ltr type="tel" inputmode="tel" autocomplete="tel" />
                            <p class="text-caption text-muted-foreground">{{ $T('We send the confirmation and reminders here.', 'نرسل التأكيد والتذكيرات على هذا الرقم.') }}</p>
                            <x-nq::field.error><span x-text="errText('phone')"></span></x-nq::field.error>
                        </x-nq::field>
                        <x-nq::field x-model="showErr.email">
                            <x-nq::field.label>{{ $T('Email (optional)', 'البريد الإلكتروني (اختياري)') }}</x-nq::field.label>
                            <x-nq::field.input x-model="details.email" ltr type="email" autocomplete="email" />
                            <x-nq::field.error><span x-text="errText('email')"></span></x-nq::field.error>
                        </x-nq::field>
                        <label class="flex items-center gap-2 text-body-sm">
                            <x-nq::switch x-model="details.forOther" />
                            {{ $T('I am booking for someone else', 'أحجز لشخص آخر') }}
                        </label>
                        <x-nq::field x-model="showErr.otherName" x-show="details.forOther" style="display: none">
                            <x-nq::field.label>{{ $T("Patient's full name", 'الاسم الكامل للمريض') }}</x-nq::field.label>
                            <x-nq::field.input x-model="details.otherName" />
                            <x-nq::field.error><span x-text="errText('otherName')"></span></x-nq::field.error>
                        </x-nq::field>
                    </div>

                    <div x-show="isStep('notes')" style="display: none" class="flex flex-col gap-4">
                        <x-nq::field>
                            <x-nq::field.label>{{ $T('Notes for the clinic (optional)', 'ملاحظات للعيادة (اختياري)') }}</x-nq::field.label>
                            <x-nq::field.textarea x-model="notes" rows="4" maxlength="600" />
                            <p class="text-caption text-muted-foreground">{{ $T('Symptoms, questions, or anything that helps prepare.', 'الأعراض أو الأسئلة أو أي شيء يساعد على التحضير.') }}</p>
                        </x-nq::field>
                        <div class="flex flex-col gap-1.5">
                            <span class="text-label">{{ $T('Attachments (optional)', 'مرفقات (اختياري)') }}</span>
                            <x-nq::file-upload x-model="files" accept="image/*,.pdf" :max-size="5 * 1024 * 1024" :max-files="4" x-on:files="onFiles($event)" />
                            <p class="text-caption text-muted-foreground">{{ $T('Earlier results or referrals. Images or PDF, up to 5 MB each.', 'نتائج سابقة أو تحويلات. صور أو PDF، حتى 5 ميجابايت لكل ملف.') }}</p>
                        </div>
                    </div>

                    <div x-show="isStep('payment')" style="display: none" class="flex flex-col gap-4">
                        <x-nq::radio-group x-model="payment" :aria-label="$headings['payment']" default-value="visit">
                            @if ($allowOnlinePayment)
                                <x-nq::radio-group.card value="online" :description="$T('Secure card payment. Nothing more to pay at the clinic.', 'دفع آمن بالبطاقة. لا شيء آخر عند العيادة.')">
                                    <span class="flex items-center gap-2"><x-lucide-credit-card aria-hidden="true" class="size-4" />{{ $T('Pay online now', 'الدفع إلكترونيًا الآن') }}</span>
                                </x-nq::radio-group.card>
                            @endif
                            <x-nq::radio-group.card value="visit" :description="$T('Cash or card at reception. Your time is held.', 'نقدًا أو بالبطاقة عند الاستقبال. موعدك محجوز.')">
                                <span class="flex items-center gap-2"><x-lucide-landmark aria-hidden="true" class="size-4" />{{ $T('Pay at the visit', 'الدفع عند الزيارة') }}</span>
                            </x-nq::radio-group.card>
                        </x-nq::radio-group>
                        @include('nasaq::components.booking-flow._totals')
                    </div>

                    <div x-show="isStep('review')" style="display: none" class="flex flex-col gap-4">
                        <dl class="m-0 grid gap-3">
                            @foreach ([['location', $T('Branch', 'الفرع'), 'locationText()', false], ['service', $T('Service', 'الخدمة'), 'serviceText()', false], ['provider', $T('Doctor', 'الطبيب'), 'providerText()', false], ['time', $T('When', 'الموعد'), 'dateLine()', true]] as [$id, $label, $expr, $isolate])
                                @continue($id === 'location' && ! $branches)
                                <div class="flex items-start justify-between gap-3 border-b border-nq-line pb-3 last:border-0 last:pb-0">
                                    <div class="min-w-0">
                                        <dt class="text-caption text-muted-foreground">{{ $label }}</dt>
                                        <dd class="m-0 text-body-sm">@if ($isolate)<bdi x-text="{{ $expr }}"></bdi>@else<span x-text="{{ $expr }}"></span>@endif</dd>
                                    </div>
                                    <x-nq::button variant="link" size="sm" x-on:click="go(idx('{{ $id }}'))"><x-lucide-pencil aria-hidden="true" />{{ $T('Edit', 'تعديل') }}</x-nq::button>
                                </div>
                            @endforeach
                            <div class="flex items-start justify-between gap-3 border-b border-nq-line pb-3 last:border-0 last:pb-0">
                                <div class="min-w-0">
                                    <dt class="text-caption text-muted-foreground">{{ $T('Patient', 'المريض') }}</dt>
                                    <dd class="m-0 text-body-sm"><span x-text="patientName()"></span><span class="block text-muted-foreground"><bdi dir="ltr" x-text="details.phone"></bdi></span></dd>
                                </div>
                                <x-nq::button variant="link" size="sm" x-on:click="go(idx('details'))"><x-lucide-pencil aria-hidden="true" />{{ $T('Edit', 'تعديل') }}</x-nq::button>
                            </div>
                            <div x-show="hasNotesOrFiles()" style="display: none" class="flex items-start justify-between gap-3 border-b border-nq-line pb-3 last:border-0 last:pb-0">
                                <div class="min-w-0">
                                    <dt class="text-caption text-muted-foreground">{{ $T('Notes', 'ملاحظات') }}</dt>
                                    <dd class="m-0 text-body-sm"><span x-show="hasNotes()" style="display: none" class="block whitespace-pre-line" x-text="notes"></span><span x-show="hasFiles()" style="display: none" class="block text-muted-foreground" x-text="attachedText()"></span></dd>
                                </div>
                                <x-nq::button variant="link" size="sm" x-on:click="go(idx('notes'))"><x-lucide-pencil aria-hidden="true" />{{ $T('Edit', 'تعديل') }}</x-nq::button>
                            </div>
                            <div class="flex items-start justify-between gap-3 border-b border-nq-line pb-3 last:border-0 last:pb-0">
                                <div class="min-w-0">
                                    <dt class="text-caption text-muted-foreground">{{ $T('Payment', 'الدفع') }}</dt>
                                    <dd class="m-0 text-body-sm" x-text="paymentText()"></dd>
                                </div>
                                <x-nq::button variant="link" size="sm" x-on:click="go(idx('payment'))"><x-lucide-pencil aria-hidden="true" />{{ $T('Edit', 'تعديل') }}</x-nq::button>
                            </div>
                        </dl>
                        @include('nasaq::components.booking-flow._totals')
                        <p class="text-caption text-muted-foreground">{{ $T('Free cancellation up to 24 hours before.', 'إلغاء مجاني حتى 24 ساعة قبل الموعد.') }}</p>
                        <x-nq::alert tone="danger" x-show="hasError()" style="display: none"><span x-text="submitError"></span></x-nq::alert>
                    </div>
                </x-nq::card.content>
                <x-nq::card.footer class="justify-between">
                    <x-nq::button variant="ghost" x-bind:disabled="isFirst() || submitting" x-bind:data-disabled="isFirst() || submitting ? '' : undefined" x-on:click="back()">
                        <x-dynamic-component :component="'lucide-'.$backward" aria-hidden="true" />
                        {{ $T('Back', 'رجوع') }}
                    </x-nq::button>
                    <x-nq::button x-show="isStep('review')" style="display: none" x-bind:disabled="submitting" x-bind:data-disabled="submitting ? '' : undefined" x-on:click="submit()">
                        <x-lucide-loader-circle aria-hidden="true" class="animate-spin" x-show="submitting" style="display: none" />
                        <x-lucide-check aria-hidden="true" x-show="! submitting" />
                        <span x-text="submitting ? $nq.t('Confirming', 'جارٍ التأكيد') : $nq.t('Confirm booking', 'تأكيد الحجز')">{{ $T('Confirm booking', 'تأكيد الحجز') }}</span>
                    </x-nq::button>
                    <x-nq::button x-show="! isStep('review')" x-bind:disabled="cannotNext()" x-bind:data-disabled="cannotNext() ? '' : undefined" x-on:click="next()">
                        {{ $T('Continue', 'متابعة') }}
                        <x-dynamic-component :component="'lucide-'.$forward" aria-hidden="true" />
                    </x-nq::button>
                </x-nq::card.footer>
            </x-nq::card>

            <aside aria-label="{{ $T('Your booking', 'حجزك') }}" class="order-last rounded-card border border-border bg-card p-4 lg:sticky lg:top-4">
                <h3 class="mb-3 text-label font-semibold">{{ $T('Your booking', 'حجزك') }}</h3>
                <dl x-show="hasService()" style="display: none" class="m-0 grid gap-3 text-body-sm">
                    @foreach ([['map-pin', $T('Branch', 'الفرع'), 'locationText()', false], ['stethoscope', $T('Service', 'الخدمة'), 'serviceText()', false], ['user-round', $T('Doctor', 'الطبيب'), 'providerText()', false], ['calendar-clock', $T('When', 'الموعد'), 'dateLine()', true]] as [$icon, $label, $expr, $isolate])
                        @continue($icon === 'map-pin' && ! $branches)
                        <div class="flex items-start gap-2.5">
                            <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><x-dynamic-component :component="'lucide-'.$icon" /></span>
                            <div class="min-w-0">
                                <dt class="text-caption text-muted-foreground">{{ $label }}</dt>
                                <dd class="m-0">@if ($isolate)<bdi x-text="dashText({{ $expr }})"></bdi>@else<span x-text="dashText({{ $expr }})"></span>@endif</dd>
                            </div>
                        </div>
                    @endforeach
                    <div class="mt-1 flex items-baseline justify-between border-t border-nq-line pt-3">
                        <dt class="text-label">{{ $T('Total', 'الإجمالي') }}</dt>
                        <dd class="m-0 text-label"><bdi x-text="totalText()"></bdi></dd>
                    </div>
                </dl>
                <p x-show="hasNoService()" class="text-body-sm text-muted-foreground">{{ $T('Nothing chosen yet.', 'لم تختر شيئًا بعد.') }}</p>
            </aside>
        </div>
    </div>
</div>
