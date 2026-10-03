<x-nq::sheet>
    <x-nq::sheet.trigger>Edit project</x-nq::sheet.trigger>
    <x-nq::sheet.content side="end">
        <x-nq::sheet.header>
            <x-nq::sheet.title>Edit project</x-nq::sheet.title>
            <x-nq::sheet.description>Changes save when you press Save.</x-nq::sheet.description>
        </x-nq::sheet.header>
        <x-nq::sheet.body class="flex flex-col gap-4 p-4">
            <x-nq::field>
                <x-nq::field.label>Name</x-nq::field.label>
                <x-nq::field.input value="Nasaq" />
            </x-nq::field>
        </x-nq::sheet.body>
        <x-nq::sheet.footer class="justify-end">
            <x-nq::sheet.close variant="ghost">Cancel</x-nq::sheet.close>
            <x-nq::sheet.close variant="primary">Save</x-nq::sheet.close>
        </x-nq::sheet.footer>
    </x-nq::sheet.content>
</x-nq::sheet>
