{{-- <x-nq::tree-view aria-label="Files" :items="$items" :default-expanded="['docs']" />
     items: nested arrays of ['id' => 'docs', 'label' => 'Documents', 'icon' => 'folder' (lucide name, optional), 'textValue' => 'Documents' (typeahead),
            'badge' => 'New' (a badge after the label, optional; 'badgeVariant' => 'neutral' | 'info' | ...),
            'disabled' => false, 'hasChildren' => false (children load on demand), 'children' => [...]]. Give every node a unique id.
     default-expanded / default-selected: arrays of ids. selection-mode: single (default) | multiple | none. dir: ltr | rtl (default: the page direction).
     indent: rem per level (1.25). loading-label: the spinner text (Loading / جارٍ التحميل). selected is x-modelable: x-model="$wire.picked".
     A lazy node (hasChildren, no children) dispatches nq-tree-expand ({ id, loading(promise) }) the first time it opens.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'defaultExpanded' => [], 'defaultSelected' => [], 'selectionMode' => 'single', 'dir' => null, 'indent' => 1.25, 'loadingLabel' => null])
@php
    $expanded = array_map('strval', (array) $defaultExpanded);
    $selected = array_map('strval', (array) $defaultSelected);
    $rows = [];
    $walk = function (array $nodes, int $level, ?string $parent) use (&$walk, &$rows) {
        $size = count($nodes);
        foreach (array_values($nodes) as $i => $node) {
            $children = $node['children'] ?? null;
            $row = [
                'id' => (string) $node['id'],
                'parent' => $parent,
                'level' => $level,
                'pos' => $i + 1,
                'size' => $size,
                'expandable' => is_array($children) ? count($children) > 0 : (bool) ($node['hasChildren'] ?? false),
                'lazy' => ! is_array($children) && (bool) ($node['hasChildren'] ?? false),
                'disabled' => (bool) ($node['disabled'] ?? false),
                'text' => (string) ($node['textValue'] ?? $node['id']),
                'label' => $node['label'] ?? $node['id'],
                'icon' => $node['icon'] ?? null,
                'badge' => $node['badge'] ?? null,
                'badgeVariant' => $node['badgeVariant'] ?? 'neutral',
            ];
            $rows[] = $row;
            if (is_array($children)) {
                $walk($children, $level + 1, $row['id']);
            }
        }
    };
    $walk((array) $items, 1, null);
    $shown = [];
    foreach ($rows as $k => $row) {
        $visible = $row['parent'] === null || (($shown[$row['parent']] ?? false) && in_array($row['parent'], $expanded, true));
        $shown[$row['id']] = $visible;
        $rows[$k]['visible'] = $visible;
    }
    $tabId = null;
    foreach ($rows as $row) {
        if ($row['visible'] && ! $row['disabled'] && in_array($row['id'], $selected, true)) { $tabId = $row['id']; break; }
    }
    if ($tabId === null) {
        foreach ($rows as $row) {
            if ($row['visible'] && ! $row['disabled']) { $tabId = $row['id']; break; }
        }
    }
    $nodes = array_map(fn ($r) => ['id' => $r['id'], 'parent' => $r['parent'], 'expandable' => $r['expandable'], 'lazy' => $r['lazy'], 'disabled' => $r['disabled'], 'text' => $r['text']], $rows);
    $config = ['nodes' => $nodes, 'expanded' => $expanded, 'selected' => $selected, 'mode' => $selectionMode, 'dir' => $dir];
    $loading = $loadingLabel ?? \Nasaq\Nasaq::t('Loading', 'جارٍ التحميل');
@endphp
<div data-slot="tree-view" role="tree" x-data="nqTreeView(@js($config))" x-modelable="selected" x-on:keydown="onKeydown($event)"
    @if ($selectionMode === 'multiple') aria-multiselectable="true" @endif
    {{ $attributes->merge(['aria-label' => $attributes->has('aria-labelledby') ? null : \Nasaq\Nasaq::t('Tree', 'شجرة')])->cn('flex flex-col gap-0.5 text-body text-foreground') }}>
    @foreach ($rows as $row)
        @php($isSelected = in_array($row['id'], $selected, true))
        @php($isOpen = $row['expandable'] && in_array($row['id'], $expanded, true))
        <div data-slot="tree-view-item" data-node-id="{{ $row['id'] }}" x-bind="item(@js($row['id']))"
            @if ($isSelected) data-selected @endif
            @if ($isOpen) data-expanded @endif
            @if ($row['disabled']) data-disabled aria-disabled="true" @endif
            tabindex="{{ $row['id'] === $tabId ? 0 : -1 }}"
            aria-level="{{ $row['level'] }}" aria-setsize="{{ $row['size'] }}" aria-posinset="{{ $row['pos'] }}"
            @if ($row['expandable']) aria-expanded="{{ $isOpen ? 'true' : 'false' }}" @endif
            @if ($selectionMode !== 'none') aria-selected="{{ $isSelected ? 'true' : 'false' }}" @endif
            style="@unless ($row['visible']) display:none; @endunless padding-inline-start:{{ ($row['level'] - 1) * $indent + 0.375 }}rem"
            class="flex min-h-8 cursor-default items-center gap-1.5 rounded-control pe-2 outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus data-[selected]:bg-nq-selected data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
            <span data-slot="tree-view-toggle" class="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
                @if ($row['expandable'] && ! $row['disabled']) x-on:click.stop="toggle(@js($row['id']))" @endif>
                @if ($row['expandable'])
                    <span x-show="loading.includes(@js($row['id']))" style="display:none" role="status" class="inline-flex">
                        <x-lucide-loader-circle data-slot="spinner" aria-hidden="true" class="size-3.5 animate-spin motion-reduce:animate-none" />
                        <span class="sr-only">{{ $loading }}</span>
                    </span>
                    <span x-show="!loading.includes(@js($row['id']))" class="contents">
                        <span x-show="expanded.includes(@js($row['id']))" class="contents" @unless ($isOpen) style="display:none" @endunless><x-lucide-chevron-down aria-hidden="true" class="size-4" /></span>
                        <span x-show="!expanded.includes(@js($row['id']))" class="contents" @if ($isOpen) style="display:none" @endif><x-nq::icon name="chevron-right" directional class="size-4" /></span>
                    </span>
                @endif
            </span>
            @if ($row['icon'])
                <span data-slot="tree-view-icon" aria-hidden="true" class="flex shrink-0 items-center text-muted-foreground [&_svg]:size-4"><x-dynamic-component :component="'lucide-'.$row['icon']" /></span>
            @endif
            @if (filled($row['badge']))
                <span class="flex min-w-0 flex-1 items-center gap-2">
                    <span dir="auto" class="truncate">{{ $row['label'] }}</span>
                    <x-nq::badge :variant="$row['badgeVariant']">{{ $row['badge'] }}</x-nq::badge>
                </span>
            @else
                <span class="min-w-0 flex-1 truncate">{{ $row['label'] }}</span>
            @endif
        </div>
    @endforeach
</div>
