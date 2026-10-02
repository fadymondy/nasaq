{{-- <x-nq::desktop-icons :items="[['id' => 'files', 'title' => 'Files', 'icon' => 'folder'], ['id' => 'notes', 'title' => 'Notes', 'icon' => 'notebook-pen']]" />
     Icons on a desktop: a tile and a two-line label each. Put it in the default slot of <x-nq::desktop-os-shell>, which opens the app when an icon fires "nq-desktop-icon-open"; or on any wallpaper.
     items: id, title, icon (a lucide name, wrapped in the app-icon tile) or icon-html (trusted HTML for the tile). hidden: ids left off the desktop.
     free: drag icons to place them (native pointer events, snapped to the cell grid unless snap is false); the default is an auto grid. positions: saved places by id ['files' => ['x' => 8, 'y' => 8]].
     open-on: auto (default; double-click with a mouse, a tap on touch screens) | click | double-click. selected: the selected id (x-modelable: x-model="$wire.selected").
     Arrow keys move between icons (mirrored in RTL), Enter or Space opens one, Escape clears the selection.
     Events (bubbling, from the root): "nq-desktop-icon-open" { id }, "nq-desktop-icon-select" { id }, "nq-desktop-icon-move" { id, x, y } (free mode, after a drop).
     labels: ['desktopIcons' => ]. Not ported: the context menu (Open, your actions, Remove from desktop). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'hidden' => [], 'free' => false, 'snap' => true, 'positions' => [], 'openOn' => 'auto', 'selected' => null, 'labels' => []])
@php
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $rows = collect($items)->map(fn ($i) => [
        'id' => $i['id'],
        'title' => $i['title'],
        'iconHtml' => $i['iconHtml'] ?? \Illuminate\Support\Facades\Blade::render('<x-nq::desktop-os-shell.app-icon :icon="$icon" />', ['icon' => $i['icon'] ?? 'app-window']),
    ])->values()->all();
    $options = array_filter([
        'free' => $free ?: null,
        'snap' => $snap ? null : false,
        'openOn' => $openOn !== 'auto' ? $openOn : null,
        'positions' => $positions ?: null,
        'hidden' => $hidden ?: null,
        'selected' => $selected,
    ], fn ($v) => $v !== null);
    $label = $labels['desktopIcons'] ?? \Nasaq\Nasaq::t('Desktop', 'سطح المكتب');
    $button = 'group flex w-22 select-none flex-col items-center gap-1.5 rounded-lg p-1.5 text-center outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus';
    $caption = 'line-clamp-2 max-w-full rounded-sm px-1 text-caption font-medium break-words';
@endphp
<div role="group" aria-label="{{ $label }}" data-slot="{{ $attributes->get('data-slot', 'desktop-icon-grid') }}" @if ($free) data-free @endif
    x-data="nqDesktopIcons({!! $js($rows) !!}, {!! $js((object) $options) !!})" x-modelable="selected"
    x-on:keydown="groupKey($event)" x-on:pointerdown="background($event)"
    {{ $attributes->except('data-slot')->cn($free ? 'relative size-full' : 'grid auto-rows-max grid-cols-[repeat(auto-fill,6rem)] content-start gap-2 p-2') }}>
    <template x-for="(item, index) in visible()" x-bind:key="item.id">
        @if ($free)
            <div data-slot="desktop-icon-position" x-bind:data-dragging="dragging === item.id ? '' : null" x-bind:style="style(item.id, index)"
                x-bind:class="dragging === item.id ? 'z-10 opacity-85' : ''" class="absolute [touch-action:none]"
                x-on:pointerdown="down($event, item.id, index)" x-on:pointermove="move($event)" x-on:pointerup="up($event)" x-on:pointercancel="up($event)">
                <button type="button" data-slot="desktop-icon" x-bind:data-id="item.id" x-bind:data-selected="selected === item.id ? '' : null" x-bind:aria-pressed="selected === item.id ? 'true' : 'false'"
                    x-on:click.capture="clickCapture($event)" x-on:click="click(item.id)" x-on:dblclick="dblclick(item.id)" x-on:keydown="keydown($event, item.id)"
                    x-bind:class="selected === item.id ? 'bg-primary/15 ring-1 ring-primary/40' : 'hover:bg-nq-hover'" class="{{ $button }}">
                    <span aria-hidden="true" class="size-12 shrink-0" x-html="item.iconHtml"></span>
                    <span x-text="item.title" x-bind:class="selected === item.id ? 'bg-primary text-primary-foreground' : 'bg-background/70 text-foreground'" class="{{ $caption }}"></span>
                </button>
            </div>
        @else
            <div class="flex">
                <button type="button" data-slot="desktop-icon" x-bind:data-id="item.id" x-bind:data-selected="selected === item.id ? '' : null" x-bind:aria-pressed="selected === item.id ? 'true' : 'false'"
                    x-on:click="click(item.id)" x-on:dblclick="dblclick(item.id)" x-on:keydown="keydown($event, item.id)"
                    x-bind:class="selected === item.id ? 'bg-primary/15 ring-1 ring-primary/40' : 'hover:bg-nq-hover'" class="{{ $button }}">
                    <span aria-hidden="true" class="size-12 shrink-0" x-html="item.iconHtml"></span>
                    <span x-text="item.title" x-bind:class="selected === item.id ? 'bg-primary text-primary-foreground' : 'bg-background/70 text-foreground'" class="{{ $caption }}"></span>
                </button>
            </div>
        @endif
    </template>
</div>
