{{-- <x-nq::provider-switcher :capabilities="[['capability' => 'data', 'label' => 'Data', 'active' => 'postgres', 'options' => ['postgres', 'sqlite'], 'isDefault' => true]]" />
     capabilities: one row each: capability, label, description, active, options (ids, or ['id', 'label', 'description', 'disabled']), isDefault, locked.
     Picking a backend dispatches a "select" event ({ capability, backend, wait(promise) }): @select="save($event.detail)".
     Call detail.wait(promise) to keep the row busy until it settles; a rejected promise puts the old backend back.
     selectable="false" makes it read-only. labels: override the built-in strings (capability, backend, isDefault, overridden, empty).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['capabilities' => [], 'selectable' => true, 'labels' => []])
@php
    $t = array_merge([
        'capability' => \Nasaq\Nasaq::t('Capability', 'القدرة'),
        'backend' => \Nasaq\Nasaq::t('Backend', 'المزوّد'),
        'isDefault' => \Nasaq\Nasaq::t('Default', 'افتراضي'),
        'overridden' => \Nasaq\Nasaq::t('Overridden', 'مُعدَّل'),
        'empty' => \Nasaq\Nasaq::t('No swappable capabilities.', 'لا توجد قدرات قابلة للتبديل.'),
    ], $labels);
    $choose = fn (string $name) => \Nasaq\Nasaq::t('Backend for '.$name, 'مزوّد '.$name);
    $rows = collect($capabilities)->map(function ($row) {
        $options = collect($row['options'] ?? [])->map(fn ($o) => is_string($o) ? ['id' => $o] : $o)->values();

        return array_merge($row, ['options' => $options, 'name' => $row['label'] ?? $row['capability']]);
    });
    $state = $rows->mapWithKeys(fn ($r) => [$r['capability'] => ['active' => $r['active'], 'isDefault' => $r['isDefault'] ?? null]])->all();
@endphp
@if ($rows->isEmpty())
    <div data-slot="provider-switcher" {{ $attributes->cn('rounded-card border border-border p-6 text-center text-body-sm text-muted-foreground') }}>{{ $t['empty'] }}</div>
@else
    <div data-slot="provider-switcher" x-data="nqProviderSwitcher(@js($state))" {{ $attributes->cn('overflow-hidden rounded-card border border-border bg-card') }}>
        <div aria-hidden="true" class="hidden grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)] gap-4 border-b border-border px-4 py-2 text-caption text-muted-foreground sm:grid">
            <span>{{ $t['capability'] }}</span>
            <span>{{ $t['backend'] }}</span>
        </div>
        <ul class="divide-y divide-border">
            @foreach ($rows as $row)
                @php
                    $key = $row['capability'];
                    $labelOf = $row['options']->mapWithKeys(fn ($o) => [$o['id'] => $o['label'] ?? $o['id']]);
                @endphp
                <li data-slot="provider-switcher-row" data-capability="{{ $key }}" :aria-busy="busy === '{{ $key }}' ? 'true' : undefined"
                    class="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)] sm:items-center sm:gap-4">
                    <div class="flex min-w-0 flex-col gap-0.5">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="text-label text-foreground">{{ $row['label'] ?? $key }}</span>
                            @if (array_key_exists('isDefault', $row) && $row['isDefault'] !== null)
                                <span x-show="rows[@js($key)].isDefault === true" x-cloak @if (! $row['isDefault']) style="display: none" @endif class="contents"><x-nq::status tone="neutral">{{ $t['isDefault'] }}</x-nq::status></span>
                                <span x-show="rows[@js($key)].isDefault === false" x-cloak @if ($row['isDefault']) style="display: none" @endif class="contents"><x-nq::status tone="info">{{ $t['overridden'] }}</x-nq::status></span>
                            @endif
                        </div>
                        @if (! empty($row['description']))
                            <p class="text-caption text-muted-foreground">{{ $row['description'] }}</p>
                        @endif
                    </div>
                    <x-nq::select :value="$row['active']" x-model="rows['{{ $key }}'].active">
                        {{-- select.trigger hard-codes its data-slot, so the button is written out here to carry data-slot="provider-switcher-select". --}}
                        <button data-slot="provider-switcher-select" x-ref="trigger" x-bind="trigger" aria-label="{{ $choose((string) ($row['name'] ?? $key)) }}"
                            :disabled="busy === '{{ $key }}'" @if (! $selectable || ! empty($row['locked'])) disabled @endif
                            class="{{ \Nasaq\Cn::merge('flex h-control w-full min-w-0 items-center justify-between gap-2 rounded-control border border-input bg-card px-3 text-body text-foreground min-h-[var(--nq-touch-min,0px)] cursor-default select-none outline-none transition-colors duration-150 ease-nq focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-popup-open:border-nq-focus data-invalid:border-nq-danger disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:text-[16px]', 'w-full') }}">
                            <span data-slot="select-value" x-text="@js($labelOf)[value] ?? value" class="min-w-0 flex-1 truncate text-start">{{ $labelOf[$row['active']] ?? $row['active'] }}</span>
                            <span class="flex shrink-0 text-muted-foreground [&_svg]:size-4"><x-lucide-chevrons-up-down /></span>
                        </button>
                        <x-nq::select.content>
                            @foreach ($row['options'] as $o)
                                <x-nq::select.item :value="$o['id']" :disabled="! empty($o['disabled'])">
                                    <span class="flex flex-col">
                                        <span>{{ $o['label'] ?? $o['id'] }}</span>
                                        @if (! empty($o['description']))
                                            <span class="text-caption text-muted-foreground">{{ $o['description'] }}</span>
                                        @endif
                                    </span>
                                </x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </li>
            @endforeach
        </ul>
    </div>
@endif
