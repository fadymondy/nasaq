<x-nq::glance-surfaces.tray-popover title="Today">
    <x-nq::glance-surfaces.glance-row icon="clock" label="Timer running" value="00:42" tone="info" />
</x-nq::glance-surfaces.tray-popover>
<x-nq::glance-surfaces.widget-gallery :added="['timer']" class="mt-6">
    <x-nq::glance-surfaces.widget-gallery-item id="steps" title="Steps" description="Daily goal" :sizes="['small', 'medium']">
        <x-nq::glance-surfaces.widget-tile size="small" title="Steps" icon="footprints" value="8,200" caption="of 10,000" :progress="82" tone="success" x-show="size === 'small'" />
        <x-nq::glance-surfaces.widget-tile size="medium" title="Steps" icon="footprints" value="8,200" caption="of 10,000" :progress="82" tone="success" x-show="size === 'medium'" style="display: none" />
    </x-nq::glance-surfaces.widget-gallery-item>
    <x-nq::glance-surfaces.widget-gallery-item id="timer" title="Timer" :sizes="['circular']">
        <x-nq::glance-surfaces.widget-tile size="circular" title="Timer" icon="clock" value="42" :progress="70" tone="info" />
    </x-nq::glance-surfaces.widget-gallery-item>
</x-nq::glance-surfaces.widget-gallery>
