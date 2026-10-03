{{-- <x-nq::presentation-editor.deck-player />
     The full-screen player of <x-nq::presentation-editor>, driven by its nqPresentation scope (playing, pIndex, notes, chrome, elapsed). Not used on its own.
     Arrow keys, Space, Page Up and Down, Home and End move between slides (arrows follow the reading direction), swiping works on touch,
     N toggles presenter notes (with the next slide and a timer), F toggles full screen and Esc exits. --}}
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $ghost = 'text-nq-bg hover:bg-nq-bg/10';
@endphp
<template x-teleport="body">
    <div data-slot="deck-player" x-show="playing" x-cloak style="display: none" role="dialog" aria-modal="true" aria-label="{{ $T('Presentation player', 'مشغّل العرض') }}"
        dir="{{ \Nasaq\Nasaq::rtl() ? 'rtl' : 'ltr' }}" tabindex="-1" x-trap.noscroll="playing"
        x-on:keydown="onPlayerKey($event)" x-on:pointermove="wake()"
        class="fixed inset-0 z-[70] flex flex-col bg-nq-fg text-nq-bg outline-none">
        <p class="sr-only">{{ $T('Arrow keys move between slides, N shows notes, F toggles full screen, Esc exits.', 'مفاتيح الأسهم للتنقل بين الشرائح، N لإظهار الملاحظات، F لملء الشاشة، Esc للخروج.') }}</p>
        <div role="progressbar" aria-label="{{ $T('Presentation progress', 'تقدّم العرض') }}" aria-valuemin="1" :aria-valuemax="Math.max(1, count)" :aria-valuenow="count ? pIndex + 1 : 0" :aria-valuetext="slideOfText()"
            class="h-1 w-full shrink-0 bg-nq-bg/15">
            <div class="h-full bg-primary transition-[width] duration-200 ease-nq" :style="'width: ' + progress()"></div>
        </div>

        <div data-slot="deck-player-stage" tabindex="-1" style="touch-action: pan-y"
            class="relative flex min-h-0 flex-1 items-center justify-center p-3 outline-none sm:p-6"
            x-on:pointerdown="swipeStart($event)" x-on:pointerup="swipeEnd($event)" x-on:pointercancel="swipeCancel()">
            <template x-for="cur in [playerSlide()]" :key="cur.id + pIndex">
                <div x-show="count > 0" class="w-full" :style="stageStyle()">
                    <x-nq::presentation-editor.slide-view expr="cur" class="rounded-card shadow-floating" />
                </div>
            </template>
            <p x-show="count === 0" x-cloak style="display: none" class="text-body text-nq-bg/70">{{ $T('This presentation has no slides.', 'لا يحتوي هذا العرض على شرائح.') }}</p>
        </div>

        <div class="sr-only" role="status" aria-live="polite" x-text="announceText()"></div>

        <section x-show="notes" x-cloak style="display: none" aria-label="{{ $T('Presenter notes', 'ملاحظات المقدّم') }}"
            class="grid max-h-[13rem] shrink-0 grid-cols-[minmax(0,1fr)] gap-4 overflow-y-auto border-t border-nq-bg/15 bg-nq-fg p-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <div class="min-w-0">
                <p class="mb-1 text-caption font-medium text-nq-bg/60">{{ $T('Presenter notes', 'ملاحظات المقدّم') }}</p>
                <p dir="auto" class="whitespace-pre-line text-start text-body text-nq-bg" x-show="(playerSlide().notes ?? '').trim() !== ''" x-text="playerSlide().notes"></p>
                <p dir="auto" class="text-start text-body text-nq-bg/50" x-show="(playerSlide().notes ?? '').trim() === ''">{{ $T('No notes for this slide.', 'لا ملاحظات لهذه الشريحة.') }}</p>
            </div>
            <div class="hidden min-w-0 sm:block">
                <p class="mb-1 text-caption font-medium text-nq-bg/60">{{ $T('Up next', 'التالي') }}</p>
                <template x-for="nx in [upNext()]" :key="nx ? nx.id : 'end'">
                    <div>
                        <div x-show="nx"><x-nq::presentation-editor.slide-view expr="(upNext() ?? { layout: 'blank', title: '' })" decorative class="rounded-control border border-nq-bg/20" /></div>
                        <div x-show="!nx" x-cloak style="display: none" class="flex aspect-video items-center justify-center rounded-control border border-dashed border-nq-bg/30 text-caption text-nq-bg/60">{{ $T('End of the presentation', 'نهاية العرض') }}</div>
                    </div>
                </template>
            </div>
        </section>

        <div :class="chrome ? 'opacity-100' : 'opacity-0 focus-within:opacity-100 hover:opacity-100'" class="flex shrink-0 items-center gap-2 px-3 py-2 transition-opacity duration-200 ease-nq sm:px-4">
            <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ $T('Close player', 'إغلاق المشغّل') }}" title="{{ $T('Close player', 'إغلاق المشغّل') }}" class="{{ $ghost }}" x-on:click="closePlayer()"><x-lucide-x aria-hidden="true" /></x-nq::button>
            <span dir="ltr" class="text-caption tabular-nums text-nq-bg/60" aria-label="{{ $T('Elapsed time', 'الوقت المنقضي') }}" x-text="elapsedText()"></span>
            <div class="mx-auto flex items-center gap-2">
                <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ $T('Previous slide', 'الشريحة السابقة') }}" ::disabled="atStart()" class="{{ $ghost }}" x-on:click="go(pIndex - 1)"><x-lucide-chevron-left aria-hidden="true" class="rtl:-scale-x-100" /></x-nq::button>
                <span class="min-w-16 text-center text-label tabular-nums text-nq-bg" aria-hidden="true" x-text="counterText()"></span>
                <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ $T('Next slide', 'الشريحة التالية') }}" ::disabled="atEnd()" class="{{ $ghost }}" x-on:click="go(pIndex + 1)"><x-lucide-chevron-right aria-hidden="true" class="rtl:-scale-x-100" /></x-nq::button>
            </div>
            <x-nq::button size="icon-sm" variant="ghost" ::aria-label="notes ? $nq.t('Hide notes', 'إخفاء الملاحظات') : $nq.t('Show notes', 'إظهار الملاحظات')" ::aria-pressed="notes" ::class="notes ? 'bg-nq-bg/15' : ''" class="{{ $ghost }}" x-on:click="notes = !notes"><x-lucide-notebook-text aria-hidden="true" /></x-nq::button>
            <x-nq::button size="icon-sm" variant="ghost" ::aria-label="isFull ? $nq.t('Exit full screen', 'الخروج من ملء الشاشة') : $nq.t('Full screen', 'ملء الشاشة')" class="{{ $ghost }}" x-on:click="toggleFullscreen()">
                <x-lucide-minimize-2 x-show="isFull" x-cloak style="display: none" aria-hidden="true" />
                <x-lucide-maximize-2 x-show="!isFull" aria-hidden="true" />
            </x-nq::button>
        </div>
    </div>
</template>
