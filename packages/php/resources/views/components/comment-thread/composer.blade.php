{{-- <x-nq::comment-thread.composer kind="main" :suggestions="$people" />
     The text box and button of one comment, inside <x-nq::comment-thread> (it uses the thread's Alpine state): mentions with @, Ctrl or Cmd + Enter to send.
     kind: main (new comment, default) | reply (under the thread `for`) | edit (the comment `for`). for: the comment id of a reply or edit.
     placeholder, submit-label, author (['name', 'avatar'] for the avatar), cancelable (shows Cancel). --}}
@include('nasaq::components.comment-thread._logic')
@props(['kind' => 'main', 'for' => null, 'suggestions' => [], 'placeholder' => null, 'submitLabel' => null, 'author' => null, 'cancelable' => false, 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_ct_words($locale);
    $placeholder ??= $kind === 'reply' ? $t['writeReply'] : $t['write'];
    $submitLabel ??= $kind === 'reply' ? $t['reply'] : ($kind === 'edit' ? $t['save'] : $t['send']);
    $cancel = $kind === 'edit' ? 'cancelEdit()' : 'cancelReply()';
@endphp
<form data-slot="comment-composer" data-composer="{{ $kind }}" @if ($for !== null) data-for="{{ $for }}" @endif novalidate
    x-on:submit.prevent="submit('{{ $kind }}'@if ($for !== null), @js((string) $for)@endif)"
    x-on:keydown="key($event, '{{ $kind }}'@if ($for !== null), @js((string) $for)@endif)"
    x-on:nq-mentions-change="mentions.{{ $kind }} = $event.detail.mentions"
    {{ $attributes->cn('flex min-w-0 gap-3') }}>
    @if ($author)
        <x-nq::avatar :name="$author['name']" :src="$author['avatar'] ?? null" size="md" class="mt-0.5" />
    @endif
    <div class="flex min-w-0 flex-1 flex-col gap-2">
        <x-nq::mention-textarea x-model="drafts.{{ $kind }}" :suggestions="$suggestions" rows="2" placeholder="{{ $placeholder }}" aria-label="{{ $placeholder }}"
            x-bind:disabled="busy !== ''" />
        <p x-show="err.{{ $kind }}" x-cloak x-text="err.{{ $kind }}" role="alert" class="text-body-sm text-nq-danger-text"></p>
        <div class="flex items-center justify-end gap-2">
            @if ($cancelable)
                <x-nq::button type="button" variant="ghost" size="sm" x-on:click="{{ $cancel }}" x-bind:disabled="busy !== ''">{{ $t['cancel'] }}</x-nq::button>
            @endif
            <x-nq::button type="submit" variant="primary" size="sm" x-bind:disabled="empty('{{ $kind }}') || busy !== ''" x-bind:aria-busy="busy === '{{ $kind }}'">
                <x-nq::spinner x-show="busy === '{{ $kind }}'" x-cloak class="size-3.5" />
                {{ $submitLabel }}
            </x-nq::button>
        </div>
    </div>
</form>
