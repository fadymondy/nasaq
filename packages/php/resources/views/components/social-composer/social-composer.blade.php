{{-- <x-nq::social-composer :accounts="[['id' => 'x1', 'platform' => 'x', 'name' => '@nasaq'], ['id' => 'li1', 'platform' => 'linkedin', 'name' => 'Nasaq Studio']]"
         @nq-social-submit="$event.detail.promise = api.publish($event.detail.post)" />
     One post for several social networks. Pick the accounts, write the text, and every chosen platform shows its own counter against its own limit (X weighs a link as 23),
     a preview of what it will send, what is still missing (Instagram needs an image, TikTok a video) and an optional version of its own. Nothing is cut for the author.
     Presentational: you own publishing. Needs the Alpine runtime (@nasaqScripts).
     accounts: [['id', 'platform' => x | bluesky | threads | linkedin | facebook | instagram | tiktok, 'name']]. default-value: ['body', 'variants' => ['x' => '…'], 'accountIds', 'media', 'scheduledAt' => '2026-09-30T09:00'].
     attach: show the Add image / Add video buttons (they fire nq-social-attach). assist-actions: [['id', 'label', 'icon']] adds the Improve menu; the first action runs from the main button.
     save-draft: show the Save draft button. locale, labels: override any string of the English table below.
     Events (bubbling). Set event.detail.promise to a Promise for async work:
       nq-social-attach { kind: image | video }  promise resolves to ['id', 'kind', 'name'] (or nothing)
       nq-social-assist { actionId, post }       write the result back with the root's setBody(text)
       nq-social-submit { post, checks }         only fires when every target passes; with a promise the button shows busy until it settles
       nq-social-save-draft { post }, nq-social-change { post }
     The same file also holds the metrics table: see <x-nq::social-composer.metrics-table>. --}}
@props(['accounts' => [], 'defaultValue' => [], 'attach' => false, 'assistActions' => [], 'assisting' => false, 'saveDraft' => false, 'disabled' => false, 'labels' => [], 'locale' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $locale ??= $ar ? 'ar' : str_replace('_', '-', app()->getLocale());
    $ar = str_starts_with($locale, 'ar');
    $en = [
        'accounts' => 'Post to', 'noAccounts' => 'Connect an account to start posting.', 'text' => 'Post text',
        'textHint' => 'One text for every target. Each platform counts it its own way, and nothing is cut for you.', 'placeholder' => 'What do you want to share?',
        'addImage' => 'Add image', 'addVideo' => 'Add video', 'removeMedia' => 'Remove {name}', 'media' => 'Media', 'assist' => 'Improve', 'schedule' => 'Schedule',
        'scheduleHint' => 'Leave empty to publish right away.', 'date' => 'Date', 'time' => 'Time', 'clearSchedule' => 'Clear schedule', 'publish' => 'Publish now',
        'scheduleAction' => 'Schedule post', 'saveDraft' => 'Save draft', 'targets' => 'Targets', 'pickTargets' => 'Pick at least one account to see how the post fits.',
        'customVersion' => 'Write a version for this platform', 'useShared' => 'Use the shared text', 'custom' => 'Custom', 'chars' => '{used} of {limit}',
        'over' => '{n} over the limit', 'left' => '{n} left', 'counter' => '{name} character count', 'problemEmpty' => 'Write some text.',
        'problemOver' => 'Too long for this platform.', 'problemMediaImage' => 'Needs an image.', 'problemMediaVideo' => 'Needs a video.',
        'problemHashtags' => 'No more than {max} hashtags.', 'preview' => 'Preview', 'ready' => 'Ready to go',
    ];
    $arabic = [
        'accounts' => 'انشر على', 'noAccounts' => 'اربط حسابًا لتبدأ النشر.', 'text' => 'نص المنشور',
        'textHint' => 'نص واحد لكل الوجهات. كل منصة تعدّه بطريقتها، ولا يُقصّ منه شيء تلقائيًا.', 'placeholder' => 'ماذا تريد أن تشارك؟',
        'addImage' => 'إضافة صورة', 'addVideo' => 'إضافة فيديو', 'removeMedia' => 'إزالة {name}', 'media' => 'الوسائط', 'assist' => 'تحسين', 'schedule' => 'الجدولة',
        'scheduleHint' => 'اتركها فارغة للنشر فورًا.', 'date' => 'التاريخ', 'time' => 'الوقت', 'clearSchedule' => 'مسح الجدولة', 'publish' => 'انشر الآن',
        'scheduleAction' => 'جدولة المنشور', 'saveDraft' => 'حفظ مسودة', 'targets' => 'الوجهات', 'pickTargets' => 'اختر حسابًا واحدًا على الأقل لترى كيف يتناسب المنشور.',
        'customVersion' => 'اكتب نسخة لهذه المنصة', 'useShared' => 'استخدم النص المشترك', 'custom' => 'مخصص', 'chars' => '{used} من {limit}',
        'over' => 'يزيد بمقدار {n}', 'left' => 'متبقٍ {n}', 'counter' => 'عدد أحرف {name}', 'problemEmpty' => 'اكتب نصًا.',
        'problemOver' => 'أطول من المسموح في هذه المنصة.', 'problemMediaImage' => 'تحتاج صورة.', 'problemMediaVideo' => 'تحتاج فيديو.',
        'problemHashtags' => 'لا تزيد على {max} وسمًا.', 'preview' => 'معاينة', 'ready' => 'جاهز للنشر',
    ];
    $t = array_merge($ar ? $arabic : $en, (array) $labels);
    $accounts = array_values(array_map(fn ($a) => (array) $a, (array) $accounts));
    $actions = array_values((array) $assistActions);
    $options = [
        'accounts' => $accounts, 'defaultValue' => $defaultValue ?: null, 'assistFirst' => $actions[0]['id'] ?? null, 'locale' => $locale, 'labels' => $t,
    ];
    $options = array_filter($options, fn ($v) => $v !== null);
    $lg = \Illuminate\Support\Js::class;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'social-composer') }}" x-data="nqSocialComposer({!! \Illuminate\Support\Js::from($options) !!})"
    {{ $attributes->except('data-slot')->cn('grid w-full gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]') }}>
    <div class="flex min-w-0 flex-col gap-4">
        <fieldset class="flex min-w-0 flex-col gap-2" @if ($disabled) disabled @endif>
            <legend class="mb-1 text-label font-medium">{{ $t['accounts'] }}</legend>
            @if (count($accounts) === 0)
                <p class="text-body-sm text-muted-foreground">{{ $t['noAccounts'] }}</p>
            @else
                <div class="flex flex-wrap gap-2">
                    <template x-for="a in accountList" :key="a.id">
                        <x-nq::button type="button" size="sm" variant="secondary" x-on:click="toggleAccount(a.id)" x-bind:aria-pressed="String(selected(a.id))"
                            x-bind:data-selected="selectedAttr(a.id)" class="data-selected:border-primary data-selected:bg-nq-selected">
                            <span class="font-medium" x-text="a.label"></span>
                            <bdi class="text-muted-foreground" x-text="a.name"></bdi>
                        </x-nq::button>
                    </template>
                </div>
            @endif
        </fieldset>

        <x-nq::field>
            <x-nq::field.label>{{ $t['text'] }}</x-nq::field.label>
            <x-nq::field.textarea x-model="body" rows="6" placeholder="{{ $t['placeholder'] }}" :disabled="$disabled" />
            <x-nq::field.description>{{ $t['textHint'] }}</x-nq::field.description>
        </x-nq::field>

        <div class="flex flex-wrap items-center gap-2">
            @if ($attach)
                <x-nq::button type="button" size="sm" variant="secondary" :disabled="$disabled" x-on:click="attachImage()">
                    <x-lucide-image-plus aria-hidden="true" />
                    {{ $t['addImage'] }}
                </x-nq::button>
                <x-nq::button type="button" size="sm" variant="secondary" :disabled="$disabled" x-on:click="attachVideo()">
                    <x-lucide-video aria-hidden="true" />
                    {{ $t['addVideo'] }}
                </x-nq::button>
            @endif
            @if (count($actions))
                <x-nq::ai-states.split-button class="ms-auto" :label="$t['assist']" :actions="$actions" :generating="$assisting" :disabled="$disabled"
                    x-on:nq-ai-run="assist(null)" x-on:nq-ai-action="assist($event.detail.id)" />
            @endif
        </div>

        <ul x-show="media.length" style="display: none" aria-label="{{ $t['media'] }}" class="flex flex-wrap gap-2">
            <template x-for="m in media" :key="m.id">
                <li class="inline-flex items-center gap-1.5 rounded-control border border-border bg-nq-surface-soft py-1 ps-2 pe-1 text-body-sm">
                    <span x-show="m.kind === 'image'" class="contents"><x-lucide-image-plus aria-hidden="true" class="size-3.5 text-muted-foreground" /></span>
                    <span x-show="m.kind !== 'image'" class="contents"><x-lucide-video aria-hidden="true" class="size-3.5 text-muted-foreground" /></span>
                    <bdi x-text="m.name"></bdi>
                    <button type="button" x-bind:aria-label="fmt('removeMedia', { name: m.name })" x-on:click="removeMedia(m.id)"
                        class="inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-4">
                        <x-lucide-x aria-hidden="true" />
                    </button>
                </li>
            </template>
        </ul>

        <fieldset class="flex min-w-0 flex-col gap-2" @if ($disabled) disabled @endif>
            <legend class="mb-1 inline-flex items-center gap-1.5 text-label font-medium">
                <x-lucide-calendar-clock aria-hidden="true" class="size-4 text-muted-foreground" />
                {{ $t['schedule'] }}
            </legend>
            <div class="flex flex-wrap items-center gap-2">
                <x-nq::date-picker x-model="date" aria-label="{{ $t['date'] }}" :locale="$locale" />
                <x-nq::date-picker.time x-model="time" aria-label="{{ $t['time'] }}" :locale="$locale" />
                <button type="button" x-show="scheduled" style="display: none" x-on:click="clearSchedule()"
                    class="inline-flex h-control-sm shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control px-3 text-label text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">{{ $t['clearSchedule'] }}</button>
            </div>
            <p class="text-caption text-muted-foreground">{{ $t['scheduleHint'] }}</p>
        </fieldset>

        <div class="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <x-nq::button type="button" variant="primary" :disabled="$disabled" x-bind:disabled="! ready" x-bind:aria-busy="submitting ? 'true' : null" x-on:click="submit()">
                <x-lucide-send aria-hidden="true" />
                <span x-show="! scheduled">{{ $t['publish'] }}</span>
                <span x-show="scheduled" style="display: none">{{ $t['scheduleAction'] }}</span>
            </x-nq::button>
            @if ($saveDraft)
                <x-nq::button type="button" variant="secondary" :disabled="$disabled" x-on:click="saveDraft()">{{ $t['saveDraft'] }}</x-nq::button>
            @endif
            <x-nq::status tone="success" class="ms-auto" x-show="ready" style="display: none">{{ $t['ready'] }}</x-nq::status>
        </div>
    </div>

    <section aria-label="{{ $t['targets'] }}" class="flex min-w-0 flex-col gap-3">
        <h3 class="text-label font-medium">{{ $t['targets'] }}</h3>
        <p x-show="! hasTargets" class="text-body-sm text-muted-foreground">{{ $t['pickTargets'] }}</p>
        <template x-for="t in targets" :key="t.platform">
            <x-nq::card data-slot="social-target" x-bind:data-platform="t.platform" x-bind:data-level="t.level">
                <x-nq::card.header class="flex-row items-center justify-between gap-2">
                    <x-nq::card.title as="h4" class="flex items-center gap-2 text-body font-medium">
                        <span x-text="t.label"></span>
                        <span x-show="t.usesVariant" style="display: none" class="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-caption text-foreground" data-slot="badge" data-variant="outline">{{ $t['custom'] }}</span>
                    </x-nq::card.title>
                    <span x-text="t.lengthText" x-bind:class="t.over ? 'text-nq-danger-text' : 'text-muted-foreground'" class="text-body-sm tabular-nums"></span>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-2">
                    <div data-slot="progress" role="progressbar" x-bind:data-tone="t.tone" x-bind:aria-label="t.counterLabel" aria-valuemin="0" aria-valuemax="100" x-bind:aria-valuenow="Math.round(t.percent)" class="flex w-full flex-col gap-1.5">
                        <div data-slot="progress-track" class="relative block h-1 w-full overflow-hidden rounded-full bg-nq-surface-soft">
                            <div data-slot="progress-indicator" x-bind:style="'inset-inline-start:0;width:' + t.percent + '%'"
                                x-bind:class="{ 'bg-primary': t.tone === 'default', 'bg-nq-warning': t.tone === 'warning', 'bg-nq-danger': t.tone === 'danger' }"
                                class="block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none"></div>
                        </div>
                    </div>
                    <p x-text="t.remainingText" x-bind:class="t.over ? 'text-nq-danger-text' : 'text-muted-foreground'" class="text-caption"></p>
                    <template x-if="t.custom">
                        <x-nq::field.textarea rows="4" x-bind:aria-label="t.customLabel" x-bind:value="t.variant" x-on:input="setVariant(t.platform, $event.target.value)" :disabled="$disabled" />
                    </template>
                    <template x-if="! t.custom">
                        <p class="line-clamp-4 whitespace-pre-wrap rounded-control bg-nq-surface-soft p-2 text-body-sm" aria-label="{{ $t['preview'] }}" x-text="t.text || labels.placeholder"></p>
                    </template>
                    <ul x-show="t.problems.length" style="display: none" class="flex flex-col gap-0.5 text-caption text-nq-danger-text">
                        <template x-for="p in t.problems" :key="p"><li x-text="p"></li></template>
                    </ul>
                    <x-nq::button type="button" variant="link" size="sm" class="self-start px-0" :disabled="$disabled" x-on:click="toggleCustom(t.platform)">
                        <span x-text="t.linkLabel"></span>
                    </x-nq::button>
                </x-nq::card.content>
            </x-nq::card>
        </template>
    </section>
</div>
