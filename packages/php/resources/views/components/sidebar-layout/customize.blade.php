{{-- <x-nq::sidebar-layout.customize />
     The accessible way to arrange the sidebar: a drag handle per item that also works with the keyboard (focus a handle,
     then Up/Down moves one place, Home/End to either end) and a switch to show or hide it. Opens with show() or the trigger part.
     title, description, reset, done, close-label, reorder (with :label): override the built-in English / Arabic copy. --}}
@aware(['storageKey' => 'nasaq-sidebar', 'items' => [], 'sections' => null, 'defaultHidden' => []])
@props(['title' => null, 'description' => null, 'reset' => null, 'done' => null, 'closeLabel' => null, 'reorder' => null])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $title ??= $t('Customize sidebar', 'تخصيص الشريط الجانبي');
    $description ??= $t('Drag to reorder. Switch items off to hide them.', 'اسحب لإعادة الترتيب. أوقف العناصر لإخفائها.');
    $reset ??= $t('Reset to default', 'إعادة الضبط الافتراضي');
    $done ??= $t('Done', 'تم');
    $reorder ??= $t('Reorder :label', 'إعادة ترتيب :label');
    $lists = $sections ?? [['id' => 'main', 'items' => $items, 'defaultHidden' => $defaultHidden]];
@endphp
<x-nq::dialog.content :close-label="$closeLabel" {{ $attributes->cn('max-w-md gap-0 p-0') }}>
    <x-nq::dialog.header class="border-b border-border px-5 py-4 pe-12">
        <x-nq::dialog.title>{{ $title }}</x-nq::dialog.title>
        <x-nq::dialog.description>{{ $description }}</x-nq::dialog.description>
    </x-nq::dialog.header>
    <div class="flex max-h-[60dvh] flex-col gap-4 overflow-y-auto px-3 py-3">
        @foreach ($lists as $list)
            @php
                $sec = $list['id'];
                $hidden = $list['defaultHidden'] ?? [];
            @endphp
            <section class="flex flex-col gap-1" data-section="{{ $sec }}" @if (! empty($list['label'])) aria-label="{{ $list['label'] }}" @endif>
                @if (! empty($list['label']))<h3 class="px-2 text-caption font-medium text-muted-foreground">{{ $list['label'] }}</h3>@endif
                <ul class="flex flex-col gap-0.5">
                    @foreach ($list['items'] as $i => $item)
                        @php
                            $off = in_array($item['id'], $hidden, true);
                            $required = ! empty($item['required']);
                        @endphp
                        <li data-sortable-id="{{ $item['id'] }}" :style="{ order: position(@js($sec), @js($item['id'])) }" style="order: {{ $i }}"
                            class="relative flex h-10 items-center gap-2 rounded-control bg-popover px-1 data-dragging:z-10 data-dragging:shadow-floating">
                            <button type="button" aria-label="{{ str_replace(':label', $item['label'], $reorder) }}" aria-keyshortcuts="ArrowUp ArrowDown Home End"
                                x-on:keydown="keyMove($event, @js($sec), @js($item['id']), @js($item['label']))" x-on:pointerdown="press($event, @js($sec), @js($item['id']), true)"
                                class="inline-flex size-7 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus active:cursor-grabbing [&_svg]:size-4"><x-lucide-grip-vertical /></button>
                            @if (! empty($item['icon']))
                                <span class="text-muted-foreground [&_svg]:size-4" :class="isVisible(@js($sec), @js($item['id'])) ? '' : 'opacity-50'"><x-dynamic-component :component="'lucide-'.$item['icon']" /></span>
                            @endif
                            <span data-sortable-label class="min-w-0 flex-1 truncate text-body-sm {{ $off ? 'text-muted-foreground' : 'text-foreground' }}"
                                :class="isVisible(@js($sec), @js($item['id'])) ? 'text-foreground' : 'text-muted-foreground'">{{ $item['label'] }}</span>
                            <button type="button" role="switch" data-slot="switch" aria-label="{{ $item['label'] }}"
                                x-on:click="toggleVisible(@js($sec), @js($item['id']))"
                                :aria-checked="String(isVisible(@js($sec), @js($item['id'])))"
                                :data-checked="isVisible(@js($sec), @js($item['id'])) ? '' : undefined" :data-unchecked="isVisible(@js($sec), @js($item['id'])) ? undefined : ''"
                                aria-checked="{{ $off ? 'false' : 'true' }}" @if ($off) data-unchecked @else data-checked @endif
                                @if ($required) disabled data-disabled @endif
                                class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-nq-line-strong p-0.5 outline-none transition-colors duration-150 ease-nq data-checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-disabled:cursor-not-allowed data-disabled:opacity-50 me-1">
                                <span data-slot="switch-thumb" @if ($off) data-unchecked @else data-checked @endif
                                    :data-checked="isVisible(@js($sec), @js($item['id'])) ? '' : undefined" :data-unchecked="isVisible(@js($sec), @js($item['id'])) ? undefined : ''"
                                    class="block size-4 rounded-full bg-background shadow-xs data-checked:bg-primary-foreground transition-[translate] duration-150 ease-nq data-checked:translate-x-3.5 rtl:data-checked:-translate-x-3.5"></span>
                            </button>
                        </li>
                    @endforeach
                </ul>
            </section>
        @endforeach
    </div>
    <div aria-live="polite" class="sr-only" x-text="announcement"></div>
    <x-nq::dialog.footer class="border-t border-border px-5 py-3 sm:justify-between">
        <x-nq::button variant="ghost" size="sm" x-bind:disabled="allDefault()" x-on:click="reset()">{{ $reset }}</x-nq::button>
        <x-nq::button variant="primary" size="sm" x-on:click="close()">{{ $done }}</x-nq::button>
    </x-nq::dialog.footer>
</x-nq::dialog.content>
