{{-- <x-nq::emoji-picker />   A ghost icon button that opens the emoji grid in a popover; choosing closes it (close-on-select, default true).
     Same props as emoji-picker.panel (skin-tone, columns), plus side, align, disabled. An "emoji-select" handler gets { emoji, label } in $event.detail,
     so: <x-nq::emoji-picker x-on:emoji-select="text += $event.detail.emoji" />. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['skinTone' => 'none', 'columns' => 8, 'side' => 'bottom', 'align' => 'start', 'closeOnSelect' => true, 'disabled' => false, 'open' => false])
@php
    $trigger = \Nasaq\Nasaq::t('Choose emoji', 'اختيار رمز تعبيري');
    // The popup is teleported but keeps this scope, so the caller's handler and close() both run on the panel's event.
    $handler = ($closeOnSelect ? 'close(); ' : '').($attributes->get('x-on:emoji-select') ?? '');
@endphp
<x-nq::popover :open="$open">
    <x-nq::popover.trigger variant="ghost" size="icon" :disabled="$disabled" aria-label="{{ $trigger }}" {{ $attributes->whereDoesntStartWith('x-on:emoji-select') }}>
        <x-nq::icon name="smile" />
    </x-nq::popover.trigger>
    <x-nq::popover.content :side="$side" :align="$align" class="w-auto overflow-hidden p-0">
        <x-nq::emoji-picker.panel :skin-tone="$skinTone" :columns="$columns" :x-on:emoji-select="$handler" />
    </x-nq::popover.content>
</x-nq::popover>
