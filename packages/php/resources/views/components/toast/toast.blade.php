{{-- <x-nq::toast />   mount it once near the app root; two stacks show every toast twice.
     Fire a toast from anywhere: window.nqToast.success('Invoice sent'), nqToast.error('Failed', { description: '…', duration: 8000 }),
     or in Alpine: $dispatch('nq-toast', { type: 'success', title: 'Invoice sent' }). Types: message | success | error | warning | info.
     duration: ms before a toast leaves (0 keeps it). placement: end (default) | start, vertical: bottom (default) | top.
     The stack sits at the inline end, so it mirrors in RTL. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['duration' => 4000, 'placement' => 'end', 'vertical' => 'bottom', 'label' => null])
<section data-slot="toaster" x-data="nqToaster(@js((int) $duration))" x-bind="region" tabindex="-1"
    aria-label="{{ $label ?? \Nasaq\Nasaq::t('Notifications', 'الإشعارات') }}" aria-live="polite"
    {{ $attributes->cn([
        'pointer-events-none fixed z-[100] w-[min(356px,calc(100vw-2rem))]',
        $vertical === 'top' ? 'top-4' : 'bottom-4',
        $placement === 'start' ? 'start-4' : 'end-4',
    ]) }}>
    <ol class="m-0 flex list-none flex-col gap-2 p-0">
        <template x-for="t in toasts" :key="t.id">
            <li data-slot="toast" role="status" :data-type="t.type"
                x-transition:enter="transition duration-200 ease-nq" x-transition:enter-start="opacity-0 translate-y-2" x-transition:enter-end="opacity-100 translate-y-0"
                x-transition:leave="transition duration-150 ease-nq" x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0"
                class="pointer-events-auto relative flex items-start rounded-floating border border-border bg-popover p-4 font-sans text-body-sm text-popover-foreground shadow-floating gap-2">
                <span data-icon aria-hidden="true" class="mt-0.5 inline-flex shrink-0 [&_svg]:size-4" x-show="t.type !== 'message'">
                    <x-lucide-circle-check x-show="t.type === 'success'" class="text-nq-success-text" />
                    <x-lucide-circle-x x-show="t.type === 'error'" class="text-nq-danger-text" />
                    <x-lucide-circle-alert x-show="t.type === 'warning'" class="text-nq-warning-text" />
                    <x-lucide-info x-show="t.type === 'info'" class="text-nq-info-text" />
                </span>
                <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div data-title class="font-medium" x-text="t.title"></div>
                    <div data-description class="text-muted-foreground" x-show="t.description" x-text="t.description"></div>
                </div>
                <button type="button" data-close x-on:click="dismiss(t.id)" aria-label="{{ \Nasaq\Nasaq::t('Close', 'إغلاق') }}"
                    class="-me-1 -mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-x /></button>
            </li>
        </template>
    </ol>
</section>
