{{-- <x-nq::settings-sections.setting-row id="email" label="Email digest" description="A weekly summary."> control </x-nq::settings-sections.setting-row>
     A settings line: label and hint on one side, the control (a switch, a select, a button) at the inline end.
     id must equal the entry id in the groups, so a search hit scrolls here. Stacks on narrow screens. --}}
@props(['id', 'label' => null, 'description' => null])
<div data-slot="{{ $attributes->get('data-slot', 'setting-row') }}" data-setting-id="{{ $id }}"
    {{ $attributes->except('data-slot')->cn([
        'flex flex-col gap-2 rounded-control py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        'data-[highlight=true]:bg-nq-selected data-[highlight=true]:outline-2 data-[highlight=true]:outline-offset-4 data-[highlight=true]:outline-nq-focus',
    ]) }}>
    <div class="flex min-w-0 flex-col gap-0.5">
        <span class="text-label text-foreground">{{ $label }}</span>
        @if ($description)<span class="text-body-sm text-muted-foreground">{{ $description }}</span>@endif
    </div>
    @if (! $slot->isEmpty())<div class="flex shrink-0 items-center gap-2 sm:max-w-[50%]">{{ $slot }}</div>@endif
</div>
