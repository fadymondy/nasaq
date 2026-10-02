{{-- <x-nq::notification-center :items="[['id' => '1', 'title' => 'Sara mentioned you in MH-142', 'actor' => ['name' => 'Sara Alharbi'], 'time' => now()->subMinutes(5), 'unread' => true]]" />
     A bell button with an unread badge that opens a popover of notifications, with All / Unread tabs and "Mark all read".
     items: id, title, description, actor (name, avatar), icon (trusted HTML, shown instead of the actor), time (a date, a Unix time in ms or an ISO string), unread, href.
     unread-count: the server total when it is more than the loaded items. open: start open (x-modelable: x-model="$wire.bellOpen"). variant: popover (default) | sheet (a full-height side panel).
     side: with the sheet, the edge it slides from (end default | start); with the popover, a floating side. align: start | center | end (default end).
     optimistic: false stops the bell marking rows read itself. The header slot adds content above the tabs (best with the sheet).
     Events (bubbling, from the root): "nq-notification-click" { id, item }, "nq-mark-all-read", "nq-open-change" { open }. Pressing a row marks it read and "Mark all read" marks all, unless optimistic is false.
     labels: ['title','all','unread','markAllRead','emptyAll','emptyAllDescription','emptyUnread','emptyUnreadDescription','unreadLabel']. Not ported: the per-row context menu (item-actions).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'unreadCount' => null, 'open' => false, 'variant' => 'popover', 'side' => null, 'align' => 'end', 'optimistic' => true, 'cap' => 99, 'labels' => [], 'header' => null])
@php
    $sheet = $variant === 'sheet';
    $toMs = fn ($t) => $t instanceof \DateTimeInterface ? $t->getTimestamp() * 1000 : $t;
    $rows = collect($items)->map(fn ($i) => array_filter(array_merge($i, ['time' => $toMs($i['time'] ?? null)]), fn ($v) => $v !== null))->values()->all();
    $unread = collect($rows)->where('unread', true)->count();
    $count = max((int) ($unreadCount ?? 0), $unread);
    $options = array_filter([
        'variant' => $sheet ? 'sheet' : null,
        'cap' => $cap !== 99 ? $cap : null,
        'optimistic' => $optimistic ? null : false,
        'unreadCount' => $unreadCount,
        'open' => $open ?: null,
    ], fn ($v) => $v !== null);
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $title = $labels['title'] ?? \Nasaq\Nasaq::t('Notifications', 'الإشعارات');
    $label = $count > 0 ? (\Nasaq\Nasaq::rtl() ? "الإشعارات، {$count} غير مقروء" : "Notifications, {$count} unread") : $title;
    $badge = $count > $cap ? $cap.'+' : (string) $count;
    $badgeStyle = $count > 0 ? '' : 'display: none';
    $popSide = in_array($side, [null, 'start', 'end'], true) ? 'bottom' : $side;
    $sheetSide = $side === 'start' ? 'start' : 'end';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'notification-center') }}" data-variant="{{ $variant }}" x-data="nqNotificationCenter({!! $js($rows) !!}, {!! $js((object) $options) !!})" x-modelable="open" x-id="['nq-notification-center']"
    {{ $attributes->except('data-slot')->cn('inline-flex') }}>
    <x-nq::button variant="ghost" size="icon" data-slot="popover-trigger" x-ref="trigger" aria-haspopup="dialog" x-on:click="toggle()" x-bind:aria-expanded="open" x-bind:aria-label="triggerLabel()" :aria-label="$label" class="relative">
        <x-lucide-bell />
        <x-nq::badge variant="accent" data-notification="badge" aria-hidden="true" x-show="count() > 0" class="pointer-events-none absolute -end-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px]" :style="$badgeStyle"><span x-text="countText()">{{ $badge }}</span></x-nq::badge>
    </x-nq::button>
    @if ($sheet)
        <x-nq::sheet.content :side="$sheetSide" class="w-[min(26rem,100vw)] pt-1">
            <x-nq::notification-center.body sheet :header="$header" :initial-unread="$unread" :total="count($rows)" :labels="$labels" />
        </x-nq::sheet.content>
    @else
        <x-nq::popover.content :side="$popSide" :align="$align" class="w-[min(24rem,calc(100vw-1rem))] p-0">
            <x-nq::notification-center.body :header="$header" :initial-unread="$unread" :total="count($rows)" :labels="$labels" />
        </x-nq::popover.content>
    @endif
</div>
