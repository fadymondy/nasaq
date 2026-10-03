{{-- Internal: one file on a sent message: a thumbnail or an icon, the name, the size. attachment: { id, name, type?, size?, url?, error? }. t: the words. --}}
@include('nasaq::components.copilot-chat._logic')
@props(['attachment' => [], 't' => []])
@php
    $a = $attachment;
    $image = str_starts_with((string) ($a['type'] ?? ''), 'image/') && nq_cc_preview_url($a['url'] ?? null);
    $detail = $a['error'] ?? nq_cc_bytes($a['size'] ?? null);
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'copilot-attachment') }}" @if (! empty($a['error'])) data-error @endif title="{{ $a['error'] ?? $a['name'] }}"
    {{ $attributes->except('data-slot')->cn(['inline-flex max-w-56 items-center gap-2 rounded-control border bg-card p-1 pe-1.5 text-caption', ! empty($a['error']) ? 'border-nq-danger' : 'border-border']) }}>
    @if ($image)<img src="{{ $a['url'] }}" alt="" class="size-8 shrink-0 rounded-sm object-cover" />@else<span aria-hidden="true" class="grid size-8 shrink-0 place-items-center rounded-sm bg-secondary text-muted-foreground"><x-lucide-file-text class="size-4" /></span>@endif
    <span class="flex min-w-0 flex-col">
        <span dir="auto" class="truncate text-foreground">{{ $a['name'] }}</span>
        <span class="{{ \Nasaq\Cn::merge('truncate text-[11px] tabular-nums', ! empty($a['error']) ? 'text-nq-danger-text' : 'text-muted-foreground') }}">{{ $detail }}</span>
    </span>
</span>
