{{-- Internal: the conversation list pane of x-nq::inbox (search, view tabs, channel and assignment chips, the rows). Runs in the inbox's Alpine scope. --}}
@php
    $chip = 'h-7 rounded-full px-2.5 text-caption text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-pressed:bg-secondary aria-pressed:text-foreground';
    $views = ['active' => 'viewActive', 'unread' => 'viewUnread', 'snoozed' => 'viewSnoozed', 'closed' => 'viewClosed', 'archived' => 'viewArchived'];
    $channels = ['all' => 'channelAll', 'chat' => 'channelChat', 'email' => 'channelEmail', 'whatsapp' => 'channelWhatsapp'];
    $scopes = ['all' => 'scopeAll', 'mine' => 'scopeMine', 'unassigned' => 'scopeUnassigned'];
@endphp
<section x-show="showList" aria-label="{{ $t['conversations'] }}" x-bind:class="compact ? `flex-1` : `w-80 shrink-0 border-e xl:w-96`" class="flex min-h-0 flex-col border-border bg-card">
    <div class="flex flex-col gap-2 border-b border-border p-3">
        <div class="relative">
            <x-lucide-search aria-hidden="true" class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <x-nq::field.input type="search" dir="auto" x-model="searchText" aria-label="{{ $t['search'] }}" placeholder="{{ $t['searchPlaceholder'] }}" class="ps-9" />
        </div>
        <x-nq::tabs default-value="active" x-model="view" class="gap-0">
            <x-nq::tabs.list aria-label="{{ $t['views'] }}" class="w-full overflow-x-auto">
                @foreach ($views as $id => $word)
                    <x-nq::tabs.tab value="{{ $id }}" class="gap-1.5">
                        {{ $t[$word] }}
                        <span class="text-caption tabular-nums text-muted-foreground" x-text="num(counts.{{ $id }})"></span>
                    </x-nq::tabs.tab>
                @endforeach
                <x-nq::tabs.indicator />
            </x-nq::tabs.list>
        </x-nq::tabs>
        <div class="flex flex-wrap items-center gap-1.5">
            <div role="group" aria-label="{{ $t['channels'] }}" class="flex flex-wrap gap-1">
                @foreach ($channels as $id => $word)
                    <button type="button" data-channel="{{ $id }}" x-bind:aria-pressed="chan == `{{ $id }}`" x-on:click="chan = `{{ $id }}`" class="{{ $chip }} border border-border aria-pressed:border-transparent">{{ $t[$word] }}</button>
                @endforeach
            </div>
            <span class="flex-1"></span>
            <div role="group" aria-label="{{ $t['scope'] }}" class="flex gap-1">
                @foreach ($scopes as $id => $word)
                    <button type="button" data-scope="{{ $id }}" x-bind:aria-pressed="scopeSel == `{{ $id }}`" x-on:click="scopeSel = `{{ $id }}`" class="{{ $chip }}">{{ $t[$word] }}</button>
                @endforeach
            </div>
        </div>
    </div>

    <ul x-show="cfg.loading" style="display: none" aria-busy="true" aria-label="{{ $t['loading'] }}" class="flex flex-col gap-1 p-3">
        @foreach ([1, 2, 3, 4, 5] as $i)
            <li class="flex items-center gap-3 rounded-control p-2">
                <span class="size-10 rounded-full bg-secondary motion-safe:animate-pulse"></span>
                <span class="flex flex-1 flex-col gap-2">
                    <span class="h-3 w-1/2 rounded bg-secondary motion-safe:animate-pulse"></span>
                    <span class="h-3 w-4/5 rounded bg-secondary motion-safe:animate-pulse"></span>
                </span>
            </li>
        @endforeach
    </ul>
    <div x-show="!cfg.loading &amp;&amp; rows.length == 0" style="display: none" class="m-3 flex flex-1 flex-col">
        <x-nq::states :title="$t['empty']" :description="$t['emptyHint']" class="flex-1 border-0" />
    </div>
    <div x-show="!cfg.loading &amp;&amp; rows.length != 0" role="list" class="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5">
        <template x-for="c in rows" x-bind:key="c.id">
            @if ($contextMenu)
                <x-nq::context-menu>
                    <x-nq::context-menu.trigger role="listitem" class="group/row relative data-popup-open:bg-nq-hover">
                        @include('nasaq::components.inbox._row')
                    </x-nq::context-menu.trigger>
                    <x-nq::context-menu.content class="min-w-52">
                        @include('nasaq::components.inbox._row-items', ['kit' => 'context-menu'])
                    </x-nq::context-menu.content>
                </x-nq::context-menu>
            @else
                <div role="listitem" class="group/row relative">
                    @include('nasaq::components.inbox._row')
                </div>
            @endif
        </template>
    </div>
</section>
