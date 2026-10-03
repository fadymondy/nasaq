{{-- <x-nq::states title="لا توجد مهام بعد" description="تظهر هنا المهام التي تنشئها أو تُسند إليك.">
         <x-slot:actions><x-nq::button variant="primary">مهمة جديدة</x-nq::button></x-slot:actions>
     </x-nq::states>
     The empty state (also <x-nq::states.empty>). Siblings: states.error, states.loading, states.skeleton.
     title, description, icon (a lucide name, default "inbox"), hatch. The actions slot takes one primary button and optionally one secondary. --}}
@props(['title' => null, 'description' => null, 'icon' => 'inbox', 'hatch' => false, 'actions' => null, 'kind' => 'empty-state', 'iconClass' => 'text-muted-foreground'])
<div data-slot="{{ $kind }}" {{ $attributes->cn([
    'flex flex-col items-center justify-center gap-3 border border-dashed border-border px-6 py-12 text-center',
    'rounded-card',
    'hatch' => $hatch,
]) }}>
    @if ($icon)
        <span data-slot="state-icon" class="{{ \Nasaq\Cn::merge('inline-flex size-10 items-center justify-center rounded-control border border-border bg-card [&_svg]:size-5', $iconClass) }}">
            <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />
        </span>
    @endif
    <div class="flex max-w-sm flex-col gap-1">
        <p class="text-label text-foreground">{{ $title }}</p>
        @if ($description)
            <p class="text-body-sm text-muted-foreground">{{ $description }}</p>
        @endif
    </div>
    {{ $slot }}
    @if ($actions && ! $actions->isEmpty())
        <div class="mt-1 flex flex-wrap items-center justify-center gap-2">{{ $actions }}</div>
    @endif
</div>
