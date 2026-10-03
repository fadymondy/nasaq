{{-- <x-nq::comment-thread.comment :comment="$c" :current-user="$me" post edit delete />
     One comment, inside <x-nq::comment-thread> (it uses the thread's Alpine state): author, badges, body, actions (the "…" menu and the context menu), inline edit and delete confirmation.
     comment: ['id', 'author' => ['id', 'name', 'avatar', 'kind'], 'body', 'createdAt', 'editedAt', 'parentId', 'pending', 'mentions' => [['id', 'name']]].
     reply: a reply (smaller avatar, no reply button). root-id: the thread the Reply button replies into. current-user: ['id']. can-moderate.
     signed-in (true), post, edit, delete, approve: the actions that are on. suggestions: people offered by @ in the edit box. --}}
@include('nasaq::components.comment-thread._logic')
@props(['comment', 'reply' => false, 'rootId' => null, 'currentUser' => null, 'canModerate' => false, 'signedIn' => true, 'post' => false, 'edit' => false, 'delete' => false, 'approve' => false, 'suggestions' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_ct_words($locale);
    $c = $comment;
    $id = (string) $c['id'];
    $author = $c['author'];
    $kind = $author['kind'] ?? 'human';
    $kinds = ['agent' => ['accent', 'bot'], 'client' => ['info', 'user-round'], 'bot' => ['neutral', 'bot']];
    $badge = $kinds[$kind] ?? null;
    $pending = ! empty($c['pending']);
    $own = $currentUser && ($currentUser['id'] ?? null) === $author['id'];
    $canApprove = $pending && $canModerate && $approve;
    $canEdit = $edit && ($own || $canModerate);
    $canDelete = $delete && ($own || $canModerate);
    $canReply = $signedIn && $post && ! $reply;
    $hasMenu = $canApprove || $canEdit || $canDelete;
    $source = nq_ct_link_mentions((string) $c['body'], $c['mentions'] ?? []);
    $body = \Illuminate\Support\Facades\Blade::render('<x-nq::markdown :source="$s" class="gap-2 text-body-sm" />', ['s' => $source]);
    $body = str_replace('<a href="#mention-', '<a data-slot="comment-mention" href="#mention-', $body);
    $chip = "[&_a[href^='#mention-']]:cursor-default [&_a[href^='#mention-']]:rounded-[4px] [&_a[href^='#mention-']]:bg-nq-info-soft [&_a[href^='#mention-']]:px-1 [&_a[href^='#mention-']]:font-medium [&_a[href^='#mention-']]:text-nq-info-text [&_a[href^='#mention-']]:no-underline";
    $idJs = \Illuminate\Support\Js::from($id)->toHtml();
    $actionsLabel = sprintf($t['actions'], $author['name']);
    $replyInto = \Illuminate\Support\Js::from((string) ($rootId ?? $id))->toHtml();
@endphp
<x-nq::context-menu>
    <x-nq::context-menu.trigger data-slot="comment" role="article" aria-label="{{ $author['name'] }}" :data-pending="$pending ? '' : null"
        class="{{ \Nasaq\Cn::merge('-m-2 flex min-w-0 gap-3 rounded-card p-2', $pending ? 'bg-nq-warning-soft/40' : '') }}">
        <x-nq::avatar :name="$author['name']" :src="$author['avatar'] ?? null" :size="$reply ? 'sm' : 'md'" class="mt-0.5" />
        <div class="flex min-w-0 flex-1 flex-col gap-1">
            <header class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="text-label text-foreground">{{ $author['name'] }}</span>
                @if ($badge)
                    <x-nq::badge :variant="$badge[0]">
                        <x-dynamic-component :component="'lucide-'.$badge[1]" aria-hidden="true" />
                        {{ $t[$kind] }}
                    </x-nq::badge>
                @endif
                @if ($pending)<x-nq::badge variant="warning">{{ $t['pending'] }}</x-nq::badge>@endif
                <x-nq::numeric.date-time :value="$c['createdAt']" relative class="text-caption text-muted-foreground" />
                @if (! empty($c['editedAt']))<span class="text-caption text-muted-foreground">({{ $t['edited'] }})</span>@endif
                @if ($hasMenu)
                    <span class="ms-auto">
                        <x-nq::dropdown-menu>
                            <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" aria-label="{{ $actionsLabel }}">
                                <x-lucide-ellipsis aria-hidden="true" />
                            </x-nq::dropdown-menu.trigger>
                            <x-nq::dropdown-menu.content align="end" class="min-w-44">
                                @if ($canApprove)
                                    <x-nq::dropdown-menu.item data-action="approve" x-on:click="approve({!! $idJs !!})"><x-lucide-check aria-hidden="true" />{{ $t['approve'] }}</x-nq::dropdown-menu.item>
                                @endif
                                @if ($canApprove && ($canEdit || $canDelete))<x-nq::dropdown-menu.separator />@endif
                                @if ($canEdit)
                                    <x-nq::dropdown-menu.item data-action="edit" x-on:click="startEdit({!! $idJs !!})"><x-lucide-pencil aria-hidden="true" />{{ $t['edit'] }}</x-nq::dropdown-menu.item>
                                @endif
                                @if ($canEdit && $canDelete)<x-nq::dropdown-menu.separator />@endif
                                @if ($canDelete)
                                    <x-nq::dropdown-menu.item variant="danger" data-action="delete" x-on:click="askDelete({!! $idJs !!})"><x-lucide-trash-2 aria-hidden="true" />{{ $t['delete'] }}</x-nq::dropdown-menu.item>
                                @endif
                            </x-nq::dropdown-menu.content>
                        </x-nq::dropdown-menu>
                    </span>
                @endif
            </header>
            @if ($canEdit)
                <div x-show="editId === {!! $idJs !!}" x-cloak>
                    <x-nq::comment-thread.composer kind="edit" :for="$id" :suggestions="$suggestions" cancelable />
                </div>
            @endif
            <div data-slot="comment-body" @if ($canEdit) x-show="editId !== {!! $idJs !!}" @endif x-on:click="mentionClick($event)" class="{{ $chip }}">{!! $body !!}</div>
            @if ($pending)
                <p @if ($canEdit) x-show="editId !== {!! $idJs !!}" @endif class="text-caption text-muted-foreground">{{ $t['pendingHint'] }}</p>
            @endif
            @if ($canApprove || $canDelete)
                <p x-show="err['c:' + {!! $idJs !!}]" x-cloak x-text="err['c:' + {!! $idJs !!}]" role="alert" class="text-body-sm text-nq-danger-text"></p>
            @endif
            @if ($canDelete)
                <div x-show="confirmId === {!! $idJs !!}" x-cloak role="alertdialog" aria-label="{{ $t['confirmDelete'] }}" class="flex flex-wrap items-center gap-2 text-body-sm">
                    <span class="text-foreground">{{ $t['confirmDelete'] }}</span>
                    <x-nq::button size="sm" variant="danger" data-action="confirm-delete" x-on:click="remove({!! $idJs !!})" x-bind:disabled="busy !== ''">{{ $t['delete'] }}</x-nq::button>
                    <x-nq::button size="sm" variant="ghost" x-on:click="cancelDelete()">{{ $t['cancel'] }}</x-nq::button>
                </div>
            @endif
            @if ($canReply)
                <div @if ($canEdit) x-show="editId !== {!! $idJs !!}" @endif>
                    <x-nq::button variant="ghost" size="sm" class="-ms-2 text-muted-foreground" data-action="reply" x-on:click="startReply({!! $replyInto !!})">
                        <x-lucide-corner-down-right aria-hidden="true" class="rtl:-scale-x-100" />
                        {{ $t['reply'] }}
                    </x-nq::button>
                </div>
            @endif
        </div>
    </x-nq::context-menu.trigger>
    @if ($canReply || $hasMenu)
        <x-nq::context-menu.content class="min-w-44">
            @if ($canReply)
                <x-nq::context-menu.item data-action="reply" x-on:click="startReply({!! $replyInto !!})"><x-lucide-corner-down-right aria-hidden="true" />{{ $t['reply'] }}</x-nq::context-menu.item>
            @endif
            @if ($canReply && $hasMenu)<x-nq::context-menu.separator />@endif
            @if ($canApprove)
                <x-nq::context-menu.item data-action="approve" x-on:click="approve({!! $idJs !!})"><x-lucide-check aria-hidden="true" />{{ $t['approve'] }}</x-nq::context-menu.item>
            @endif
            @if ($canApprove && ($canEdit || $canDelete))<x-nq::context-menu.separator />@endif
            @if ($canEdit)
                <x-nq::context-menu.item data-action="edit" x-on:click="startEdit({!! $idJs !!})"><x-lucide-pencil aria-hidden="true" />{{ $t['edit'] }}</x-nq::context-menu.item>
            @endif
            @if ($canEdit && $canDelete)<x-nq::context-menu.separator />@endif
            @if ($canDelete)
                <x-nq::context-menu.item variant="danger" data-action="delete" x-on:click="askDelete({!! $idJs !!})"><x-lucide-trash-2 aria-hidden="true" />{{ $t['delete'] }}</x-nq::context-menu.item>
            @endif
        </x-nq::context-menu.content>
    @endif
</x-nq::context-menu>
