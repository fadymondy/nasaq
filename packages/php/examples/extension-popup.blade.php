<div class="flex flex-wrap items-start gap-8">
    <x-nq::extension-popup status="disconnected" :pausable="true" :options="true">
        <x-slot:brand><span dir="ltr">Nasaq</span></x-slot:brand>
        <x-nq::extension-popup.connect default-server="" />
        <x-slot:footer>v1.4.0</x-slot:footer>
    </x-nq::extension-popup>

    <x-nq::extension-popup status="connected">
        <x-slot:brand><span dir="ltr">Nasaq</span></x-slot:brand>
        <x-nq::extension-popup.mini-card title="Saved today" icon="bookmark" :status="['label' => 'Synced', 'tone' => 'success']" :value="12" hint="Pages and snippets" />
        <x-nq::extension-popup.quick-actions :actions="[
            ['id' => 'open', 'label' => 'Open app', 'icon' => 'globe', 'external' => true],
            ['id' => 'save', 'label' => 'Save this page', 'icon' => 'bookmark'],
            ['id' => 'copy', 'label' => 'Copy link', 'icon' => 'link-2'],
        ]" />
    </x-nq::extension-popup>

    <x-nq::extension-popup.connect mode="pair" class="w-80" />

    <x-nq::extension-popup.options-page title="Extension settings" description="Applies to every site." :sections="[
        ['id' => 'general', 'title' => 'General', 'description' => 'How the extension behaves.'],
    ]" :save="true" class="w-[36rem]">
        <x-slot:general>
            <x-nq::extension-popup.option-row label="Show badge" description="On the toolbar icon.">
                <x-slot:control><x-nq::switch aria-label="Show badge" /></x-slot:control>
            </x-nq::extension-popup.option-row>
        </x-slot:general>
    </x-nq::extension-popup.options-page>
</div>
