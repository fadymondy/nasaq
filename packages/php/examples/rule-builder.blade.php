{{-- Pick the event, add conditions and actions; the sentence reads the rule back. --}}
<div class="w-[40rem] max-w-full">
    <x-nq::rule-builder :events="[['id' => 'order.created', 'label' => 'an order is placed']]" :fields="[['id' => 'amount', 'label' => 'Amount', 'kind' => 'number']]"
        :action-types="[['id' => 'email', 'label' => 'Send an email', 'fields' => [['name' => 'to', 'label' => 'To', 'kind' => 'text', 'required' => true]]]]" />
</div>
