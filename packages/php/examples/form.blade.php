<x-nq::form class="max-w-sm" action="/sign-up" method="post">
    <x-nq::form.field name="email" label="Email">
        <x-nq::field.input type="email" />
    </x-nq::form.field>
    <x-nq::button type="submit" variant="primary" x-bind:disabled="submitting" x-bind:aria-busy="submitting ? 'true' : null">Create account</x-nq::button>
</x-nq::form>
