{{-- <x-nq::funnel-builder :sources="$sources" :value="$funnel" x-on:save="$event.detail.wait(…)" />
     Builds a funnel: a name, an ordered list of steps taken from events or page views (reorder with the up and down buttons, remove with the cross) and the time window to finish in.
     Saving stays honest: a funnel needs a name and two steps.
     sources: [['id' => 'signup', 'kind' => 'event' | 'page', 'label' => 'Signed up', 'detail' => 'user_signed_up']].
     value: the starting funnel ['name' => '', 'steps' => [['id', 'sourceId', 'kind', 'label', 'detail']], 'window' => ['amount' => 7, 'unit' => 'hour' | 'day' | 'week']].
     title, description, labels: array overriding the built-in words (moveUp, moveDown, remove and stepNumber take a {label} or {n} placeholder).
     It is presentational: it fires events on the root.
       save           detail.value (the funnel) and wait(promise); resolve, or resolve { error } to show that message. A rejected promise, or nobody listening, shows the generic error.
       funnel-change  detail.value (the funnel) after every edit. Named so it never collides with the native change event.
     Differences from the React component: the source list is picked from two lists (events, pages) shown one at a time. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['sources' => [], 'value' => null, 'title' => null, 'description' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $T = \Nasaq\Nasaq::class;
    $L = fn (string $k, string $en, string $ar) => $labels[$k] ?? $T::t($en, $ar);
    $srcs = collect($sources)->map(fn ($s) => (array) $s)->values()->all();
    $events = array_values(array_filter($srcs, fn ($s) => ($s['kind'] ?? 'event') === 'event'));
    $pages = array_values(array_filter($srcs, fn ($s) => ($s['kind'] ?? '') === 'page'));
    $start = (array) ($value ?? []);
    $config = [
        'sources' => $srcs,
        'value' => [
            'name' => $start['name'] ?? '',
            'steps' => array_values((array) ($start['steps'] ?? [])),
            'window' => (array) ($start['window'] ?? ['amount' => 7, 'unit' => 'day']),
        ],
        'labels' => [
            'saved' => $L('saved', 'Funnel saved.', 'تم حفظ القمع.'),
            'failed' => $L('failed', 'Could not save the funnel. Try again.', 'تعذّر حفظ القمع. حاول مرة أخرى.'),
            'moveUp' => $L('moveUp', 'Move {label} up', 'نقل {label} للأعلى'),
            'moveDown' => $L('moveDown', 'Move {label} down', 'نقل {label} للأسفل'),
            'remove' => $L('remove', 'Remove {label}', 'إزالة {label}'),
        ],
    ];
    $kindEvent = $L('kindEvent', 'Event', 'حدث');
    $kindPage = $L('kindPage', 'Page view', 'زيارة صفحة');
    $pick = $L('pick', 'Choose…', 'اختر…');
    $none = $L('noSources', 'Nothing of this kind to add.', 'لا شيء من هذا النوع للإضافة.');
    $addTitle = $L('addTitle', 'Add a step', 'إضافة خطوة');
@endphp
{{-- The card classes, copied from card.blade.php, so data-slot can be funnel-builder. --}}
<div data-slot="{{ $attributes->get('data-slot', 'funnel-builder') }}" x-data="nqFunnelBuilder(@js($config))" x-id="['nq-funnel']"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground') }}>
    <form novalidate class="flex flex-col gap-4" x-on:submit.prevent="submit()">
        <x-nq::card.header>
            <x-nq::card.title as="h3">{{ $title ?? $L('title', 'Funnel builder', 'منشئ القمع') }}</x-nq::card.title>
            <x-nq::card.description>{{ $description ?? $L('description', 'Pick the steps people take, in order, and how long they have to finish them.', 'اختر الخطوات التي يمرّ بها الناس بالترتيب، والمدة المتاحة لإتمامها.') }}</x-nq::card.description>
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col gap-5">
            <template x-if="message && message.tone === 'danger'">
                <x-nq::alert tone="danger"><span x-text="message.text"></span></x-nq::alert>
            </template>
            <template x-if="message && message.tone === 'success'">
                <x-nq::alert tone="success"><span x-text="message.text"></span></x-nq::alert>
            </template>
            <x-nq::field x-model="nameInvalid">
                <x-nq::field.label>{{ $L('nameLabel', 'Funnel name', 'اسم القمع') }}</x-nq::field.label>
                <x-nq::field.input dir="auto" x-model="name" x-on:input="edited()" placeholder="{{ $L('namePlaceholder', 'Signup to first order', 'من التسجيل إلى أول طلب') }}" />
                <x-nq::field.error>{{ $L('nameRequired', 'Give the funnel a name.', 'أعطِ القمع اسمًا.') }}</x-nq::field.error>
            </x-nq::field>

            <section x-bind:aria-labelledby="$id('nq-funnel', '-steps')" class="flex flex-col gap-2">
                <h4 x-bind:id="$id('nq-funnel', '-steps')" class="text-label text-foreground">{{ $L('stepsTitle', 'Steps', 'الخطوات') }}</h4>
                <p x-show="steps.length === 0" class="rounded-card border border-dashed border-border p-4 text-body-sm text-muted-foreground">{{ $L('noSteps', 'No steps yet. Add the first event or page below.', 'لا خطوات بعد. أضف أول حدث أو صفحة أدناه.') }}</p>
                <ol x-show="steps.length > 0" x-cloak style="display: none" class="flex flex-col gap-2">
                    <template x-for="(s, i) in steps" :key="s.id">
                        <li data-slot="funnel-builder-step" class="flex items-center gap-3 rounded-card border border-border p-2 ps-3">
                            <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-caption text-muted-foreground">
                                <bdi x-text="i + 1"></bdi>
                            </span>
                            <span class="flex min-w-0 flex-1 flex-col">
                                <span dir="auto" class="truncate text-label text-foreground" x-text="s.label"></span>
                                <span class="flex items-center gap-1.5 text-caption text-muted-foreground">
                                    <x-nq::badge variant="outline">
                                        <x-lucide-mouse-pointer-click aria-hidden="true" x-show="s.kind === 'event'" />
                                        <x-lucide-file-text aria-hidden="true" x-show="s.kind !== 'event'" style="display: none" />
                                        <span x-text="s.kind === 'event' ? @js($kindEvent) : @js($kindPage)"></span>
                                    </x-nq::badge>
                                    <bdi x-show="s.detail" dir="ltr" class="truncate" x-text="s.detail"></bdi>
                                </span>
                            </span>
                            <span class="flex shrink-0 items-center">
                                <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:aria-label="say('moveUp', s.label)" x-bind:disabled="i === 0" x-on:click="move(i, -1)">
                                    <x-lucide-arrow-up aria-hidden="true" />
                                </x-nq::button>
                                <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:aria-label="say('moveDown', s.label)" x-bind:disabled="i === steps.length - 1" x-on:click="move(i, 1)">
                                    <x-lucide-arrow-down aria-hidden="true" />
                                </x-nq::button>
                                <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:aria-label="say('remove', s.label)" x-on:click="removeAt(i)">
                                    <x-lucide-x aria-hidden="true" />
                                </x-nq::button>
                            </span>
                        </li>
                    </template>
                </ol>
                <p x-show="stepsInvalid" x-cloak style="display: none" role="alert" class="text-body-sm text-danger">{{ $L('needTwo', 'A funnel needs at least two steps.', 'يحتاج القمع إلى خطوتين على الأقل.') }}</p>
            </section>

            <section aria-label="{{ $addTitle }}" class="flex flex-col gap-2 rounded-card bg-muted/40 p-3">
                <span class="text-label text-foreground">{{ $addTitle }}</span>
                <div class="flex flex-wrap items-end gap-2">
                    <x-nq::toggle-group x-model="kindValue" aria-label="{{ $addTitle }}" :default-value="['event']">
                        <x-nq::toggle-group.toggle value="event">{{ $kindEvent }}</x-nq::toggle-group.toggle>
                        <x-nq::toggle-group.toggle value="page">{{ $kindPage }}</x-nq::toggle-group.toggle>
                    </x-nq::toggle-group>
                    <div class="min-w-48 flex-1" x-show="kind === 'event'">
                        <x-nq::select x-model="pickEvent">
                            <x-nq::select.trigger aria-label="{{ $addTitle }}"><x-nq::select.value :placeholder="$events ? $pick : $none" /></x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach ($events as $o)
                                    <x-nq::select.item :value="(string) $o['id']">{{ $o['label'] }}</x-nq::select.item>
                                @endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    </div>
                    <div class="min-w-48 flex-1" x-show="kind === 'page'" style="display: none">
                        <x-nq::select x-model="pickPage">
                            <x-nq::select.trigger aria-label="{{ $addTitle }}"><x-nq::select.value :placeholder="$pages ? $pick : $none" /></x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach ($pages as $o)
                                    <x-nq::select.item :value="(string) $o['id']">{{ $o['label'] }}</x-nq::select.item>
                                @endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    </div>
                    <x-nq::button type="button" variant="secondary" x-bind:disabled="!pick" x-on:click="addStep()">
                        <x-lucide-plus aria-hidden="true" />
                        {{ $L('add', 'Add step', 'إضافة الخطوة') }}
                    </x-nq::button>
                </div>
            </section>

            <div class="flex flex-col gap-1.5">
                <span x-bind:id="$id('nq-funnel', '-window')" class="text-label text-foreground">{{ $L('windowLabel', 'Conversion window', 'نافذة التحويل') }}</span>
                <div class="flex items-center gap-2" role="group" x-bind:aria-labelledby="$id('nq-funnel', '-window')">
                    <x-nq::field.input type="number" min="1" inputmode="numeric" ltr class="w-24" aria-label="{{ $L('windowLabel', 'Conversion window', 'نافذة التحويل') }}" x-model.number="amount" x-on:change="setAmount()" />
                    <x-nq::select x-model="unit">
                        <x-nq::select.trigger class="w-32" aria-label="{{ $L('unit', 'Unit', 'الوحدة') }}"><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            <x-nq::select.item value="hour">{{ $L('hours', 'hours', 'ساعات') }}</x-nq::select.item>
                            <x-nq::select.item value="day">{{ $L('days', 'days', 'أيام') }}</x-nq::select.item>
                            <x-nq::select.item value="week">{{ $L('weeks', 'weeks', 'أسابيع') }}</x-nq::select.item>
                        </x-nq::select.content>
                    </x-nq::select>
                    <bdi dir="ltr" class="text-caption text-muted-foreground" x-text="windowKey()"></bdi>
                </div>
                <span class="text-caption text-muted-foreground">{{ $L('windowHint', 'People must finish all steps within this time of the first one.', 'يجب أن يُتمّ الناس كل الخطوات خلال هذه المدة من الخطوة الأولى.') }}</span>
            </div>
        </x-nq::card.content>
        <x-nq::card.footer class="justify-end gap-2">
            <x-nq::button type="button" variant="ghost" x-bind:disabled="pending" x-on:click="reset()">{{ $L('reset', 'Reset', 'إعادة التعيين') }}</x-nq::button>
            <x-nq::button type="submit" variant="primary" x-bind:disabled="pending" x-bind:aria-busy="pending ? 'true' : null">{{ $L('save', 'Save funnel', 'حفظ القمع') }}</x-nq::button>
        </x-nq::card.footer>
    </form>
</div>
