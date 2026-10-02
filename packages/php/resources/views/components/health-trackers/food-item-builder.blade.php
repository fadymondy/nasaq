{{-- <x-nq::health-trackers.food-item-builder :families="[['id' => 'caffeine', 'name' => 'Caffeine', 'nameAr' => 'الكافيين']]" :initial="['kind' => 'drink', 'name' => 'Tea']" editing cancel @save="$event.detail.wait(…)" />
     Builds a catalogue item. The ring shows how complete the entry is (name, Arabic name, verdict, families, note) and lists what is still missing. It measures the entry, never the food: there is no calorie or portion field.
     families: [id, name, nameAr?]. initial: start values for editing ['kind', 'name', 'nameAr', 'verdict', 'triggerFamilies', 'note']. editing swaps the heading to "Edit item". title overrides it. cancel shows a Cancel button. labels: override the words.
     Events on the root:
       save    detail.draft { kind, name, nameAr, verdict, triggerFamilies, note }  resolve, or resolve { error } to keep the form open and show it. A rejection shows a generic error.
       cancel  (none)
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['families' => [], 'initial' => [], 'editing' => false, 'title' => null, 'cancel' => false, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $ar = $t::rtl();
    $w = array_merge([
        'builderNew' => $t::t('New item', 'عنصر جديد'),
        'builderEdit' => $t::t('Edit item', 'تعديل العنصر'),
        'kind' => $t::t('Type', 'النوع'),
        'kindFood' => $t::t('Food', 'طعام'),
        'kindDrink' => $t::t('Drink', 'مشروب'),
        'name' => $t::t('Name', 'الاسم'),
        'builderNameAr' => $t::t('Arabic name', 'الاسم بالعربية'),
        'builderNameArHint' => $t::t('Shown when the app is in Arabic.', 'يظهر عندما يكون التطبيق بالعربية.'),
        'builderNameRequired' => $t::t('Give the item a name.', 'أعطِ العنصر اسمًا.'),
        'builderVerdict' => $t::t('Verdict', 'الحكم'),
        'verdictSafe' => $t::t('Safe', 'آمن'),
        'verdictTrigger' => $t::t('Trigger', 'محفّز'),
        'verdictUnreviewed' => $t::t('Unreviewed', 'لم يُراجَع'),
        'unreviewedHint' => $t::t('Nobody has judged this yet. It is not the same as safe.', 'لم يحكم عليه أحد بعد. وهذا لا يعني أنه آمن.'),
        'builderFamilies' => $t::t('Trigger families', 'عائلات المحفّزات'),
        'builderFamiliesHint' => $t::t('Pick every family this item belongs to.', 'اختر كل عائلة ينتمي إليها هذا العنصر.'),
        'builderFamiliesRequired' => $t::t('A trigger needs at least one family.', 'يحتاج المحفّز إلى عائلة واحدة على الأقل.'),
        'builderNote' => $t::t('Note', 'ملاحظة'),
        'builderNoteHint' => $t::t('Kept as written, for your own doctor. Nothing adds it up.', 'تبقى كما كُتبت، لطبيبك. لا شيء يجمعها.'),
        'builderSave' => $t::t('Save item', 'حفظ العنصر'),
        'builderSaving' => $t::t('Saving', 'جارٍ الحفظ'),
        'cancel' => $t::t('Cancel', 'إلغاء'),
        'builderCompleteness' => $t::t('{done} of {total} steps', '{done} من {total} خطوات'),
        'builderCompletenessLabel' => $t::t('Entry completeness', 'اكتمال الإدخال'),
        'builderMissingIntro' => $t::t('Still to add', 'ما زال ناقصًا'),
        'stepName' => $t::t('a name', 'اسم'),
        'stepNameAr' => $t::t('an Arabic name', 'اسم بالعربية'),
        'stepVerdict' => $t::t('a verdict', 'حكم'),
        'stepFamilies' => $t::t('a trigger family', 'عائلة محفّز'),
        'stepNote' => $t::t('a note', 'ملاحظة'),
        'actionFailed' => $t::t('That did not work. Try again.', 'لم تنجح العملية. حاول مرة أخرى.'),
    ], (array) $labels);
    $famList = array_values(array_map(fn ($f) => (array) $f, (array) $families));
    $initial = (array) $initial;
    $config = [
        'draft' => $initial ?: new stdClass,
        'families' => array_map(fn ($f) => ['id' => (string) $f['id']], $famList),
        'locale' => $ar ? 'ar' : 'en', 'ar' => $ar,
        'labels' => [
            'missingIntro' => $w['builderMissingIntro'], 'complete' => $w['builderCompletenessLabel'], 'completeness' => $w['builderCompletenessLabel'], 'steps' => $w['builderCompleteness'],
            'stepName' => $w['stepName'], 'stepNameAr' => $w['stepNameAr'], 'stepVerdict' => $w['stepVerdict'], 'stepFamilies' => $w['stepFamilies'], 'stepNote' => $w['stepNote'],
            'actionFailed' => $w['actionFailed'], 'saving' => $w['builderSaving'], 'save' => $w['builderSave'], 'famRequired' => $w['builderFamiliesRequired'], 'famHint' => $w['builderFamiliesHint'],
        ],
    ];
    $size = 72;
    $thickness = 7;
    $radius = ($size - $thickness) / 2;
    $circumference = 2 * M_PI * $radius;
    $kinds = ['food' => $w['kindFood'], 'drink' => $w['kindDrink']];
    $verdicts = ['unreviewed' => [$w['verdictUnreviewed'], 'circle-help'], 'safe' => [$w['verdictSafe'], 'shield-check'], 'trigger' => [$w['verdictTrigger'], 'triangle-alert']];
    $famId = 'fib-fam-'.\Illuminate\Support\Str::random(6);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'food-item-builder') }}" x-data="nqFoodItemBuilder(@js($config))" {{ $attributes->except('data-slot') }}>
<x-nq::card>
    <form novalidate class="flex flex-col gap-5" x-on:submit.prevent="submit()">
        <x-nq::card.header class="flex-row items-center justify-between gap-4">
            <div class="flex min-w-0 flex-col gap-1">
                <x-nq::card.title>{{ $title ?? ($editing ? $w['builderEdit'] : $w['builderNew']) }}</x-nq::card.title>
                <x-nq::card.description><span x-text="missingText">{{ $w['builderMissingIntro'] }}</span></x-nq::card.description>
            </div>
            <div data-slot="timer-ring" role="img" aria-label="{{ $w['builderCompletenessLabel'] }}" x-bind:aria-label="ringLabel" class="relative inline-flex shrink-0 items-center justify-center" style="width: {{ $size }}px; height: {{ $size }}px">
                <svg aria-hidden="true" viewBox="0 0 {{ $size }} {{ $size }}" class="absolute inset-0 size-full -rotate-90">
                    <circle cx="{{ $size / 2 }}" cy="{{ $size / 2 }}" r="{{ $radius }}" fill="none" stroke-width="{{ $thickness }}" class="stroke-nq-line" />
                    <circle data-slot="timer-ring-arc" cx="{{ $size / 2 }}" cy="{{ $size / 2 }}" r="{{ $radius }}" fill="none" stroke-width="{{ $thickness }}" stroke-linecap="round"
                        stroke-dasharray="{{ $circumference }}" stroke-dashoffset="{{ $circumference }}" x-bind:stroke-dashoffset="ringOffset" x-bind:class="tone"
                        class="stroke-muted-foreground transition-[stroke-dashoffset,stroke] duration-500 ease-linear motion-reduce:transition-none" />
                </svg>
                <span class="relative text-label tabular-nums text-foreground" x-text="percent">0%</span>
            </div>
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col gap-4">
            <fieldset class="flex gap-2" aria-label="{{ $w['kind'] }}">
                @foreach ($kinds as $key => $text)
                    <template x-if="kind === `{{ $key }}`"><x-nq::button type="button" size="sm" variant="primary" aria-pressed="true" x-on:click="setKind({{ $loop->index }})">{{ $text }}</x-nq::button></template>
                    <template x-if="kind !== `{{ $key }}`"><x-nq::button type="button" size="sm" variant="secondary" aria-pressed="false" x-on:click="setKind({{ $loop->index }})">{{ $text }}</x-nq::button></template>
                @endforeach
            </fieldset>
            <div class="grid gap-4 sm:grid-cols-2">
                <x-nq::field x-model="nameInvalid">
                    <x-nq::field.label>{{ $w['name'] }}</x-nq::field.label>
                    <x-nq::field.input x-model="name" dir="auto" />
                    <x-nq::field.error>{{ $w['builderNameRequired'] }}</x-nq::field.error>
                </x-nq::field>
                <x-nq::field>
                    <x-nq::field.label>{{ $w['builderNameAr'] }}</x-nq::field.label>
                    <x-nq::field.input x-model="nameAr" dir="rtl" lang="ar" />
                    <x-nq::field.description>{{ $w['builderNameArHint'] }}</x-nq::field.description>
                </x-nq::field>
            </div>
            <div role="radiogroup" aria-label="{{ $w['builderVerdict'] }}" class="flex flex-col gap-2">
                <span class="text-label text-foreground">{{ $w['builderVerdict'] }}</span>
                <div class="flex flex-wrap gap-2">
                    @foreach ($verdicts as $key => [$text, $icon])
                        <template x-if="verdict === `{{ $key }}`"><x-nq::button type="button" role="radio" aria-checked="true" variant="primary" size="sm" x-on:click="setVerdict({{ $loop->index }})"><x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />{{ $text }}</x-nq::button></template>
                        <template x-if="verdict !== `{{ $key }}`"><x-nq::button type="button" role="radio" aria-checked="false" variant="secondary" size="sm" x-on:click="setVerdict({{ $loop->index }})"><x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />{{ $text }}</x-nq::button></template>
                    @endforeach
                </div>
                <p class="text-caption text-muted-foreground" x-show="verdict === `unreviewed`">{{ $w['unreviewedHint'] }}</p>
            </div>
            <fieldset class="flex flex-col gap-2" aria-describedby="{{ $famId }}" x-show="verdict === `trigger`" style="display: none">
                <legend class="text-label text-foreground">{{ $w['builderFamilies'] }}</legend>
                <p id="{{ $famId }}" class="text-caption text-muted-foreground" x-bind:class="familiesMissing ? `text-nq-danger-text` : `text-muted-foreground`" x-bind:role="familiesMissing ? `alert` : null"
                    x-text="famText">{{ $w['builderFamiliesHint'] }}</p>
                <div class="flex flex-wrap gap-x-4 gap-y-2">
                    @foreach ($famList as $i => $f)
                        <label class="inline-flex items-center gap-2 text-body-sm text-foreground">
                            <x-nq::checkbox x-model="famOn[{{ $i }}]" />
                            <bdi>{{ $ar && ! empty($f['nameAr']) ? $f['nameAr'] : $f['name'] }}</bdi>
                        </label>
                    @endforeach
                </div>
            </fieldset>
            <x-nq::field>
                <x-nq::field.label>{{ $w['builderNote'] }}</x-nq::field.label>
                <x-nq::field.textarea x-model="note" rows="3" dir="auto" />
                <x-nq::field.description>{{ $w['builderNoteHint'] }}</x-nq::field.description>
            </x-nq::field>
            <p role="alert" x-show="error" style="display: none" x-text="error" class="text-caption text-nq-danger-text"></p>
            <div class="flex flex-wrap justify-end gap-2">
                @if ($cancel)
                    <x-nq::button type="button" variant="ghost" x-bind:disabled="saving" x-on:click="cancel()">{{ $w['cancel'] }}</x-nq::button>
                @endif
                <x-nq::button type="submit" variant="primary" x-bind:aria-busy="saving ? `true` : null" x-bind:disabled="saving">
                    <span x-text="saveText">{{ $w['builderSave'] }}</span>
                </x-nq::button>
            </div>
        </x-nq::card.content>
    </form>
</x-nq::card>
</div>
