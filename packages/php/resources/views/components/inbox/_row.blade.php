{{-- Internal: one conversation row (c in the list's x-for): the open button and the ⋯ menu. --}}
<button type="button" x-bind:aria-current="c.id == selId ? `true` : null" x-bind:data-unread="isUnread(c) ? `` : null" x-on:click="pick(c.id)"
    class="flex w-full items-start gap-3 rounded-control p-2.5 pe-10 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus aria-[current=true]:bg-secondary">
    @include('nasaq::components.inbox._avatar', ['name' => 'c.contact.name', 'src' => 'c.contact.avatar', 'size' => 'md'])
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="flex items-center gap-1.5">
            <span x-show="c.color" style="display: none" aria-hidden="true" data-slot="color-dot" class="inline-block size-2 shrink-0 rounded-full" x-bind:style="c.color ? `background: var(--nq-tag-` + c.color + `)` : ``"></span>
            <span dir="auto" x-bind:class="isUnread(c) ? `font-semibold` : `font-medium`" class="min-w-0 flex-1 truncate text-body-sm text-foreground" x-text="c.contact.name"></span>
            <x-lucide-pin x-show="c.pinned" style="display: none" aria-label="{{ $t['pinned'] }}" class="size-3 shrink-0 text-muted-foreground" />
            <x-lucide-bell-off x-show="c.muted" style="display: none" aria-label="{{ $t['muted'] }}" class="size-3 shrink-0 text-muted-foreground" />
            <span x-show="lastAt(c)" style="display: none" class="shrink-0 text-caption text-muted-foreground" x-text="lastAt(c) ? relative(lastAt(c)) : ``"></span>
        </span>
        <span x-show="c.subject" style="display: none" dir="auto" class="truncate text-caption text-foreground" x-text="c.subject"></span>
        <span class="flex items-center gap-1.5">
            <span dir="auto" x-bind:class="isUnread(c) ? `text-foreground` : `text-muted-foreground`" class="min-w-0 flex-1 truncate text-caption" x-text="preview(c)"></span>
            <span x-show="isUnread(c)" style="display: none" class="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-nq-accent px-1 text-caption tabular-nums text-foreground">
                <span aria-hidden="true" x-text="num(c.unread ?? 0)"></span>
                <span class="sr-only" x-text="say(`unreadCount`, { n: num(c.unread ?? 0) })"></span>
            </span>
        </span>
        <span class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1 text-caption text-muted-foreground">
                <x-lucide-message-circle x-show="c.channel == `chat`" style="display: none" aria-hidden="true" class="size-3" />
                <x-lucide-mail x-show="c.channel == `email`" style="display: none" aria-hidden="true" class="size-3" />
                <span x-text="channelLabel(c.channel)"></span>
            </span>
            <span x-show="snoozedText(c)" style="display: none" class="text-caption text-muted-foreground" x-text="snoozedText(c)"></span>
        </span>
    </span>
</button>
<div class="absolute end-1.5 top-1.5">
    <x-nq::dropdown-menu>
        <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" x-bind:aria-label="say(`rowActions`, { name: c.contact.name })" class="opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 data-[popup-open]:opacity-100 max-md:opacity-100">
            <x-lucide-more-horizontal aria-hidden="true" />
        </x-nq::dropdown-menu.trigger>
        <x-nq::dropdown-menu.content align="end" class="min-w-52">
            @include('nasaq::components.inbox._row-items', ['kit' => 'dropdown-menu'])
        </x-nq::dropdown-menu.content>
    </x-nq::dropdown-menu>
</div>
