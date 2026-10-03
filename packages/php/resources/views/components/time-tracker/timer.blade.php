{{-- <x-nq::time-tracker.timer /> (inside <x-nq::time-tracker>)
     The running timer: pick a project and task, add a note, press start. The clock derives from the start time, so a restored timer keeps counting.
     Starting and stopping are announced through a status region. Needs the Alpine runtime (@nasaqScripts). --}}
@aware(['running' => null])
<x-nq::card data-slot="time-tracker">
    <x-nq::card.header>
        <x-nq::card.title>{{ \Nasaq\Nasaq::t('Timer', 'المؤقّت') }}</x-nq::card.title>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div role="timer" aria-label="{{ \Nasaq\Nasaq::t('Timer', 'المؤقّت') }}" aria-live="off" class="flex flex-col gap-0.5">
                <bdi dir="ltr" class="tabular-nums text-display-sm font-semibold text-foreground" x-text="clockText()">0:00:00</bdi>
                <span class="text-body-sm text-muted-foreground" x-text="activeLabel()">{{ \Nasaq\Nasaq::t('Choose a project to start the timer.', 'اختر مشروعًا لبدء المؤقّت.') }}</span>
            </div>
            <x-nq::button variant="danger" size="lg" x-show="isRunning()" x-cloak style="display: none" x-on:click="stop()">
                <x-lucide-square aria-hidden="true" />
                {{ \Nasaq\Nasaq::t('Stop timer', 'أوقف المؤقّت') }}
            </x-nq::button>
            <x-nq::button variant="primary" size="lg" x-show="!isRunning()" x-on:click="start()">
                <x-lucide-play aria-hidden="true" />
                {{ \Nasaq\Nasaq::t('Start timer', 'ابدأ المؤقّت') }}
            </x-nq::button>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
            <x-nq::time-tracker.picker model="sel" />
            <div x-id="['note']" data-slot="field" class="flex flex-col gap-1.5 sm:col-span-2">
                <label data-slot="field-label" x-bind:for="$id('note')" class="text-label text-foreground">{{ \Nasaq\Nasaq::t('What are you working on?', 'على ماذا تعمل؟') }}</label>
                <x-nq::field.input x-bind:id="$id('note')" x-model="note" />
            </div>
        </div>
        <p role="alert" x-show="message" style="display: none" x-text="message" class="text-body-sm text-nq-danger-text"></p>
        <span role="status" class="sr-only" x-text="announce"></span>
    </x-nq::card.content>
</x-nq::card>
