{{-- Internal: the contact panel of x-nq::inbox (details with copy buttons, tags, notes, Media / Files / Links). Runs inside the inbox's Alpine scope (conv, assignee, images, fileItems, linkItems). --}}
@php
    $fields = [
        ['contactEmail', 'email', 'conv.contact.email', true, true],
        ['contactPhone', 'phone', 'conv.contact.phone', true, true],
        ['contactCompany', 'company', 'conv.contact.company', false, false],
        ['contactLocation', 'location', 'conv.contact.location', false, false],
        ['contactTimezone', 'timezone', 'conv.contact.timezone', true, false],
    ];
@endphp
<div class="flex items-start justify-between gap-2 p-4 pb-0">
    <span class="text-label text-foreground">{{ $t['contact'] }}</span>
    <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t['hideContact'] }}" x-on:click="contactOpen = false"><x-lucide-x aria-hidden="true" /></x-nq::button>
</div>
<div class="flex flex-col items-center gap-2 p-4 text-center">
    @include('nasaq::components.inbox._avatar', ['name' => 'conv.contact.name', 'src' => 'conv.contact.avatar', 'size' => 'lg', 'class' => 'size-16 text-h3'])
    <h2 dir="auto" class="text-h3 text-foreground" x-text="conv.contact.name"></h2>
    <x-nq::badge variant="outline" x-text="channelLabel(conv.channel)"></x-nq::badge>
    <span x-show="assignee" style="display: none" class="text-caption text-muted-foreground" x-text="assignee ? say(`assignedTo`, { name: assignee.name }) : ``"></span>
</div>
<dl class="flex flex-col gap-3 border-t border-border p-4">
    @foreach ($fields as [$label, $key, $expr, $ltr, $copy])
        <div x-show="{{ $expr }}" style="display: none" class="flex flex-col gap-0.5">
            <dt class="text-caption text-muted-foreground">{{ $t[$label] }}</dt>
            <dd class="flex items-center gap-1 text-body-sm text-foreground">
                @if ($ltr)
                    <bdi dir="ltr" class="min-w-0 flex-1 truncate {{ $key === 'phone' ? 'tabular-nums' : '' }}" x-text="{{ $expr }}"></bdi>
                @else
                    <span dir="auto" x-text="{{ $expr }}"></span>
                @endif
                @if ($copy)
                    <button type="button" data-action="copy-{{ $key }}" aria-label="{{ $t['copy'] }}: {{ $t[$label] }}" x-on:click="copy({{ $expr }}, `{{ $key }}`)"
                        class="inline-flex size-7 shrink-0 items-center justify-center rounded-control text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4">
                        <x-lucide-check x-show="copied == `{{ $key }}`" aria-hidden="true" style="display: none" />
                        <x-lucide-copy x-show="copied != `{{ $key }}`" aria-hidden="true" />
                    </button>
                @endif
            </dd>
        </div>
    @endforeach
    <div x-show="conv.contact.firstSeen" style="display: none" class="flex flex-col gap-0.5">
        <dt class="text-caption text-muted-foreground">{{ $t['contactSince'] }}</dt>
        <dd class="flex items-center gap-1 text-body-sm text-foreground"><span x-text="conv.contact.firstSeen ? when(conv.contact.firstSeen, { dateStyle: `medium` }) : ``"></span></dd>
    </div>
    <div x-show="conv.contact.tags?.length" style="display: none" class="flex flex-col gap-1.5">
        <dt class="text-caption text-muted-foreground">{{ $t['contactTags'] }}</dt>
        <dd class="flex flex-wrap gap-1">
            <template x-for="tag in (conv.contact.tags ?? [])" x-bind:key="tag">
                <span data-slot="badge" class="inline-flex h-5 items-center rounded-full border border-border bg-secondary px-2 text-caption text-foreground" x-text="tag"></span>
            </template>
        </dd>
    </div>
    <div x-show="conv.contact.notes" style="display: none" class="flex flex-col gap-0.5">
        <dt class="text-caption text-muted-foreground">{{ $t['contactNotes'] }}</dt>
        <dd class="flex items-center gap-1 text-body-sm text-foreground"><span dir="auto" class="whitespace-pre-wrap text-nq-fg-body" x-text="conv.contact.notes"></span></dd>
    </div>
</dl>
<x-nq::tabs default-value="media" x-model="mediaTab" class="gap-3 border-t border-border p-4">
    <x-nq::tabs.list variant="underline" aria-label="{{ $t['mediaTabs'] }}">
        <x-nq::tabs.tab value="media"><x-lucide-image aria-hidden="true" />{{ $t['media'] }}</x-nq::tabs.tab>
        <x-nq::tabs.tab value="files"><x-lucide-file-text aria-hidden="true" />{{ $t['files'] }}</x-nq::tabs.tab>
        <x-nq::tabs.tab value="links"><x-lucide-link-2 aria-hidden="true" />{{ $t['links'] }}</x-nq::tabs.tab>
        <x-nq::tabs.indicator />
    </x-nq::tabs.list>
    <x-nq::tabs.panel value="media">
        <p x-show="images.length == 0" style="display: none" class="py-4 text-center text-caption text-muted-foreground">{{ $t['mediaEmpty'] }}</p>
        <ul x-show="images.length != 0" class="grid grid-cols-3 gap-1.5">
            <template x-for="m in images" x-bind:key="m.id">
                <li>
                    <button type="button" x-bind:aria-label="`{{ $t['mediaOpen'] }}: ` + m.name" x-on:click="openLightbox(m)"
                        class="block aspect-square w-full overflow-hidden rounded-control border border-border bg-secondary outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                        <img x-show="m.url" x-bind:src="m.url" alt="" loading="lazy" class="size-full object-cover" style="display: none">
                        <x-lucide-image x-show="!m.url" aria-hidden="true" class="m-auto size-5 text-muted-foreground" style="display: none" />
                    </button>
                </li>
            </template>
        </ul>
    </x-nq::tabs.panel>
    <x-nq::tabs.panel value="files">
        <p x-show="fileItems.length == 0" style="display: none" class="py-4 text-center text-caption text-muted-foreground">{{ $t['mediaEmpty'] }}</p>
        <ul x-show="fileItems.length != 0" class="flex flex-col gap-1">
            <template x-for="m in fileItems" x-bind:key="m.id">
                <li>
                    <a x-bind:href="m.url" x-bind:download="m.name" class="flex items-center gap-2 rounded-control p-1.5 no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                        <x-lucide-file-text aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                        <span dir="auto" class="min-w-0 flex-1 truncate text-body-sm text-foreground" x-text="m.name"></span>
                        <bdi x-show="m.size" dir="ltr" class="text-caption text-muted-foreground" x-text="m.size ? bytes(m.size) : ``"></bdi>
                    </a>
                </li>
            </template>
        </ul>
    </x-nq::tabs.panel>
    <x-nq::tabs.panel value="links">
        <p x-show="linkItems.length == 0" style="display: none" class="py-4 text-center text-caption text-muted-foreground">{{ $t['mediaEmpty'] }}</p>
        <ul x-show="linkItems.length != 0" class="flex flex-col gap-1">
            <template x-for="m in linkItems" x-bind:key="m.id">
                <li>
                    <a x-bind:href="m.url" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 rounded-control p-1.5 no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                        <x-lucide-external-link aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                        <span class="flex min-w-0 flex-1 flex-col">
                            <span dir="auto" class="truncate text-body-sm text-foreground" x-text="m.name"></span>
                            <bdi dir="ltr" class="truncate text-caption text-muted-foreground" x-text="host(m.url ?? ``)"></bdi>
                        </span>
                    </a>
                </li>
            </template>
        </ul>
    </x-nq::tabs.panel>
</x-nq::tabs>
