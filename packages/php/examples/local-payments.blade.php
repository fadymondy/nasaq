<x-nq::local-payments
    :amount="1250000"
    currency="USD"
    :methods="[
        [
            'id' => 'instapay',
            'name' => 'InstaPay',
            'kind' => 'instant-transfer',
            'details' => [['label' => 'Payment address', 'value' => 'shop@instapay']],
            'steps' => ['Open your banking app', 'Send the total to the address below', 'Add the reference and a screenshot'],
        ],
    ]"
/>

<x-nq::local-payments.verification-queue
    class="mt-8"
    :submissions="[
        ['id' => 's1', 'customer' => 'Mona Adel', 'methodName' => 'InstaPay', 'amount' => 1250000, 'currency' => 'USD', 'reference' => 'AB12CD34', 'receiptName' => 'receipt.jpg', 'receiptUrl' => '/receipts/s1.jpg', 'submittedAt' => '2026-09-01T10:00:00Z', 'status' => 'submitted'],
        ['id' => 's2', 'customer' => 'Omar Khaled', 'methodName' => 'Bank transfer', 'amount' => 500000, 'currency' => 'USD', 'reference' => 'ZZ99YY88', 'submittedAt' => '2026-09-02T10:00:00Z', 'status' => 'verified'],
    ]"
/>
