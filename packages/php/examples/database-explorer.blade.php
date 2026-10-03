<x-nq::database-explorer
    :schemas="[
        ['name' => 'public', 'tables' => [
            ['name' => 'users', 'rowCount' => 1280, 'columns' => [
                ['name' => 'id', 'type' => 'uuid', 'primaryKey' => true],
                ['name' => 'email', 'type' => 'varchar(120)'],
                ['name' => 'plan', 'type' => 'text', 'nullable' => true],
                ['name' => 'created_at', 'type' => 'timestamptz'],
            ]],
            ['name' => 'orders', 'rowCount' => 5421, 'columns' => [
                ['name' => 'id', 'type' => 'uuid', 'primaryKey' => true],
                ['name' => 'user_id', 'type' => 'uuid', 'references' => 'users.id'],
                ['name' => 'total', 'type' => 'numeric(10,2)'],
            ]],
            ['name' => 'active_users', 'kind' => 'view', 'columns' => [['name' => 'id', 'type' => 'uuid']]],
        ]],
    ]" />
