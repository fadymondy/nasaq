{{-- Internal: the confirm dialog every server-admin panel shares. Driven by the panel's confirmOpen / confirmTitle / confirmBody / confirmLabel /
     confirmDanger / confirmGo(). Included inside the panel root with @include('nasaq::components.server-admin._confirm', ['t' => $t]). --}}
<x-nq::alert-dialog x-model="confirmOpen">
    <x-nq::alert-dialog.content>
        <x-nq::alert-dialog.header>
            <x-nq::alert-dialog.title><span x-text="confirmTitle"></span></x-nq::alert-dialog.title>
            <x-nq::alert-dialog.description><span x-text="confirmBody"></span></x-nq::alert-dialog.description>
        </x-nq::alert-dialog.header>
        <x-nq::alert-dialog.footer>
            <x-nq::alert-dialog.cancel>{{ $t['cancel'] }}</x-nq::alert-dialog.cancel>
            <template x-if="confirmDanger"><x-nq::alert-dialog.action variant="danger" x-on:click="confirmGo()"><span x-text="confirmLabel"></span></x-nq::alert-dialog.action></template>
            <template x-if="! confirmDanger"><x-nq::alert-dialog.action variant="primary" x-on:click="confirmGo()"><span x-text="confirmLabel"></span></x-nq::alert-dialog.action></template>
        </x-nq::alert-dialog.footer>
    </x-nq::alert-dialog.content>
</x-nq::alert-dialog>
