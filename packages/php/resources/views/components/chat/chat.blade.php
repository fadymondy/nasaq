{{-- <div class="flex h-96 flex-col"><x-nq::chat class="flex-1"> <x-nq::chat.message side="user" name="You" text="Hi" /> </x-nq::chat> <x-nq::chat.composer /></div>
     The scrolling message list (React ChatThread). It follows new content (also a message that grows while streaming) as long as the reader is at the bottom;
     once they scroll up it stops and a "Jump to latest" button appears. Parts: chat.message, chat.composer, chat.typing-indicator.
     label: accessible name of the log ("Conversation"). jump-label: name of the jump button. content-class: classes of the inner column.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['label' => null, 'jumpLabel' => null, 'contentClass' => null])
<div data-slot="{{ $attributes->get('data-slot', 'chat-thread') }}" x-data="nqChatThread" {{ $attributes->except('data-slot')->cn('relative flex min-h-0 flex-col') }}>
    <div x-ref="scroller" x-on:scroll="onScroll()" role="log" aria-live="polite" aria-relevant="additions" aria-label="{{ $label ?? \Nasaq\Nasaq::t('Conversation', 'المحادثة') }}" tabindex="0"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
        <div x-ref="content" class="{{ \Nasaq\Cn::merge('flex flex-col gap-4 p-4', (string) $contentClass) }}">{{ $slot }}</div>
    </div>
    <x-nq::button x-show="away" x-cloak type="button" variant="secondary" size="icon-sm" data-slot="chat-jump" x-on:click="jump()"
        aria-label="{{ $jumpLabel ?? \Nasaq\Nasaq::t('Jump to latest', 'الانتقال إلى الأحدث') }}" class="absolute end-4 bottom-3 rounded-full shadow-sm">
        <x-lucide-arrow-down aria-hidden="true" />
    </x-nq::button>
</div>
