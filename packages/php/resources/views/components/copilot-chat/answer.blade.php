{{-- Internal: the assistant side of one turn: tool steps, streamed Markdown, artifacts, sources, actions and follow-ups. Used by <x-nq::copilot-chat>.
     Its buttons call the root scope (copyAnswer, rate, regenerate, send). message: the message array. last: it is the last message. t: the words. --}}
@include('nasaq::components.copilot-chat._logic')
@props(['message' => [], 'last' => false, 't' => [], 'regenerate' => false, 'feedback' => false, 'share' => false, 'copyTargets' => ['claude', 'chatgpt', 'cursor'], 'allowHtml' => false])
@php
    $m = $message;
    $id = (string) ($m['id'] ?? '');
    $text = (string) ($m['text'] ?? '');
    $busy = (bool) ($m['streaming'] ?? false);
    $failed = array_key_exists('error', $m) && $m['error'] !== null;
    $idJs = \Illuminate\Support\Js::from($id)->toHtml();
    $copyJs = \Illuminate\Support\Js::from($t['copy'])->toHtml();
    $goodJs = \Illuminate\Support\Js::from($t['good'])->toHtml();
    $followUps = $m['followUps'] ?? [];
@endphp
<x-nq::chat.message side="assistant" :name="$t['assistant']" :time="$m['at'] ?? null" :streaming="$busy && $text === '' && empty($m['steps'])" data-id="{{ $id }}"
    {{ $attributes->cn('w-full min-w-0 [&>div:last-child]:flex-1 [&_[data-slot=chat-bubble]]:w-full') }}>
    <x-slot:avatar>
        <span aria-hidden="true" class="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><x-lucide-sparkles class="size-4" /></span>
    </x-slot:avatar>
    <div class="flex min-w-0 flex-col gap-3">
        @if (! empty($m['steps']))<x-nq::copilot-chat.steps :steps="$m['steps']" :streaming="$busy" :t="$t" />@endif
        @if ($text !== '')
            @foreach (nq_cc_segments($text) as $seg)
                @if ($seg['kind'] === 'code')
                    <x-nq::code-block-ai :code="$seg['code']" :language="$seg['language']" :targets="$copyTargets" />
                @else
                    <x-nq::markdown :source="$seg['text']" class="text-body" />
                @endif
            @endforeach
        @endif
        @if ($busy && $text !== '')<span aria-hidden="true" class="inline-block h-4 w-1.5 rounded-sm bg-nq-accent motion-safe:animate-pulse"></span>@endif
        @if (! empty($m['artifacts']))<x-nq::artifact-renderer.list :artifacts="$m['artifacts']" :allow-html="$allowHtml" />@endif
        @if ($failed)
            <div role="alert" data-slot="copilot-stream-error" class="flex flex-wrap items-center gap-2 rounded-control border border-nq-danger bg-nq-danger-soft px-3 py-2 text-caption text-nq-danger-text">
                <x-lucide-triangle-alert aria-hidden="true" class="size-3.5 shrink-0" />
                <span class="min-w-0 flex-1">{{ $m['error'] !== '' ? $m['error'] : $t['streamError'] }}</span>
                @if ($last && $regenerate)
                    <x-nq::button type="button" variant="secondary" size="sm" x-on:click="regenerate({!! $idJs !!})"><x-lucide-refresh-cw aria-hidden="true" />{{ $t['retry'] }}</x-nq::button>
                @endif
            </div>
        @endif
        @if (! $busy && ! empty($m['sources']))<x-nq::copilot-chat.sources :sources="$m['sources']" :t="$t" />@endif
        @if (! $busy && $text !== '')
            <div class="flex items-center gap-0.5 text-muted-foreground" data-slot="copilot-actions">
                <x-nq::button type="button" variant="ghost" size="icon-sm" data-id="{{ $id }}" data-copy="{{ $text }}" x-on:click="copyAnswer($el)"
                    x-bind:aria-label="copyLabel({!! $idJs !!}, {!! $copyJs !!})" x-bind:title="copyLabel({!! $idJs !!}, {!! $copyJs !!})">
                    <x-lucide-check x-show="isCopied({!! $idJs !!})" style="display: none" aria-hidden="true" class="size-3.5" />
                    <x-lucide-copy x-show="! isCopied({!! $idJs !!})" aria-hidden="true" class="size-3.5" />
                </x-nq::button>
                @if ($share)
                    <x-nq::button type="button" variant="ghost" size="icon-sm" data-copy="{{ $text }}" x-show="canShare()" style="display: none" x-on:click="shareAnswer($el)" aria-label="{{ $t['share'] }}" title="{{ $t['share'] }}">
                        <x-lucide-share-2 aria-hidden="true" class="size-3.5" />
                    </x-nq::button>
                @endif
                @if ($feedback)
                    <x-nq::button type="button" variant="ghost" size="icon-sm" x-on:click="rate({!! $idJs !!}, 'up')" x-bind:aria-pressed="pressed({!! $idJs !!}, 'up')" aria-label="{{ $t['good'] }}" title="{{ $t['good'] }}" class="aria-pressed:text-nq-accent">
                        <x-lucide-thumbs-up aria-hidden="true" class="size-3.5" />
                    </x-nq::button>
                    <x-nq::button type="button" variant="ghost" size="icon-sm" x-on:click="rate({!! $idJs !!}, 'down')" x-bind:aria-pressed="pressed({!! $idJs !!}, 'down')" aria-label="{{ $t['bad'] }}" title="{{ $t['bad'] }}" class="aria-pressed:text-nq-danger-text">
                        <x-lucide-thumbs-down aria-hidden="true" class="size-3.5" />
                    </x-nq::button>
                @endif
                @if ($last && $regenerate && ! $failed)
                    <x-nq::button type="button" variant="ghost" size="icon-sm" x-on:click="regenerate({!! $idJs !!})" aria-label="{{ $t['regenerate'] }}" title="{{ $t['regenerate'] }}">
                        <x-lucide-refresh-cw aria-hidden="true" class="size-3.5" />
                    </x-nq::button>
                @endif
            </div>
        @endif
        @if (! $busy && $last && count($followUps))
            <div role="group" aria-label="{{ $t['followUps'] }}" class="flex flex-wrap gap-2">
                @foreach ($followUps as $f)
                    <button type="button" dir="auto" x-on:click="send({!! \Illuminate\Support\Js::from((string) $f) !!})"
                        class="rounded-full border border-border bg-card px-3 py-1 text-start text-caption text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">{{ $f }}</button>
                @endforeach
            </div>
        @endif
    </div>
</x-nq::chat.message>
