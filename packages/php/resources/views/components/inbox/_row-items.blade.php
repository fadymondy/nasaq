{{-- Internal: the choices of a conversation row (pin, read state, mute, colour, snooze, archive), shared by the ⋯ menu and the context menu.
     kit: dropdown-menu | context-menu. Runs inside the row's x-for (c is the conversation) and uses the inbox's patch() and snoozeTo(). --}}
@php
    $k = 'nq::'.$kit;
    $hues = ['gray', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink'];
@endphp
<x-dynamic-component :component="$k.'.item'" data-action="pin" x-on:click="patch(c.id, { pinned: !c.pinned })">
    <x-lucide-pin-off x-show="c.pinned" aria-hidden="true" style="display: none" />
    <x-lucide-pin x-show="!c.pinned" aria-hidden="true" />
    <span x-text="c.pinned ? t.unpin : t.pin">{{ $t['pin'] }}</span>
</x-dynamic-component>
<x-dynamic-component :component="$k.'.item'" data-action="read" x-on:click="patch(c.id, { unread: !isUnread(c) })">
    <x-lucide-mail-open x-show="isUnread(c)" aria-hidden="true" style="display: none" />
    <x-lucide-mail x-show="!isUnread(c)" aria-hidden="true" />
    <span x-text="isUnread(c) ? t.markRead : t.markUnread">{{ $t['markUnread'] }}</span>
</x-dynamic-component>
<x-dynamic-component :component="$k.'.item'" data-action="mute" x-on:click="patch(c.id, { muted: !c.muted })">
    <x-lucide-bell x-show="c.muted" aria-hidden="true" style="display: none" />
    <x-lucide-bell-off x-show="!c.muted" aria-hidden="true" />
    <span x-text="c.muted ? t.unmute : t.mute">{{ $t['mute'] }}</span>
</x-dynamic-component>
<x-dynamic-component :component="$k.'.sub'">
    <x-dynamic-component :component="$k.'.sub-trigger'"><x-lucide-palette aria-hidden="true" />{{ $t['color'] }}</x-dynamic-component>
    <x-dynamic-component :component="$k.'.sub-content'" class="min-w-40">
        <x-dynamic-component :component="$k.'.item'" data-action="color" x-on:click="patch(c.id, { color: null })">
            <span aria-hidden="true" class="inline-block size-2.5 rounded-full border border-border"></span>
            <span class="flex-1">{{ $t['noColor'] }}</span>
            <x-lucide-check x-show="!c.color" aria-hidden="true" style="display: none" />
        </x-dynamic-component>
        @foreach ($hues as $hue)
            <x-dynamic-component :component="$k.'.item'" data-action="color" x-on:click="patch(c.id, { color: `{{ $hue }}` })">
                <span aria-hidden="true" class="inline-block size-2.5 shrink-0 rounded-full" style="background: var(--nq-tag-{{ $hue }})"></span>
                <span class="flex-1">{{ $t['colors'][$hue] }}</span>
                <x-lucide-check x-show="c.color == `{{ $hue }}`" aria-hidden="true" style="display: none" />
            </x-dynamic-component>
        @endforeach
    </x-dynamic-component>
</x-dynamic-component>
<x-dynamic-component :component="$k.'.sub'">
    <x-dynamic-component :component="$k.'.sub-trigger'"><x-lucide-clock aria-hidden="true" />{{ $t['snooze'] }}</x-dynamic-component>
    <x-dynamic-component :component="$k.'.sub-content'" class="min-w-56">
        <template x-for="p in snoozeOptions" x-bind:key="p.id">
            <x-dynamic-component :component="$k.'.item'" data-action="snooze" x-on:click="snoozeTo(c.id, p.at)">
                <span class="flex-1" x-text="p.label"></span>
                <span class="text-caption text-muted-foreground" x-text="p.hint"></span>
            </x-dynamic-component>
        </template>
        <template x-if="c.status == `snoozed`">
            <x-dynamic-component :component="$k.'.item'" data-action="unsnooze" x-on:click="snoozeTo(c.id, null)">{{ $t['unsnooze'] }}</x-dynamic-component>
        </template>
    </x-dynamic-component>
</x-dynamic-component>
<x-dynamic-component :component="$k.'.separator'" />
<x-dynamic-component :component="$k.'.item'" data-action="archive" x-on:click="patch(c.id, { archived: !c.archived })">
    <x-lucide-archive-restore x-show="c.archived" aria-hidden="true" style="display: none" />
    <x-lucide-archive x-show="!c.archived" aria-hidden="true" />
    <span x-text="c.archived ? t.unarchive : t.archive">{{ $t['archive'] }}</span>
</x-dynamic-component>
