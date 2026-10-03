{{-- <x-nq::copilot-provider greeting="Hi! Ask me anything." x-model="assistantOpen" @nq-copilot-send="stream($event.detail)"> ...launchers, the dock... </x-nq::copilot-provider>
     Owns the state of an assistant conversation (React CopilotProvider) and renders no box of its own, only its slot (display: contents). Everything inside can read and call it:
     isOpen, messages, draft, streaming, open({ message, autoSend, context }), close(), toggle(), send(text), stop(), retry(), newChat(), push(event). Any code on the page can open the assistant
     with window events: $dispatch('nq-copilot-open', { message: 'Summarise this order', autoSend: true }), nq-copilot-close, nq-copilot-toggle.
     open: starts open (false); x-modelable (x-model="$wire.assistantOpen"). greeting: an assistant message shown at the start of every new chat. messages: the starting messages
     ([['id', 'role' => user|assistant, 'text']]). labels: words (open, close).
     There is no transport: sending dispatches nq-copilot-send { text, meta, data, history, sessionId, answerId, signal, push }, and your handler streams the answer by calling push() with events
     (delta, text, step, sources, artifact, followUps, session, error, done). Also nq-copilot-change { open } (whether it is open), nq-copilot-stop, nq-copilot-new, nq-copilot-feedback { message, value }.
     The Blade copilot chat is rendered on the server, so the provider does not paint messages itself: use messages in your own x-for, or re-render the chat from Livewire.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['open' => false, 'greeting' => null, 'messages' => null, 'labels' => []])
@php
    $words = array_merge(\Nasaq\Nasaq::rtl() ? ['open' => 'افتح المساعد', 'close' => 'أغلق المساعد'] : ['open' => 'Open assistant', 'close' => 'Close assistant'], $labels);
    $config = \Illuminate\Support\Js::from(['open' => (bool) $open, 'greeting' => $greeting, 'messages' => $messages, 'words' => $words])->toHtml();
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'copilot-provider') }}" x-data="nqCopilotProvider({!! $config !!})" x-modelable="isOpen" x-bind:data-open="isOpen ? `` : null"
    x-on:nq-copilot-open.window="open($event.detail)" x-on:nq-copilot-close.window="close()" x-on:nq-copilot-toggle.window="toggle()"
    {{ $attributes->except('data-slot')->cn('contents') }}>{{ $slot }}</div>
