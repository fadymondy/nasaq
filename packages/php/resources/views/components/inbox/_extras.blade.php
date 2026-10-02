{{-- Internal: attachments and the link preview of one message (row.m in the thread's x-for). --}}
<ul x-show="row.m.attachments?.length" style="display: none" data-slot="attachment-list" class="{{ $attachClass ?? '' }} flex flex-wrap gap-1.5">
    <template x-for="a in (row.m.attachments ?? [])" x-bind:key="a.id">
        <li>
            <a x-bind:href="a.url ?? `#`" x-bind:download="a.name" class="flex max-w-56 items-center gap-2 rounded-control border border-border bg-card p-1.5 text-foreground no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                <img x-show="a.kind == `image` &amp;&amp; a.url" x-bind:src="a.url" alt="" loading="lazy" class="size-10 rounded-[4px] object-cover" style="display: none">
                <x-lucide-file-text x-show="a.kind != `image` || !a.url" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                <span class="flex min-w-0 flex-col">
                    <span dir="auto" class="truncate text-body-sm" x-text="a.name"></span>
                    <bdi x-show="a.size" dir="ltr" class="text-caption text-muted-foreground" x-text="a.size ? bytes(a.size) : ``"></bdi>
                </span>
            </a>
        </li>
    </template>
</ul>
<a x-show="row.m.linkPreview" style="display: none" data-slot="link-preview" x-bind:href="row.m.linkPreview?.url" target="_blank" rel="noopener noreferrer"
    x-bind:aria-label="`{{ $t['linkOpen'] }}: ` + (row.m.linkPreview?.title ?? host(row.m.linkPreview?.url ?? ``))"
    class="mt-2 flex w-64 max-w-full flex-col overflow-hidden rounded-control border border-border bg-card text-start no-underline outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
    <img x-show="row.m.linkPreview?.image" x-bind:src="row.m.linkPreview?.image" alt="" loading="lazy" class="aspect-video w-full object-cover" style="display: none">
    <span class="flex flex-col gap-0.5 p-2.5">
        <span dir="ltr" class="truncate text-caption text-muted-foreground" x-text="row.m.linkPreview?.siteName ?? host(row.m.linkPreview?.url ?? ``)"></span>
        <span x-show="row.m.linkPreview?.title" style="display: none" dir="auto" class="line-clamp-2 text-label text-foreground" x-text="row.m.linkPreview?.title"></span>
        <span x-show="row.m.linkPreview?.description" style="display: none" dir="auto" class="line-clamp-2 text-caption text-muted-foreground" x-text="row.m.linkPreview?.description"></span>
    </span>
</a>
