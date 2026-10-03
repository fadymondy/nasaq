<x-nq::dialog>
    <x-nq::dialog.trigger variant="danger">Delete project</x-nq::dialog.trigger>
    <x-nq::dialog.content>
        <x-nq::dialog.header>
            <x-nq::dialog.title>Delete this project?</x-nq::dialog.title>
            <x-nq::dialog.description>Issues, time entries and files are removed. This cannot be undone.</x-nq::dialog.description>
        </x-nq::dialog.header>
        <x-nq::dialog.footer>
            <x-nq::dialog.close variant="ghost">Keep project</x-nq::dialog.close>
            <x-nq::dialog.close variant="danger">Delete</x-nq::dialog.close>
        </x-nq::dialog.footer>
    </x-nq::dialog.content>
</x-nq::dialog>
