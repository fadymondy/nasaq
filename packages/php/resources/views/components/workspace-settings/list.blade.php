{{-- <x-nq::workspace-settings.list :workspaces="$workspaces" can-create @open="$event.detail.wait(switchTo($event.detail.workspace))" @create="openCreateDialog()" />
     Every workspace you belong to, with your role, its size and a button to open it.
     workspaces: [['id', 'name', 'slug', 'logo', 'role' => label, 'members' => count, 'current' => bool]]. title replaces the heading. can-create adds the "New workspace" button.
     labels: any of the strings below, by key. Needs the Alpine runtime (@nasaqScripts).
       open    detail.workspace { id, name }, detail.wait(promise?): the button shows a spinner until it settles. Nobody waiting is fine.
       create  (no detail) fired by the "New workspace" button. --}}
@props(['workspaces' => [], 'title' => null, 'canCreate' => false, 'labels' => []])
@php
    $L = fn (string $key, string $en, string $arabic) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $num = fn ($n) => number_format($n, 0, '.', ',');
    $members = fn ($n) => $n === 1 ? $L('membersOne', '1 member', 'عضو واحد') : str_replace('{n}', $num($n), $L('membersMany', '{n} members', '{n} أعضاء'));
    $heading = $title ?? $L('listTitle', 'Your workspaces', 'مساحات عملك');
    $items = collect($workspaces)->mapWithKeys(fn ($w) => [(string) $w['id'] => ['id' => $w['id'], 'name' => $w['name']]])->all();
    $newLabel = $L('newWorkspace', 'New workspace', 'مساحة عمل جديدة');
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'workspace-list') }}" aria-label="{{ $heading }}" x-data="nqWorkspaceList(@js(['workspaces' => (object) $items]))"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-h3 text-foreground">{{ $heading }}</h2>
        @if ($canCreate)
            <x-nq::button type="button" variant="secondary" x-on:click="create()"><x-lucide-plus aria-hidden="true" />{{ $newLabel }}</x-nq::button>
        @endif
    </div>
    @if (count($workspaces))
        <ul aria-label="{{ $L('listLabel', 'Workspaces', 'مساحات العمل') }}" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            @foreach ($workspaces as $w)
                <li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <x-nq::avatar :name="$w['name']" :src="$w['logo'] ?? null" shape="square" size="lg" />
                    <div class="flex min-w-0 flex-1 flex-col">
                        <span class="flex items-center gap-2 truncate text-label text-foreground">
                            {{ $w['name'] }}
                            @if (! empty($w['current']))
                                <x-nq::badge variant="brand"><x-lucide-check aria-hidden="true" />{{ $L('current', 'Current', 'الحالية') }}</x-nq::badge>
                            @endif
                        </span>
                        <span class="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
                            @if (! empty($w['slug']))<bdi dir="ltr">{{ $w['slug'] }}</bdi>@endif
                            @if (isset($w['members']))<span>{{ $members($w['members']) }}</span>@endif
                        </span>
                    </div>
                    @if (! empty($w['role']))<x-nq::badge variant="neutral">{{ $w['role'] }}</x-nq::badge>@endif
                    @if (! empty($w['current']))
                        <x-nq::button type="button" size="sm" variant="ghost" disabled>{{ $L('open', 'Open', 'فتح') }}</x-nq::button>
                    @else
                        <x-nq::button type="button" size="sm" variant="secondary" data-id="{{ $w['id'] }}" x-on:click="open($el.dataset.id)" x-bind:aria-busy="isOpening($el.dataset.id) ? 'true' : null" x-bind:data-disabled="isOpening($el.dataset.id) ? '' : null">
                            <x-nq::spinner x-show="isOpening($el.dataset.id)" style="display: none" />
                            {{ $L('open', 'Open', 'فتح') }}
                        </x-nq::button>
                    @endif
                </li>
            @endforeach
        </ul>
    @else
        <x-nq::states.empty :title="$L('listEmpty', 'You are not in any workspace yet', 'لست في أي مساحة عمل بعد')" :description="$L('listEmptyHint', 'Create one, or ask a teammate to invite you.', 'أنشئ واحدة، أو اطلب من زميل دعوتك.')">
            @if ($canCreate)
                <x-slot:actions>
                    <x-nq::button type="button" variant="primary" x-on:click="create()"><x-lucide-plus aria-hidden="true" />{{ $newLabel }}</x-nq::button>
                </x-slot:actions>
            @endif
        </x-nq::states.empty>
    @endif
</section>
