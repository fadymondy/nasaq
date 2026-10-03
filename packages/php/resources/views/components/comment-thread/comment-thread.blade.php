{{-- <x-nq::comment-thread :comments="$comments" :current-user="$me" :suggestions="$people" post edit delete />
     A conversation: comments with one level of replies, @mentions as chips, author-kind badges (agent, client, bot), a "pending review" state with Approve for moderators, edit and delete on your own comments, a sign-in prompt when signed out. Every action is also on the context menu.
     comments: flat list of ['id', 'author' => ['id', 'name', 'avatar', 'kind'], 'body', 'createdAt', 'editedAt', 'parentId', 'pending', 'mentions'].
     current-user ['id', 'name', 'avatar'], signed-in (true), suggestions ([['id', 'name']]) for @, can-moderate, hide-header, labels (override of the built-in words).
     post, edit, delete, approve: switch the action on (it is off by default, like omitting the callback). The page listens on the root, each event has detail.wait(promise); resolve { error } to keep the text and show it:
       nq-comment-submit {body, mentions, parentId?}, nq-comment-edit {id, body, mentions}, nq-comment-delete {id}, nq-comment-approve {id}, nq-comment-signin.
     Needs the Alpine module (nqCommentThread). --}}
@include('nasaq::components.comment-thread._logic')
@props(['comments' => [], 'currentUser' => null, 'signedIn' => true, 'suggestions' => [], 'canModerate' => false, 'hideHeader' => false, 'labels' => [], 'post' => false, 'edit' => false, 'delete' => false, 'approve' => false, 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_ct_words($locale, $labels);
    $threads = nq_ct_build($comments);
    $bodies = [];
    foreach ($comments as $c) {
        $bodies[(string) $c['id']] = (string) $c['body'];
    }
    $config = ['bodies' => (object) $bodies, 'labels' => ['failed' => $t['failed']]];
    $num = fn (int $n) => str_starts_with($locale, 'ar') ? strtr((string) $n, '0123456789', '٠١٢٣٤٥٦٧٨٩') : (string) $n;
@endphp
<section data-slot="comment-thread" aria-label="{{ $t['threadLabel'] }}" x-data="nqCommentThread(@js($config))" {{ $attributes->cn('flex min-w-0 flex-col gap-4')->except('data-slot') }}>
    @unless ($hideHeader)
        <h3 class="flex items-center gap-2 text-label text-foreground">
            <x-lucide-message-square aria-hidden="true" class="size-4 text-muted-foreground" />
            {{ $t['title'] }}
            <x-nq::badge variant="outline"><x-nq::numeric :value="count($comments)" /></x-nq::badge>
        </h3>
    @endunless
    @if (! $threads)
        <x-nq::states.empty icon="message-square" :title="$t['empty']" :description="$t['emptyHint']" />
    @else
        <ol class="m-0 flex list-none flex-col gap-5 p-0">
            @foreach ($threads as $node)
                @php($rid = (string) $node['comment']['id'])
                <li class="flex min-w-0 flex-col gap-3">
                    <x-nq::comment-thread.comment :comment="$node['comment']" :root-id="$rid" :current-user="$currentUser" :can-moderate="$canModerate" :signed-in="$signedIn" :post="$post" :edit="$edit" :delete="$delete" :approve="$approve" :suggestions="$suggestions" :locale="$locale" />
                    <ol @if ($node['replies']) aria-label="{{ sprintf($t['replies'], $num(count($node['replies']))) }}" @else x-show="replyTo === @js($rid)" x-cloak @endif
                        class="m-0 ms-4 flex list-none flex-col gap-3 border-s border-border p-0 ps-4">
                        @foreach ($node['replies'] as $r)
                            <li>
                                <x-nq::comment-thread.comment :comment="$r" reply :root-id="$rid" :current-user="$currentUser" :can-moderate="$canModerate" :signed-in="$signedIn" :post="$post" :edit="$edit" :delete="$delete" :approve="$approve" :suggestions="$suggestions" :locale="$locale" />
                            </li>
                        @endforeach
                        @if ($post && $signedIn)
                            <li x-show="replyTo === @js($rid)" x-cloak>
                                <x-nq::comment-thread.composer kind="reply" :for="$rid" :author="$currentUser" :suggestions="$suggestions" cancelable :locale="$locale" />
                            </li>
                        @endif
                    </ol>
                </li>
            @endforeach
        </ol>
    @endif
    @if ($post)
        @if ($signedIn)
            <x-nq::comment-thread.composer kind="main" :author="$currentUser" :suggestions="$suggestions" :locale="$locale" />
        @else
            <div data-slot="comment-signin" class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-border p-4">
                <div class="flex min-w-0 flex-col gap-0.5">
                    <span class="text-label text-foreground">{{ $t['signIn'] }}</span>
                    <span class="text-body-sm text-muted-foreground">{{ $t['signInHint'] }}</span>
                </div>
                <x-nq::button variant="primary" x-on:click="signIn()">
                    <x-lucide-log-in aria-hidden="true" class="rtl:-scale-x-100" />
                    {{ $t['signInAction'] }}
                </x-nq::button>
            </div>
        @endif
    @endif
</section>
