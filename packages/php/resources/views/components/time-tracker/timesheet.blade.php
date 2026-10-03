{{-- <x-nq::time-tracker.timesheet /> (inside <x-nq::time-tracker>)
     Project and task rows by day columns, with hours per cell, per row and per day. A Day/Week toggle and previous / today / next buttons move the period
     (the root's view and date options set where it starts). The table is drawn by Alpine, so it follows every entry change. Needs the Alpine runtime (@nasaqScripts). --}}
@aware(['view' => 'week'])
@php($t = fn ($en, $ar) => \Nasaq\Nasaq::t($en, $ar))
<section data-slot="{{ $attributes->get('data-slot', 'timesheet') }}" x-id="['sheet']" x-bind:aria-labelledby="$id('sheet')" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
    <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 x-bind:id="$id('sheet')" class="text-title-sm text-foreground">{{ $t('Timesheet', 'جدول الدوام') }}</h2>
        <div class="flex flex-wrap items-center gap-2">
            <x-nq::toggle-group :default-value="[$view]" :aria-label="$t('View', 'العرض')" x-model="viewValue">
                <x-nq::toggle-group.toggle value="day">{{ $t('Day', 'يوم') }}</x-nq::toggle-group.toggle>
                <x-nq::toggle-group.toggle value="week">{{ $t('Week', 'أسبوع') }}</x-nq::toggle-group.toggle>
            </x-nq::toggle-group>
            <div class="flex items-center gap-1">
                <x-nq::button type="button" variant="secondary" size="icon-sm" :aria-label="$t('Previous', 'السابق')" x-on:click="shift(-1)">
                    <x-lucide-chevron-left aria-hidden="true" class="rtl:rotate-180" />
                </x-nq::button>
                <x-nq::button type="button" variant="secondary" size="sm" x-on:click="goToday()">{{ $t('Today', 'اليوم') }}</x-nq::button>
                <x-nq::button type="button" variant="secondary" size="icon-sm" :aria-label="$t('Next', 'التالي')" x-on:click="shift(1)">
                    <x-lucide-chevron-right aria-hidden="true" class="rtl:rotate-180" />
                </x-nq::button>
            </div>
        </div>
    </div>
    <p aria-live="polite" class="text-body-sm text-muted-foreground" x-text="range()"></p>
    <x-nq::card>
        {{-- An ARIA table of table-row divs: a <td> cannot sit inside an Alpine x-for <template> in every parser. --}}
        <div role="table" data-slot="table" aria-label="{{ $t("Hours by project and day", "الساعات حسب المشروع واليوم") }}" class="table w-full overflow-x-auto text-body">
            <div role="rowgroup" data-slot="table-header" class="table-header-group">
                <div role="row" data-slot="table-row" class="table-row">
                    <div role="columnheader" data-slot="table-head" class="table-cell h-row whitespace-nowrap px-4 py-3 text-caption font-medium text-muted-foreground">{{ $t("Project / task", "المشروع / المهمة") }}</div>
                    <template x-for="d in days()" x-bind:key="d">
                        <div role="columnheader" data-slot="table-head" class="table-cell h-row whitespace-nowrap px-4 py-3 text-end text-caption font-medium text-muted-foreground" x-bind:aria-current="isToday(d) ? 'date' : null" x-text="colLabel(d)"></div>
                    </template>
                    <div role="columnheader" data-slot="table-head" x-show="isWeek()" class="table-cell h-row whitespace-nowrap px-4 py-3 text-end text-caption font-medium text-muted-foreground">{{ $t("Total", "الإجمالي") }}</div>
                </div>
            </div>
            <div role="rowgroup" data-slot="table-body" class="table-row-group">
                <div role="row" data-slot="table-row" x-show="!grid().rows.length" style="display: none" class="table-row">
                    <div role="cell" data-slot="table-cell" x-bind:colspan="colspan()" class="table-cell px-4 py-8 text-center text-muted-foreground">{{ $t("Nothing logged for this period.", "لا شيء مسجَّل لهذه الفترة.") }}</div>
                </div>
                <template x-for="row in grid().rows" x-bind:key="row.key">
                    <div role="row" data-slot="table-row" class="table-row border-t border-border">
                        <div role="rowheader" data-slot="table-cell" class="table-cell h-row whitespace-nowrap px-4 py-3 font-medium" x-text="row.text"></div>
                        <template x-for="d in days()" x-bind:key="d">
                            <div role="cell" data-slot="table-cell" class="table-cell h-row whitespace-nowrap px-4 py-3 text-end"><bdi dir="ltr" class="tabular-nums" x-text="cellText(row, d)"></bdi></div>
                        </template>
                        <div role="cell" data-slot="table-cell" x-show="isWeek()" class="table-cell h-row whitespace-nowrap px-4 py-3 text-end font-medium"><bdi dir="ltr" class="tabular-nums" x-text="hours(row.total)"></bdi></div>
                    </div>
                </template>
            </div>
            <div role="rowgroup" data-slot="table-footer" class="table-footer-group">
                <div role="row" data-slot="table-row" x-show="grid().rows.length" class="table-row border-t border-border bg-muted/50">
                    <div role="rowheader" data-slot="table-cell" class="table-cell h-row whitespace-nowrap px-4 py-3 font-semibold">{{ $t("Total", "الإجمالي") }}</div>
                    <template x-for="d in days()" x-bind:key="d">
                        <div role="cell" data-slot="table-cell" class="table-cell h-row whitespace-nowrap px-4 py-3 text-end font-semibold"><bdi dir="ltr" class="tabular-nums" x-text="hours(grid().columns[d] ?? 0)"></bdi></div>
                    </template>
                    <div role="cell" data-slot="table-cell" x-show="isWeek()" class="table-cell h-row whitespace-nowrap px-4 py-3 text-end font-semibold"><bdi dir="ltr" class="tabular-nums" x-text="hours(grid().total)"></bdi></div>
                </div>
            </div>
        </div>
    </x-nq::card>
</section>
