{{-- <x-nq::code-tabs install="@nasaq/web" sync-key="pm" />   <x-nq::code-tabs :tabs="[['label' => 'curl', 'language' => 'bash', 'code' => '…'], …]" title="Request" ai-copy />
     The same snippet in several languages or package managers, in tabs. Each panel is a code block. Copy copies the visible tab.
     tabs: [{ label, code, value?, language? (bash), filename? }]. Shortcuts: install="pkg" (pnpm/npm/yarn/bun add; dev, global) or
     exec="shadcn@latest add button" (dlx/npx/bunx); managers: ["pnpm","npm"] limits them.
     default-value, sync-key (blocks with the same key switch together), title (left of the tabs), ai-copy (the AI copy menu instead of the plain button),
     line-numbers, pre-class, label (the tab list's name). Fires nq-code-tab ({ value }). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['tabs' => [], 'install' => null, 'exec' => null, 'dev' => false, 'global' => false, 'managers' => ['pnpm', 'npm', 'yarn', 'bun'], 'defaultValue' => null, 'syncKey' => null, 'title' => null, 'aiCopy' => false, 'lineNumbers' => false, 'preClass' => null, 'label' => null])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $flag = fn (string $short) => $dev ? " {$short}" : '';
    $tabs = collect($tabs);
    if ($install !== null) {
        $tabs = collect($managers)->map(fn ($m) => ['label' => $m, 'language' => 'bash', 'code' => match ($m) {
            'pnpm' => 'pnpm add'.($global ? ' -g' : $flag('-D')).' '.$install,
            'npm' => 'npm install'.($global ? ' -g' : $flag('-D')).' '.$install,
            'yarn' => $global ? 'yarn global add '.$install : 'yarn add'.$flag('-D').' '.$install,
            default => 'bun add'.($global ? ' -g' : $flag('-d')).' '.$install,
        }]);
    } elseif ($exec !== null) {
        $tabs = collect($managers)->map(fn ($m) => ['label' => $m, 'language' => 'bash', 'code' => match ($m) {
            'pnpm' => 'pnpm dlx '.$exec,
            'npm' => 'npx '.$exec,
            'yarn' => 'yarn dlx '.$exec,
            default => 'bunx '.$exec,
        }]);
    }
    $tabs = $tabs->map(fn ($x) => $x + ['value' => $x['label'], 'language' => 'bash', 'filename' => null])->values();
    $initial = $defaultValue ?? ($tabs->first()['value'] ?? null);
@endphp
<div data-slot="code-tabs" dir="ltr" x-data="nqCodeTabs({!! \Illuminate\Support\Js::from(['active' => $initial, 'syncKey' => $syncKey]) !!})"
    x-on:nq-code-tabs-sync.window="onSync($event)" {{ $attributes->cn('overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start') }}>
    <x-nq::tabs :default-value="$initial" x-model="active" class="gap-0">
        <div class="flex h-row items-center justify-between gap-2 border-b border-border ps-3 pe-1.5">
            <div class="flex min-w-0 items-center gap-3">
                @if ($title)<span class="hidden truncate font-mono text-caption text-muted-foreground sm:block">{{ $title }}</span>@endif
                <x-nq::tabs.list variant="underline" :aria-label="$label ?? $t('Code variants', 'صيغ الشيفرة')" class="h-row gap-3 border-b-0">
                    @foreach ($tabs as $tab)
                        <x-nq::tabs.tab :value="$tab['value']" class="h-row font-mono text-caption">{{ $tab['label'] }}</x-nq::tabs.tab>
                    @endforeach
                    <x-nq::tabs.indicator />
                </x-nq::tabs.list>
            </div>
            @foreach ($tabs as $tab)
                <span class="contents" x-show="active === {!! \Illuminate\Support\Js::from((string) $tab['value']) !!}" @if ((string) $tab['value'] !== (string) $initial) style="display: none" @endif>
                    @if ($aiCopy)
                        <x-nq::code-copy-menu :code="$tab['code']" :language="$tab['language']" :filename="$tab['filename']" />
                    @else
                        <x-nq::copy-button :value="preg_replace('/\n$/', '', $tab['code'])" :label="$t('Copy code', 'نسخ الشيفرة')" :copied-label="$t('Code copied to clipboard', 'تم نسخ الشيفرة إلى الحافظة')" />
                    @endif
                </span>
            @endforeach
        </div>
        @foreach ($tabs as $tab)
            <x-nq::tabs.panel :value="$tab['value']" class="outline-none">
                <x-nq::code-block :code="$tab['code']" :language="$tab['language']" :label="$tab['filename'] ?? $tab['label']" :line-numbers="$lineNumbers" :copyable="false" :pre-class="$preClass" class="rounded-none border-0 bg-transparent" />
            </x-nq::tabs.panel>
        @endforeach
    </x-nq::tabs>
</div>
