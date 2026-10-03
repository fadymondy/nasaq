<x-nq::map-view
    label="Fleet"
    :layers="[['id' => 'vans', 'label' => 'Vans', 'labelAr' => 'الشاحنات', 'tone' => 'info']]"
    :pins="[['id' => 'v1', 'lat' => 24.7136, 'lng' => 46.6753, 'label' => 'Van 12', 'labelAr' => 'شاحنة 12', 'layer' => 'vans', 'tone' => 'info', 'icon' => 'truck', 'status' => 'Moving', 'statusAr' => 'تتحرك']]"
    :routes="[['id' => 'r1', 'layer' => 'vans', 'label' => 'Route A', 'points' => [['lat' => 24.71, 'lng' => 46.67], ['lat' => 24.75, 'lng' => 46.72]]]]"
    tile-url="https://tile.example.com/{z}/{x}/{y}.png"
    attribution="© Example maps" />
