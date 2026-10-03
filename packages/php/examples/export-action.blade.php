<x-nq::export-action
    :columns="[['id' => 'name', 'label' => 'Name'], ['id' => 'email', 'label' => 'Email']]"
    :scopes="['filtered' => [['name' => 'Sara Ali', 'email' => 'sara@example.com'], ['name' => 'Omar Nasser', 'email' => 'omar@example.com']], 'all' => [['name' => 'Sara Ali', 'email' => 'sara@example.com'], ['name' => 'Omar Nasser', 'email' => 'omar@example.com'], ['name' => 'Lina Haddad', 'email' => 'lina@example.com']]]"
    filename="contacts" />
