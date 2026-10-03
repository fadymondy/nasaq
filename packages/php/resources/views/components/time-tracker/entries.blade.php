{{-- <x-nq::time-tracker.entries /> (inside <x-nq::time-tracker>)   <x-nq::time-tracker.entries :can-edit="false" :can-delete="false" />
     The entries grouped by day, newest first, with a total per day, and the add and edit dialog (date, project, task, a duration typed the way people say it, a note).
     can-add / can-edit / can-delete (default true) show or hide the add button, the edit buttons and the delete buttons.
     The list is drawn by Alpine, so it follows every change. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['canAdd' => true, 'canEdit' => true, 'canDelete' => true])
@php($t = fn ($en, $ar) => \Nasaq\Nasaq::t($en, $ar))
<section data-slot="{{ $attributes->get('data-slot', 'time-entry-list') }}" x-id="['entries']" x-bind:aria-labelledby="$id('entries')" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
    <div class="flex items-center justify-between gap-3">
        <h2 x-bind:id="$id('entries')" class="text-title-sm text-foreground">{{ $t('Time entries', 'سجلّات الوقت') }}</h2>
        @if ($canAdd)
            <x-nq::button type="button" variant="secondary" size="sm" x-on:click="openDialog(null)">
                <x-lucide-plus aria-hidden="true" />
                {{ $t('Add time', 'أضف وقتًا') }}
            </x-nq::button>
        @endif
    </div>
    <div x-show="!entries.length" style="display: none">
        <x-nq::states icon="clock" :title="$t('No time logged yet', 'لم يُسجَّل وقت بعد')" :description="$t('Start the timer or add an entry by hand.', 'ابدأ المؤقّت أو أضف سجلًّا يدويًا.')">
            @if ($canAdd)
                <x-slot:actions>
                    <x-nq::button type="button" variant="primary" size="sm" x-on:click="openDialog(null)">
                        <x-lucide-plus aria-hidden="true" />
                        {{ $t('Add time', 'أضف وقتًا') }}
                    </x-nq::button>
                </x-slot:actions>
            @endif
        </x-nq::states>
    </div>
    <template x-for="g in groups()" x-bind:key="g.day">
        <x-nq::card>
            <x-nq::card.header class="flex-row items-center justify-between gap-3">
                <x-nq::card.title class="text-label"><span x-text="g.text"></span></x-nq::card.title>
                <span class="text-body-sm text-muted-foreground">
                    {{ $t('Day total', 'إجمالي اليوم') }} <bdi dir="ltr" class="tabular-nums font-medium text-foreground" x-text="hours(g.total)"></bdi>
                </span>
            </x-nq::card.header>
            <x-nq::card.content>
                <ul class="divide-y divide-border">
                    <template x-for="e in g.items" x-bind:key="e.id">
                        <li class="flex items-center gap-3 py-2">
                            <div class="flex min-w-0 flex-1 flex-col">
                                <span class="truncate text-body-sm font-medium text-foreground" x-text="label(e.projectId, e.taskId)"></span>
                                <span x-show="e.note" class="truncate text-body-sm text-muted-foreground" x-text="e.note"></span>
                            </div>
                            <bdi dir="ltr" class="tabular-nums text-body-sm font-medium text-foreground" x-text="hours(e.seconds)"></bdi>
                            @if ($canEdit)
                                <x-nq::button type="button" variant="ghost" size="icon-sm" x-bind:aria-label="entryAria('edit', e)" x-on:click="openDialog(e)">
                                    <x-lucide-pencil aria-hidden="true" />
                                </x-nq::button>
                            @endif
                            @if ($canDelete)
                                <x-nq::button type="button" variant="ghost" size="icon-sm" x-bind:aria-label="entryAria('remove', e)" x-on:click="removeEntry(e)">
                                    <x-lucide-trash-2 aria-hidden="true" />
                                </x-nq::button>
                            @endif
                        </li>
                    </template>
                </ul>
            </x-nq::card.content>
        </x-nq::card>
    </template>
    @if ($canAdd || $canEdit)
        <x-nq::dialog x-model="dlg.open">
            <x-nq::dialog.content>
                <form novalidate class="grid gap-4" x-on:submit.prevent="submitDialog()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title><span x-text="dialogTitle()">{{ $t('Add time', 'أضف وقتًا') }}</span></x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $t('Log time you did not track with the timer.', 'سجّل وقتًا لم تتتبّعه بالمؤقّت.') }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <div data-slot="field" class="flex flex-col gap-1.5">
                        <span data-slot="field-label" class="text-label text-foreground">{{ $t('Date', 'التاريخ') }}</span>
                        <x-nq::date-picker x-model="dlg.date" :aria-label="$t('Date', 'التاريخ')" />
                    </div>
                    <x-nq::time-tracker.picker model="dlg" />
                    <div x-id="['duration']" data-slot="field" class="flex flex-col gap-1.5">
                        <label data-slot="field-label" x-bind:for="$id('duration')" class="text-label text-foreground">{{ $t('Duration', 'المدّة') }}</label>
                        <x-nq::field.input ltr inputmode="text" autocomplete="off" x-bind:id="$id('duration')" x-model="dlg.duration" x-bind:aria-invalid="showDurationProblem() ? 'true' : null" />
                        <p data-slot="field-description" class="text-caption text-muted-foreground">{{ $t('For example 1h 30m, 1:30 or 1.5.', 'مثلًا 1h 30m أو 1:30 أو 1.5.') }}</p>
                        <p data-slot="field-error" role="alert" x-show="showDurationProblem()" style="display: none" x-text="durationProblem()" class="text-caption text-nq-danger-text"></p>
                    </div>
                    <div x-id="['dnote']" data-slot="field" class="flex flex-col gap-1.5">
                        <label data-slot="field-label" x-bind:for="$id('dnote')" class="text-label text-foreground">{{ $t('What are you working on?', 'على ماذا تعمل؟') }}</label>
                        <x-nq::field.input x-bind:id="$id('dnote')" x-model="dlg.note" />
                    </div>
                    <p x-show="dlg.message" style="display: none" role="alert" x-text="dlg.message" class="text-body-sm text-nq-danger-text"></p>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="dlg.open = false">{{ $t('Cancel', 'إلغاء') }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary">{{ $t('Save', 'احفظ') }}</x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
</section>
