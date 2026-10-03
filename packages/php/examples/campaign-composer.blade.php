<x-nq::campaign-composer
    :audiences="[['id' => 'all', 'label' => 'Everyone', 'counts' => ['email' => 1240, 'whatsapp' => 610]]]"
    :variables="[['key' => 'name', 'label' => 'Name', 'sample' => 'Sara']]"
    :default-value="['audienceId' => 'all', 'subject' => 'Hello', 'body' => '<p>Hi there</p>']"
/>
