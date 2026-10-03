{{-- <x-nq::workspace-settings.create-dialog slug-prefix="nasaq.app/" @create="$event.detail.wait(createWorkspace($event.detail.values))">
         <x-slot:trigger><x-nq::button variant="primary">New workspace</x-nq::button></x-slot:trigger>
     </x-nq::workspace-settings.create-dialog>
     The create dialog (the "Add workspace" item of a workspace switcher): the create-form inside a dialog with a Cancel button. The address field is
     hidden by default (show-slug). The trigger slot is whatever opens it; open="true" starts it open. It closes after a create that resolves without an
     error. Same events and labels as create-form. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['slugPrefix' => null, 'showSlug' => false, 'open' => false, 'labels' => [], 'trigger' => null, 'submitLabel' => null, 'checkSlug' => false])
<x-nq::workspace-settings.create-form dialog :show-slug="$showSlug" :slug-prefix="$slugPrefix" :open="$open" :check-slug="$checkSlug" :labels="$labels" :submit-label="$submitLabel" {{ $attributes }}>
    <x-slot:trigger>{{ $trigger }}</x-slot:trigger>
</x-nq::workspace-settings.create-form>
