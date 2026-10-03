<x-nq::wallet
    :balance="1250.5"
    :pending="100"
    currency="USD"
    :sources="[['id' => 'visa', 'label' => 'Visa ending 4242']]"
    :destinations="[['id' => 'bank', 'label' => 'Al Rajhi Bank', 'description' => 'SA03 **** 1234']]"
    :transactions="[['id' => 't1', 'type' => 'topup', 'amount' => 200, 'status' => 'completed', 'date' => '2024-03-05T10:30:00', 'description' => 'Top-up']]"
    top-up
    payout
/>
