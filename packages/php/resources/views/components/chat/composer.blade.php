{{-- <x-nq::chat.composer placeholder="Ask anything" @nq-send="send($event.detail.text)" />   <x-nq::chat.composer streaming stoppable @nq-stop="cancel()" />
     The message box (React ChatComposer). Enter sends, Shift+Enter adds a new line, and the field grows with its text. Enter is ignored while an input
     method (IME) composition is open, so Arabic and CJK candidates can be confirmed without sending.
     Fires nq-send { text } (the trimmed text; the field clears itself) and nq-stop on its root. x-model works on the text (x-modelable).
     streaming: a reply is being produced; sending is blocked. stoppable: while streaming the send button becomes a stop button that fires nq-stop.
     Dispatch nq-chat-streaming { streaming } on the composer to toggle streaming from your own code. disabled. value: the starting text.
     placeholder, label ("Message"), send-label, stop-label, max-rows (8). Slots: attachments (above the field), actions (before the send button).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => '', 'streaming' => false, 'stoppable' => false, 'disabled' => false, 'placeholder' => null, 'label' => null, 'sendLabel' => null, 'stopLabel' => null, 'maxRows' => 8, 'attachments' => null, 'actions' => null])
@php
    $options = \Illuminate\Support\Js::from(['streaming' => (bool) $streaming, 'stoppable' => (bool) $stoppable, 'disabled' => (bool) $disabled, 'maxRows' => (int) $maxRows])->toHtml();
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'chat-composer') }}" x-data="nqChatComposer(@js((string) $value), {!! $options !!})" x-modelable="text"
    x-on:nq-chat-streaming="streaming = $event.detail.streaming"
    @if ($disabled) data-disabled @endif
    {{ $attributes->except('data-slot')->cn([
        'flex flex-col gap-2 rounded-card border border-input bg-card p-2 transition-colors duration-150 ease-nq',
        'focus-within:border-nq-focus data-disabled:opacity-50',
    ]) }}>
    @if ($attachments && ! $attachments->isEmpty())
        <div data-slot="chat-attachments" class="flex flex-wrap gap-2">{{ $attachments }}</div>
    @endif
    <div class="flex items-end gap-2">
        <x-nq::field.textarea x-ref="field" x-model="text" x-on:keydown="key($event)" rows="1" dir="auto"
            placeholder="{{ $placeholder ?? \Nasaq\Nasaq::t('Write a message…', 'اكتب رسالة…') }}" aria-label="{{ $label ?? \Nasaq\Nasaq::t('Message', 'الرسالة') }}"
            class="min-h-0 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 focus-visible:outline-0">{{ $value }}</x-nq::field.textarea>
        @if ($actions && ! $actions->isEmpty()){{ $actions }}@endif
        @if ($stoppable)
            <x-nq::button x-show="stopping()" x-cloak type="button" variant="secondary" size="icon" x-on:click="stop()" aria-label="{{ $stopLabel ?? \Nasaq\Nasaq::t('Stop', 'إيقاف') }}">
                <x-lucide-square aria-hidden="true" class="fill-current" />
            </x-nq::button>
        @endif
        <x-nq::button x-show="! stopping()" type="button" variant="primary" size="icon" x-on:click="send()" x-bind:disabled="! canSend()"
            aria-label="{{ $sendLabel ?? \Nasaq\Nasaq::t('Send', 'إرسال') }}">
            <x-lucide-send aria-hidden="true" class="rtl:-scale-x-100" />
        </x-nq::button>
    </div>
</div>
