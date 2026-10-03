{{-- Internal. The tabs, the "Mark all read" row and the rows of <x-nq::notification-center>; it reads the nqNotificationCenter scope. --}}
@props(['sheet' => false, 'header' => null, 'initialUnread' => 0, 'total' => 0, 'labels' => []])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $L = array_merge([
        'title' => $T('Notifications', 'الإشعارات'),
        'all' => $T('All', 'الكل'),
        'unread' => $T('Unread', 'غير المقروءة'),
        'markAllRead' => $T('Mark all read', 'تعليم الكل كمقروء'),
        'emptyAll' => $T('No notifications', 'لا توجد إشعارات'),
        'emptyAllDescription' => $T('Mentions, reviews and activity show up here.', 'تظهر هنا الإشارات والمراجعات والنشاط.'),
        'emptyUnread' => $T('You are all caught up', 'لا جديد'),
        'emptyUnreadDescription' => $T('There is nothing new to read.', 'لا شيء جديد للقراءة.'),
        'unreadLabel' => $T('Unread', 'غير مقروء'),
    ], $labels);
    $hasHeader = $header !== null && ! ($header instanceof \Illuminate\View\ComponentSlot && $header->isEmpty());
    $list = 'm-0 list-none divide-y divide-border overflow-y-auto overscroll-contain p-0 '.($sheet ? 'min-h-0 flex-1' : 'max-h-96');
    $inner = <<<'HTML'
<span class="relative mt-0.5 shrink-0">
    <template x-if="item.icon"><span class="flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground [&_svg]:size-4" x-html="item.icon"></span></template>
    <template x-if="!item.icon && item.actor">
        <span data-slot="avatar" class="inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-secondary align-middle font-medium text-secondary-foreground size-8 text-caption rounded-full">
            <img data-slot="avatar-image" x-show="item.actor.avatar" x-bind:src="item.actor.avatar" x-bind:alt="item.actor.name" class="size-full object-cover">
            <span data-slot="avatar-fallback" x-show="!item.actor.avatar" role="img" x-bind:aria-label="item.actor.name" x-text="initials(item.actor.name)" class="flex size-full items-center justify-center"></span>
        </span>
    </template>
</span>
<span class="flex min-w-0 flex-1 flex-col gap-0.5">
    <span class="text-body-sm" x-bind:class="item.unread ? 'font-medium text-foreground' : 'text-muted-foreground'" x-text="item.title"></span>
    <span x-show="item.description" class="line-clamp-2 text-caption text-muted-foreground" x-text="item.description"></span>
</span>
<span class="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
    <time x-show="item.time !== undefined" x-bind:datetime="isoTime(item.time)" x-text="timeText(item.time)" class="text-caption text-muted-foreground tabular-nums"></time>
    <span x-show="item.unread" class="size-2 rounded-full bg-nq-accent"><span class="sr-only">__UNREAD__</span></span>
</span>
HTML;
    $inner = str_replace('__UNREAD__', e($L['unreadLabel']), $inner);
    $row = 'flex w-full items-start no-underline gap-3 px-4 py-3 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus';
    $rows = fn (string $only) => '<template x-for="item in rows('.$only.')" :key="item.id"><li>'
        .'<template x-if="item.href"><a data-slot="notification-item" x-bind:href="item.href" x-bind:data-unread="item.unread ? \'\' : null" x-on:click="press(item)" class="'.$row.'">'.$inner.'</a></template>'
        .'<template x-if="!item.href"><button type="button" data-slot="notification-item" x-bind:data-unread="item.unread ? \'\' : null" x-on:click="press(item)" class="'.$row.'">'.$inner.'</button></template>'
        .'</li></template>';
    $panel = $sheet ? 'flex min-h-0 flex-1 flex-col' : '';
@endphp
<x-nq::tabs default-value="all" class="{{ $sheet ? 'gap-0 min-h-0 flex-1' : 'gap-0' }}">
    <div class="{{ $sheet ? 'flex items-center justify-between gap-2 px-4 pt-3 pe-12' : 'flex items-center justify-between gap-2 border-b border-border px-4 pt-3' }}">
        <p x-bind:id="$id('nq-notification-center', 'title')" class="text-label text-foreground">{{ $L['title'] }}</p>
        <x-nq::button variant="ghost" size="sm" class="-mt-1" data-notification="mark-all-read" x-on:click="markAllRead()" x-bind:disabled="count() === 0">
            <x-lucide-check-check /> {{ $L['markAllRead'] }}
        </x-nq::button>
    </div>
    @if ($hasHeader)
        <div data-slot="notification-center-header" class="border-b border-border px-4 py-3">{{ $header }}</div>
    @endif
    <x-nq::tabs.list variant="underline" class="border-border px-4">
        <x-nq::tabs.tab value="all">{{ $L['all'] }}</x-nq::tabs.tab>
        <x-nq::tabs.tab value="unread">{{ $L['unread'] }} <span x-show="count() > 0" x-text="countText()" class="text-caption text-muted-foreground"></span></x-nq::tabs.tab>
        <x-nq::tabs.indicator />
    </x-nq::tabs.list>
    <x-nq::tabs.panel value="all" class="{{ $panel }}">
        <div x-show="rows(false).length === 0" @if ($total > 0) style="display: none" @endif>
            <x-nq::states icon="bell-off" class="border-0 py-10" :title="$L['emptyAll']" :description="$L['emptyAllDescription']" />
        </div>
        <ul x-show="rows(false).length > 0" class="{{ $list }}" @if ($total === 0) style="display: none" @endif>{!! $rows('false') !!}</ul>
    </x-nq::tabs.panel>
    <x-nq::tabs.panel value="unread" class="{{ $panel }}">
        <div x-show="rows(true).length === 0" @if ($initialUnread > 0) style="display: none" @endif>
            <x-nq::states icon="bell-off" class="border-0 py-10" :title="$L['emptyUnread']" :description="$L['emptyUnreadDescription']" />
        </div>
        <ul x-show="rows(true).length > 0" class="{{ $list }}" @if ($initialUnread === 0) style="display: none" @endif>{!! $rows('true') !!}</ul>
    </x-nq::tabs.panel>
</x-nq::tabs>
