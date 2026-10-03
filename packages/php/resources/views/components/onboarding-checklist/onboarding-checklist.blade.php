{{-- <x-nq::onboarding-checklist :items="$items" x-on:action="openInvite($event.detail.id)" x-on:dismiss="hideCard()" />
     The in-app "Get started" card: how far setup is (x of y), the open items each with one action, and a dismiss. The first open item is highlighted as the next thing to do.
     It only reports clicks: you own which items are done.
     items: [['id' => 'invite', 'title' => 'Invite a teammate', 'description' => 'Work is better together.', 'done' => false, 'actionLabel' => 'Invite', 'icon' => 'users']] (icon: a lucide name).
     items is x-modelable: set an item's done to true (x-model on the component) and the card follows. title replaces "Get started". dismissible (default true): show the close button.
     labels: array overriding the built-in words.
     Bubbling events: "action" { id, wait } (wait(promise) keeps that button busy until it settles), "dismiss" { wait }, "complete" {} once, when the last item becomes done.
     Differences from the React component: items come as data with their icon by name; the pending button state needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'title' => null, 'dismissible' => true, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $T = \Nasaq\Nasaq::class;
    $L = fn (string $k, string $en, string $ar) => $labels[$k] ?? $T::t($en, $ar);
    $rows = collect($items)->map(fn ($i) => (array) $i)->values()->all();
    $heading = $title ?? $L('title', 'Get started', 'ابدأ من هنا');
    $dismiss = $L('dismiss', 'Dismiss the checklist', 'أخفِ القائمة');
    $progress = $L('progress', '{done} of {total} done', 'أُنجز {done} من {total}');
    $state = array_map(fn ($i) => ['id' => (string) $i['id'], 'done' => ! empty($i['done'])], $rows);
    $done = count(array_filter($state, fn ($i) => $i['done']));
    $first = collect($state)->search(fn ($i) => ! $i['done']);
    $config = ['title' => $heading, 'allDone' => $L('allDone', 'You are all set', 'كل شيء جاهز'), 'progress' => $progress];
@endphp
<section role="region" aria-label="{{ $heading }}" data-slot="{{ $attributes->get('data-slot', 'onboarding-checklist') }}" x-data="nqOnboardingChecklist(@js($state), @js($config))" x-modelable="items"
    x-bind:data-complete="summary().complete ? '' : null"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-3 rounded-card border border-border bg-card p-4 text-card-foreground') }}>
    <header class="flex items-start gap-3">
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <h3 class="text-h3 text-foreground" x-text="heading()">{{ $heading }}</h3>
            <p class="text-caption text-muted-foreground" data-slot="onboarding-checklist-count" x-text="progressText()">{{ str_replace(['{done}', '{total}'], [$done, count($state)], $progress) }}</p>
        </div>
        @if ($dismissible)
            <x-nq::button variant="ghost" size="icon" aria-label="{{ $dismiss }}" x-on:click="dismiss()">
                <x-lucide-x aria-hidden="true" />
            </x-nq::button>
        @endif
    </header>
    <div data-slot="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" x-bind:aria-valuenow="summary().percent" x-bind:aria-label="progressText()" x-bind:data-tone="summary().complete ? 'success' : 'default'" class="flex w-full flex-col gap-1.5">
        <div data-slot="progress-track" class="relative block w-full overflow-hidden rounded-full bg-nq-surface-soft h-1.5">
            <div data-slot="progress-indicator" x-bind:style="'inset-inline-start:0;width:' + summary().percent + '%'" x-bind:class="summary().complete ? 'bg-nq-success' : 'bg-primary'" class="block h-full rounded-full bg-primary transition-[width] duration-300 ease-nq motion-reduce:transition-none" style="inset-inline-start:0;width:{{ count($state) ? round($done / count($state) * 100) : 0 }}%"></div>
        </div>
    </div>
    <div x-show="summary().complete" x-cloak style="display: none" class="flex items-center gap-2 rounded-control bg-nq-success-soft px-3 py-2 text-body text-nq-success-text">
        <x-lucide-party-popper aria-hidden="true" class="size-4" />
        {{ $L('allDoneHint', 'Every step is done. Nice work.', 'أنجزت كل الخطوات. أحسنت.') }}
    </div>
    <ol x-show="!summary().complete" class="flex flex-col gap-1.5">
        @foreach ($rows as $i => $item)
            @php $id = (string) $item['id']; @endphp
            <li x-data="{ id: @js($id) }" x-bind:data-done="isDone(id) ? '' : null" x-bind:data-next="isNext(id) ? '' : null"
                x-bind:class="isNext(id) ? 'border-primary bg-nq-selected' : 'border-border bg-card'"
                class="flex items-center gap-3 rounded-control border px-3 py-2 {{ $i === $first ? 'border-primary bg-nq-selected' : 'border-border bg-card' }}">
                <span aria-hidden="true" x-bind:class="isDone(id) ? 'border-nq-success bg-nq-success text-primary-foreground' : 'border-nq-line-strong text-muted-foreground'"
                    class="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-nq-line-strong text-muted-foreground">
                    <x-lucide-circle-check class="size-4" x-show="isDone(id)" style="display: none" />
                    @if (! empty($item['icon']))
                        <span class="inline-flex" x-show="!isDone(id)"><x-dynamic-component :component="'lucide-'.$item['icon']" aria-hidden="true" /></span>
                    @endif
                </span>
                <span class="flex min-w-0 flex-1 flex-col text-start">
                    <span x-bind:class="isDone(id) ? 'text-muted-foreground line-through' : 'text-foreground'" class="truncate text-label text-foreground">
                        {{ $item['title'] }}
                        <span class="sr-only" x-text="isDone(id) ? @js(', '.$L('done', 'Done', 'تم')) : (isNext(id) ? @js(', '.$L('next', 'Next', 'التالي')) : '')"></span>
                    </span>
                    @if (! empty($item['description']))
                        <span x-show="!isDone(id)" class="truncate text-caption text-muted-foreground">{{ $item['description'] }}</span>
                    @endif
                </span>
                @if (! empty($item['actionLabel']))
                    <x-nq::button size="sm" x-show="!isDone(id)"
                        x-bind:class="isNext(id) ? 'bg-primary text-primary-foreground' : ''"
                        x-bind:disabled="pending !== null" x-bind:aria-busy="pending === id ? 'true' : null"
                        x-on:click="run(id)">
                        {{ $item['actionLabel'] }}
                        <x-lucide-loader-circle aria-hidden="true" class="size-4 animate-spin motion-reduce:animate-none" x-show="pending === id" style="display: none" />
                        <x-lucide-arrow-right aria-hidden="true" class="rtl:-scale-x-100" x-show="pending !== id" />
                    </x-nq::button>
                @endif
            </li>
        @endforeach
    </ol>
    @if ($dismissible)
        <x-nq::button variant="secondary" size="sm" class="self-start" x-show="summary().complete" x-cloak style="display: none" x-on:click="dismiss()">{{ $dismiss }}</x-nq::button>
    @endif
</section>
