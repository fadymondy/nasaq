<x-nq::confirm-provider />
<x-nq::button variant="danger" x-data x-on:click="if (await $confirm({ title: 'Delete Billing?', description: 'Its tasks and files are deleted too. This cannot be undone.', confirmLabel: 'Delete' })) $dispatch('deleted', { id: 'p1' })">Delete</x-nq::button>
