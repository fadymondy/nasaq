{{-- <x-nq::icon-picker x-model="icon" />   A button showing the chosen icon that opens the icon grid in a popover; choosing closes it.
     Same props as icon-picker.panel (icons, columns, page-size, recent-key), plus value (the chosen name), side, align, close-on-select (default true), disabled.
     The chosen name is x-modelable (x-model="icon") and a "select" event ({ name }) fires on the wrapper. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => null, 'icons' => null, 'columns' => 8, 'pageSize' => 96, 'recentKey' => 'nasaq:icon-picker:recent', 'side' => 'bottom', 'align' => 'start', 'closeOnSelect' => true, 'disabled' => false, 'open' => false])
@php
    $trigger = \Nasaq\Nasaq::t('Choose icon', 'اختيار أيقونة');
    $chosen = \Nasaq\Nasaq::t('Icon: :name', 'الأيقونة: :name');
    $js = fn ($v) => \Illuminate\Support\Js::from($v);
    $label = 'picked ? `'.str_replace(['`', '${', chr(92)], '', $chosen).'`.replace(`:name`, picked) : `'.str_replace(['`', '${', chr(92)], '', $trigger).'`';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'icon-picker-root') }}" x-data="{ picked: @js($value) }" x-modelable="picked" {{ $attributes->except('data-slot')->whereStartsWith('x-model')->merge(['class' => 'contents']) }}>
    <x-nq::popover :open="$open">
        <x-nq::popover.trigger variant="secondary" size="icon" :disabled="$disabled" {{ $attributes->whereDoesntStartWith('x-model') }}
            :x-bind:aria-label="$label" :x-bind:title="'picked || `'.str_replace(['`', '${', chr(92)], '', $trigger).'`'" aria-label="{{ $trigger }}">
            <span x-show="! (picked &amp;&amp; popupEl?.querySelector(`[data-name='${picked}']`))" class="inline-flex text-muted-foreground"><x-nq::icon name="shapes" /></span>
            <span x-show="picked &amp;&amp; popupEl?.querySelector(`[data-name='${picked}']`)" style="display:none" class="inline-flex"
                x-html="picked ? (popupEl?.querySelector(`[data-name='${picked}']`)?.innerHTML ?? '') : ''"></span>
        </x-nq::popover.trigger>
        <x-nq::popover.content :side="$side" :align="$align" class="w-auto overflow-hidden p-0">
            <x-nq::icon-picker.panel x-model="picked" :icons="$icons" :columns="$columns" :page-size="$pageSize" :recent-key="$recentKey" :auto-focus="true"
                :x-on:select="$closeOnSelect ? 'close()' : null" />
        </x-nq::popover.content>
    </x-nq::popover>
</div>
