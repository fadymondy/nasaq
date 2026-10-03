{{-- <x-nq::workspace-switcher :workspaces="[['id' => '3x1', 'name' => '3x1', 'description' => 'Pro · 12 members'], ['id' => 'personal', 'name' => 'Fady Mondy']]" value="3x1" create />
     The organisation / team switcher at the top of the sidebar. workspaces: id, name, description, logoSrc (a URL), logo (trusted HTML, an icon).
     value: the active workspace id (x-modelable: x-model="$wire.workspace"). create: adds the "Add workspace" item, which dispatches a bubbling "nq-workspace-create" event on window.
     The default slot adds items under the list. labels: ['heading' => , 'create' => ]. Folds to the logo on the collapsed rail. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['workspaces' => [], 'value' => null, 'create' => false, 'labels' => []])
@php
    $list = array_values($workspaces);
    $active = collect($list)->firstWhere('id', $value) ?? ($list[0] ?? null);
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $heading = $labels['heading'] ?? \Nasaq\Nasaq::t('Workspaces', 'مساحات العمل');
    $add = $labels['create'] ?? \Nasaq\Nasaq::t('Add workspace', 'إضافة مساحة عمل');
    $names = collect($list)->pluck('name', 'id')->all();
    $g = 'group-data-collapsed/sidebar:';
    // The logo: a supplied icon, an image, or the name's initials.
    $logo = function (array $w, string $size) {
        $box = $size === 'md' ? 'size-8' : 'size-6';
        if (! empty($w['logo'])) {
            return '<span class="inline-flex shrink-0 items-center justify-center rounded-control border border-border bg-card '.$box.'">'.$w['logo'].'</span>';
        }
        return \Illuminate\Support\Facades\Blade::render('<x-nq::avatar :name="$name" :src="$src" shape="square" :size="$size" />', ['name' => $w['name'] ?? '', 'src' => $w['logoSrc'] ?? null, 'size' => $size === 'md' ? 'md' : 'sm']);
    };
@endphp
@if ($active)
<div data-slot="{{ $attributes->get('data-slot', 'workspace-switcher-root') }}" x-data="{ ws: {!! $js($active['id']) !!}, names: {!! $js($names) !!} }" x-modelable="ws" {{ $attributes->except('data-slot')->cn('contents') }}>
<x-nq::dropdown-menu>
    <button type="button" data-slot="workspace-switcher" x-bind="trigger" x-ref="trigger"
        x-bind:aria-label="typeof rail !== 'undefined' && rail && collapsed ? names[ws] : null"
        class="{{ implode(' ', [
            'flex w-full items-center gap-2 rounded-control px-1.5 text-start outline-none',
            'transition-colors duration-150 ease-nq hover:bg-nq-hover data-popup-open:bg-nq-selected',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
            'min-h-[calc(var(--spacing-nav-row)+12px)] border border-border bg-background/60 py-1 shadow-xs hover:border-nq-line-strong',
            $g.'size-control '.$g.'justify-center '.$g.'px-0 '.$g.'border-0 '.$g.'bg-transparent '.$g.'shadow-none',
        ]) }}">
        @foreach ($list as $w)
            <span data-workspace="{{ $w['id'] }}" class="flex min-w-0 flex-1 items-center gap-2 {{ $g }}flex-none"
                x-show="ws === $el.dataset.workspace" @if ($w['id'] !== $active['id']) style="display: none" @endif>
                {!! $logo($w, 'md') !!}
                <span class="grid min-w-0 flex-1 {{ $g }}hidden">
                    <span class="truncate text-label leading-snug text-foreground">{{ $w['name'] }}</span>
                    @if (! empty($w['description']))<span class="truncate text-caption leading-snug text-muted-foreground">{{ $w['description'] }}</span>@endif
                </span>
            </span>
        @endforeach
        <x-lucide-chevrons-up-down aria-hidden="true" class="size-4 shrink-0 text-muted-foreground {{ $g }}hidden" />
    </button>
    <x-nq::dropdown-menu.content side="bottom" align="start" class="w-[max(16rem,var(--anchor-width))]">
        <x-nq::dropdown-menu.group>
            <x-nq::dropdown-menu.label>{{ $heading }}</x-nq::dropdown-menu.label>
            @foreach ($list as $w)
                <x-nq::dropdown-menu.item class="h-10" :data-workspace="$w['id']" x-on:click="ws = $el.dataset.workspace" x-bind:aria-current="ws === $el.dataset.workspace ? 'true' : null">
                    {!! $logo($w, 'sm') !!}
                    <span class="min-w-0 flex-1 truncate">{{ $w['name'] }}</span>
                    <span class="contents" x-show="ws === $el.closest('[data-workspace]').dataset.workspace" @if ($w['id'] !== $active['id']) style="display: none" @endif><x-lucide-check aria-hidden="true" class="text-foreground!" /></span>
                </x-nq::dropdown-menu.item>
            @endforeach
        </x-nq::dropdown-menu.group>
        @if ($slot->isNotEmpty() || $create)<x-nq::dropdown-menu.separator />@endif
        {{ $slot }}
        @if ($create)
            <x-nq::dropdown-menu.item class="text-muted-foreground" data-workspace-create x-on:click="$dispatch('nq-workspace-create')">
                <span class="inline-flex size-6 items-center justify-center rounded-control border border-dashed border-border"><x-lucide-plus class="size-3.5!" /></span>
                {{ $add }}
            </x-nq::dropdown-menu.item>
        @endif
    </x-nq::dropdown-menu.content>
</x-nq::dropdown-menu>
</div>
@endif
