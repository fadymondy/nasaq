{{-- <x-nq::current-visit :patient="['name' => 'Huda Salem', 'age' => 34, 'gender' => 'Female', 'allergies' => ['Penicillin']]" service="Dental check-up" :started-at="now()->subMinutes(12)" />
     The visit in progress: the patient card with allergies up front, earlier visits, a running timer, notes, a prescription list and a follow-up choice.
     Finishing is blocked until there is a note or a valid prescription, and a half-filled medicine is never dropped silently.
     patient: ['name', 'age'?, 'gender'?, 'phone'?, 'avatar'?, 'allergies'?, 'conditions'?]. service: what the visit is for. started-at: when it started (date or ISO string). room.
     history: earlier visits, [['id', 'title', 'summary'?, 'date'], ...] (shown newest first). notes: the starting notes. prescriptions: [['id', 'drug', 'dose', 'frequency', 'days'], ...].
     follow-up-options: quick choices in days (default 7, 14 and 30). working-weekdays: 0 = Sunday, so a follow-up never lands on a day off.
     now: pins "now" and stops the timer (for tests and docs). labels: override any string (a :n sentence takes the value).
     Bubbling event: "finish" { notes, prescriptions, followUp ("YYYY-MM-DD" or null), fail(message) }. The panel locks and shows "saved" at once; call fail to unlock it and show the message.
     The medicine rows are drawn by Alpine. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['patient', 'service', 'startedAt', 'room' => null, 'history' => [], 'notes' => '', 'prescriptions' => [], 'followUpOptions' => [7, 14, 30], 'workingWeekdays' => null, 'now' => null, 'labels' => [], 'locale' => null])
@include('nasaq::components.current-visit._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_cv_words($locale, (array) $labels);
    $p = (array) $patient;
    $nowDate = $now ? \Carbon\CarbonImmutable::parse($now) : \Carbon\CarbonImmutable::now();
    $started = \Carbon\CarbonImmutable::parse($startedAt);
    $sorted = collect($history)->map(fn ($h) => (array) $h)->sortByDesc(fn ($h) => \Carbon\CarbonImmutable::parse($h['date'])->getTimestamp())->values();
    $allergies = (array) ($p['allergies'] ?? []);
    $conditions = (array) ($p['conditions'] ?? []);
    $rows = collect($prescriptions)->map(fn ($r) => (array) $r)->map(fn ($r) => ['id' => (string) $r['id'], 'drug' => (string) ($r['drug'] ?? ''), 'dose' => (string) ($r['dose'] ?? ''), 'frequency' => (string) ($r['frequency'] ?? ''), 'days' => (string) ($r['days'] ?? '')])->values()->all();
    $config = array_filter([
        'notes' => $notes ?: null,
        'rx' => $rows ?: null,
        'startedAt' => $started->getTimestamp() * 1000,
        'serverNow' => $nowDate->getTimestamp() * 1000,
        'frozen' => $now ? true : null,
        'today' => $nowDate->format('Y-m-d'),
        'followUpOptions' => array_values($followUpOptions),
        'workingWeekdays' => $workingWeekdays ? array_values($workingWeekdays) : null,
        'locale' => $locale,
        't' => array_intersect_key($t, array_flip(['required', 'invalid', 'failed', 'followUpOn', 'removeRx'])),
    ], fn ($v) => $v !== null);
    $ageLine = isset($p['age']) ? nq_cv_years((int) $p['age'], $locale) : null;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'current-visit') }}" x-data="nqCurrentVisit({!! \Illuminate\Support\Js::from($config)->toHtml() !!})" {{ $attributes->except('data-slot')->cn('grid gap-4 lg:grid-cols-[18rem_1fr] lg:items-start') }}>
    <div class="flex flex-col gap-4">
        <x-nq::card data-slot="current-visit-patient">
            <x-nq::card.header class="flex-row items-center gap-3">
                <x-nq::avatar :name="$p['name']" :src="$p['avatar'] ?? null" size="lg" />
                <div class="min-w-0">
                    <x-nq::card.title as="h2" class="truncate">{{ $p['name'] }}</x-nq::card.title>
                    <x-nq::card.description>{{ $ageLine }}@if ($ageLine && ! empty($p['gender'])) · @endif{{ $p['gender'] ?? '' }}</x-nq::card.description>
                </div>
            </x-nq::card.header>
            <x-nq::card.content class="flex flex-col gap-3">
                @if (! empty($p['phone']))
                    <bdi dir="ltr" class="text-body-sm tabular-nums text-muted-foreground">{{ $p['phone'] }}</bdi>
                @endif
                <div>
                    <p class="text-caption text-muted-foreground">{{ $t['allergies'] }}</p>
                    @if (count($allergies) > 0)
                        <ul class="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
                            @foreach ($allergies as $a)
                                <li><x-nq::badge variant="danger"><x-lucide-triangle-alert aria-hidden="true" class="size-3" />{{ $a }}</x-nq::badge></li>
                            @endforeach
                        </ul>
                    @else
                        <p class="text-body-sm">{{ $t['none'] }}</p>
                    @endif
                </div>
                <div>
                    <p class="text-caption text-muted-foreground">{{ $t['conditions'] }}</p>
                    @if (count($conditions) > 0)
                        <ul class="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
                            @foreach ($conditions as $c)
                                <li><x-nq::badge variant="outline">{{ $c }}</x-nq::badge></li>
                            @endforeach
                        </ul>
                    @else
                        <p class="text-body-sm">{{ $t['none'] }}</p>
                    @endif
                </div>
            </x-nq::card.content>
        </x-nq::card>

        <x-nq::card data-slot="current-visit-history">
            <x-nq::card.header>
                <x-nq::card.title as="h3">{{ $t['history'] }}</x-nq::card.title>
            </x-nq::card.header>
            <x-nq::card.content>
                @if ($sorted->isEmpty())
                    <p class="text-body-sm text-muted-foreground">{{ $t['noHistory'] }}</p>
                @else
                    <x-nq::timeline>
                        @foreach ($sorted as $h)
                            <x-nq::timeline.item :title="$h['title']" :description="$h['summary'] ?? null" :time="$h['date']" />
                        @endforeach
                    </x-nq::timeline>
                @endif
            </x-nq::card.content>
        </x-nq::card>
    </div>

    <x-nq::card data-slot="current-visit-panel">
        <x-nq::card.header class="flex-row items-start justify-between gap-3">
            <div class="min-w-0">
                <x-nq::card.title as="h2">{{ $t['visit'] }}</x-nq::card.title>
                <x-nq::card.description>{{ $service }}@if ($room) · {{ nq_cv_fill($t['room'], $room) }}@endif</x-nq::card.description>
            </div>
            <div class="text-end">
                <p class="text-caption text-muted-foreground">{{ $t['timer'] }}</p>
                <p class="inline-flex items-center gap-1.5 text-h3 tabular-nums" role="timer" aria-label="{{ $t['timer'] }}">
                    <x-lucide-timer aria-hidden="true" class="size-4 text-muted-foreground" />
                    <bdi dir="ltr" x-text="elapsed">{{ nq_cv_elapsed($nowDate->getTimestamp() - $started->getTimestamp()) }}</bdi>
                </p>
            </div>
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col gap-5">
            <x-nq::field>
                <x-nq::field.label>{{ $t['notes'] }}</x-nq::field.label>
                <x-nq::field.textarea rows="5" placeholder="{{ $t['notesHint'] }}" x-model="notes" x-bind:disabled="locked" />
            </x-nq::field>

            <section aria-labelledby="nq-visit-rx" class="flex flex-col gap-3">
                <div class="flex items-center justify-between gap-2">
                    <h3 id="nq-visit-rx" class="text-label">{{ $t['prescriptions'] }}</h3>
                    <x-nq::button size="sm" variant="secondary" x-bind:disabled="locked" x-on:click="addRx()"><x-lucide-plus aria-hidden="true" />{{ $t['addRx'] }}</x-nq::button>
                </div>
                <template x-for="(r, i) in rx" :key="r.id">
                    <div data-slot="current-visit-rx" class="grid grid-cols-2 gap-2 rounded-card border border-border p-3 sm:grid-cols-[2fr_1fr_1.5fr_5rem_auto] sm:items-start">
                        <x-nq::field class="col-span-2 sm:col-span-1" x-effect="invalid = !!errs(r).drug">
                            <x-nq::field.label>{{ $t['drug'] }}</x-nq::field.label>
                            <x-nq::field.input x-model="r.drug" x-bind:disabled="locked" />
                            <x-nq::field.error><span x-text="errText(errs(r).drug)"></span></x-nq::field.error>
                        </x-nq::field>
                        <x-nq::field x-effect="invalid = !!errs(r).dose">
                            <x-nq::field.label>{{ $t['dose'] }}</x-nq::field.label>
                            <x-nq::field.input ltr x-model="r.dose" x-bind:disabled="locked" />
                            <x-nq::field.error><span x-text="errText(errs(r).dose)"></span></x-nq::field.error>
                        </x-nq::field>
                        <x-nq::field x-effect="invalid = !!errs(r).frequency">
                            <x-nq::field.label>{{ $t['frequency'] }}</x-nq::field.label>
                            <x-nq::field.input placeholder="{{ $t['frequencyHint'] }}" x-model="r.frequency" x-bind:disabled="locked" />
                            <x-nq::field.error><span x-text="errText(errs(r).frequency)"></span></x-nq::field.error>
                        </x-nq::field>
                        <x-nq::field x-effect="invalid = !!errs(r).days">
                            <x-nq::field.label>{{ $t['days'] }}</x-nq::field.label>
                            <x-nq::field.input ltr inputmode="numeric" x-model="r.days" x-bind:disabled="locked" />
                            <x-nq::field.error><span x-text="errText(errs(r).days)"></span></x-nq::field.error>
                        </x-nq::field>
                        <x-nq::button size="icon" variant="ghost" class="self-end" x-bind:aria-label="cfg.t.removeRx.replace(':n', i + 1)" x-bind:disabled="locked" x-on:click="removeRx(r.id)"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                    </div>
                </template>
            </section>

            <section aria-label="{{ $t['followUp'] }}" class="flex flex-col gap-2">
                <h3 class="text-label">{{ $t['followUp'] }}</h3>
                <div class="flex flex-wrap items-center gap-2">
                    <x-nq::button size="sm" variant="secondary" class="aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground" x-bind:aria-pressed="followUp === null" x-bind:disabled="locked" x-on:click="followUp = null">{{ $t['noFollowUp'] }}</x-nq::button>
                    @foreach ($followUpOptions as $n)
                        <x-nq::button size="sm" variant="secondary" class="aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground" x-bind:aria-pressed="chosen({{ (int) $n }})" x-bind:disabled="locked" x-on:click="pickDays({{ (int) $n }})">{{ nq_cv_in_days((int) $n, $locale) }}</x-nq::button>
                    @endforeach
                    <x-nq::date-picker x-model="followUp" :min="$nowDate->format('Y-m-d')" :today="$nowDate->format('Y-m-d')" :locale="$locale" placeholder="{{ $t['orPick'] }}" aria-label="{{ $t['orPick'] }}" x-bind:disabled="locked" class="w-auto min-w-40" />
                </div>
                <p class="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground" x-show="followUp" x-cloak style="display: none">
                    <x-lucide-calendar-plus aria-hidden="true" class="size-4" />
                    <span x-text="followUpText"></span>
                </p>
            </section>

            <x-nq::alert tone="warning" x-show="fixRx" style="display: none">{{ $t['fixRx'] }}</x-nq::alert>
            <x-nq::alert tone="warning" x-show="needSomething" style="display: none">{{ $t['needSomething'] }}</x-nq::alert>
            <x-nq::alert tone="danger" x-show="error" style="display: none"><span x-text="error"></span></x-nq::alert>
            <x-nq::alert tone="success" x-show="done" style="display: none">{{ $t['saved'] }}</x-nq::alert>

            <div class="flex justify-end">
                <x-nq::button size="lg" x-bind:disabled="locked" x-on:click="finish()"><x-lucide-check-check aria-hidden="true" />{{ $t['finish'] }}</x-nq::button>
            </div>
        </x-nq::card.content>
    </x-nq::card>
</div>
