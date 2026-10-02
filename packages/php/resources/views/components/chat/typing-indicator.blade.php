{{-- <x-nq::chat.typing-indicator />   <x-nq::chat.typing-indicator label="Sara is typing" />
     Three pulsing dots. The pulse stops under reduced motion; the label is read by screen readers. label: default "Assistant is typing" / "المساعد يكتب". --}}
@props(['label' => null])
<span data-slot="{{ $attributes->get('data-slot', 'typing-indicator') }}" role="status" {{ $attributes->except('data-slot')->cn('inline-flex items-center gap-1 py-1') }}>
    @foreach ([0, 1, 2] as $i)
        <span aria-hidden="true" style="animation-delay: {{ $i * 150 }}ms" class="size-1.5 rounded-full bg-muted-foreground motion-safe:animate-pulse"></span>
    @endforeach
    <span class="sr-only">{{ $label ?? \Nasaq\Nasaq::t('Assistant is typing', 'المساعد يكتب') }}</span>
</span>
