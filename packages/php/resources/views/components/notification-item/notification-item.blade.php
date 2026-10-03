{{-- <x-nq::notification-item :actor="['name' => 'نور عادل']" title="أشارت إليك نور عادل في MH-728" description="..." time="2m" unread unread-label="غير مقروء" />
     One row of the notifications side-over. Unread = accent dot + stronger title, never colour alone.
     href renders an <a> (target="_blank" adds rel="noopener noreferrer"); otherwise a <button type="button">.
     actor: ['name' => ..., 'avatar' => url] renders an avatar unless <x-slot:icon> is given. time: pre-formatted ("2m"); date-time: ISO 8601 for <time>.
     <x-slot:title> / <x-slot:description> take markup in place of the title / description strings. --}}
@props(['href' => null, 'target' => null, 'rel' => null, 'actor' => null, 'icon' => null, 'title' => null, 'description' => null, 'time' => null, 'dateTime' => null, 'unread' => false, 'unreadLabel' => null])
@php
    $tag = $href !== null ? 'a' : 'button';
    $unreadText = $unreadLabel ?? \Nasaq\Nasaq::t('Unread', 'غير مقروء');
    $rel ??= $target === '_blank' ? 'noopener noreferrer' : null;
    $hasIcon = $icon !== null && ! ($icon instanceof \Illuminate\View\ComponentSlot && $icon->isEmpty());
    $hasDescription = $description !== null && ! ($description instanceof \Illuminate\View\ComponentSlot && $description->isEmpty());
@endphp
<{{ $tag }}
    @if ($href !== null) href="{{ $href }}" @if ($target) target="{{ $target }}" @endif @if ($rel) rel="{{ $rel }}" @endif @else type="button" @endif
    data-slot="notification-item" @if ($unread) data-unread @endif
    {{ $attributes->cn([
        'flex w-full items-start no-underline gap-3 px-4 py-3 text-start outline-none',
        'transition-colors duration-150 ease-nq hover:bg-nq-hover',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
    ]) }}>
    <span class="relative mt-0.5 shrink-0">
        @if ($hasIcon)
            <span class="flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground [&_svg]:size-4">{{ $icon }}</span>
        @elseif ($actor)
            <x-nq::avatar :name="$actor['name']" :src="$actor['avatar'] ?? null" size="md" />
        @endif
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="{{ \Nasaq\Cn::merge('text-body-sm', $unread ? 'font-medium text-foreground' : 'text-muted-foreground') }}">{{ $title }}</span>
        @if ($hasDescription)
            <span class="line-clamp-2 text-caption text-muted-foreground">{{ $description }}</span>
        @endif
    </span>
    <span class="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
        @if ($time)
            <time @if ($dateTime) datetime="{{ $dateTime }}" @endif class="text-caption text-muted-foreground tabular-nums">{{ $time }}</time>
        @endif
        @if ($unread)
            <span class="size-2 rounded-full bg-nq-accent"><span class="sr-only">{{ $unreadText }}</span></span>
        @endif
    </span>
</{{ $tag }}>
