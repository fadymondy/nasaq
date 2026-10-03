<x-nq::menubar aria-label="Application">
    <x-nq::menubar.menu>
        <x-nq::menubar.trigger>File</x-nq::menubar.trigger>
        <x-nq::menubar.content>
            <x-nq::menubar.item :shortcut="['Ctrl', 'N']">New file</x-nq::menubar.item>
            <x-nq::menubar.item :shortcut="['Ctrl', 'S']">Save</x-nq::menubar.item>
            <x-nq::menubar.separator />
            <x-nq::menubar.item variant="danger">Quit</x-nq::menubar.item>
        </x-nq::menubar.content>
    </x-nq::menubar.menu>
    <x-nq::menubar.menu>
        <x-nq::menubar.trigger>View</x-nq::menubar.trigger>
        <x-nq::menubar.content>
            <x-nq::menubar.checkbox-item :checked="true">Show grid</x-nq::menubar.checkbox-item>
            <x-nq::menubar.sub>
                <x-nq::menubar.sub-trigger>Zoom</x-nq::menubar.sub-trigger>
                <x-nq::menubar.sub-content>
                    <x-nq::menubar.item>Zoom in</x-nq::menubar.item>
                    <x-nq::menubar.item>Zoom out</x-nq::menubar.item>
                </x-nq::menubar.sub-content>
            </x-nq::menubar.sub>
        </x-nq::menubar.content>
    </x-nq::menubar.menu>
</x-nq::menubar>
