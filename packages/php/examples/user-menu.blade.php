<div class="w-64">
    <x-nq::user-menu :user="['name' => 'Fady Mondy', 'email' => 'hello@example.com']" sign-out>
        <x-nq::dropdown-menu.item><x-lucide-user-round /> Account</x-nq::dropdown-menu.item>
        <x-nq::dropdown-menu.item><x-lucide-credit-card /> Billing</x-nq::dropdown-menu.item>
    </x-nq::user-menu>
</div>
