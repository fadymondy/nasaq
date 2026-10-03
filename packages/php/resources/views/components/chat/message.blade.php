{{-- <x-nq::chat.message side="user" name="You" :time="$sentAt" text="Hello" />   <x-nq::chat.message name="Assistant" format="markdown" streaming>**Working** on it</x-nq::chat.message>
     One message row: avatar, byline with time and status, and a bubble.
     side: assistant (inline-start, default) | user (inline-end). name: sender (avatar initials and byline). avatar-src. avatar: a slot replacing the default avatar.
     time: when it was sent (shown as a localised time). status: sending | sent | error. retry: show a Retry button on an error; it fires nq-retry on the message.
     format: text (keeps whitespace, default) | markdown (safe, no raw HTML). streaming: still being produced, shows the typing indicator.
     text: the body as a string; or put it in the slot (plain text follows format, elements are rendered as is). --}}
@props(['side' => 'assistant', 'name' => null, 'avatarSrc' => null, 'avatar' => null, 'time' => null, 'status' => null, 'retry' => false, 'format' => 'text', 'streaming' => false, 'text' => null])
@php
    $user = $side === 'user';
    $raw = trim((string) $slot);
    // A slot without markup is a string (React children): it follows `format`.
    $body = $text ?? ($raw !== '' && ! str_contains($raw, '<') ? html_entity_decode($raw) : null);
    $empty = $body !== null ? $body === '' : $raw === '';
    $retryable = $status === 'error' && $retry;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'chat-message') }}" data-side="{{ $side }}" @if ($status) data-status="{{ $status }}" @endif @if ($streaming) data-streaming @endif
    @if ($retryable) x-data @endif
    {{ $attributes->except('data-slot')->cn(['flex max-w-[85%] items-start gap-2', $user ? 'flex-row-reverse self-end' : 'self-start']) }}>
    @if ($avatar && ! $avatar->isEmpty())
        {{ $avatar }}
    @elseif ($name)
        <x-nq::avatar :name="$name" :src="$avatarSrc" size="sm" class="mt-0.5" />
    @endif
    <div class="{{ \Nasaq\Cn::merge('flex min-w-0 flex-col gap-1', $user ? 'items-end' : 'items-start') }}">
        @if ($name || $time)
            <div class="flex items-center gap-2 text-caption text-muted-foreground">
                @if ($name)<span class="text-label text-foreground">{{ $name }}</span>@endif
                @if ($time)<x-nq::numeric.date-time :value="$time" time-style="short" />@endif
            </div>
        @endif
        <div data-slot="chat-bubble" @if ($streaming) aria-busy="true" @endif
            class="{{ \Nasaq\Cn::merge('min-w-0 rounded-card px-3 py-2 text-body', $user ? 'bg-secondary text-secondary-foreground' : 'border border-border bg-card text-nq-fg-body', $status === 'error' ? 'border border-nq-danger' : '') }}">
            @if (! $empty)
                @if ($body !== null && $format === 'markdown')
                    <x-nq::markdown :source="$body" />
                @elseif ($body !== null)
                    <p dir="auto" class="whitespace-pre-wrap text-start [overflow-wrap:anywhere]">{{ $body }}</p>
                @else
                    {{ $slot }}
                @endif
            @endif
            @if ($streaming)<x-nq::chat.typing-indicator :class="$empty ? '' : 'mt-1 block'" />@endif
        </div>
        @if ($status)
            <div data-slot="chat-status" class="flex items-center gap-1.5 text-caption text-muted-foreground">
                @if ($status === 'sending')
                    <x-nq::spinner class="size-3" />
                    <span role="status">{{ \Nasaq\Nasaq::t('Sending…', 'جارٍ الإرسال…') }}</span>
                @elseif ($status === 'sent')
                    <x-lucide-check aria-hidden="true" class="size-3" />
                    <span>{{ \Nasaq\Nasaq::t('Sent', 'تم الإرسال') }}</span>
                @else
                    <x-lucide-circle-alert aria-hidden="true" class="size-3 text-nq-danger-text" />
                    <span role="alert" class="text-nq-danger-text">{{ \Nasaq\Nasaq::t('Failed to send', 'تعذر الإرسال') }}</span>
                    @if ($retryable)
                        <x-nq::button type="button" variant="link" size="sm" x-on:click="$dispatch('nq-retry')">{{ \Nasaq\Nasaq::t('Retry', 'إعادة المحاولة') }}</x-nq::button>
                    @endif
                @endif
            </div>
        @endif
    </div>
</div>
